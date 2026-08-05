<?php
// Historial de partidas terminadas.
//
//   GET /api/historial.php        -> las partidas del usuario que pide
//   GET /api/historial.php?todas=1 -> todas (como el nodo global de Firebase)
//
// En Firebase `history` era una lista global sin dueño: todo el mundo veía las
// partidas de todo el mundo y no había forma de saber cuáles eran tuyas. Aquí
// por defecto se devuelven solo las propias.

require_once __DIR__ . '/_comun.php';

$pdo = bd($cfg);

// El historial es de quien tiene cuenta. Un invitado no arrastra nada entre
// partidas, así que se le devuelve una lista vacía en vez de un error: la app
// simplemente no tiene nada que enseñarle.
$yo = identidad($cfg, $pdo);
if ($yo === null || $yo['invitado']) {
    responder(200, []);
}
$yo = $yo['id'];

$todas = ($_GET['todas'] ?? '') === '1';

// `mi` trae cómo quedó QUIEN pregunta: puesto, experiencia y nivel alcanzado.
$sql =
    'SELECT p.codigo, p.creada_en, p.terminada_en, p.max_level,
            p.ganador_usuario_id, g.nombre AS ganador_nombre,
            mi.posicion AS mi_posicion, mi.xp_ganada AS mi_xp, mi.nivel AS mi_nivel
       FROM munckin_partida p
       LEFT JOIN munckin_partida_jugador g
              ON g.partida_id = p.id AND g.usuario_id = p.ganador_usuario_id
       LEFT JOIN munckin_partida_jugador mi
              ON mi.partida_id = p.id AND mi.usuario_id = ?
      WHERE p.estado = \'ENDED\'';

$params = [$yo];
if (!$todas) {
    $sql .= ' AND mi.usuario_id IS NOT NULL';
}
$sql .= ' ORDER BY p.terminada_en DESC LIMIT 100';

$st = $pdo->prepare($sql);
$st->execute($params);
$partidas = $st->fetchAll();

// Los nombres de los participantes, en una sola consulta para no hacer N+1.
$nombres = [];
if ($partidas) {
    $codigos = array_column($partidas, 'codigo');
    $marcas = implode(',', array_fill(0, count($codigos), '?'));
    $stn = $pdo->prepare(
        "SELECT p.codigo, j.nombre
           FROM munckin_partida p
           JOIN munckin_partida_jugador j ON j.partida_id = p.id
          WHERE p.codigo IN ($marcas)"
    );
    $stn->execute($codigos);
    foreach ($stn->fetchAll() as $f) $nombres[$f['codigo']][] = $f['nombre'];
}

// Misma forma que GameHistoryEntry en src/types/game.ts.
$salida = array_map(function (array $p) use ($nombres) {
    return [
        'gameId' => $p['codigo'],
        'createdAt' => a_ms($p['creada_en']) ?? 0,
        'endedAt' => a_ms($p['terminada_en']) ?? 0,
        'winnerId' => $p['ganador_usuario_id'] !== null ? (string) $p['ganador_usuario_id'] : null,
        'winnerName' => $p['ganador_nombre'],
        'maxLevel' => (int) $p['max_level'],
        'playerNames' => $nombres[$p['codigo']] ?? [],
        // Añadidos al modelo original: cómo quedé yo en esa partida.
        'miPosicion' => $p['mi_posicion'] !== null ? (int) $p['mi_posicion'] : null,
        'miXp' => (int) ($p['mi_xp'] ?? 0),
        'miNivel' => $p['mi_nivel'] !== null ? (int) $p['mi_nivel'] : null,
    ];
}, $partidas);

responder(200, $salida);
