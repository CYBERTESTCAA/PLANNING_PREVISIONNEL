import { DensityMode } from './DayCell';
import { LayoutGrid, AlignJustify, Maximize2 } from 'lucide-react';

interface DensitySelectorProps {
  density: DensityMode;
  onChange: (d: DensityMode) => void;
}

const options: { value: DensityMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: 'compact', label: 'Compact', icon: LayoutGrid },
  { value: 'comfort', label: 'Confort', icon: AlignJustify },
  { value: 'large', label: 'Large', icon: Maximize2 },
];

export const DensitySelector = ({ density, onChange }: DensitySelectorProps) => {
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
      {options.map(opt => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={`p-1.5 rounded-md transition-colors
                       ${density === opt.value 
                         ? 'bg-card text-foreground shadow-sm' 
                         : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};
