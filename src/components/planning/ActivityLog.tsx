import { useState } from 'react';
import { X, Clock, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ActivityEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: Date;
  personName?: string;
}

interface ActivityLogProps {
  entries: ActivityEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLog = ({ entries, isOpen, onClose }: ActivityLogProps) => {
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? entries.filter(e =>
        e.action.toLowerCase().includes(filter.toLowerCase()) ||
        e.detail.toLowerCase().includes(filter.toLowerCase()) ||
        (e.personName || '').toLowerCase().includes(filter.toLowerCase())
      )
    : entries;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l border-border 
                       shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Historique</h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {entries.length}
                </span>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filtrer l'historique..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-secondary rounded-lg text-sm text-foreground 
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Aucune modification</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((entry) => (
                    <div key={entry.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{entry.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.detail}</p>
                          {entry.personName && (
                            <p className="text-xs text-primary/80 mt-0.5">{entry.personName}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {formatTimeAgo(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
