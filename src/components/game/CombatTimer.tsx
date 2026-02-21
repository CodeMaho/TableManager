import { useState, useEffect } from 'react';
import { Timer, Plus, Minus } from 'lucide-react';
import clsx from 'clsx';
import { useGameContext } from '../../context/GameContext';

const INITIAL_SECONDS = 180;

export function CombatTimer() {
  const { game, gameId, addCombatTime } = useGameContext();

  const combatStartedAt = game?.combatState.combatStartedAt ?? null;
  const extraSeconds = game?.combatState.combatExtraSeconds ?? 0;

  const computeRemaining = () => {
    if (!combatStartedAt) return INITIAL_SECONDS;
    const elapsed = Math.floor((Date.now() - combatStartedAt) / 1000);
    return Math.max(0, INITIAL_SECONDS + extraSeconds - elapsed);
  };

  const [displaySeconds, setDisplaySeconds] = useState(computeRemaining);

  // Re-sincroniza cada 500ms usando los valores de Firebase
  useEffect(() => {
    const tick = () => setDisplaySeconds(computeRemaining());
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatStartedAt, extraSeconds]);

  if (!gameId) return null;

  const handleAdd = () => addCombatTime(gameId, 30);

  const handleRemove = () => {
    // Solo restar si queda al menos 30s para no ir a negativo
    if (computeRemaining() >= 30) {
      addCombatTime(gameId, -30);
    }
  };

  const expired = displaySeconds === 0;
  const minutes = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;

  return (
    <div
      className={clsx(
        'mx-4 mb-2 rounded-xl p-3 flex items-center justify-between',
        expired ? 'bg-yellow-400 text-yellow-900' : 'bg-white/15 text-white'
      )}
    >
      <div className="flex items-center gap-2">
        <Timer size={18} className={clsx(expired && 'animate-pulse')} />
        {expired ? (
          <span className="font-bold text-sm">TIEMPO AGOTADO</span>
        ) : (
          <span className="font-bold text-xl tabular-nums">
            {minutes}:{secs.toString().padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRemove}
          disabled={expired}
          className={clsx(
            'min-h-10 px-3 rounded-lg font-bold text-sm flex items-center gap-1',
            expired
              ? 'bg-yellow-900/20 text-yellow-900 active:bg-yellow-900/30 disabled:opacity-40'
              : 'bg-white/20 text-white active:bg-white/30 disabled:opacity-40'
          )}
        >
          <Minus size={16} /> 30s
        </button>
        <button
          type="button"
          onClick={handleAdd}
          className={clsx(
            'min-h-10 px-3 rounded-lg font-bold text-sm flex items-center gap-1',
            expired
              ? 'bg-yellow-900/20 text-yellow-900 active:bg-yellow-900/30'
              : 'bg-white/20 text-white active:bg-white/30'
          )}
        >
          <Plus size={16} /> 30s
        </button>
      </div>
    </div>
  );
}
