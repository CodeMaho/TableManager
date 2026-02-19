import clsx from 'clsx';
import { Shield, Swords } from 'lucide-react';
import type { PlayerProfile } from '../../types/game';
import { getCombatStrength } from '../../utils/munchkinMath';
import { PlayerAvatar } from './PlayerAvatar';

interface PlayerCardProps {
  player: PlayerProfile;
  playerId: string;
  isActive: boolean;
  isHost: boolean;
  onKick?: () => void;
  onSelect?: () => void;
}

export function PlayerCard({ player, isActive, isHost, onKick, onSelect }: PlayerCardProps) {
  const strength = getCombatStrength(player);

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'flex items-center justify-between rounded-xl p-3 border transition-colors',
        isActive ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200',
        onSelect && 'cursor-pointer active:bg-gray-100'
      )}
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar race={player.attributes.race} playerClass={player.attributes.class} size="md" />
        <div>
          <p className="font-semibold text-gray-900">{player.name}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Shield size={14} /> Nv.{player.attributes.level}
            </span>
            <span className="flex items-center gap-1">
              <Swords size={14} /> {strength}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-2 text-xs text-gray-500 mt-0.5">
            <span>Raza: <strong className="text-gray-700">{player.attributes.race}</strong></span>
            <span>Clase: <strong className="text-gray-700">{player.attributes.class}</strong></span>
            {(player.attributes.debuff || 0) > 0 && (
              <span className="text-red-500">Debuff: -{player.attributes.debuff}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isHost && onKick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onKick(); }}
            className="min-h-8 min-w-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 text-xs"
          >
            Expulsar
          </button>
        )}
      </div>
    </div>
  );
}
