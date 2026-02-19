import { type LucideIcon } from 'lucide-react';
import { StatTracker } from './StatTracker';

interface GearSlotProps {
  label: string;
  icon: LucideIcon;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function GearSlot({ label, icon: Icon, value, disabled = false, onChange }: GearSlotProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
      <div className="flex items-center justify-center min-h-12 min-w-12 rounded-lg bg-amber-50 text-amber-600">
        <Icon size={24} />
      </div>
      <StatTracker label={label} value={value} disabled={disabled} onChange={onChange} />
    </div>
  );
}
