import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGame } from '../hooks/useGame';
import { useCombat } from '../hooks/useCombat';
import type { GameSession, PlayerProfile, GameHistoryEntry, HelperRequestStatus } from '../types/game';
import type { Jugador } from '../services/api';

interface GameContextValue {
  user: Jugador | null;
  uid: string | null;
  /** true solo con cuenta: habilita nivel, experiencia e historial. */
  identificado: boolean;
  /** Vuelve a leer el perfil (tras crear partida, terminar una, o entrar). */
  refrescarPerfil: () => Promise<void>;
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

  createGame: (hostName: string, maxLevel: number) => Promise<string>;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  updatePlayer: (gameId: string, updates: Partial<PlayerProfile>) => Promise<void>;
  updatePlayerGear: (gameId: string, slot: string, value: number) => Promise<void>;
  updatePlayerLevel: (gameId: string, level: number) => Promise<void>;
  toggleReady: (gameId: string, isReady: boolean) => Promise<void>;
  startGame: (gameId: string) => Promise<void>;
  nextTurn: (gameId: string) => Promise<void>;
  startCombat: (gameId: string) => Promise<void>;
  updateCombat: (gameId: string, updates: Partial<GameSession['combatState']>) => Promise<void>;
  endCombat: (gameId: string, won: boolean) => Promise<void>;
  dieInCombat: (gameId: string) => Promise<void>;
  sendHelperRequest: (gameId: string, toId: string) => Promise<void>;
  respondHelperRequest: (gameId: string, status: HelperRequestStatus) => Promise<void>;
  endGame: (gameId: string, winnerId: string) => Promise<void>;
  updateMaxLevel: (gameId: string, maxLevel: number) => Promise<void>;
  reorderTurns: (gameId: string, newOrder: string[]) => Promise<void>;
  subscribeToGame: (gameId: string) => void;
  kickPlayer: (gameId: string, playerId: string) => Promise<void>;
  getHistory: () => Promise<GameHistoryEntry[]>;
  loadGameFromHistory: (gameId: string) => void;
  addCombatTime: (gameId: string, delta: number) => Promise<void>;
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
    identificado: authState.identificado,
    refrescarPerfil: authState.refrescar,
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
    addCombatTime: gameState.addCombatTime,
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
