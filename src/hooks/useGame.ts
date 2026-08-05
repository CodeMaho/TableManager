import { useState, useEffect, useCallback, useRef } from 'react';
import { accion, cargarEstado, cargarHistorial, type EstadoPartida } from '../services/api';
import type { GameSession, PlayerProfile, GameHistoryEntry, HelperRequestStatus } from '../types/game';

// Sustituye a Firebase Realtime Database por la API PHP + MySQL.
//
// Diferencia de fondo: antes `onValue` empujaba los cambios; ahora se SONDEA.
// Para que no se note más de lo imprescindible:
//   - cada escritura devuelve ya el estado nuevo, así que quien actúa lo ve al
//     instante y no espera al siguiente sondeo;
//   - el sondeo manda el `rev` que tiene, y mientras nadie escriba la respuesta
//     es un objeto diminuto que ni siquiera reconstruye el estado.
// El resto de la mesa ve los cambios en INTERVALO_MS como mucho.
//
// Las firmas han perdido los parámetros que identificaban al jugador
// (`playerId`, `fromId`, `activePlayerId`…) y los que el servidor recalcula
// (`turnNumber`, `nextTurnIndex`): el servidor usa SIEMPRE el usuario de la
// sesión y el orden de turno guardado. Es lo que impide suplantar a otro, y
// dejarlos en la firma habría hecho creer que sirven para algo.

const INTERVALO_MS = 1000;

interface UseGameReturn {
  game: GameSession | null;
  gameId: string | null;
  loading: boolean;
  error: string | null;
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

export function useGame(): UseGameReturn {
  const [game, setGame] = useState<GameSession | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `rev` en una ref y no en el estado: cambia en cada sondeo y no debe
  // provocar re-render ni reiniciar el efecto que sondea.
  const revRef = useRef<number>(0);

  const aplicar = useCallback((estado: EstadoPartida) => {
    revRef.current = estado.rev;
    setGame(estado);
    setError(null);
  }, []);

  const subscribeToGame = useCallback((id: string) => {
    setLoading(true);
    revRef.current = 0;
    setGameId(id);
  }, []);

  // Sondeo mientras haya partida seleccionada.
  useEffect(() => {
    if (!gameId) return;

    let vivo = true;
    let temporizador: number | undefined;

    const tick = async () => {
      try {
        const estado = await cargarEstado(gameId, revRef.current || undefined);
        if (!vivo) return;
        if (estado) aplicar(estado);
        setLoading(false);
      } catch (err) {
        if (!vivo) return;
        setError(err instanceof Error ? err.message : 'Error de conexión');
        setLoading(false);
      } finally {
        if (vivo) temporizador = window.setTimeout(tick, INTERVALO_MS);
      }
    };

    tick();
    return () => {
      vivo = false;
      if (temporizador !== undefined) window.clearTimeout(temporizador);
    };
  }, [gameId, aplicar]);

  /** Ejecuta una acción y refleja al momento el estado que devuelve. */
  const ejecutar = useCallback(async (
    nombre: string,
    datos: Record<string, unknown>,
    mensajeError: string,
  ): Promise<void> => {
    try {
      aplicar(await accion(nombre, datos));
    } catch (err) {
      setError(err instanceof Error ? err.message : mensajeError);
    }
  }, [aplicar]);

  const createGame = useCallback(async (hostName: string, maxLevel: number): Promise<string> => {
    try {
      const estado = await accion('crear', { nombre: hostName, maxLevel });
      revRef.current = estado.rev;
      setGame(estado);
      setGameId(estado.gameId);
      setError(null);
      return estado.gameId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear partida';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const joinGame = useCallback(async (id: string, playerName: string) => {
    try {
      const estado = await accion('unirse', { id, nombre: playerName });
      revRef.current = estado.rev;
      setGame(estado);
      setGameId(estado.gameId);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al unirse';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const updatePlayer = useCallback(
    (id: string, updates: Partial<PlayerProfile>) =>
      ejecutar('jugador', { id, ...updates }, 'Error al actualizar'),
    [ejecutar],
  );

  const updatePlayerGear = useCallback(
    (id: string, slot: string, value: number) =>
      ejecutar('gear', { id, slot, valor: value }, 'Error al actualizar'),
    [ejecutar],
  );

  const updatePlayerLevel = useCallback(
    (id: string, level: number) =>
      ejecutar('nivel', { id, nivel: level }, 'Error al actualizar'),
    [ejecutar],
  );

  const toggleReady = useCallback(
    (id: string, isReady: boolean) =>
      ejecutar('listo', { id, listo: isReady }, 'Error al actualizar'),
    [ejecutar],
  );

  const startGame = useCallback(
    (id: string) =>
      ejecutar('empezar', { id }, 'Error al iniciar partida'),
    [ejecutar],
  );

  // El servidor calcula a quién le toca a partir del orden guardado, así que
  // ignora el jugador y el número de turno que se le pasen.
  const nextTurn = useCallback(
    (id: string) =>
      ejecutar('siguienteTurno', { id }, 'Error al avanzar turno'),
    [ejecutar],
  );

  const startCombat = useCallback(
    (id: string) => ejecutar('empezarCombate', { id }, 'Error al iniciar combate'),
    [ejecutar],
  );

  const updateCombat = useCallback(
    (id: string, updates: Partial<GameSession['combatState']>) =>
      ejecutar('combate', { id, ...updates }, 'Error al actualizar'),
    [ejecutar],
  );

  const endCombat = useCallback(
    (id: string, won: boolean) =>
      ejecutar('terminarCombate', { id, gano: won }, 'Error al finalizar combate'),
    [ejecutar],
  );

  const dieInCombat = useCallback(
    (id: string) => ejecutar('morir', { id }, 'Error al morir en combate'),
    [ejecutar],
  );

  const sendHelperRequest = useCallback(
    (id: string, toId: string) =>
      ejecutar('pedirAyuda', { id, aId: toId }, 'Error al enviar invitación'),
    [ejecutar],
  );

  const respondHelperRequest = useCallback(
    (id: string, status: HelperRequestStatus) =>
      ejecutar('responderAyuda', { id, estado: status }, 'Error al responder invitación'),
    [ejecutar],
  );

  const endGame = useCallback(
    (id: string, winnerId: string) =>
      ejecutar('terminar', { id, ganadorId: winnerId }, 'Error al finalizar partida'),
    [ejecutar],
  );

  const updateMaxLevel = useCallback(
    (id: string, maxLevel: number) =>
      ejecutar('maxLevel', { id, maxLevel }, 'Error al actualizar nivel máximo'),
    [ejecutar],
  );

  const reorderTurns = useCallback(
    (id: string, newOrder: string[]) =>
      ejecutar('reordenar', { id, orden: newOrder }, 'Error al reordenar turnos'),
    [ejecutar],
  );

  const kickPlayer = useCallback(
    (id: string, playerId: string) =>
      ejecutar('expulsar', { id, jugadorId: playerId }, 'Error al expulsar jugador'),
    [ejecutar],
  );

  const addCombatTime = useCallback(
    (id: string, delta: number) => ejecutar('tiempoCombate', { id, delta }, 'Error al ajustar tiempo'),
    [ejecutar],
  );

  const getHistory = useCallback(async (): Promise<GameHistoryEntry[]> => {
    try {
      return await cargarHistorial();
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
    addCombatTime,
  };
}
