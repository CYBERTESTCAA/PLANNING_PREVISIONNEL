import { useState } from 'react';
import { Project, AbsenceType } from '@/types/planning';
import { filterProjects } from '@/lib/planningUtils';
import { HardHat, UserMinus, X, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAssign: (projectId: string, date: string) => void;
  onBulkAbsence: (type: AbsenceType, date: string) => void;
  projects: Project[];
  visibleDates: Date[];
}

export const BulkActionBar = ({
  selectedCount, onClearSelection,
  onBulkAssign, onBulkAbsence,
  projects, visibleDates,
}: BulkActionBarProps) => {
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showAbsencePanel, setShowAbsencePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [absenceType, setAbsenceType] = useState<AbsenceType>('CP');

  if (selectedCount === 0) return null;

  const filteredProjects = filterProjects(projects, searchQuery);

  const handleBulkAssign = () => {
    if (selectedProjectId && selectedDate) {
      onBulkAssign(selectedProjectId, selectedDate);
      setShowAssignPanel(false);
      setSelectedProjectId('');
      setSearchQuery('');
    }
  };

  const handleBulkAbsence = () => {
    if (selectedDate) {
      onBulkAbsence(absenceType, selectedDate);
      setShowAbsencePanel(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 
                 bg-card border border-border rounded-2xl shadow-2xl px-5 py-3
                 flex items-center gap-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {selectedCount}
        </div>
        personne{selectedCount > 1 ? 's' : ''} sélectionnée{selectedCount > 1 ? 's' : ''}
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="relative">
        <button
          onClick={() => { setShowAssignPanel(!showAssignPanel); setShowAbsencePanel(false); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground 
                     rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <HardHat className="w-4 h-4" />
          Affecter chantier
        </button>

        <AnimatePresence>
          {showAssignPanel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-2 left-0 w-[320px] bg-card border border-border 
                         rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-border">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher chantier..."
                    className="w-full pl-8 pr-3 py-1.5 bg-secondary rounded-lg text-sm 
                               text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>
                <div className="max-h-[150px] overflow-y-auto space-y-0.5">
                  {filteredProjects.slice(0, 8).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs
                                 ${selectedProjectId === p.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: `hsl(${p.color})` }} />
                      <span className="font-medium">{p.code}</span>
                      <span className="text-muted-foreground truncate">{p.label}</span>
                      {selectedProjectId === p.id && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 border-b border-border">
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-secondary rounded-lg text-sm text-foreground focus:outline-none"
                >
                  <option value="">Choisir un jour...</option>
                  {visibleDates.map(d => {
                    const ds = d.toISOString().split('T')[0];
                    return <option key={ds} value={ds}>{d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</option>;
                  })}
                </select>
              </div>
              <div className="p-3">
                <button
                  onClick={handleBulkAssign}
                  disabled={!selectedProjectId || !selectedDate}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm 
                             font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Appliquer à {selectedCount} personne{selectedCount > 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <button
          onClick={() => { setShowAbsencePanel(!showAbsencePanel); setShowAssignPanel(false); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-foreground 
                     rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          <UserMinus className="w-4 h-4" />
          Absence
        </button>

        <AnimatePresence>
          {showAbsencePanel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-2 left-0 w-[280px] bg-card border border-border 
                         rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  {(['CP', 'RTT', 'MALADIE', 'FORMATION', 'AUTRE'] as AbsenceType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setAbsenceType(t)}
                      className={`px-2 py-1.5 rounded text-xs font-medium border transition-colors
                                 ${absenceType === t ? 'bg-primary/10 border-primary' : 'border-border hover:bg-secondary'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-secondary rounded-lg text-xs text-foreground focus:outline-none"
                >
                  <option value="">Choisir un jour...</option>
                  {visibleDates.map(d => {
                    const ds = d.toISOString().split('T')[0];
                    return <option key={ds} value={ds}>{d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}</option>;
                  })}
                </select>
                <button
                  onClick={handleBulkAbsence}
                  disabled={!selectedDate}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs 
                             font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Appliquer à {selectedCount} personne{selectedCount > 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onClearSelection}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        title="Désélectionner"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
