import { useState, useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { useGameContext } from '../../context/GameContext';

interface ToastData {
  name: string;
  level: number;
}

export function LevelUpToast() {
  const { game } = useGameContext();
  const prevLevelsRef = useRef<Record<string, number>>({});
  const [toast, setToast] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!game) return;

    for (const [uid, player] of Object.entries(game.players)) {
      const prev = prevLevelsRef.current[uid];
      const curr = player.attributes.level;

      if (prev !== undefined && curr > prev) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setToast({ name: player.name, level: curr });
        timerRef.current = setTimeout(() => setToast(null), 5000);
      }

      prevLevelsRef.current[uid] = curr;
    }
  }, [game]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] pointer-events-none">
      <div className="bg-amber-500 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
        <TrendingUp size={24} className="shrink-0" />
        <div>
          <p className="font-bold text-base">{toast.name}</p>
          <p className="text-sm opacity-90">¡Subió al nivel {toast.level}!</p>
        </div>
      </div>
    </div>
  );
}
