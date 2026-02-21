import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { getAvatarUrl } from '../../utils/avatarUrl';

interface PlayerAvatarProps {
  race: string;
  playerClass: string;
  sex?: 'M' | 'F';
  playerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const emojiSizes = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function PlayerAvatar({
  race,
  playerClass,
  sex = 'M',
  playerName = '',
  size = 'md',
}: PlayerAvatarProps) {
  const url = getAvatarUrl(race, playerClass, sex, playerName);

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Cuando cambia raza, clase o sexo → nueva URL → reiniciar estado
  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [url]);

  return (
    <div
      className={clsx(
        'rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0 relative',
        sizeClasses[size]
      )}
    >
      {failed ? (
        // Fallback emoji si la IA falla
        <span className={emojiSizes[size]}>🧙</span>
      ) : (
        <>
          {/* Shimmer mientras genera la imagen */}
          {loading && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
          )}
          <img
            src={url}
            alt={`${race} ${playerClass}`}
            className={clsx(
              'w-full h-full object-cover transition-opacity duration-500',
              loading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setLoading(false)}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
          />
        </>
      )}
    </div>
  );
}
