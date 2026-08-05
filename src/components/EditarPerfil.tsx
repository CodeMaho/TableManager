import { useState } from 'react';
import { guardarJugador, type Jugador } from '../services/api';

// Edición del perfil de ESTA app. El nombre y el género que se cambian aquí
// solo valen para munckin: la cuenta de Keycloak es común a todas las apps y no
// se toca desde aquí.
//
// El género se usa para el avatar y para precargar `attributes.sex` al entrar en
// una partida; el cambio afecta a las partidas nuevas, no a las ya jugadas.

interface Props {
  jugador: Jugador;
  onGuardado: (j: Jugador) => void;
  onVolver: () => void;
}

export function EditarPerfil({ jugador, onGuardado, onVolver }: Props) {
  const [nombre, setNombre] = useState(jugador.nombreVisible ?? '');
  const [sexo, setSexo] = useState<'M' | 'F'>(jugador.sexo);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const sinCambios = nombre.trim() === (jugador.nombreVisible ?? '') && sexo === jugador.sexo;

  const guardar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      onGuardado(await guardarJugador({ nombreVisible: nombre.trim(), sexo }));
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Tu perfil</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Solo afecta a Munchkin Tolete. Tu cuenta de {jugador.username} no cambia.
        </p>
      </div>

      <div>
        <label htmlFor="perfil-nombre" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de munchkin
        </label>
        <input
          id="perfil-nombre"
          type="text"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setGuardado(false); }}
          placeholder="Cómo apareces en la mesa"
          maxLength={20}
          className="w-full min-h-12 px-4 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">Género</span>
        <div className="flex gap-2">
          {([['M', 'Masculino'], ['F', 'Femenino']] as const).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => { setSexo(valor); setGuardado(false); }}
              aria-pressed={sexo === valor}
              className={`flex-1 min-h-12 rounded-lg border-2 font-medium transition-colors ${
                sexo === valor
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-300 text-gray-600 active:bg-gray-50'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Se usa para tu avatar y se aplica a las partidas nuevas.
        </p>
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>}
      {guardado && !error && (
        <p className="text-green-700 text-sm bg-green-50 rounded-lg p-3">Perfil guardado.</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onVolver}
          className="min-h-12 px-4 rounded-lg border border-gray-300 text-gray-600 font-medium active:bg-gray-50"
        >
          Volver
        </button>
        <button
          type="button"
          disabled={guardando || sinCambios || !nombre.trim()}
          onClick={guardar}
          className="flex-1 min-h-12 rounded-lg bg-amber-500 text-white font-bold active:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
