import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HardHat, Shield, Hand, Footprints, Swords, SkipForward, ArrowDownUp, Backpack, Trophy, Home, Rabbit } from 'lucide-react';
import clsx from 'clsx';
import { useGameContext } from '../context/GameContext';
import { GameLayout } from '../components/layout/GameLayout';
import { GearSlot } from '../components/game/GearSlot';
import { StatTracker } from '../components/game/StatTracker';
import { getCombatStrength, clampLevel } from '../utils/munchkinMath';
import { PlayerAvatar } from '../components/game/PlayerAvatar';

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    game,
    gameId,
    uid,
    isMyTurn,
    myProfile,
    gameLoading,
    subscribeToGame,
    updatePlayerGear,
    updatePlayerLevel,
    updatePlayer,
    startCombat,
    nextTurn,
  } = useGameContext();

  const [raceInput, setRaceInput] = useState('');
  const [classInput, setClassInput] = useState('');

  useEffect(() => {
    if (id && !gameId) {
      subscribeToGame(id);
    }
  }, [id, gameId, subscribeToGame]);

  useEffect(() => {
    if (myProfile) {
      setRaceInput(myProfile.attributes.race);
      setClassInput(myProfile.attributes.class);
    }
  }, [myProfile?.attributes.race, myProfile?.attributes.class]);

  const playerIds = useMemo(() => {
    if (!game) return [];
    return game.turnState.turnOrder?.length
      ? game.turnState.turnOrder
      : Object.keys(game.players);
  }, [game]);

  if (gameLoading || !game || !uid || !id || !myProfile) {
    return (
      <GameLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Cargando partida...</div>
        </div>
      </GameLayout>
    );
  }

  const maxLevel = game.meta.maxLevel || 10;
  const strength = getCombatStrength(myProfile);
  const canEditGear = game.meta.status === 'IN_GAME';
  const isEnded = game.meta.status === 'ENDED';
  const winner = game.meta.winnerId ? game.players[game.meta.winnerId] : null;

  const handleEndTurn = () => {
    // Usar turnIndex almacenado en Firebase para evitar duplicados al reordenar.
    // Fallback a indexOf() solo para partidas antiguas sin turnIndex.
    const currentIndex = game.turnState.turnIndex ?? playerIds.indexOf(game.turnState.activePlayerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    nextTurn(id, playerIds[nextIndex], game.turnState.turnNumber + 1, nextIndex);
  };

  const handleLevelChange = (newLevel: number) => {
    const clamped = clampLevel(newLevel, maxLevel);
    updatePlayerLevel(id, uid, clamped);
  };

  const handleRaceBlur = () => {
    if (raceInput !== myProfile.attributes.race) {
      updatePlayer(id, uid, {
        attributes: { ...myProfile.attributes, race: raceInput },
      });
    }
  };

  const handleClassBlur = () => {
    if (classInput !== myProfile.attributes.class) {
      updatePlayer(id, uid, {
        attributes: { ...myProfile.attributes, class: classInput },
      });
    }
  };

  const handleSexToggle = () => {
    updatePlayer(id, uid, {
      attributes: { ...myProfile.attributes, sex: myProfile.attributes.sex === 'M' ? 'F' : 'M' },
    });
  };

  return (
    <GameLayout>
      <div className={clsx(
        'flex-1 flex flex-col overflow-hidden transition-colors',
        isEnded ? 'bg-amber-50/70' : isMyTurn ? 'bg-green-50/70' : 'bg-gray-50/70'
      )}>
        {/* Banners fijos (no desplazables) */}
        {isEnded && winner && (
          <div className="mx-4 mt-4 bg-amber-500 text-white text-center py-4 rounded-xl space-y-2 shrink-0">
            <Trophy size={32} className="mx-auto" />
            <p className="text-xl font-bold">¡{winner.name} ha ganado!</p>
            <p className="text-sm opacity-80">Ha alcanzado el nivel {maxLevel}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-2 min-h-10 px-4 rounded-lg bg-white text-amber-600 font-bold text-sm flex items-center justify-center gap-2 mx-auto active:bg-amber-50"
            >
              <Home size={16} /> Volver al inicio
            </button>
          </div>
        )}

        {!isEnded && (
          <div className={clsx(
            'mx-4 mt-4 text-center py-2 rounded-xl font-bold text-sm shrink-0',
            isMyTurn ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
          )}>
            {isMyTurn ? 'TU TURNO' : `Turno de ${game.players[game.turnState.activePlayerId]?.name}`}
          </div>
        )}

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Sección de estadísticas */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PlayerAvatar race={myProfile.attributes.race} playerClass={myProfile.attributes.class} sex={myProfile.attributes.sex} playerName={myProfile.name} size="lg" />
                <h3 className="font-bold text-gray-900 text-lg">{myProfile.name}</h3>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <Swords size={18} />
                <span className="text-xl font-bold">{strength}</span>
              </div>
            </div>

            <StatTracker
              label="Nivel"
              value={myProfile.attributes.level}
              min={1}
              max={maxLevel}
              onChange={handleLevelChange}
            />
            <StatTracker
              label="Debuff"
              value={myProfile.attributes.debuff || 0}
              min={0}
              onChange={(v) => updatePlayer(id, uid, { attributes: { ...myProfile.attributes, debuff: v } })}
            />

            {/* Sexo / Raza / Clase */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSexToggle}
                className="min-h-10 px-3 rounded-lg border border-gray-200 text-sm font-medium active:bg-gray-50"
              >
                <ArrowDownUp size={14} className="inline mr-1" />
                {myProfile.attributes.sex === 'M' ? 'Hombre' : 'Mujer'}
              </button>

              <div className="flex-1 min-w-24">
                <label className="block text-xs text-gray-500 mb-0.5">Raza</label>
                <input
                  type="text"
                  value={raceInput}
                  onChange={(e) => setRaceInput(e.target.value.slice(0, 10))}
                  onBlur={handleRaceBlur}
                  placeholder="Raza"
                  maxLength={10}
                  className="w-full min-h-10 px-3 rounded-lg border border-gray-200 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex-1 min-w-24">
                <label className="block text-xs text-gray-500 mb-0.5">Clase</label>
                <input
                  type="text"
                  value={classInput}
                  onChange={(e) => setClassInput(e.target.value.slice(0, 10))}
                  onBlur={handleClassBlur}
                  placeholder="Clase"
                  maxLength={10}
                  className="w-full min-h-10 px-3 rounded-lg border border-gray-200 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sección de equipo */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Backpack size={18} /> Equipo
            </h3>
            <GearSlot label="Cabeza" icon={HardHat} value={myProfile.gear.head} disabled={!canEditGear} onChange={(v) => updatePlayerGear(id, uid, 'head', v)} />
            <GearSlot label="Armadura" icon={Shield} value={myProfile.gear.armor} disabled={!canEditGear} onChange={(v) => updatePlayerGear(id, uid, 'armor', v)} />
            <GearSlot label="Manos" icon={Hand} value={myProfile.gear.hands} disabled={!canEditGear} onChange={(v) => updatePlayerGear(id, uid, 'hands', v)} />
            <GearSlot label="Pies" icon={Footprints} value={myProfile.gear.feet} disabled={!canEditGear} onChange={(v) => updatePlayerGear(id, uid, 'feet', v)} />
            <GearSlot label="Montura" icon={Rabbit} value={myProfile.gear.mount || 0} disabled={!canEditGear} onChange={(v) => updatePlayerGear(id, uid, 'mount', v)} />
          </div>
        </div>

        {/* Footer en flujo normal (no fixed) */}
        {isMyTurn && !isEnded && (
          <div className="p-4 bg-white border-t shadow-lg space-y-2 shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startCombat(id)}
                className="flex-1 min-h-14 rounded-xl bg-red-500 text-white font-bold text-lg flex items-center justify-center gap-2 active:bg-red-600 transition-colors"
              >
                <Swords size={20} /> Combatir
              </button>
              <button
                type="button"
                onClick={handleEndTurn}
                className="min-h-14 px-6 rounded-xl bg-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2 active:bg-gray-300 transition-colors"
              >
                <SkipForward size={20} /> Fin Turno
              </button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
