import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useGameContext } from '../context/GameContext';
import { GameLayout } from '../components/layout/GameLayout';
import { LobbyList } from '../components/lobby/LobbyList';

export function LobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    game,
    gameId,
    uid,
    isHost,
    myProfile,
    gameLoading,
    subscribeToGame,
    toggleReady,
    startGame,
    reorderTurns,
  } = useGameContext();

  useEffect(() => {
    if (id && !gameId) {
      subscribeToGame(id);
    }
  }, [id, gameId, subscribeToGame]);

  useEffect(() => {
    if ((game?.meta.status === 'IN_GAME' || game?.meta.status === 'ENDED') && id) {
      navigate(`/game/${id}`, { replace: true });
    }
  }, [game?.meta.status, id, navigate]);

  if (gameLoading || !game || !uid || !id) {
    return (
      <GameLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Cargando sala...</div>
        </div>
      </GameLayout>
    );
  }

  if (!game.players[uid]) {
    navigate('/', { replace: true });
    return null;
  }

  const players = game.players;
  const playerIds = Object.keys(players);
  const turnOrder = game.turnState.turnOrder?.length
    ? game.turnState.turnOrder
    : playerIds;
  const allReady = playerIds.every((pid) => players[pid].isReady);
  const canStart = isHost && allReady && playerIds.length >= 2;

  return (
    <GameLayout>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Esperando jugadores...</h2>
          <p className="text-sm text-gray-500 mt-1">Comparte el ID de partida para invitar amigos</p>
          <p className="text-xs text-amber-600 mt-1">Nivel de victoria: {game.meta.maxLevel}</p>
        </div>

        <LobbyList
          players={players}
          hostId={game.meta.hostId}
          turnOrder={turnOrder}
          isHost={isHost}
          onMovePlayer={isHost ? (pid, direction) => {
            const order = [...turnOrder];
            const idx = order.indexOf(pid);
            const newIdx = idx + direction;
            if (newIdx < 0 || newIdx >= order.length) return;
            [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
            reorderTurns(id, order, game.turnState.activePlayerId);
          } : undefined}
        />
      </div>

      <div className="sticky bottom-0 p-4 bg-white border-t space-y-2">
        <button
          type="button"
          onClick={() => toggleReady(id, uid, !myProfile?.isReady)}
          className={`w-full min-h-14 rounded-xl font-bold text-lg transition-colors ${
            myProfile?.isReady
              ? 'bg-gray-200 text-gray-600 active:bg-gray-300'
              : 'bg-green-500 text-white active:bg-green-600'
          }`}
        >
          {myProfile?.isReady ? 'No Listo' : '¡Listo!'}
        </button>

        {isHost && (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => startGame(id, turnOrder[0])}
            className="w-full min-h-14 rounded-xl bg-amber-500 text-white font-bold text-lg flex items-center justify-center gap-2 active:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={20} /> Iniciar Partida
          </button>
        )}
      </div>
    </GameLayout>
  );
}
