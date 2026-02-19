import { CheckCircle, Circle, Users } from 'lucide-react';
import clsx from 'clsx';
import type { PlayerProfile } from '../../types/game';
import { PlayerAvatar } from '../game/PlayerAvatar';

interface LobbyListProps {
  players: Record<string, PlayerProfile>;
  hostId: string;
}

export function LobbyList({ players, hostId }: LobbyListProps) {
  const entries = Object.entries(players);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Users size={16} />
        <span>{entries.length} jugador{entries.length !== 1 ? 'es' : ''} en la sala</span>
      </div>
      {entries.map(([id, player]) => (
        <div
          key={id}
          className={clsx(
            'flex items-center justify-between rounded-xl p-4 border',
            player.isReady ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <PlayerAvatar race={player.attributes.race} playerClass={player.attributes.class} size="md" />
            <div>
              <p className="font-semibold text-gray-900">
                {player.name}
                {id === hostId && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Anfitrión</span>
                )}
              </p>
            </div>
          </div>
          {player.isReady ? (
            <CheckCircle size={24} className="text-green-500" />
          ) : (
            <Circle size={24} className="text-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}
