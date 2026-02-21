import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { CombatOverlay } from '../game/CombatOverlay';
import { LevelUpToast } from '../game/LevelUpToast';

interface GameLayoutProps {
  children: ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className="h-screen bg-gray-50/80 flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      <LevelUpToast />
      <CombatOverlay />
    </div>
  );
}
