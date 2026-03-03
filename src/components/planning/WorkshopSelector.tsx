import { useEffect, useRef, useState } from 'react';
import { Workshop } from '@/types/planning';
import { Factory, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkshopSelectorProps {
  workshops: Workshop[];
  selectedWorkshopId: string;
  onSelectWorkshop: (id: string) => void;
}

export const WorkshopSelector = ({ workshops, selectedWorkshopId, onSelectWorkshop }: WorkshopSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = workshops.find(w => w.id === selectedWorkshopId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg 
                   hover:bg-accent transition-colors min-w-[220px] shadow-card"
      >
        <Factory className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-foreground flex-1 text-left truncate">
          {selected ? `${selected.code} — ${selected.name}` : 'Sélectionner un atelier'}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-full bg-card border border-border 
                       rounded-lg shadow-dropdown z-50 overflow-hidden"
          >
            {workshops.map((w) => (
              <button
                key={w.id}
                onClick={() => { onSelectWorkshop(w.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left 
                           hover:bg-accent transition-colors ${w.id === selectedWorkshopId ? 'bg-accent' : ''}`}
              >
                <Factory className="w-4 h-4 text-muted-foreground" />
                <span className={`font-medium ${w.id === selectedWorkshopId ? 'text-primary' : 'text-foreground'}`}>
                  {w.code} — {w.name}
                </span>
                {w.theme_color && (
                  <span className="ml-auto w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${w.theme_color})` }} />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
