import type { PlayerProfile, GameSession } from '../types/game';

export function getCombatStrength(player: PlayerProfile): number {
  const { level, debuff } = player.attributes;
  const { head, armor, hands, feet } = player.gear;
  return level + head + armor + hands + feet - (debuff || 0);
}

export function getMunchkinSide(game: GameSession): number {
  const activePlayer = game.players[game.turnState.activePlayerId];
  if (!activePlayer) return 0;

  let total = getCombatStrength(activePlayer);

  const helperId = game.combatState.helperId;
  if (helperId && game.players[helperId]) {
    total += getCombatStrength(game.players[helperId]);
  }

  total += game.combatState.playerModifiers;
  return total;
}

export function getMonsterSide(game: GameSession): number {
  return game.combatState.monsterLevel + game.combatState.monsterModifiers;
}

export function canSellForLevel(currentLevel: number): boolean {
  return currentLevel < 9;
}

export function clampLevel(level: number, maxLevel: number = 10): number {
  return Math.max(1, Math.min(maxLevel, level));
}

export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MUNCH-${id}`;
}
