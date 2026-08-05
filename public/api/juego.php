<?php
// Operaciones de partida. Sustituye a todas las escrituras que useGame.ts hacía
// contra Firebase.
//
//   POST /api/juego.php   { "accion": "...", ... }
//
// Autorización (antes no había ninguna: con el id de la partida cualquiera podía
// escribir cualquier cosa):
//   - sobre uno mismo -> se usa SIEMPRE el usuario de la sesión; se ignora
//     cualquier identificador de jugador que mande el cliente.
//   - ciclo de vida y turno (empezar, siguienteTurno, combate, ayuda) -> jugador
//     activo.
//   - host (expulsar, reordenar, maxLevel, terminar) -> solo el anfitrión.
//   - modificadores de combate y tiempo -> cualquier jugador de la partida, que
//     es como funcionaba en la mesa.

require_once __DIR__ . '/_comun.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    responder(405, ['error' => 'metodo_no_permitido']);
}

$pdo = bd($cfg);
$in = cuerpo_json();
$accion = (string) ($in['accion'] ?? '');

/** Ranuras de equipo válidas (src/types/game.ts). */
const RANURAS = ['head', 'armor', 'hands', 'feet', 'mount'];

/**
 * Experiencia por puesto final. 100 XP = 1 nivel (nivel_por_xp()).
 *
 * El enunciado fijaba 1º = 100 y 2º = 60; el resto sigue bajando y se estabiliza
 * en 20 para que participar siempre sume algo. Cambiar esta tabla es lo único
 * que hace falta para reajustar la progresión.
 */
const XP_POR_PUESTO = [100, 60, 40, 30, 25];
const XP_MINIMA = 20;

function xp_de_puesto(int $puesto): int {
    return XP_POR_PUESTO[$puesto - 1] ?? XP_MINIMA;
}

/** Deja el combate en reposo. Mismos campos que reseteaba endCombat en Firebase. */
function sql_reset_combate(): string {
    return 'fase = \'EXPLORATION\', combate_activo = 0, monstruo_nivel = 1,
            monstruo_mods = 0, jugador_mods = 0, ayudante_usuario_id = NULL,
            ayuda_de_usuario_id = NULL, ayuda_a_usuario_id = NULL, ayuda_estado = NULL,
            combate_inicio_ms = NULL, combate_extra_seg = 0';
}

/**
 * Cierra la partida: fija la clasificación, reparte experiencia y actualiza los
 * contadores.
 *
 * La clasificación sale del nivel alcanzado, y a igualdad, de la fuerza de
 * combate (nivel + equipo - maldiciones), que es el mismo criterio que usa la
 * app para ordenar la mesa. El ganador declarado va primero siempre.
 *
 * Los invitados NO reciben experiencia: no tienen progreso entre partidas. Es
 * exactamente lo que se gana al crear una cuenta.
 */
function cerrar_partida(PDO $pdo, int $partidaId, ?int $ganador): void {
    $pdo->prepare(
        'UPDATE munckin_partida SET estado = \'ENDED\', ganador_usuario_id = ?, terminada_en = NOW() WHERE id = ?'
    )->execute([$ganador, $partidaId]);

    $st = $pdo->prepare(
        'SELECT j.usuario_id, j.nivel, j.debuff,
                (j.gear_head + j.gear_armor + j.gear_hands + j.gear_feet + j.gear_mount) AS equipo,
                u.es_invitado
           FROM munckin_partida_jugador j
           JOIN usuario u ON u.id = j.usuario_id
          WHERE j.partida_id = ?'
    );
    $st->execute([$partidaId]);
    $jugadores = $st->fetchAll();

    usort($jugadores, function (array $a, array $b) use ($ganador) {
        if ((int) $a['usuario_id'] === $ganador) return -1;
        if ((int) $b['usuario_id'] === $ganador) return 1;
        $fa = (int) $a['nivel'] + (int) $a['equipo'] - (int) $a['debuff'];
        $fb = (int) $b['nivel'] + (int) $b['equipo'] - (int) $b['debuff'];
        return ($b['nivel'] <=> $a['nivel']) ?: ($fb <=> $fa);
    });

    $marca = $pdo->prepare(
        'UPDATE munckin_partida_jugador SET posicion = ?, xp_ganada = ? WHERE partida_id = ? AND usuario_id = ?'
    );
    $sumaXp = $pdo->prepare('UPDATE munckin_perfil SET xp = xp + ? WHERE usuario_id = ?');
    $contador = $pdo->prepare('UPDATE munckin_perfil SET partidas = partidas + 1 WHERE usuario_id = ?');

    foreach ($jugadores as $i => $j) {
        $uid = (int) $j['usuario_id'];
        $puesto = $i + 1;
        $xp = ((int) $j['es_invitado'] === 1) ? 0 : xp_de_puesto($puesto);

        $marca->execute([$puesto, $xp, $partidaId, $uid]);
        if ($xp > 0) $sumaXp->execute([$xp, $uid]);
        $contador->execute([$uid]);
    }

    if ($ganador !== null) {
        $pdo->prepare('UPDATE munckin_perfil SET victorias = victorias + 1 WHERE usuario_id = ?')
            ->execute([$ganador]);
    }
}

/** Código de 4 caracteres libre. Antes lo generaba el cliente y podía chocar. */
function codigo_libre(PDO $pdo): string {
    $alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I/O/0/1, que se confunden
    for ($intento = 0; $intento < 20; $intento++) {
        $c = '';
        for ($i = 0; $i < 4; $i++) $c .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
        $st = $pdo->prepare('SELECT 1 FROM munckin_partida WHERE codigo = ?');
        $st->execute([$c]);
        if ($st->fetchColumn() === false) return $c;
    }
    responder(503, ['error' => 'sin_codigos_libres']);
}

// ---------------------------------------------------------------------------

// Crear o unirse son los únicos puntos donde nace una identidad: si el jugador
// no tiene cuenta, se le da de alta como invitado con el nombre que escriba. El
// resto de acciones exigen que esa identidad ya exista.
if ($accion === 'crear' || $accion === 'unirse') {
    $yo = identidad_o_crear($cfg, $pdo, (string) ($in['nombre'] ?? ''))['id'];
} else {
    $yo = exigir_identidad($cfg, $pdo)['id'];
}

if ($accion === 'crear') {
    $perfil = perfil_munckin($pdo, $yo);
    $nombre = trim((string) ($in['nombre'] ?? '')) ?: ($perfil['nombre_visible'] ?? 'Jugador');
    $maxLevel = entero($in['maxLevel'] ?? null, 2, 99, 10);
    $codigo = codigo_libre($pdo);

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO munckin_partida (codigo, host_usuario_id, activo_usuario_id, max_level, estado)
             VALUES (?, ?, ?, ?, \'LOBBY\')'
        )->execute([$codigo, $yo, $yo, $maxLevel]);
        $partidaId = (int) $pdo->lastInsertId();

        $pdo->prepare(
            'INSERT INTO munckin_partida_jugador
                (partida_id, usuario_id, nombre, sexo, raza, clase, orden_turno)
             VALUES (?, ?, ?, ?, ?, ?, 0)'
        )->execute([
            $partidaId, $yo, $nombre,
            $perfil['sexo_pref'] ?? 'M',
            $perfil['raza_pref'] ?? 'Humano',
            $perfil['clase_pref'] ?? 'Ninguna',
        ]);

        // El perfil recuerda las preferencias para la próxima partida.
        $pdo->prepare('UPDATE munckin_perfil SET nombre_visible = ?, max_level_pref = ? WHERE usuario_id = ?')
            ->execute([$nombre, $maxLevel, $yo]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('[munckin] crear: ' . $e->getMessage());
        responder(500, ['error' => 'no_se_pudo_crear']);
    }

    responder(201, estado_partida($pdo, exigir_partida($pdo, $codigo)));
}

// A partir de aquí todas las acciones operan sobre una partida existente.
$codigo = strtoupper(trim((string) ($in['id'] ?? '')));
if ($codigo === '') responder(400, ['error' => 'falta_id']);
$partida = exigir_partida($pdo, $codigo);
$pid = (int) $partida['id'];

if ($accion === 'unirse') {
    $perfil = perfil_munckin($pdo, $yo);
    $nombre = trim((string) ($in['nombre'] ?? '')) ?: ($perfil['nombre_visible'] ?? 'Jugador');

    $st = $pdo->prepare('SELECT 1 FROM munckin_partida_jugador WHERE partida_id = ? AND usuario_id = ?');
    $st->execute([$pid, $yo]);

    // Volver a entrar no crea nada: la identidad de Keycloak es estable, así que
    // el jugador reencuentra su fila. Esto es lo que sustituye al reenganche por
    // nombre que hacía joinGame en Firebase, que movía datos de un uid a otro.
    if ($st->fetchColumn() === false) {
        $orden = (int) $pdo->query(
            'SELECT COALESCE(MAX(orden_turno) + 1, 0) FROM munckin_partida_jugador WHERE partida_id = ' . $pid
        )->fetchColumn();

        $pdo->prepare(
            'INSERT INTO munckin_partida_jugador
                (partida_id, usuario_id, nombre, sexo, raza, clase, orden_turno)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $pid, $yo, $nombre,
            $perfil['sexo_pref'] ?? 'M',
            $perfil['raza_pref'] ?? 'Humano',
            $perfil['clase_pref'] ?? 'Ninguna',
            $orden,
        ]);
        $pdo->prepare('UPDATE munckin_perfil SET nombre_visible = ? WHERE usuario_id = ?')->execute([$nombre, $yo]);
        marcar_cambio($pdo, $pid);
    }

    responder(200, estado_partida($pdo, exigir_partida($pdo, $codigo)));
}

// El resto exige estar en la partida.
exigir_jugador($pdo, $pid, $yo);

switch ($accion) {

    // ----- sobre uno mismo -------------------------------------------------
    case 'jugador': {
        $campos = [];
        $vals = [];
        if (isset($in['name'])) { $campos[] = 'nombre = ?'; $vals[] = mb_substr(trim((string) $in['name']), 0, 80); }
        $a = is_array($in['attributes'] ?? null) ? $in['attributes'] : [];
        if (isset($a['level']))  { $campos[] = 'nivel = ?';  $vals[] = entero($a['level'], 1, (int) $partida['max_level'], 1); }
        if (isset($a['debuff'])) { $campos[] = 'debuff = ?'; $vals[] = entero($a['debuff'], -99, 99); }
        if (isset($a['sex']))    { $campos[] = 'sexo = ?';   $vals[] = $a['sex'] === 'F' ? 'F' : 'M'; }
        if (isset($a['race']))   { $campos[] = 'raza = ?';   $vals[] = mb_substr((string) $a['race'], 0, 40); }
        if (isset($a['class']))  { $campos[] = 'clase = ?';  $vals[] = mb_substr((string) $a['class'], 0, 40); }
        $g = is_array($in['gear'] ?? null) ? $in['gear'] : [];
        foreach (RANURAS as $slot) {
            if (isset($g[$slot])) { $campos[] = "gear_$slot = ?"; $vals[] = entero($g[$slot], -99, 99); }
        }
        if (isset($g['backpack']) && is_array($g['backpack'])) {
            $campos[] = 'gear_backpack = ?';
            $vals[] = json_encode(array_values($g['backpack']), JSON_UNESCAPED_UNICODE);
        }
        if (!$campos) responder(400, ['error' => 'nada_que_actualizar']);

        $vals[] = $pid;
        $vals[] = $yo;
        $pdo->prepare('UPDATE munckin_partida_jugador SET ' . implode(', ', $campos)
            . ' WHERE partida_id = ? AND usuario_id = ?')->execute($vals);
        break;
    }

    case 'gear': {
        $slot = (string) ($in['slot'] ?? '');
        if (!in_array($slot, RANURAS, true)) responder(400, ['error' => 'ranura_invalida']);
        $pdo->prepare("UPDATE munckin_partida_jugador SET gear_$slot = ? WHERE partida_id = ? AND usuario_id = ?")
            ->execute([entero($in['valor'] ?? 0, -99, 99), $pid, $yo]);
        break;
    }

    case 'nivel': {
        $nivel = entero($in['nivel'] ?? 1, 1, (int) $partida['max_level'], 1);
        $pdo->prepare('UPDATE munckin_partida_jugador SET nivel = ? WHERE partida_id = ? AND usuario_id = ?')
            ->execute([$nivel, $pid, $yo]);
        break;
    }

    case 'listo': {
        $pdo->prepare('UPDATE munckin_partida_jugador SET listo = ? WHERE partida_id = ? AND usuario_id = ?')
            ->execute([!empty($in['listo']) ? 1 : 0, $pid, $yo]);
        break;
    }

    // ----- turno y combate: jugador activo ---------------------------------
    case 'empezar': {
        exigir_host($partida, $yo);
        $primero = (int) $pdo->query(
            'SELECT usuario_id FROM munckin_partida_jugador WHERE partida_id = ' . $pid
            . ' ORDER BY orden_turno, usuario_id LIMIT 1'
        )->fetchColumn();
        $pdo->prepare(
            'UPDATE munckin_partida SET estado = \'IN_GAME\', activo_usuario_id = ?, fase = \'EXPLORATION\',
                    turno_numero = 1, turno_indice = 0 WHERE id = ?'
        )->execute([$primero ?: $yo, $pid]);
        break;
    }

    case 'siguienteTurno': {
        exigir_turno($partida, $yo);
        // El siguiente sale del orden guardado, no de lo que diga el cliente.
        $orden = $pdo->query(
            'SELECT usuario_id FROM munckin_partida_jugador WHERE partida_id = ' . $pid
            . ' ORDER BY orden_turno, usuario_id'
        )->fetchAll(PDO::FETCH_COLUMN);
        if (!$orden) responder(409, ['error' => 'partida_sin_jugadores']);

        $indice = (int) $partida['turno_indice'];
        $siguiente = ($indice + 1) % count($orden);
        $pdo->prepare(
            'UPDATE munckin_partida SET activo_usuario_id = ?, fase = \'EXPLORATION\',
                    turno_numero = turno_numero + 1, turno_indice = ? WHERE id = ?'
        )->execute([(int) $orden[$siguiente], $siguiente, $pid]);
        break;
    }

    case 'empezarCombate': {
        exigir_turno($partida, $yo);
        $pdo->prepare(
            'UPDATE munckin_partida SET fase = \'COMBAT\', combate_activo = 1, monstruo_nivel = 1,
                    monstruo_mods = 0, jugador_mods = 0, ayudante_usuario_id = NULL,
                    ayuda_de_usuario_id = NULL, ayuda_a_usuario_id = NULL, ayuda_estado = NULL,
                    combate_inicio_ms = ?, combate_extra_seg = 0 WHERE id = ?'
        )->execute([(int) round(microtime(true) * 1000), $pid]);
        break;
    }

    case 'combate': {
        // Cualquier jugador puede tocar los modificadores: en la mesa los ajusta
        // quien juega la carta, no solo quien tiene el turno.
        $campos = [];
        $vals = [];
        if (isset($in['monsterLevel']))     { $campos[] = 'monstruo_nivel = ?'; $vals[] = entero($in['monsterLevel'], 0, 999, 1); }
        if (isset($in['monsterModifiers'])) { $campos[] = 'monstruo_mods = ?';  $vals[] = entero($in['monsterModifiers'], -999, 999); }
        if (isset($in['playerModifiers']))  { $campos[] = 'jugador_mods = ?';   $vals[] = entero($in['playerModifiers'], -999, 999); }
        if (!$campos) responder(400, ['error' => 'nada_que_actualizar']);
        $vals[] = $pid;
        $pdo->prepare('UPDATE munckin_partida SET ' . implode(', ', $campos) . ' WHERE id = ?')->execute($vals);
        break;
    }

    case 'tiempoCombate': {
        $delta = entero($in['delta'] ?? 0, -3600, 3600);
        // Incremento en la propia sentencia: equivale a la runTransaction de
        // Firebase, sin condición de carrera si dos ajustan a la vez.
        $pdo->prepare('UPDATE munckin_partida SET combate_extra_seg = combate_extra_seg + ? WHERE id = ?')
            ->execute([$delta, $pid]);
        break;
    }

    case 'pedirAyuda': {
        exigir_turno($partida, $yo);
        $destino = (int) ($in['aId'] ?? 0);
        if ($destino === $yo) responder(400, ['error' => 'ayuda_a_ti_mismo']);
        exigir_jugador($pdo, $pid, $destino);
        $pdo->prepare(
            'UPDATE munckin_partida SET ayuda_de_usuario_id = ?, ayuda_a_usuario_id = ?, ayuda_estado = \'pending\'
              WHERE id = ?'
        )->execute([$yo, $destino, $pid]);
        break;
    }

    case 'responderAyuda': {
        // Solo responde a quien se le pidió.
        if ((int) $partida['ayuda_a_usuario_id'] !== $yo) {
            responder(403, ['error' => 'no_es_tu_peticion']);
        }
        $acepta = ($in['estado'] ?? '') === 'accepted';
        if ($acepta) {
            $pdo->prepare(
                'UPDATE munckin_partida SET ayudante_usuario_id = ?, ayuda_de_usuario_id = NULL,
                        ayuda_a_usuario_id = NULL, ayuda_estado = NULL WHERE id = ?'
            )->execute([$yo, $pid]);
        } else {
            $pdo->prepare(
                'UPDATE munckin_partida SET ayuda_de_usuario_id = NULL, ayuda_a_usuario_id = NULL,
                        ayuda_estado = NULL WHERE id = ?'
            )->execute([$pid]);
        }
        break;
    }

    case 'terminarCombate': {
        exigir_turno($partida, $yo);
        $gano = !empty($in['gano']);
        $pdo->prepare('UPDATE munckin_partida SET ' . sql_reset_combate() . ' WHERE id = ?')->execute([$pid]);

        if ($gano) {
            $maxLevel = (int) $partida['max_level'];
            $st = $pdo->prepare('SELECT nivel FROM munckin_partida_jugador WHERE partida_id = ? AND usuario_id = ?');
            $st->execute([$pid, $yo]);
            $nuevo = min($maxLevel, ((int) $st->fetchColumn()) + 1);

            $pdo->prepare('UPDATE munckin_partida_jugador SET nivel = ? WHERE partida_id = ? AND usuario_id = ?')
                ->execute([$nuevo, $pid, $yo]);

            if ($nuevo >= $maxLevel) cerrar_partida($pdo, $pid, $yo);
        }
        break;
    }

    case 'morir': {
        exigir_turno($partida, $yo);
        // Pierde todo el equipo pero conserva nivel, raza y clase.
        $pdo->prepare('UPDATE munckin_partida SET ' . sql_reset_combate() . ' WHERE id = ?')->execute([$pid]);
        $pdo->prepare(
            'UPDATE munckin_partida_jugador
                SET gear_head = 0, gear_armor = 0, gear_hands = 0, gear_feet = 0, gear_mount = 0,
                    gear_backpack = NULL
              WHERE partida_id = ? AND usuario_id = ?'
        )->execute([$pid, $yo]);
        break;
    }

    // ----- host ------------------------------------------------------------
    case 'maxLevel': {
        exigir_host($partida, $yo);
        $pdo->prepare('UPDATE munckin_partida SET max_level = ? WHERE id = ?')
            ->execute([entero($in['maxLevel'] ?? 10, 2, 99, 10), $pid]);
        break;
    }

    case 'reordenar': {
        exigir_host($partida, $yo);
        $orden = is_array($in['orden'] ?? null) ? $in['orden'] : [];
        if (!$orden) responder(400, ['error' => 'orden_vacio']);

        $pdo->beginTransaction();
        try {
            $up = $pdo->prepare(
                'UPDATE munckin_partida_jugador SET orden_turno = ? WHERE partida_id = ? AND usuario_id = ?'
            );
            foreach (array_values($orden) as $i => $uid) $up->execute([$i, $pid, (int) $uid]);

            // El índice de turno sigue al jugador activo en el nuevo orden.
            $nuevoIndice = array_search((string) $partida['activo_usuario_id'], array_map('strval', $orden), true);
            $pdo->prepare('UPDATE munckin_partida SET turno_indice = ? WHERE id = ?')
                ->execute([$nuevoIndice === false ? 0 : (int) $nuevoIndice, $pid]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('[munckin] reordenar: ' . $e->getMessage());
            responder(500, ['error' => 'no_se_pudo_reordenar']);
        }
        break;
    }

    case 'expulsar': {
        exigir_host($partida, $yo);
        $objetivo = (int) ($in['jugadorId'] ?? 0);
        if ($objetivo === $yo) responder(400, ['error' => 'no_puedes_expulsarte']);
        $pdo->prepare('DELETE FROM munckin_partida_jugador WHERE partida_id = ? AND usuario_id = ?')
            ->execute([$pid, $objetivo]);

        // Si se va el jugador activo, el turno pasa al primero que quede.
        if ((int) $partida['activo_usuario_id'] === $objetivo) {
            $siguiente = $pdo->query(
                'SELECT usuario_id FROM munckin_partida_jugador WHERE partida_id = ' . $pid
                . ' ORDER BY orden_turno, usuario_id LIMIT 1'
            )->fetchColumn();
            $pdo->prepare('UPDATE munckin_partida SET activo_usuario_id = ?, turno_indice = 0 WHERE id = ?')
                ->execute([$siguiente === false ? null : (int) $siguiente, $pid]);
        }
        break;
    }

    case 'terminar': {
        exigir_host($partida, $yo);
        $ganador = isset($in['ganadorId']) ? (int) $in['ganadorId'] : null;
        cerrar_partida($pdo, $pid, $ganador ?: null);
        break;
    }

    default:
        responder(400, ['error' => 'accion_desconocida', 'accion' => $accion]);
}

marcar_cambio($pdo, $pid);
responder(200, estado_partida($pdo, exigir_partida($pdo, $codigo)));
