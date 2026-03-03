import { useEffect, useRef, useState } from 'react';
import { Subsidiary } from '@/types/planning';
import { Building2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubsidiarySelectorProps {
  subsidiaries: Subsidiary[];
  selectedSubsidiaryId: string;
  onSelectSubsidiary: (id: string) => void;
}

export const SubsidiarySelector = ({ subsidiaries, selectedSubsidiaryId, onSelectSubsidiary }: SubsidiarySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = subsidiaries.find(s => s.id === selectedSubsidiaryId);

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
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-foreground flex-1 text-left truncate">
          {selected ? `${selected.code} — ${selected.name}` : 'Sélectionner une filiale'}
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
            {subsidiaries.map((s) => (
              <button
                key={s.id}
                onClick={() => { onSelectSubsidiary(s.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left 
                           hover:bg-accent transition-colors ${s.id === selectedSubsidiaryId ? 'bg-accent' : ''}`}
              >
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className={`font-medium ${s.id === selectedSubsidiaryId ? 'text-primary' : 'text-foreground'}`}>
                  {s.code} — {s.name}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
