import { LogIn, LogOut, Trophy, Swords } from 'lucide-react';
import type { Jugador } from '../services/api';

// Tarjeta de perfil de la pantalla de inicio.
//
// Con cuenta: nombre, nivel, barra de progreso hacia el siguiente y botón de
// salir. Sin cuenta: una invitación a entrar explicando qué se gana, sin
// bloquear nada — jugar no exige cuenta.

interface Props {
  jugador: Jugador | null;
}

export function PerfilJugador({ jugador }: Props) {
  const volver = encodeURIComponent(window.location.pathname + window.location.search);

  if (!jugador?.identificado) {
    return (
      <div className="bg-white/70 rounded-2xl border border-amber-200 p-4 space-y-3">
        <p className="text-sm text-gray-600">
          Estás jugando <strong>sin cuenta</strong>. Puedes jugar igual, pero no se guarda tu
          progreso ni el historial de partidas.
        </p>
        <div className="flex gap-2">
          <a
            href={`/login.php?volver=${volver}`}
            className="flex-1 min-h-12 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center gap-2 active:bg-amber-600 transition-colors"
          >
            <LogIn size={18} /> Iniciar sesión
          </a>
          <a
            href={`/registro.php?volver=${volver}`}
            className="flex-1 min-h-12 rounded-lg border-2 border-amber-500 text-amber-600 font-bold flex items-center justify-center active:bg-amber-50 transition-colors"
          >
            Crear cuenta
          </a>
        </div>
      </div>
    );
  }

  const porcentaje = Math.min(100, Math.max(0, jugador.xpEnNivel));

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">
            {jugador.nombreVisible || jugador.username}
          </p>
          <p className="text-xs text-gray-500 truncate">{jugador.username}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center px-3 py-1 rounded-lg bg-amber-100">
            <p className="text-[10px] uppercase tracking-wide text-amber-700">Nivel</p>
            <p className="text-xl font-bold leading-none text-amber-700">{jugador.nivel}</p>
          </div>
          <a
            href="/logout.php"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="min-h-12 min-w-12 rounded-lg border border-gray-300 text-gray-500 flex items-center justify-center active:bg-gray-50"
          >
            <LogOut size={18} />
          </a>
        </div>
      </div>

      <div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {jugador.xpEnNivel}/100 XP · faltan {jugador.xpParaSubir} para el nivel {jugador.nivel + 1}
        </p>
      </div>

      <div className="flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <Swords size={13} className="text-gray-400" /> {jugador.partidas} partidas
        </span>
        <span className="flex items-center gap-1">
          <Trophy size={13} className="text-amber-500" /> {jugador.victorias} victorias
        </span>
      </div>
    </div>
  );
}
