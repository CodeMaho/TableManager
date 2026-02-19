# Munchkin Companion PWA

Aplicación web progresiva en tiempo real para registrar niveles, equipamiento y fuerza de combate durante partidas de **Munchkin** — sin necesidad de instalación.

![Munchkin Companion](public/munckin.jpg)

## Funcionalidades

- **Sincronización en tiempo real** — Todos los jugadores ven los cambios al instante (<100ms)
- **Sesiones anónimas** — Sin registro; únete con un código de partida de 4 caracteres
- **Mobile-first** — Optimizado para móviles con controles táctiles amplios
- **Seguimiento de combate** — Resolución completa con modificadores de monstruo/jugador y sistema de ayudante
- **Gestión de turnos** — Orden de turno forzado con roles activo/pasivo
- **Equipamiento** — Ranuras de cabeza, armadura, manos y pies con mochila de almacenamiento
- **Panel del anfitrión** — Expulsar jugadores, reordenar turnos y gestionar la partida
- **Historial de partidas** — Consulta sesiones y resultados anteriores

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript |
| Build | Vite |
| Estilos | Tailwind CSS v4 |
| Estado | React Context API |
| Backend | Firebase Realtime Database |
| Auth | Firebase Auth Anónimo |
| Enrutamiento | React Router DOM v7 |
| Iconos | Lucide React |

## Requisitos previos

- [Node.js](https://nodejs.org/) 18+
- Un proyecto de [Firebase](https://firebase.google.com/) con:
  - **Realtime Database** habilitado
  - **Autenticación anónima** habilitada

## Puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/CodeMaho/TableManager.git
cd TableManager
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

Abre `src/services/firebase.ts` y reemplaza el objeto `firebaseConfig` con las credenciales de tu proyecto Firebase:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.REGION.firebasedatabase.app",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};
```

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo con HMR |
| `npm run build` | Comprueba tipos y genera la build de producción |
| `npm run preview` | Previsualiza la build de producción en local |
| `npm run lint` | Ejecuta ESLint |

## Despliegue

La app puede desplegarse en cualquier plataforma de hosting estático (Firebase Hosting, Vercel, Netlify, etc.).

### Firebase Hosting

```bash
npm run build
firebase deploy
```

## Estructura del proyecto

```
src/
├── components/
│   ├── layout/
│   │   ├── GameLayout.tsx      # Contenedor principal del juego
│   │   └── Navbar.tsx          # Indicador de turno y estado
│   ├── game/
│   │   ├── StatTracker.tsx     # Componente stepper [-] Valor [+]
│   │   ├── GearSlot.tsx        # Ranura de equipamiento con icono
│   │   ├── PlayerCard.tsx      # Tarjeta resumen de un rival
│   │   ├── PlayerAvatar.tsx    # Componente de avatar
│   │   └── CombatOverlay.tsx   # Modal de modo combate
│   └── lobby/
│       └── LobbyList.tsx       # Lista de jugadores en sala de espera
├── context/
│   └── GameContext.tsx         # Proveedor global de estado
├── hooks/
│   ├── useAuth.ts              # Autenticación anónima Firebase
│   ├── useGame.ts              # Suscripción a Firebase Realtime DB
│   └── useCombat.ts            # Cálculo de fuerza de combate
├── pages/
│   ├── HomePage.tsx            # Pantalla de crear/unirse a partida
│   ├── LobbyPage.tsx           # Sala de espera previa al juego
│   └── GamePage.tsx            # Vista principal de la partida
├── services/
│   └── firebase.ts             # Inicialización de Firebase
├── types/
│   └── game.ts                 # Interfaces TypeScript
└── utils/
    ├── avatarUrl.ts            # Utilidades de avatar
    └── munchkinMath.ts         # Fórmulas de fuerza de combate
```

## Modelo de datos

Las partidas se almacenan en Firebase Realtime Database bajo `/games/<GAME_ID>`:

```
games/
└── <GAME_ID>/
    ├── meta/           # hostId, status, createdAt, maxLevel
    ├── turnState/      # activePlayerId, phase, turnNumber, turnOrder
    ├── combatState/    # isActive, monsterLevel, modifiers, helperId
    └── players/
        └── <UID>/      # name, isReady, attributes, gear
```

### Perfil de jugador

```typescript
interface PlayerProfile {
  name: string;
  isReady: boolean;
  attributes: {
    level: number;   // 1 – nivelMáximo
    debuff: number;
    sex: 'M' | 'F';
    race: string;
    class: string;
  };
  gear: {
    head: number;
    armor: number;
    hands: number;
    feet: number;
    backpack: string[];
  };
}
```

**Fuerza de combate** (calculada en el frontend):
```
fuerzaCombate = nivel + cabeza + armadura + manos + pies - debuff
```

## Resumen de reglas

- Cada jugador empieza en **Nivel 1** y busca alcanzar el nivel máximo configurado (por defecto: 10).
- En tu turno puedes luchar contra monstruos, mejorar equipamiento y vender objetos por niveles.
- **Combate:** `LadoMunchkin = (Jugador + Ayudante fuerza de combate) + ModificadoresJugador` vs `NivelMonstruo + ModificadoresMonstruo`.
- Vender objetos: cada **1000 Oro = +1 Nivel** (no se puede ganar solo vendiendo).
- Otro jugador puede unirse al combate como **Ayudante** mediante una solicitud de aceptación.
- El primer jugador en alcanzar el nivel máximo gana la partida.

## Licencia

MIT
