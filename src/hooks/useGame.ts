import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, off, set, update, get, push } from 'firebase/database';
import { db } from '../services/firebase';
import type { GameSession, PlayerProfile, GameHistoryEntry, HelperRequestStatus } from '../types/game';
import { generateGameId } from '../utils/munchkinMath';

interface UseGameReturn {
  game: GameSession | null;
  gameId: string | null;
  loading: boolean;
  error: string | null;
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

function newPlayerProfile(name: string): PlayerProfile {
  return {
    name,
    isReady: false,
    attributes: {
      level: 1,
      debuff: 0,
      sex: 'M',
      race: 'Humano',
      class: 'Ninguna',
    },
    gear: {
      head: 0,
      armor: 0,
      hands: 0,
      feet: 0,
      backpack: [],
    },
  };
}

export function useGame(): UseGameReturn {
  const [game, setGame] = useState<GameSession | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribeToGame = useCallback((id: string) => {
    setLoading(true);
    setGameId(id);
    const gameRef = ref(db, `games/${id}`);
    onValue(
      gameRef,
      (snapshot) => {
        const data = snapshot.val() as GameSession | null;
        setGame(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (gameId) {
        const gameRef = ref(db, `games/${gameId}`);
        off(gameRef);
      }
    };
  }, [gameId]);

  const createGame = useCallback(async (hostId: string, hostName: string, maxLevel: number): Promise<string> => {
    const id = generateGameId();
    const newGame: GameSession = {
      meta: {
        hostId,
        createdAt: Date.now(),
        status: 'LOBBY',
        maxLevel,
      },
      turnState: {
        activePlayerId: hostId,
        phase: 'EXPLORATION',
        turnNumber: 0,
        turnOrder: [hostId],
        turnIndex: 0,
      },
      combatState: {
        isActive: false,
        monsterLevel: 1,
        monsterModifiers: 0,
        playerModifiers: 0,
        helperId: null,
        helperRequest: null,
      },
      players: {
        [hostId]: newPlayerProfile(hostName),
      },
    };

    try {
      await set(ref(db, `games/${id}`), newGame);
      subscribeToGame(id);
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear partida';
      setError(msg);
      throw new Error(msg);
    }
  }, [subscribeToGame]);

  const joinGame = useCallback(async (id: string, playerId: string, playerName: string) => {
    try {
      const snapshot = await get(ref(db, `games/${id}`));
      if (!snapshot.exists()) {
        throw new Error('Partida no encontrada');
      }
      const gameData = snapshot.val() as GameSession;

      // Check if a player with this name already exists (reconnection)
      const existingEntry = Object.entries(gameData.players).find(
        ([, p]) => p.name === playerName
      );

      if (existingEntry) {
        // Reconnect: remap the existing player data to the new UID
        const [oldId, existingProfile] = existingEntry;
        if (oldId !== playerId) {
          // Move player data from old UID to new UID
          await set(ref(db, `games/${id}/players/${playerId}`), existingProfile);
          await set(ref(db, `games/${id}/players/${oldId}`), null);

          // Update references if the old ID was the host
          if (gameData.meta.hostId === oldId) {
            await set(ref(db, `games/${id}/meta/hostId`), playerId);
          }
          // Update active player reference if needed
          if (gameData.turnState.activePlayerId === oldId) {
            await set(ref(db, `games/${id}/turnState/activePlayerId`), playerId);
          }
          // Update helper reference if needed
          if (gameData.combatState.helperId === oldId) {
            await set(ref(db, `games/${id}/combatState/helperId`), playerId);
          }
          // Replace old UID in turnOrder
          const oldOrder: string[] = gameData.turnState.turnOrder ?? Object.keys(gameData.players);
          const newOrder = oldOrder.map((uid) => (uid === oldId ? playerId : uid));
          await set(ref(db, `games/${id}/turnState/turnOrder`), newOrder);
        }
        subscribeToGame(id);
        return;
      }

      // New player joining - allowed at any game state
      const currentOrder: string[] = gameData.turnState.turnOrder ?? Object.keys(gameData.players);
      await set(ref(db, `games/${id}/players/${playerId}`), newPlayerProfile(playerName));
      await set(ref(db, `games/${id}/turnState/turnOrder`), [...currentOrder, playerId]);
      subscribeToGame(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al unirse';
      setError(msg);
      throw new Error(msg);
    }
  }, [subscribeToGame]);

  const updatePlayer = useCallback(async (id: string, playerId: string, updates: Partial<PlayerProfile>) => {
    try {
      await update(ref(db, `games/${id}/players/${playerId}`), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  const updatePlayerGear = useCallback(async (id: string, playerId: string, slot: string, value: number) => {
    try {
      await set(ref(db, `games/${id}/players/${playerId}/gear/${slot}`), value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  const updatePlayerLevel = useCallback(async (id: string, playerId: string, level: number) => {
    try {
      await set(ref(db, `games/${id}/players/${playerId}/attributes/level`), level);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  const toggleReady = useCallback(async (id: string, playerId: string, isReady: boolean) => {
    try {
      await set(ref(db, `games/${id}/players/${playerId}/isReady`), isReady);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  const startGame = useCallback(async (id: string, firstPlayerId: string) => {
    try {
      await update(ref(db, `games/${id}`), {
        'meta/status': 'IN_GAME',
        'turnState/activePlayerId': firstPlayerId,
        'turnState/phase': 'EXPLORATION',
        'turnState/turnNumber': 1,
        'turnState/turnIndex': 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar partida');
    }
  }, []);

  const nextTurn = useCallback(async (id: string, nextPlayerId: string, turnNumber: number, nextTurnIndex: number) => {
    try {
      await update(ref(db, `games/${id}/turnState`), {
        activePlayerId: nextPlayerId,
        phase: 'EXPLORATION',
        turnNumber,
        turnIndex: nextTurnIndex,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al avanzar turno');
    }
  }, []);

  const startCombat = useCallback(async (id: string) => {
    try {
      await update(ref(db, `games/${id}`), {
        'turnState/phase': 'COMBAT',
        'combatState/isActive': true,
        'combatState/monsterLevel': 1,
        'combatState/monsterModifiers': 0,
        'combatState/playerModifiers': 0,
        'combatState/helperId': null,
        'combatState/helperRequest': null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar combate');
    }
  }, []);

  const updateCombat = useCallback(async (id: string, updates: Partial<GameSession['combatState']>) => {
    try {
      await update(ref(db, `games/${id}/combatState`), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, []);

  const sendHelperRequest = useCallback(async (id: string, fromId: string, toId: string) => {
    try {
      await set(ref(db, `games/${id}/combatState/helperRequest`), {
        fromId,
        toId,
        status: 'pending',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar invitación');
    }
  }, []);

  const respondHelperRequest = useCallback(async (id: string, status: HelperRequestStatus) => {
    try {
      if (status === 'accepted') {
        // Get the request to know who is the helper
        const reqSnap = await get(ref(db, `games/${id}/combatState/helperRequest`));
        const request = reqSnap.val() as { toId: string } | null;
        if (request) {
          await update(ref(db, `games/${id}/combatState`), {
            helperId: request.toId,
            helperRequest: null,
          });
        }
      } else {
        await set(ref(db, `games/${id}/combatState/helperRequest`), null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al responder invitación');
    }
  }, []);

  const endCombat = useCallback(async (id: string, won: boolean, activePlayerId: string) => {
    try {
      const updates: Record<string, unknown> = {
        'turnState/phase': 'EXPLORATION',
        'combatState/isActive': false,
        'combatState/monsterLevel': 1,
        'combatState/monsterModifiers': 0,
        'combatState/playerModifiers': 0,
        'combatState/helperId': null,
        'combatState/helperRequest': null,
      };

      if (won) {
        const snapshot = await get(ref(db, `games/${id}/players/${activePlayerId}/attributes/level`));
        const currentLevel = (snapshot.val() as number) || 1;
        const metaSnap = await get(ref(db, `games/${id}/meta/maxLevel`));
        const maxLevel = (metaSnap.val() as number) || 10;
        const newLevel = Math.min(maxLevel, currentLevel + 1);
        updates[`players/${activePlayerId}/attributes/level`] = newLevel;

        if (newLevel >= maxLevel) {
          updates['meta/winnerId'] = activePlayerId;
          updates['meta/status'] = 'ENDED';
          const gameSnap = await get(ref(db, `games/${id}`));
          const gameData = gameSnap.val() as GameSession;
          const historyEntry: GameHistoryEntry = {
            gameId: id,
            createdAt: gameData.meta.createdAt,
            endedAt: Date.now(),
            winnerId: activePlayerId,
            winnerName: gameData.players[activePlayerId]?.name,
            maxLevel,
            playerNames: Object.values(gameData.players).map((p) => p.name),
          };
          await push(ref(db, 'history'), historyEntry);
        }
      }

      await update(ref(db, `games/${id}`), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al finalizar combate');
    }
  }, []);

  const dieInCombat = useCallback(async (id: string, playerId: string) => {
    try {
      // Reset all gear to 0 but keep level, race, class
      const updates: Record<string, unknown> = {
        'turnState/phase': 'EXPLORATION',
        'combatState/isActive': false,
        'combatState/monsterLevel': 1,
        'combatState/monsterModifiers': 0,
        'combatState/playerModifiers': 0,
        'combatState/helperId': null,
        'combatState/helperRequest': null,
        [`players/${playerId}/gear/head`]: 0,
        [`players/${playerId}/gear/armor`]: 0,
        [`players/${playerId}/gear/hands`]: 0,
        [`players/${playerId}/gear/feet`]: 0,
        [`players/${playerId}/gear/backpack`]: [],
      };

      await update(ref(db, `games/${id}`), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al morir en combate');
    }
  }, []);

  const endGame = useCallback(async (id: string, winnerId: string) => {
    try {
      const gameSnap = await get(ref(db, `games/${id}`));
      const gameData = gameSnap.val() as GameSession;

      await update(ref(db, `games/${id}/meta`), {
        status: 'ENDED',
        winnerId,
      });

      const historyEntry: GameHistoryEntry = {
        gameId: id,
        createdAt: gameData.meta.createdAt,
        endedAt: Date.now(),
        winnerId,
        winnerName: gameData.players[winnerId]?.name,
        maxLevel: gameData.meta.maxLevel,
        playerNames: Object.values(gameData.players).map((p) => p.name),
      };
      await push(ref(db, 'history'), historyEntry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al finalizar partida');
    }
  }, []);

  const reorderTurns = useCallback(async (id: string, newOrder: string[], activePlayerId: string) => {
    try {
      const newTurnIndex = Math.max(0, newOrder.indexOf(activePlayerId));
      await update(ref(db, `games/${id}/turnState`), {
        turnOrder: newOrder,
        turnIndex: newTurnIndex,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reordenar turnos');
    }
  }, []);

  const updateMaxLevel = useCallback(async (id: string, maxLevel: number) => {
    try {
      await set(ref(db, `games/${id}/meta/maxLevel`), maxLevel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar nivel máximo');
    }
  }, []);

  const kickPlayer = useCallback(async (id: string, playerId: string) => {
    try {
      const orderSnap = await get(ref(db, `games/${id}/turnState/turnOrder`));
      const updates: Record<string, unknown> = { [`players/${playerId}`]: null };
      if (orderSnap.exists()) {
        const currentOrder = orderSnap.val() as string[];
        updates['turnState/turnOrder'] = currentOrder.filter((uid) => uid !== playerId);
      }
      await update(ref(db, `games/${id}`), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al expulsar jugador');
    }
  }, []);

  const getHistory = useCallback(async (): Promise<GameHistoryEntry[]> => {
    try {
      const snapshot = await get(ref(db, 'history'));
      if (!snapshot.exists()) return [];
      const data = snapshot.val() as Record<string, GameHistoryEntry>;
      return Object.values(data).sort((a, b) => b.endedAt - a.endedAt);
    } catch {
      return [];
    }
  }, []);

  const loadGameFromHistory = useCallback((historicGameId: string) => {
    subscribeToGame(historicGameId);
  }, [subscribeToGame]);

  return {
    game,
    gameId,
    loading,
    error,
    createGame,
    joinGame,
    updatePlayer,
    updatePlayerGear,
    updatePlayerLevel,
    toggleReady,
    startGame,
    nextTurn,
    startCombat,
    updateCombat,
    endCombat,
    dieInCombat,
    sendHelperRequest,
    respondHelperRequest,
    endGame,
    updateMaxLevel,
    reorderTurns,
    subscribeToGame,
    kickPlayer,
    getHistory,
    loadGameFromHistory,
  };
}
