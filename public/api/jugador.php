<?php
// Perfil del jugador en munckin.
//
//   GET  /api/jugador.php   -> quién soy
//   POST /api/jugador.php   -> cambiar nombre visible y género  (solo con cuenta)
//
// El GET responde SIEMPRE 200, tenga o no cuenta el que pregunta: jugar no exige
// login. Es lo que permite a la app decidir qué enseñar —el campo de nombre, o
// el perfil con nivel y el botón de salir— sin tratar la ausencia de sesión como
// un error.
//
// El nombre que se edita aquí es el de ESTA app: no toca la cuenta de Keycloak,
// que es común a todas. Por eso vive en `munckin_perfil` y no en `usuario`.

require_once __DIR__ . '/_comun.php';

$pdo = bd($cfg);
$yo = identidad($cfg, $pdo);

/** Devuelve el perfil completo y termina. */
function responder_perfil(PDO $pdo, array $yo): void {
    $st = $pdo->prepare('SELECT username, nombre FROM usuario WHERE id = ?');
    $st->execute([$yo['id']]);
    $u = $st->fetch() ?: [];

    $perfil = perfil_munckin($pdo, $yo['id']);
    $xp = (int) ($perfil['xp'] ?? 0);
    $nombreVisible = $perfil['nombre_visible'] ?? ($u['nombre'] ?? ($u['username'] ?? null));

    // Un invitado tiene identidad para jugar, pero no cuenta: ni progreso ni
    // historial. Se le devuelve solo su nombre, para no volver a pedírselo.
    if ($yo['invitado']) {
        responder(200, [
            'identificado' => false,
            'invitado' => true,
            'id' => (string) $yo['id'],
            'nombreVisible' => $nombreVisible,
        ]);
    }

    responder(200, [
        'identificado' => true,
        'invitado' => false,
        'id' => (string) $yo['id'],
        'username' => $u['username'] ?? '',
        'nombre' => $u['nombre'] ?? null,
        'nombreVisible' => $nombreVisible,
        'sexo' => $perfil['sexo_pref'] ?? 'M',
        'xp' => $xp,
        'nivel' => nivel_por_xp($xp),
        'xpEnNivel' => $xp % 100,
        'xpParaSubir' => 100 - ($xp % 100),
        'partidas' => (int) ($perfil['partidas'] ?? 0),
        'victorias' => (int) ($perfil['victorias'] ?? 0),
        'maxLevelPref' => (int) ($perfil['max_level_pref'] ?? 10),
    ]);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    // Editar el perfil exige cuenta: un invitado no arrastra nada entre
    // partidas, así que no hay nada que guardarle.
    if ($yo === null || $yo['invitado']) {
        responder(403, ['error' => 'requiere_cuenta',
                        'mensaje' => 'Inicia sesión para guardar tu perfil.']);
    }

    $in = cuerpo_json();
    perfil_munckin($pdo, $yo['id']); // asegura que la fila existe

    $campos = [];
    $vals = [];

    if (array_key_exists('nombreVisible', $in)) {
        $nombre = trim((string) $in['nombreVisible']);
        if ($nombre === '') {
            responder(400, ['error' => 'nombre_vacio', 'mensaje' => 'El nombre no puede estar vacío.']);
        }
        $campos[] = 'nombre_visible = ?';
        $vals[] = mb_substr($nombre, 0, 80);
    }

    if (array_key_exists('sexo', $in)) {
        if (!in_array($in['sexo'], ['M', 'F'], true)) {
            responder(400, ['error' => 'sexo_invalido']);
        }
        $campos[] = 'sexo_pref = ?';
        $vals[] = $in['sexo'];
    }

    if (!$campos) responder(400, ['error' => 'nada_que_actualizar']);

    $vals[] = $yo['id'];
    $pdo->prepare('UPDATE munckin_perfil SET ' . implode(', ', $campos) . ' WHERE usuario_id = ?')
        ->execute($vals);

    responder_perfil($pdo, $yo);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET, POST');
    responder(405, ['error' => 'metodo_no_permitido']);
}

// Sin identidad todavía (ni cuenta ni cookie de invitado): visitante nuevo.
if ($yo === null) {
    responder(200, ['identificado' => false, 'invitado' => true, 'nombreVisible' => null]);
}

responder_perfil($pdo, $yo);
