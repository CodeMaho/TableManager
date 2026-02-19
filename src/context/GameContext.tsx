import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGame } from '../hooks/useGame';
import { useCombat } from '../hooks/useCombat';
import type { GameSession, PlayerProfile, GameHistoryEntry, HelperRequestStatus } from '../types/game';
import type { User } from 'firebase/auth';

interface GameContextValue {
  user: User | null;
  uid: string | null;
  authLoading: boolean;
  authError: string | null;

  game: GameSession | null;
  gameId: string | null;
  gameLoading: boolean;
  gameError: string | null;

  isHost: boolean;
  isMyTurn: boolean;
  myProfile: PlayerProfile | null;
  combat: ReturnType<typeof useCombat>;

  createGame: (hostId: string, hostName: string, maxLevel: number) => Promise<string>;
  joinGame: (gameId: string, playerId: string, playerName: string) => Promise<void>;
  updatePlayer: (gameId: string, playerId: string, updates: Partial<PlayerProfile>) => Promise<void>;
  updatePlayerGear: (gameId: string, playerId: string, slot: string, value: number) => Promise<void>;
  updatePlayerLevel: (gameId: string, playerId: string, level: number) => Promise<void>;
  toggleReady: (gameId: string, playerId: string, isReady: boolean) => Promise<void>;
  startGame: (gameId: string, firstPlayerId: string) => Promise<void>;
  nextTurn: (gameId: string, nextPlayerId: string, turnNumber: number, nextTurnIndex: number) => Promise<void>;
  startCombat: (gameId: string) => Promise<void>;
  updateCombat: (gameId: string, updates: Partial<GameSession['combatState']>) => Promise<void>;
  endCombat: (gameId: string, won: boolean, activePlayerId: string) => Promise<void>;
  dieInCombat: (gameId: string, playerId: string) => Promise<void>;
  sendHelperRequest: (gameId: string, fromId: string, toId: string) => Promise<void>;
  respondHelperRequest: (gameId: string, status: HelperRequestStatus) => Promise<void>;
  endGame: (gameId: string, winnerId: string) => Promise<void>;
  updateMaxLevel: (gameId: string, maxLevel: number) => Promise<void>;
  reorderTurns: (gameId: string, newOrder: string[], activePlayerId: string) => Promise<void>;
  subscribeToGame: (gameId: string) => void;
  kickPlayer: (gameId: string, playerId: string) => Promise<void>;
  getHistory: () => Promise<GameHistoryEntry[]>;
  loadGameFromHistory: (gameId: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const authState = useAuth();
  const gameState = useGame();
  const combat = useCombat(gameState.game);

  const isHost = !!(authState.uid && gameState.game?.meta.hostId === authState.uid);
  const isMyTurn = !!(authState.uid && gameState.game?.turnState.activePlayerId === authState.uid);
  const myProfile = authState.uid && gameState.game?.players[authState.uid]
    ? gameState.game.players[authState.uid]
    : null;

  const value: GameContextValue = {
    user: authState.user,
    uid: authState.uid,
    authLoading: authState.loading,
    authError: authState.error,

    game: gameState.game,
    gameId: gameState.gameId,
    gameLoading: gameState.loading,
    gameError: gameState.error,

    isHost,
    isMyTurn,
    myProfile,
    combat,

    createGame: gameState.createGame,
    joinGame: gameState.joinGame,
    updatePlayer: gameState.updatePlayer,
    updatePlayerGear: gameState.updatePlayerGear,
    updatePlayerLevel: gameState.updatePlayerLevel,
    toggleReady: gameState.toggleReady,
    startGame: gameState.startGame,
    nextTurn: gameState.nextTurn,
    startCombat: gameState.startCombat,
    updateCombat: gameState.updateCombat,
    endCombat: gameState.endCombat,
    dieInCombat: gameState.dieInCombat,
    sendHelperRequest: gameState.sendHelperRequest,
    respondHelperRequest: gameState.respondHelperRequest,
    endGame: gameState.endGame,
    updateMaxLevel: gameState.updateMaxLevel,
    reorderTurns: gameState.reorderTurns,
    subscribeToGame: gameState.subscribeToGame,
    kickPlayer: gameState.kickPlayer,
    getHistory: gameState.getHistory,
    loadGameFromHistory: gameState.loadGameFromHistory,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return ctx;
}
