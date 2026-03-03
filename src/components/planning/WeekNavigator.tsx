import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { ViewType } from '@/types/planning';
import { motion } from 'framer-motion';

interface WeekNavigatorProps {
  periodLabel: string;
  viewType: ViewType;
  onViewTypeChange: (view: ViewType) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export const WeekNavigator = ({
  periodLabel,
  viewType,
  onViewTypeChange,
  onPrevious,
  onNext,
  onToday,
}: WeekNavigatorProps) => {
  const views: { value: ViewType; label: string }[] = [
    { value: 'day', label: 'Jour' },
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
    { value: 'year', label: 'Année' },
  ];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          className="week-nav-btn hover:bg-secondary"
          aria-label="Période précédente"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>

        <button
          onClick={onToday}
          className="px-3 py-1.5 text-sm font-medium text-primary bg-accent 
                     hover:bg-primary hover:text-primary-foreground
                     rounded-md transition-colors"
        >
          Aujourd'hui
        </button>

        <button
          onClick={onNext}
          className="week-nav-btn hover:bg-secondary"
          aria-label="Période suivante"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <motion.div 
        key={periodLabel}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground capitalize">
          {periodLabel}
        </h2>
      </motion.div>

      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        {views.map((view) => (
          <button
            key={view.value}
            onClick={() => onViewTypeChange(view.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                       ${viewType === view.value 
                         ? 'bg-card text-foreground shadow-card' 
                         : 'text-muted-foreground hover:text-foreground'}`}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
};
