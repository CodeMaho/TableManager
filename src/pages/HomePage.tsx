import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Plus, LogIn, History, Trophy, ChevronRight } from 'lucide-react';
import { useGameContext } from '../context/GameContext';
import type { GameHistoryEntry } from '../types/game';

export function HomePage() {
  const { uid, authLoading, createGame, joinGame, getHistory, loadGameFromHistory } = useGameContext();
  const navigate = useNavigate();

  const [playerName, setPlayerName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [maxLevel, setMaxLevel] = useState(10);
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'history'>('menu');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);

  useEffect(() => {
    if (mode === 'history') {
      getHistory().then(setHistory);
    }
  }, [mode, getHistory]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 text-lg">Conectando...</div>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!uid || !playerName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const id = await createGame(uid, playerName.trim(), maxLevel);
      navigate(`/lobby/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear partida');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!uid || !playerName.trim() || !joinId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const normalizedId = joinId.trim().toUpperCase();
      await joinGame(normalizedId, uid, playerName.trim());
      // Navigate to game if already started, otherwise to lobby
      navigate(`/lobby/${normalizedId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (entry: GameHistoryEntry) => {
    loadGameFromHistory(entry.gameId);
    navigate(`/game/${entry.gameId}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-orange-50/80 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <Swords size={64} className="mx-auto text-amber-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900">Munchkin Tolete</h1>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {mode === 'menu' && (
          <>
            <button
              type="button"
              onClick={() => setMode('create')}
              className="w-full min-h-14 rounded-xl bg-amber-500 text-white font-bold text-lg flex items-center justify-center gap-2 active:bg-amber-600 transition-colors"
            >
              <Plus size={20} /> Crear Partida
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className="w-full min-h-14 rounded-xl bg-white border-2 border-amber-500 text-amber-600 font-bold text-lg flex items-center justify-center gap-2 active:bg-amber-50 transition-colors"
            >
              <LogIn size={20} /> Unirse a Partida
            </button>
            <button
              type="button"
              onClick={() => setMode('history')}
              className="w-full min-h-14 rounded-xl bg-white border border-gray-300 text-gray-600 font-bold text-lg flex items-center justify-center gap-2 active:bg-gray-50 transition-colors"
            >
              <History size={20} /> Historial
            </button>
          </>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {mode === 'create' ? 'Crear Nueva Partida' : 'Unirse a Partida'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Introduce tu nombre"
                maxLength={20}
                className="w-full min-h-12 px-4 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de Partida</label>
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                  placeholder="MUNCH-XXXX"
                  maxLength={10}
                  className="w-full min-h-12 px-4 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono tracking-wider"
                />
              </div>
            )}

            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel máximo de victoria: <strong>{maxLevel}</strong>
                </label>
                <input
                  type="range"
                  min={2}
                  max={30}
                  value={maxLevel}
                  onChange={(e) => setMaxLevel(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>2</span>
                  <span>30</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode('menu'); setError(null); }}
                className="min-h-12 px-4 rounded-lg border border-gray-300 text-gray-600 font-medium active:bg-gray-50"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={loading || !playerName.trim() || (mode === 'join' && !joinId.trim())}
                onClick={mode === 'create' ? handleCreate : handleJoin}
                className="flex-1 min-h-12 rounded-lg bg-amber-500 text-white font-bold active:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Cargando...' : mode === 'create' ? 'Crear' : 'Unirse'}
              </button>
            </div>
          </div>
        )}

        {mode === 'history' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Historial de Partidas</h2>

            {history.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No hay partidas en el historial</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.map((entry) => (
                  <button
                    key={entry.gameId}
                    type="button"
                    onClick={() => handleViewHistory(entry)}
                    className="w-full text-left rounded-xl border border-gray-200 p-3 active:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-sm font-bold text-gray-900">{entry.gameId}</p>
                      <p className="text-xs text-gray-500">{formatDate(entry.endedAt)}</p>
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <Trophy size={12} />
                        <span>{entry.winnerName || 'Sin ganador'}</span>
                        <span className="text-gray-400">- Nv.{entry.maxLevel}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.playerNames.join(', ')}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMode('menu')}
              className="w-full min-h-12 rounded-lg border border-gray-300 text-gray-600 font-medium active:bg-gray-50"
            >
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
