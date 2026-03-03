import { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Person, Team } from '@/types/planning';
import { Search, HardHat, User, Users, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  people: Person[];
  teams: Team[];
  onNavigateToPerson?: (personId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToTeam?: (teamId: string) => void;
}

interface SearchResult {
  id: string;
  type: 'project' | 'person' | 'team';
  title: string;
  subtitle: string;
  icon: typeof HardHat;
  color?: string;
}

export const CommandPalette = ({
  isOpen,
  onClose,
  projects,
  people,
  teams,
  onNavigateToPerson,
  onNavigateToProject,
  onNavigateToTeam,
}: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // toggle handled by parent
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      // Show recent / suggestions
      return [
        ...projects.slice(0, 3).map(p => ({
          id: p.id,
          type: 'project' as const,
          title: `${p.code} – ${p.label}`,
          subtitle: 'Chantier',
          icon: HardHat,
          color: p.color,
        })),
        ...people.slice(0, 3).map(p => ({
          id: p.id,
          type: 'person' as const,
          title: p.display_name,
          subtitle: teams.find(t => t.id === p.team_id)?.name || '',
          icon: User,
        })),
      ];
    }

    const lq = query.toLowerCase();
    const matched: SearchResult[] = [];

    // Search projects
    projects
      .filter(p => p.code.toLowerCase().includes(lq) || p.label.toLowerCase().includes(lq))
      .slice(0, 5)
      .forEach(p => {
        matched.push({
          id: p.id,
          type: 'project',
          title: `${p.code} – ${p.label}`,
          subtitle: p.is_active ? 'Chantier actif' : 'Chantier inactif',
          icon: HardHat,
          color: p.color,
        });
      });

    // Search people
    people
      .filter(p => p.display_name.toLowerCase().includes(lq))
      .slice(0, 5)
      .forEach(p => {
        matched.push({
          id: p.id,
          type: 'person',
          title: p.display_name,
          subtitle: teams.find(t => t.id === p.team_id)?.name || '',
          icon: User,
        });
      });

    // Search teams
    teams
      .filter(t => t.name.toLowerCase().includes(lq))
      .slice(0, 3)
      .forEach(t => {
        matched.push({
          id: t.id,
          type: 'team',
          title: t.name,
          subtitle: `${people.filter(p => p.team_id === t.id).length} personnes`,
          icon: Users,
        });
      });

    return matched;
  }, [query, projects, people, teams]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    switch (result.type) {
      case 'person':
        onNavigateToPerson?.(result.id);
        break;
      case 'project':
        onNavigateToProject?.(result.id);
        break;
      case 'team':
        onNavigateToTeam?.(result.id);
        break;
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          className="bg-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-border"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher un chantier, une personne, une équipe..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground 
                         focus:outline-none text-base"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono 
                           text-muted-foreground bg-muted rounded border border-border">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                Aucun résultat pour "{query}"
              </div>
            ) : (
              results.map((result, index) => {
                const Icon = result.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                               ${index === selectedIndex ? 'bg-accent' : 'hover:bg-muted/50'}`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={result.color ? {
                        backgroundColor: `hsl(${result.color} / 0.15)`,
                        color: `hsl(${result.color})`,
                      } : undefined}
                    >
                      <Icon className={`w-4 h-4 ${!result.color ? 'text-muted-foreground' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate text-sm">
                        {result.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </div>
                    </div>
                    {index === selectedIndex && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
            <span>↑↓ naviguer</span>
            <span>↵ sélectionner</span>
            <span>esc fermer</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
