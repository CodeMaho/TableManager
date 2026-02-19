import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { CombatOverlay } from '../game/CombatOverlay';

interface GameLayoutProps {
  children: ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50/80 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <CombatOverlay />
    </div>
  );
}
