import { useMemo } from 'react';
import type { GameSession } from '../types/game';
import { getMunchkinSide, getMonsterSide } from '../utils/munchkinMath';

interface CombatInfo {
  isActive: boolean;
  munchkinStrength: number;
  monsterStrength: number;
  isWinning: boolean;
  difference: number;
}

export function useCombat(game: GameSession | null): CombatInfo {
  return useMemo(() => {
    if (!game || !game.combatState.isActive) {
      return {
        isActive: false,
        munchkinStrength: 0,
        monsterStrength: 0,
        isWinning: false,
        difference: 0,
      };
    }

    const munchkinStrength = getMunchkinSide(game);
    const monsterStrength = getMonsterSide(game);

    return {
      isActive: true,
      munchkinStrength,
      monsterStrength,
      isWinning: munchkinStrength > monsterStrength,
      difference: munchkinStrength - monsterStrength,
    };
  }, [game]);
}
