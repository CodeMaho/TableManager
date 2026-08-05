// Cliente de la API de partida. Sustituye a Firebase Realtime Database.
//
// La identidad la pone la puerta de Keycloak mediante una cookie de sesión, así
// que aquí no se maneja ningún token: basta con que las peticiones vayan al
// mismo origen. Por eso tampoco hay claves de API en el bundle, que es lo que
// pasaba con la configuración de Firebase.

import type { GameSession, GameHistoryEntry } from '../types/game';

/**
 * Quién eres, según /api/jugador.php.
 *
 * Jugar NO exige cuenta. Hay tres estados posibles:
 *   - visitante nuevo:  identificado=false, id=null
 *   - invitado:         identificado=false, id puesto (cookie del navegador)
 *   - con cuenta:       identificado=true, con nivel, experiencia e historial
 */
export interface Jugador {
  identificado: boolean;
  invitado: boolean;
  id: string | null;
  username: string;
  /** Nombre en ESTA app. No toca la cuenta de Keycloak, que es común a todas. */
  nombreVisible: string | null;
  sexo: 'M' | 'F';
  xp: number;
  nivel: number;
  xpEnNivel: number;
  xpParaSubir: number;
  partidas: number;
  victorias: number;
  maxLevelPref: number;
}

/** Estado de partida con el contador de revisión que usa el sondeo. */
export type EstadoPartida = GameSession & { rev: number; gameId: string };

export class ApiError extends Error {
  // Campos explícitos en vez de propiedades de constructor: el proyecto compila
  // con `erasableSyntaxOnly`, que no admite esa forma abreviada.
  status: number;
  code: string;

  constructor(status: number, code: string, mensaje: string) {
    super(mensaje);
    this.status = status;
    this.code = code;
  }
}

const MENSAJES: Record<string, string> = {
  sin_sesion: 'Tu sesión ha caducado. Vuelve a entrar.',
  sin_perfil: 'Tu sesión ha caducado. Vuelve a entrar.',
  partida_no_encontrada: 'Partida no encontrada',
  no_estas_en_la_partida: 'No estás en esta partida',
  no_es_tu_turno: 'No es tu turno',
  solo_host: 'Solo el anfitrión puede hacer eso',
  no_es_tu_peticion: 'Esa petición de ayuda no es para ti',
  sin_base_de_datos: 'El servidor no está disponible',
};

async function leer(res: Response): Promise<unknown> {
  const texto = await res.text();
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return {};
  }
}

function fallar(res: Response, datos: unknown): never {
  const d = (datos ?? {}) as { error?: string; mensaje?: string };
  const code = d.error ?? 'error_desconocido';
  throw new ApiError(res.status, code, d.mensaje ?? MENSAJES[code] ?? 'No se pudo completar la operación');
}

/**
 * Quién soy. No falla por no tener cuenta: el endpoint responde 200 siempre y
 * la app decide qué enseñar a partir de `identificado`.
 */
function normalizarJugador(d: Record<string, unknown>): Jugador {
  const num = (v: unknown, pordefecto = 0) => (typeof v === 'number' ? v : pordefecto);

  return {
    identificado: d.identificado === true,
    invitado: d.invitado !== false,
    id: d.id != null ? String(d.id) : null,
    username: String(d.username ?? ''),
    nombreVisible: (d.nombreVisible as string | null) ?? null,
    sexo: d.sexo === 'F' ? 'F' : 'M',
    xp: num(d.xp),
    nivel: num(d.nivel, 1),
    xpEnNivel: num(d.xpEnNivel),
    xpParaSubir: num(d.xpParaSubir, 100),
    partidas: num(d.partidas),
    victorias: num(d.victorias),
    maxLevelPref: num(d.maxLevelPref, 10),
  };
}

export async function cargarJugador(): Promise<Jugador> {
  const res = await fetch('/api/jugador.php', { cache: 'no-store' });
  const datos = await leer(res);
  if (!res.ok) fallar(res, datos);
  return normalizarJugador(datos as Record<string, unknown>);
}

/**
 * Estado de una partida. Pasando `rev` el servidor responde `null` si nadie ha
 * tocado nada, que es el caso habitual del sondeo y ahorra rehacer el estado.
 */
export async function cargarEstado(gameId: string, rev?: number): Promise<EstadoPartida | null> {
  const url = `/api/estado.php?id=${encodeURIComponent(gameId)}${rev != null ? `&rev=${rev}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  const datos = await leer(res);
  if (!res.ok) fallar(res, datos);

  if ((datos as { sinCambios?: boolean }).sinCambios) return null;
  return datos as EstadoPartida;
}

/** Ejecuta una acción sobre la partida y devuelve el estado ya actualizado. */
export async function accion(nombre: string, datos: Record<string, unknown> = {}): Promise<EstadoPartida> {
  const res = await fetch('/api/juego.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: nombre, ...datos }),
  });
  const cuerpo = await leer(res);
  if (!res.ok) fallar(res, cuerpo);
  return cuerpo as EstadoPartida;
}

/** Guarda el perfil de esta app (nombre visible y género). Exige cuenta. */
export async function guardarJugador(cambios: {
  nombreVisible?: string;
  sexo?: 'M' | 'F';
}): Promise<Jugador> {
  const res = await fetch('/api/jugador.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  });
  const datos = await leer(res);
  if (!res.ok) fallar(res, datos);
  return normalizarJugador(datos as Record<string, unknown>);
}

export async function cargarHistorial(): Promise<GameHistoryEntry[]> {
  const res = await fetch('/api/historial.php', { cache: 'no-store' });
  const datos = await leer(res);
  if (!res.ok) fallar(res, datos);
  return Array.isArray(datos) ? (datos as GameHistoryEntry[]) : [];
}
