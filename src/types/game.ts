export type GameStatus = 'LOBBY' | 'IN_GAME' | 'ENDED';
export type TurnPhase = 'EXPLORATION' | 'COMBAT';
export type HelperRequestStatus = 'pending' | 'accepted' | 'declined';

export interface GameSession {
  meta: {
    hostId: string;
    createdAt: number;
    status: GameStatus;
    winnerId?: string;
    maxLevel: number;
  };
  turnState: {
    activePlayerId: string;
    phase: TurnPhase;
    turnNumber: number;
    turnOrder?: string[]; // UIDs en orden de turno
    turnIndex?: number;   // Índice actual en turnOrder (para evitar duplicados al reordenar)
  };
  combatState: {
    isActive: boolean;
    monsterLevel: number;
    monsterModifiers: number;
    playerModifiers: number;
    helperId: string | null;
    combatStartedAt?: number;    // Unix ms cuando empezó el combate
    combatExtraSeconds?: number; // Segundos añadidos/quitados por los jugadores
    helperRequest?: {
      fromId: string;
      toId: string;
      status: HelperRequestStatus;
    } | null;
  };
  players: Record<string, PlayerProfile>;
}

export interface PlayerProfile {
  name: string;
  isReady: boolean;
  attributes: {
    level: number;
    debuff: number;
    sex: 'M' | 'F';
    race: string;
    class: string;
  };
  gear: {
    head: number;
    armor: number;
    hands: number;
    feet: number;
    mount: number;
    backpack: string[];
  };
}

export interface GameHistoryEntry {
  gameId: string;
  createdAt: number;
  endedAt: number;
  winnerId?: string;
  winnerName?: string;
  maxLevel: number;
  playerNames: string[];
}
