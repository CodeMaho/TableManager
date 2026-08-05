import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { getAvatarSvgUrl, generateAvatarAI } from '../../utils/avatarUrl';

interface PlayerAvatarProps {
  race: string;
  playerClass: string;
  sex?: 'M' | 'F';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export function PlayerAvatar({
  race,
  playerClass,
  sex = 'M',
  size = 'md',
}: PlayerAvatarProps) {
  const [aiUrl, setAiUrl] = useState<string | null>(null);
  const svgUrl = getAvatarSvgUrl(race, playerClass, sex);

  useEffect(() => {
    let cancelled = false;
    setAiUrl(null);
    generateAvatarAI(race, playerClass, sex).then(url => {
      if (!cancelled) setAiUrl(url);
    });
    return () => { cancelled = true; };
  }, [race, playerClass, sex]);

  return (
    // CSS Grid para apilar SVG e imagen IA en la misma celda
    <div className={clsx('rounded-full overflow-hidden shrink-0 bg-gray-100 grid', sizeClasses[size])}>
      {/* SVG — visible inmediatamente, se oculta cuando carga la IA */}
      <img
        src={svgUrl}
        alt={`${race} ${playerClass}`}
        className={clsx(
          'col-start-1 row-start-1 w-full h-full object-cover transition-opacity duration-500',
          aiUrl ? 'opacity-0' : 'opacity-100',
        )}
        draggable={false}
      />
      {/* Imagen IA — se monta solo cuando la URL está lista */}
      {aiUrl && (
        <img
          src={aiUrl}
          alt=""
          className="col-start-1 row-start-1 w-full h-full object-cover"
          draggable={false}
        />
      )}
    </div>
  );
}
