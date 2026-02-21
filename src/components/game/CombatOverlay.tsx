import { X, Swords, Trophy, Footprints, Skull, HandHelping, Clock, Check, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { StatTracker } from './StatTracker';
import { PlayerAvatar } from './PlayerAvatar';
import { CombatTimer } from './CombatTimer';
import { useGameContext } from '../../context/GameContext';
import { getCombatStrength } from '../../utils/munchkinMath';

export function CombatOverlay() {
  const {
    game,
    gameId,
    uid,
    isMyTurn,
    combat,
    updateCombat,
    endCombat,
    dieInCombat,
    sendHelperRequest,
    respondHelperRequest,
  } = useGameContext();

  if (!game || !gameId || !combat.isActive || !uid) return null;

  const activePlayer = game.players[game.turnState.activePlayerId];
  const helper = game.combatState.helperId ? game.players[game.combatState.helperId] : null;
  const helperRequest = game.combatState.helperRequest;
  const isRequestedHelper = helperRequest?.toId === uid && helperRequest?.status === 'pending';
  const hasPendingRequest = helperRequest?.status === 'pending';

  const otherPlayers = Object.entries(game.players).filter(
    ([id]) => id !== game.turnState.activePlayerId && id !== game.combatState.helperId
  );

  return (
    <div className="fixed inset-0 z-50 bg-red-900/90 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Swords size={24} /> COMBATE
        </h2>
        {isMyTurn && (
          <button
            type="button"
            onClick={() => endCombat(gameId, false, game.turnState.activePlayerId)}
            className="min-h-12 min-w-12 flex items-center justify-center rounded-full bg-white/20"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Combat timer — sincronizado via Firebase */}
      <CombatTimer />

      {/* Notification for helper request */}
      {isRequestedHelper && (
        <div className="mx-4 mb-2 bg-yellow-400 text-yellow-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <HandHelping size={20} />
            <span>{activePlayer?.name} te pide ayuda en combate</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => respondHelperRequest(gameId, 'accepted')}
              className="flex-1 min-h-12 rounded-lg bg-green-600 text-white font-bold flex items-center justify-center gap-2 active:bg-green-700"
            >
              <Check size={18} /> Aceptar
            </button>
            <button
              type="button"
              onClick={() => respondHelperRequest(gameId, 'declined')}
              className="flex-1 min-h-12 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center gap-2 active:bg-red-700"
            >
              <XCircle size={18} /> Rechazar
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4">
        {/* Comparación de fuerza */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-white/70 text-sm">Munchkins</p>
            <p className={clsx('text-4xl font-bold', combat.isWinning ? 'text-green-400' : 'text-white')}>
              {combat.munchkinStrength}
            </p>
            <p className="text-white/50 text-xs mt-1">
              {activePlayer?.name}{helper ? ` + ${helper.name}` : ''}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-white/70 text-sm">Monstruo</p>
            <p className={clsx('text-4xl font-bold', !combat.isWinning ? 'text-red-400' : 'text-white')}>
              {combat.monsterStrength}
            </p>
          </div>
        </div>

        {/* Nivel del monstruo */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <StatTracker
            label="Monstruo"
            value={game.combatState.monsterLevel}
            min={1}
            disabled={!isMyTurn}
            onChange={(v) => updateCombat(gameId, { monsterLevel: v })}
          />
          <StatTracker
            label="Mod. Monst."
            value={game.combatState.monsterModifiers}
            min={-99}
            onChange={(v) => updateCombat(gameId, { monsterModifiers: v })}
          />
          <StatTracker
            label="Mod. Jugad."
            value={game.combatState.playerModifiers}
            min={-99}
            onChange={(v) => updateCombat(gameId, { playerModifiers: v })}
          />
        </div>

        {/* Helper invitation system */}
        {isMyTurn && !game.combatState.helperId && !hasPendingRequest && otherPlayers.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Invitar ayudante:</p>
            <div className="space-y-2">
              {otherPlayers.map(([id, player]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => sendHelperRequest(gameId, uid, id)}
                  className="w-full min-h-12 px-4 rounded-lg border border-gray-200 text-left flex items-center gap-2 active:bg-gray-50"
                >
                  <PlayerAvatar race={player.attributes.race} playerClass={player.attributes.class} sex={player.attributes.sex} playerName={player.name} size="sm" />
                  <span className="font-medium">{player.name}</span>
                  <span className="text-sm text-gray-500 ml-auto">Fuerza: {getCombatStrength(player)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pending request indicator (for the active player) */}
        {isMyTurn && hasPendingRequest && !helper && (
          <div className="bg-white rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock size={18} className="animate-pulse" />
              <span className="text-sm font-medium">
                Esperando respuesta de <strong>{game.players[helperRequest.toId]?.name}</strong>...
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateCombat(gameId, { helperRequest: null })}
              className="text-red-500 text-sm min-h-8 px-2"
            >
              Cancelar
            </button>
          </div>
        )}

        {helper && (
          <div className="bg-white rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm flex items-center gap-2">
              <HandHelping size={16} className="text-green-600" />
              Ayudante: <strong>{helper.name}</strong> (Fuerza: {getCombatStrength(helper)})
            </span>
            {isMyTurn && (
              <button
                type="button"
                onClick={() => updateCombat(gameId, { helperId: null })}
                className="text-red-500 text-sm min-h-8 px-2"
              >
                Quitar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isMyTurn && (
        <div className="p-4 space-y-2">
          <button
            type="button"
            disabled={!combat.isWinning}
            onClick={() => endCombat(gameId, true, game.turnState.activePlayerId)}
            className={clsx(
              'w-full min-h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors',
              combat.isWinning
                ? 'bg-green-500 text-white active:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            <Trophy size={20} /> GANAR COMBATE
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => endCombat(gameId, false, game.turnState.activePlayerId)}
              className="flex-1 min-h-14 rounded-xl font-bold text-lg bg-white/20 text-white flex items-center justify-center gap-2 active:bg-white/30"
            >
              <Footprints size={20} /> HUIR
            </button>
            <button
              type="button"
              onClick={() => dieInCombat(gameId, game.turnState.activePlayerId)}
              className="flex-1 min-h-14 rounded-xl font-bold text-lg bg-black/40 text-white flex items-center justify-center gap-2 active:bg-black/60 border border-white/20"
            >
              <Skull size={20} /> MORIR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
