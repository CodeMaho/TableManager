<?php
// Estado de una partida. Sustituye al listener onValue de Firebase.
//
//   GET /api/estado.php?id=4A9X          -> estado completo
//   GET /api/estado.php?id=4A9X&rev=12   -> 200 con {"sinCambios":true,"rev":12}
//                                           si nadie ha tocado nada desde rev 12
//
// El cliente sondea con el `rev` que ya tiene; mientras nadie escriba, la
// respuesta es diminuta y no se vuelve a montar el estado. Es lo que hace
// asumible el polling frente al push que daba Firebase.

require_once __DIR__ . '/_comun.php';

// Leer una partida NO exige cuenta ni identidad: quien tiene el código, entra.
// Es como funcionaba antes, y permite ver la sala antes de unirse.
$pdo = bd($cfg);

$codigo = strtoupper(trim((string) ($_GET['id'] ?? '')));
if ($codigo === '') responder(400, ['error' => 'falta_id']);

$partida = partida_por_codigo($pdo, $codigo);
if (!$partida) responder(404, ['error' => 'partida_no_encontrada']);

$revCliente = isset($_GET['rev']) && is_numeric($_GET['rev']) ? (int) $_GET['rev'] : null;
if ($revCliente !== null && $revCliente === (int) $partida['rev']) {
    responder(200, ['sinCambios' => true, 'rev' => (int) $partida['rev']]);
}

responder(200, estado_partida($pdo, $partida));
