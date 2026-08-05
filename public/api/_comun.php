<?php
// Piezas compartidas por la API de partida de munckin.
//
// Sustituye a Firebase Realtime Database. Diferencias de fondo respecto al
// modelo anterior:
//
//   - La identidad ya no es un uid anónimo de Firebase: sale de la sesión de la
//     puerta (Keycloak). El cliente NUNCA dice quién es; el servidor lo deduce.
//     Por eso las operaciones sobre uno mismo ignoran cualquier playerId que
//     llegue en la petición.
//   - Antes cualquiera con el id de la partida podía escribir lo que quisiera.
//     Ahora hay autorización: host, jugador activo o uno mismo, según la acción.
//   - No hay push: el cliente sondea `estado.php` y solo recarga cuando sube el
//     contador `rev`.

declare(strict_types=1);

// Este fichero solo se incluye; pedirlo por URL no debe hacer nada.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(404);
    exit;
}

$cfg = require __DIR__ . '/../config.php';
require_once __DIR__ . '/../session.php';
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');

/** Responde JSON y termina. */
function responder(int $codigo, array $cuerpo): void {
    http_response_code($codigo);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Conexión a la base o 503. */
function bd(array $cfg): PDO {
    $pdo = kc_db($cfg);
    if (!$pdo) responder(503, ['error' => 'sin_base_de_datos']);
    return $pdo;
}

// Cookie que identifica a un jugador SIN cuenta. El token es aleatorio de 128
// bits: es la identidad en sí, no hace falta firmarlo.
const COOKIE_INVITADO = 'munckin_invitado';

/**
 * Quién está pidiendo esto.
 *
 * Jugar no exige cuenta. Hay dos identidades posibles:
 *   - con sesión de la puerta -> usuario de Keycloak (progreso, historial, XP)
 *   - sin sesión              -> invitado, atado a una cookie del navegador
 *
 * Devuelve ['id' => int, 'invitado' => bool] o null si aún no hay ninguna.
 * No crea nada: para eso está identidad_o_crear().
 */
function identidad(array $cfg, PDO $pdo): ?array {
    $nombre = kc_verificar_sesion($cfg);
    if ($nombre !== null) {
        $sub = kc_sesion_sub($cfg) ?? kc_sub_por_username($cfg, $nombre);
        if ($sub !== null) {
            $id = kc_usuario_id($cfg, $sub);
            if ($id !== null) return ['id' => $id, 'invitado' => false];
        }
        // Sesión de la puerta válida pero sin fila todavía: la crea el login.
        responder(409, ['error' => 'sin_perfil', 'mensaje' => 'Vuelve a iniciar sesión.']);
    }

    $token = $_COOKIE[COOKIE_INVITADO] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) return null;

    $st = $pdo->prepare('SELECT id FROM usuario WHERE kc_sub = ?');
    $st->execute(['inv:' . $token]);
    $id = $st->fetchColumn();
    return $id === false ? null : ['id' => (int) $id, 'invitado' => true];
}

/** Como identidad(), pero da de alta al invitado si aún no existe. */
function identidad_o_crear(array $cfg, PDO $pdo, string $nombre): array {
    $yo = identidad($cfg, $pdo);
    if ($yo !== null) return $yo;

    $token = $_COOKIE[COOKIE_INVITADO] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        $token = bin2hex(random_bytes(16));
        setcookie(COOKIE_INVITADO, $token, [
            'expires' => time() + 60 * 60 * 24 * 365,
            'path' => '/',
            'httponly' => true,
            'secure' => true,
            'samesite' => 'Lax',
        ]);
    }

    $nombre = mb_substr(trim($nombre), 0, 80) ?: 'Invitado';
    $pdo->prepare('INSERT INTO usuario (kc_sub, es_invitado, username, nombre) VALUES (?, 1, ?, ?)')
        ->execute(['inv:' . $token, $nombre, $nombre]);

    return ['id' => (int) $pdo->lastInsertId(), 'invitado' => true];
}

/** Identidad ya existente, o 401. Para acciones sobre una partida en curso. */
function exigir_identidad(array $cfg, PDO $pdo): array {
    $yo = identidad($cfg, $pdo);
    if ($yo === null) responder(401, ['error' => 'sin_identidad']);
    return $yo;
}

/** Nivel a partir de la experiencia. No se guarda: se deriva, así no descuadra. */
function nivel_por_xp(int $xp): int {
    return 1 + intdiv(max(0, $xp), 100);
}

/** Perfil de munckin del usuario; lo crea vacío la primera vez. */
function perfil_munckin(PDO $pdo, int $usuarioId): array {
    $st = $pdo->prepare('SELECT * FROM munckin_perfil WHERE usuario_id = ?');
    $st->execute([$usuarioId]);
    $p = $st->fetch();
    if ($p) return $p;

    $pdo->prepare('INSERT INTO munckin_perfil (usuario_id) VALUES (?)')->execute([$usuarioId]);
    $st->execute([$usuarioId]);
    return $st->fetch() ?: [];
}

/** Partida por código, o null. */
function partida_por_codigo(PDO $pdo, string $codigo): ?array {
    $st = $pdo->prepare('SELECT * FROM munckin_partida WHERE codigo = ?');
    $st->execute([strtoupper($codigo)]);
    $p = $st->fetch();
    return $p ?: null;
}

/** Partida por código o 404. */
function exigir_partida(PDO $pdo, string $codigo): array {
    $p = partida_por_codigo($pdo, $codigo);
    if (!$p) responder(404, ['error' => 'partida_no_encontrada']);
    return $p;
}

/** Sube `rev`: es lo que hace que los demás clientes se enteren del cambio. */
function marcar_cambio(PDO $pdo, int $partidaId): void {
    $pdo->prepare('UPDATE munckin_partida SET rev = rev + 1 WHERE id = ?')->execute([$partidaId]);
}

function exigir_host(array $partida, int $usuarioId): void {
    if ((int) $partida['host_usuario_id'] !== $usuarioId) {
        responder(403, ['error' => 'solo_host', 'mensaje' => 'Solo el anfitrión puede hacer eso']);
    }
}

function exigir_turno(array $partida, int $usuarioId): void {
    if ((int) $partida['activo_usuario_id'] !== $usuarioId) {
        responder(403, ['error' => 'no_es_tu_turno']);
    }
}

function exigir_jugador(PDO $pdo, int $partidaId, int $usuarioId): void {
    $st = $pdo->prepare('SELECT 1 FROM munckin_partida_jugador WHERE partida_id = ? AND usuario_id = ?');
    $st->execute([$partidaId, $usuarioId]);
    if ($st->fetchColumn() === false) responder(403, ['error' => 'no_estas_en_la_partida']);
}

/** Milisegundos unix desde un DATETIME de MySQL (el front usa números). */
function a_ms(?string $fecha): ?int {
    if ($fecha === null || $fecha === '') return null;
    $t = strtotime($fecha);
    return $t === false ? null : $t * 1000;
}

/**
 * Construye el objeto GameSession que espera el frontend, con la misma forma
 * que tenía en Firebase. Así los componentes no cambian: `players` sigue siendo
 * un diccionario indexado por id de jugador.
 */
function estado_partida(PDO $pdo, array $p): array {
    $st = $pdo->prepare(
        'SELECT * FROM munckin_partida_jugador WHERE partida_id = ? ORDER BY orden_turno, usuario_id'
    );
    $st->execute([(int) $p['id']]);
    $filas = $st->fetchAll();

    $players = [];
    $turnOrder = [];
    foreach ($filas as $f) {
        $pid = (string) $f['usuario_id'];
        $turnOrder[] = $pid;
        $players[$pid] = [
            'name' => $f['nombre'],
            'isReady' => (bool) $f['listo'],
            'attributes' => [
                'level' => (int) $f['nivel'],
                'debuff' => (int) $f['debuff'],
                'sex' => $f['sexo'],
                'race' => $f['raza'],
                'class' => $f['clase'],
            ],
            'gear' => [
                'head' => (int) $f['gear_head'],
                'armor' => (int) $f['gear_armor'],
                'hands' => (int) $f['gear_hands'],
                'feet' => (int) $f['gear_feet'],
                'mount' => (int) $f['gear_mount'],
                'backpack' => kc_json_a_array($f['gear_backpack']),
            ],
        ];
    }

    $peticion = null;
    if ($p['ayuda_estado'] !== null && $p['ayuda_de_usuario_id'] !== null) {
        $peticion = [
            'fromId' => (string) $p['ayuda_de_usuario_id'],
            'toId' => (string) $p['ayuda_a_usuario_id'],
            'status' => $p['ayuda_estado'],
        ];
    }

    return [
        'rev' => (int) $p['rev'],
        'gameId' => $p['codigo'],
        'meta' => [
            'hostId' => $p['host_usuario_id'] !== null ? (string) $p['host_usuario_id'] : '',
            'createdAt' => a_ms($p['creada_en']) ?? 0,
            'status' => $p['estado'],
            'winnerId' => $p['ganador_usuario_id'] !== null ? (string) $p['ganador_usuario_id'] : null,
            'maxLevel' => (int) $p['max_level'],
        ],
        'turnState' => [
            'activePlayerId' => $p['activo_usuario_id'] !== null ? (string) $p['activo_usuario_id'] : '',
            'phase' => $p['fase'],
            'turnNumber' => (int) $p['turno_numero'],
            'turnOrder' => $turnOrder,
            'turnIndex' => (int) $p['turno_indice'],
        ],
        'combatState' => [
            'isActive' => (bool) $p['combate_activo'],
            'monsterLevel' => (int) $p['monstruo_nivel'],
            'monsterModifiers' => (int) $p['monstruo_mods'],
            'playerModifiers' => (int) $p['jugador_mods'],
            'helperId' => $p['ayudante_usuario_id'] !== null ? (string) $p['ayudante_usuario_id'] : null,
            'combatStartedAt' => $p['combate_inicio_ms'] !== null ? (int) $p['combate_inicio_ms'] : null,
            'combatExtraSeconds' => (int) $p['combate_extra_seg'],
            'helperRequest' => $peticion,
        ],
        'players' => (object) $players,
    ];
}

/** Cuerpo JSON de la petición. */
function cuerpo_json(): array {
    $d = json_decode((string) file_get_contents('php://input'), true);
    return is_array($d) ? $d : [];
}

/** Entero acotado. */
function entero($v, int $min, int $max, int $porDefecto = 0): int {
    if (!is_numeric($v)) return $porDefecto;
    return max($min, min($max, (int) $v));
}
