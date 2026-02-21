import { CheckCircle, Circle, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { PlayerProfile } from '../../types/game';
import { PlayerAvatar } from '../game/PlayerAvatar';

interface LobbyListProps {
  players: Record<string, PlayerProfile>;
  hostId: string;
  turnOrder: string[];
  isHost: boolean;
  onMovePlayer?: (pid: string, direction: -1 | 1) => void;
}

export function LobbyList({ players, hostId, turnOrder, isHost, onMovePlayer }: LobbyListProps) {
  // Render players in turnOrder. Players not yet in turnOrder appear at the end.
  const orderedIds = [
    ...turnOrder.filter((pid) => players[pid]),
    ...Object.keys(players).filter((pid) => !turnOrder.includes(pid)),
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        {orderedIds.length} jugador{orderedIds.length !== 1 ? 'es' : ''} en la sala
        {isHost && <span className="ml-1 text-amber-600">· Arrastra para reordenar turnos</span>}
      </p>
      {orderedIds.map((id, index) => {
        const player = players[id];
        if (!player) return null;
        return (
          <div
            key={id}
            className={clsx(
              'flex items-center justify-between rounded-xl p-4 border',
              player.isReady ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
            )}
          >
            {/* Turn position + reorder buttons (host only) */}
            {isHost && onMovePlayer ? (
              <div className="flex flex-col items-center mr-2 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMovePlayer(id, -1)}
                  className="min-h-8 min-w-8 flex items-center justify-center rounded text-gray-400 active:bg-gray-100 disabled:opacity-20"
                >
                  <ChevronUp size={16} />
                </button>
                <span className="text-xs font-bold text-gray-400 leading-none">{index + 1}</span>
                <button
                  type="button"
                  disabled={index === orderedIds.length - 1}
                  onClick={() => onMovePlayer(id, 1)}
                  className="min-h-8 min-w-8 flex items-center justify-center rounded text-gray-400 active:bg-gray-100 disabled:opacity-20"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            ) : (
              <span className="text-sm font-bold text-gray-400 w-6 text-center shrink-0">{index + 1}</span>
            )}

            {/* Player info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <PlayerAvatar race={player.attributes.race} playerClass={player.attributes.class} sex={player.attributes.sex} playerName={player.name} size="md" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {player.name}
                  {id === hostId && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Anfitrión</span>
                  )}
                </p>
              </div>
            </div>

            {/* Ready status */}
            {player.isReady ? (
              <CheckCircle size={24} className="text-green-500 shrink-0" />
            ) : (
              <Circle size={24} className="text-gray-300 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
