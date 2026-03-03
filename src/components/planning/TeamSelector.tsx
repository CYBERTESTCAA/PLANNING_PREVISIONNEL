import { Team } from '@/types/planning';
import { ChevronDown, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

export const TeamSelector = ({ teams, selectedTeamId, onSelectTeam }: TeamSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

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
                   hover:bg-accent transition-colors min-w-[200px] shadow-card"
      >
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-foreground flex-1 text-left">
          {selectedTeam?.name || 'Sélectionner une équipe'}
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
                       rounded-lg shadow-dropdown z-50 overflow-hidden"
          >
            {teams.filter(t => t.is_active).map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  onSelectTeam(team.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left 
                           hover:bg-accent transition-colors
                           ${team.id === selectedTeamId ? 'bg-accent' : ''}`}
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className={`font-medium ${team.id === selectedTeamId ? 'text-primary' : 'text-foreground'}`}>
                  {team.name}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
