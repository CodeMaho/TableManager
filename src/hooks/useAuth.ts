import { useState, useEffect, useCallback } from 'react';
import { cargarJugador, type Jugador } from '../services/api';

// Identidad del jugador. Jugar NO exige cuenta.
//
//   - Sin cuenta se juega igual, como invitado: el servidor ata la identidad a
//     una cookie del navegador, así que la partida en curso y el nombre elegido
//     sobreviven a recargar la página, pero no hay progreso entre partidas.
//   - Con cuenta (Keycloak, vía la puerta) aparecen el nivel, la experiencia y
//     el historial, y el mismo jugador es el mismo en cualquier dispositivo.
//
// `uid` es null hasta que existe identidad. En cuanto se crea o se entra a una
// partida el servidor la asigna, y `refrescar()` la trae.

interface AuthState {
  user: Jugador | null;
  uid: string | null;
  identificado: boolean;
  loading: boolean;
  error: string | null;
  refrescar: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<Jugador | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    try {
      setUser(await cargarJugador());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer tu perfil');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    cargarJugador()
      .then((j) => { if (vivo) { setUser(j); setError(null); } })
      .catch((err: Error) => { if (vivo) setError(err.message); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, []);

  return {
    user,
    uid: user?.id ?? null,
    identificado: user?.identificado ?? false,
    loading,
    error,
    refrescar,
  };
}
