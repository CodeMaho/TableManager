import { useState } from 'react';
import clsx from 'clsx';
import { getAvatarUrl } from '../../utils/avatarUrl';

interface PlayerAvatarProps {
  race: string;
  playerClass: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export function PlayerAvatar({ race, playerClass, size = 'md' }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = getAvatarUrl(race, playerClass);

  return (
    <div className={clsx('rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0', sizeClasses[size])}>
      {!failed ? (
        <img
          src={url}
          alt={`${race} ${playerClass}`}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={clsx(size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl')}>🧙</span>
      )}
    </div>
  );
}
