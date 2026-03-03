import { useState, useMemo, useRef, useEffect } from 'react';
import { Person } from '@/types/planning';
import { ChevronDown, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PersonSelectorProps {
  people: Person[];
  selectedPersonId: string;
  onSelectPerson: (personId: string) => void;
}

export const PersonSelector = ({ people, selectedPersonId, onSelectPerson }: PersonSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg 
                   hover:bg-accent transition-colors min-w-[250px] shadow-card"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <span className="font-medium text-foreground flex-1 text-left">
          {selectedPerson?.display_name || 'Sélectionner une personne'}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 
                     ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-full bg-card border border-border 
                       rounded-lg shadow-dropdown z-50 overflow-hidden max-h-[300px] overflow-y-auto"
          >
            {people.filter(p => p.is_active).map((person) => (
              <button
                key={person.id}
                onClick={() => {
                  onSelectPerson(person.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left 
                           hover:bg-accent transition-colors
                           ${person.id === selectedPersonId ? 'bg-accent' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className={`font-medium ${person.id === selectedPersonId ? 'text-primary' : 'text-foreground'}`}>
                  {person.display_name}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
