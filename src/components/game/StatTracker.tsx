import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';

interface StatTrackerProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function StatTracker({ label, value, min = 0, max = 99, disabled = false, onChange }: StatTrackerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 w-20">{label}</span>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className={clsx(
          'min-h-12 min-w-12 flex items-center justify-center rounded-lg border-2 transition-colors',
          disabled || value <= min
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'border-red-300 text-red-600 active:bg-red-100'
        )}
      >
        <Minus size={20} />
      </button>
      <span className="min-w-10 text-center text-xl font-bold tabular-nums">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className={clsx(
          'min-h-12 min-w-12 flex items-center justify-center rounded-lg border-2 transition-colors',
          disabled || value >= max
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'border-green-300 text-green-600 active:bg-green-100'
        )}
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
