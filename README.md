# Munchkin Companion PWA

A real-time Progressive Web App to track levels, gear, and combat strength during **Munchkin** board game sessions — no installation required.

![Munchkin Companion](public/munckin.jpg)

## Features

- **Real-time sync** — All players see updates instantly (<100ms)
- **Anonymous sessions** — No account needed; join with a 4-char game code
- **Mobile-first** — Optimized for phones with large, touch-friendly controls
- **Combat tracker** — Full combat resolution with monster/player modifiers and a helper system
- **Turn management** — Enforced turn order with active/passive player roles
- **Gear tracking** — Head, armor, hands, and feet slots with backpack storage
- **Host controls** — Kick players, reorder turns, and manage game settings
- **Game history** — Review past sessions and results

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| State | React Context API |
| Backend | Firebase Realtime Database |
| Auth | Firebase Anonymous Auth |
| Routing | React Router DOM v7 |
| Icons | Lucide React |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Firebase](https://firebase.google.com/) project with:
  - **Realtime Database** enabled
  - **Anonymous Authentication** enabled

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/CodeMaho/TableManager.git
cd TableManager
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Open `src/services/firebase.ts` and replace the `firebaseConfig` object with your own Firebase project credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.REGION.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 4. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Deployment

The app can be deployed to any static hosting platform (Firebase Hosting, Vercel, Netlify, etc.).

### Firebase Hosting

```bash
npm run build
firebase deploy
```

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── GameLayout.tsx      # Main game wrapper
│   │   └── Navbar.tsx          # Turn/status indicator
│   ├── game/
│   │   ├── StatTracker.tsx     # [-] Value [+] stepper component
│   │   ├── GearSlot.tsx        # Equipment slot with icon
│   │   ├── PlayerCard.tsx      # Opponent summary card
│   │   ├── PlayerAvatar.tsx    # Avatar display component
│   │   └── CombatOverlay.tsx   # Combat mode modal
│   └── lobby/
│       └── LobbyList.tsx       # Waiting room player list
├── context/
│   └── GameContext.tsx         # Global game state provider
├── hooks/
│   ├── useAuth.ts              # Firebase anonymous auth
│   ├── useGame.ts              # Firebase Realtime DB subscription
│   └── useCombat.ts            # Combat strength calculations
├── pages/
│   ├── HomePage.tsx            # Create/Join game screen
│   ├── LobbyPage.tsx           # Pre-game lobby
│   └── GamePage.tsx            # Main game view
├── services/
│   └── firebase.ts             # Firebase initialization
├── types/
│   └── game.ts                 # TypeScript interfaces
└── utils/
    ├── avatarUrl.ts            # Avatar helper utilities
    └── munchkinMath.ts         # Combat strength formulas
```

## Data Model

Games are stored in Firebase Realtime Database under `/games/<GAME_ID>`:

```
games/
└── <GAME_ID>/
    ├── meta/           # hostId, status, createdAt, maxLevel
    ├── turnState/      # activePlayerId, phase, turnNumber, turnOrder
    ├── combatState/    # isActive, monsterLevel, modifiers, helperId
    └── players/
        └── <UID>/      # name, isReady, attributes, gear
```

### Player Profile

```typescript
interface PlayerProfile {
  name: string;
  isReady: boolean;
  attributes: {
    level: number;   // 1 – maxLevel
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

**Combat strength** (computed on the frontend):
```
combatStrength = level + head + armor + hands + feet
```

## Game Rules Summary

- Each player starts at **Level 1** and aims to reach the configured max level (default: 10).
- On your turn you can fight monsters, upgrade gear, and sell items for levels.
- **Combat**: `MunchkinSide = (Player + Helper combat strength) + PlayerModifiers` vs `MonsterLevel + MonsterModifiers`.
- Selling items: every **1000 Gold = +1 Level** (cannot win by selling alone).
- Another player can join combat as a **Helper** via a request/accept flow.
- The first player to reach max level wins the game.

## License

MIT
