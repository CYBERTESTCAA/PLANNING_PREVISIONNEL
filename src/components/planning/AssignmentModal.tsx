import { useState, useMemo, useRef, useEffect } from 'react';
import { ManufacturingOrder, Project, AbsenceType, ABSENCE_TYPE_LABELS, SlotType, SLOT_LABELS } from '@/types/planning';
import { filterProjects } from '@/lib/planningUtils';
import { X, Search, Check, Plus, UserMinus, Clock, ListTodo, CalendarDays, HardHat, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ModalTab = 'assignment' | 'absence' | 'task';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectIds: string[], comment: string, manufacturingOrderId?: string | null, slot?: SlotType, timeSpentMinutes?: number | null, dateEnd?: string | null, dateStart?: string) => void;
  onAbsenceSubmit?: (type: AbsenceType, comment: string) => void;
  onTaskSubmit?: (params: { title: string; description?: string | null; dueDate?: string | null; projectId?: string | null }) => void;
  projects: Project[];
  manufacturingOrders?: ManufacturingOrder[];
  personName: string;
  date: string;
  defaultSlot?: SlotType;
}

export const AssignmentModal = ({
  isOpen, onClose, onSubmit, onAbsenceSubmit, onTaskSubmit,
  projects, manufacturingOrders, personName, date, defaultSlot = 'FULL',
}: AssignmentModalProps) => {
  const [tab, setTab] = useState<ModalTab>('assignment');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [comment, setComment] = useState('');
  const [selectedManufacturingOrderId, setSelectedManufacturingOrderId] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>(date);
  const [dateEnd, setDateEnd] = useState<string>(date);
  const [slot, setSlot] = useState<SlotType>(defaultSlot);
  const [timeSpentHours, setTimeSpentHours] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [expandedInModalId, setExpandedInModalId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [absenceType, setAbsenceType] = useState<AbsenceType>('CP');
  const [absenceComment, setAbsenceComment] = useState('');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(date);
  const [taskProjectId, setTaskProjectId] = useState<string>('');

  const filteredProjects = useMemo(() => filterProjects(projects, searchQuery), [projects, searchQuery]);

  const manufacturingOrdersForSelectedProject = useMemo(() => {
    if (!manufacturingOrders) return [];
    if (selectedProjectIds.length !== 1) return [];
    return manufacturingOrders.filter(mo => mo.project_id === selectedProjectIds[0]);
  }, [manufacturingOrders, selectedProjectIds]);

  useEffect(() => { setHighlightedIndex(0); setExpandedInModalId(null); }, [searchQuery]);

  useEffect(() => {
    if (selectedProjectIds.length !== 1) setSelectedManufacturingOrderId('');
  }, [selectedProjectIds]);

  useEffect(() => {
    if (isOpen) {
      setTab('assignment');
      setSlot(defaultSlot);
      setTimeSpentHours('');
      setDateStart(date);
      setDateEnd(date);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate(date);
      setTaskProjectId('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultSlot, date]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSubmit = () => {
    if (tab === 'assignment' && selectedProjectIds.length > 0) {
      const manufacturingOrderId = selectedProjectIds.length === 1 && selectedManufacturingOrderId
        ? selectedManufacturingOrderId
        : null;
      const timeSpentMinutes = timeSpentHours && !isNaN(parseFloat(timeSpentHours))
        ? Math.round(parseFloat(timeSpentHours) * 60)
        : null;
      const effectiveDate = dateStart || date;
      const rangeEnd = dateEnd && dateEnd !== effectiveDate ? dateEnd : null;
      onSubmit(selectedProjectIds, comment, manufacturingOrderId, slot, timeSpentMinutes, rangeEnd, effectiveDate);
      handleClose();
    } else if (tab === 'absence' && onAbsenceSubmit) {
      onAbsenceSubmit(absenceType, absenceComment);
      handleClose();
    } else if (tab === 'task' && onTaskSubmit && taskTitle.trim()) {
      onTaskSubmit({
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        dueDate: taskDueDate || null,
        projectId: taskProjectId || null,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedProjectIds([]);
    setSearchQuery('');
    setComment('');
    setSelectedManufacturingOrderId('');
    setSlot(defaultSlot);
    setTimeSpentHours('');
    setHighlightedIndex(0);
    setAbsenceType('CP');
    setAbsenceComment('');
    setTaskTitle('');
    setTaskDescription('');
    setTaskProjectId('');
    onClose();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredProjects.length - 1));
      const el = listRef.current?.children[Math.min(highlightedIndex + 1, filteredProjects.length - 1)] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProjects[highlightedIndex]) {
        toggleProject(filteredProjects[highlightedIndex].id);
      }
    }
  };

  if (!isOpen) return null;

  const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const absenceTypes: { value: AbsenceType; label: string; icon: string }[] = [
    { value: 'CP', label: 'Congés Payés', icon: '🏖️' },
    { value: 'RTT', label: 'RTT', icon: '🕐' },
    { value: 'MALADIE', label: 'Maladie', icon: '🏥' },
    { value: 'FORMATION', label: 'Formation', icon: '📚' },
    { value: 'AUTRE', label: 'Autre', icon: '📝' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/30"
        onClick={handleClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card shadow-2xl
                     flex flex-col overflow-hidden border-l border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground">{personName}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab('assignment')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors
                         ${tab === 'assignment' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Plus className="w-4 h-4" />
              Chantier
            </button>
            {onAbsenceSubmit && (
              <button
                onClick={() => setTab('absence')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors
                           ${tab === 'absence' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <UserMinus className="w-4 h-4" />
                Absence
              </button>
            )}
            {onTaskSubmit && (
              <button
                onClick={() => setTab('task')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors
                           ${tab === 'task' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ListTodo className="w-4 h-4" />
                Tâche
              </button>
            )}
          </div>

          {tab === 'task' && onTaskSubmit ? (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Titre de la tâche *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Ex : Vérifier les plans de façade..."
                  autoFocus
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Description (facultatif)</label>
                <textarea
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="Détails, instructions, contexte..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-secondary rounded-lg text-sm text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                    <CalendarDays className="w-3 h-3" /> Échéance
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                    <HardHat className="w-3 h-3" /> Chantier lié
                  </label>
                  <select
                    value={taskProjectId}
                    onChange={e => setTaskProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground focus:outline-none"
                  >
                    <option value="">Aucun</option>
                    {projects.filter(p => p.is_active).map(p => (
                      <option key={p.id} value={p.id}>{p.code} – {p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : tab === 'assignment' ? (
            <>
              {/* Slot + date range */}
              <div className="px-5 py-2.5 border-b border-border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  {(['AM', 'PM', 'FULL'] as SlotType[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border
                                 ${slot === s
                                   ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                   : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/50'}`}
                    >
                      {SLOT_LABELS[s]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Du</span>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => {
                      setDateStart(e.target.value);
                      if (e.target.value > dateEnd) setDateEnd(e.target.value);
                    }}
                    className="flex-1 px-2 py-1 bg-secondary rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-xs text-muted-foreground">au</span>
                  <input
                    type="date"
                    value={dateEnd}
                    min={dateStart}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="flex-1 px-2 py-1 bg-secondary rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="px-5 py-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Rechercher un chantier… (Entrée = sélectionner)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-lg 
                               text-foreground placeholder:text-muted-foreground text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {selectedProjectIds.length > 0 && (
                <div className="px-5 py-2 border-b border-border bg-accent/20">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProjectIds.map((id) => {
                      const project = projects.find(p => p.id === id);
                      if (!project) return null;
                      return (
                        <motion.div
                          key={id}
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ 
                            backgroundColor: `hsl(${project.color} / 0.15)`,
                            color: `hsl(${project.color})`,
                            border: `1px solid hsl(${project.color} / 0.3)`,
                          }}
                        >
                          <span>{project.code}</span>
                          <button onClick={() => toggleProject(id)} className="hover:bg-foreground/10 rounded-full p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}


              <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-2">
                <div className="space-y-0.5">
                  {filteredProjects.map((project, index) => {
                    const isSelected = selectedProjectIds.includes(project.id);
                    const isHighlighted = index === highlightedIndex;
                    const projectOFs = manufacturingOrders?.filter(mo => mo.project_id === project.id) ?? [];
                    const hasOFs = projectOFs.length > 0;
                    const isExpanded = expandedInModalId === project.id;
                    return (
                      <div key={project.id}>
                        <div className={`flex items-center gap-0.5 rounded-lg
                          ${isSelected ? 'bg-primary/10 ring-1 ring-primary/50' : ''}
                          ${isHighlighted && !isSelected ? 'bg-accent' : ''}`}>
                          {/* Chevron toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedInModalId(isExpanded ? null : project.id); }}
                            className={`p-1.5 rounded-lg transition-colors shrink-0
                              ${hasOFs ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60' : 'invisible pointer-events-none'}`}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          {/* Project row */}
                          <button
                            onClick={() => toggleProject(project.id)}
                            className={`flex-1 flex items-center gap-2 px-2 py-2.5 rounded-lg transition-colors text-left text-sm
                              ${!isSelected && !isHighlighted ? 'hover:bg-muted/50' : ''}`}
                          >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${project.color})` }} />
                            <span className="font-mono font-medium text-foreground">{project.code}</span>
                            <span className="text-muted-foreground">–</span>
                            <span className="text-foreground truncate">{project.label}</span>
                            {hasOFs && (
                              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{projectOFs.length}&nbsp;OF</span>
                            )}
                            {isSelected && !hasOFs && <Check className="w-4 h-4 text-primary ml-auto shrink-0" />}
                            {isSelected && hasOFs && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </button>
                        </div>
                        {/* OF sub-list (independent of selection) */}
                        {isExpanded && hasOFs && (
                          <div className="ml-8 mt-0.5 mb-1 space-y-0.5 border-l-2 border-border pl-2">
                            <button
                              onClick={() => { if (!isSelected) toggleProject(project.id); setSelectedManufacturingOrderId(''); }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-left
                                ${isSelected && !selectedManufacturingOrderId ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
                            >
                              <Check className={`w-3 h-3 shrink-0 ${isSelected && !selectedManufacturingOrderId ? 'opacity-100' : 'opacity-0'}`} />
                              Sans OF spécifique
                            </button>
                            {projectOFs.map(mo => (
                              <button
                                key={mo.id}
                                onClick={() => { if (!isSelected) toggleProject(project.id); setSelectedManufacturingOrderId(mo.id); }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-left
                                  ${isSelected && selectedManufacturingOrderId === mo.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
                              >
                                <Check className={`w-3 h-3 shrink-0 ${isSelected && selectedManufacturingOrderId === mo.id ? 'opacity-100' : 'opacity-0'}`} />
                                <span className="font-mono font-semibold">{mo.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <div className="text-center py-6 text-sm text-muted-foreground">Aucun chantier trouvé</div>
                  )}
                </div>
              </div>

              <div className="px-5 py-2 border-t border-border space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="Temps passé (h)"
                      value={timeSpentHours}
                      onChange={(e) => setTimeSpentHours(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-secondary rounded-lg text-sm
                                 text-foreground placeholder:text-muted-foreground
                                 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Commentaire (optionnel)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-[2] px-3 py-2 bg-secondary rounded-lg text-sm
                               text-foreground placeholder:text-muted-foreground
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4">
                <label className="block text-xs font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">
                  Type d'absence
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {absenceTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setAbsenceType(type.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl 
                                 border transition-all text-left text-sm
                                 ${absenceType === type.value
                                   ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                                   : 'border-border hover:bg-secondary text-muted-foreground'}`}
                    >
                      <span>{type.icon}</span>
                      <span className="font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-border">
                <input
                  type="text"
                  placeholder="Commentaire (optionnel)..."
                  value={absenceComment}
                  onChange={(e) => setAbsenceComment(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm
                             text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors text-sm font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                tab === 'assignment' ? selectedProjectIds.length === 0
                : tab === 'task' ? !taskTitle.trim()
                : false
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground 
                         rounded-lg transition-colors text-sm font-medium
                         hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              {tab === 'assignment' 
                ? `Ajouter (${selectedProjectIds.length})`
                : tab === 'task'
                  ? 'Créer la tâche'
                  : 'Ajouter l\'absence'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
