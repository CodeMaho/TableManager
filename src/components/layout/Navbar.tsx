import { Crown, Copy, Check, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { useGameContext } from '../../context/GameContext';
import { StatTracker } from '../game/StatTracker';

export function Navbar() {
  const { game, gameId, isMyTurn, isHost, updateMaxLevel, reorderTurns } = useGameContext();
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!game || !gameId) return null;

  const turnOrder: string[] = game.turnState.turnOrder?.length
    ? game.turnState.turnOrder
    : Object.keys(game.players);

  const movePlayer = (pid: string, direction: -1 | 1) => {
    const order = [...turnOrder];
    const idx = order.indexOf(pid);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    reorderTurns(gameId, order, game.turnState.activePlayerId);
  };

  const activePlayer = game.players[game.turnState.activePlayerId];
  const statusLabel = game.meta.status === 'LOBBY' ? 'Sala de espera' :
    game.meta.status === 'ENDED' ? 'Partida finalizada' :
    `Turno ${game.turnState.turnNumber}`;

  const copyId = async () => {
    await navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <nav className={clsx(
        'sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm transition-colors',
        game.meta.status === 'IN_GAME' && isMyTurn ? 'bg-green-500 text-white' : 'bg-white text-gray-900 border-b'
      )}>
        <div className="flex items-center gap-2">
          <Crown size={20} className={isMyTurn ? 'text-yellow-200' : 'text-amber-500'} />
          <button
            type="button"
            onClick={copyId}
            className="flex items-center gap-1 font-mono text-sm font-bold"
          >
            {gameId}
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {statusLabel}
            {game.meta.status === 'IN_GAME' && activePlayer && (
              <span className="ml-1 opacity-75">- {activePlayer.name}</span>
            )}
          </span>
          {isHost && game.meta.status !== 'ENDED' && (
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="min-h-8 min-w-8 flex items-center justify-center rounded-lg hover:bg-black/10"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </nav>

      {/* Panel de configuración del host */}
      {showSettings && isHost && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <StatTracker
              label="Nv. Victoria"
              value={game.meta.maxLevel}
              min={2}
              max={30}
              onChange={(v) => updateMaxLevel(gameId, v)}
            />
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-sm text-gray-500 min-h-8 px-2"
            >
              Cerrar
            </button>
          </div>

          {/* Reordenación de turnos */}
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1.5">Orden de turnos</p>
            <div className="space-y-1">
              {turnOrder.map((pid, index) => {
                const player = game.players[pid];
                if (!player) return null;
                return (
                  <div
                    key={pid}
                    className={clsx(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5',
                      pid === game.turnState.activePlayerId
                        ? 'bg-green-100 border border-green-300'
                        : 'bg-white border border-gray-200'
                    )}
                  >
                    <span className="text-xs text-gray-400 w-4 shrink-0">{index + 1}.</span>
                    <span className="flex-1 text-sm font-medium truncate">{player.name}</span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePlayer(pid, -1)}
                      className="min-h-8 min-w-8 flex items-center justify-center rounded text-gray-600 active:bg-gray-100 disabled:opacity-25"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={index === turnOrder.length - 1}
                      onClick={() => movePlayer(pid, 1)}
                      className="min-h-8 min-w-8 flex items-center justify-center rounded text-gray-600 active:bg-gray-100 disabled:opacity-25"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
