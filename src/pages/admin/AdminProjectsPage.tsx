import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectStatus, PROJECT_STATUS_LABELS } from '@/types/planning';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, HardHat, Check, X, Search, Palette, CalendarIcon, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getRandomProjectColor, PROJECT_COLORS } from '@/data/mockData';
import { usePlanningData } from '@/hooks/usePlanningData';
import { api, isApiEnabled } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const AdminProjectsPage = () => {
  const { projects: storeProjects, selectedWorkshopId, manufacturingOrders } = usePlanningData();
  const [projects, setProjects] = useState<Project[]>(storeProjects);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => { setProjects(storeProjects); }, [storeProjects]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [editStatus, setEditStatus] = useState<ProjectStatus>('A_PLANIFIER');
  const [editProgress, setEditProgress] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(getRandomProjectColor());
  const [newStartDate, setNewStartDate] = useState<Date | undefined>();
  const [newEndDate, setNewEndDate] = useState<Date | undefined>();
  const [newStatus, setNewStatus] = useState<ProjectStatus>('A_PLANIFIER');
  const [newProgress, setNewProgress] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q);
    });
  }, [projects, searchQuery, statusFilter]);

  const pagedProjects = useMemo(() => filteredProjects.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredProjects, page]);
  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);

  const handleAdd = async () => {
    if (!newCode.trim() || !newLabel.trim()) { toast.error('Le code et le libellé sont requis'); return; }
    if (projects.some(p => p.code === newCode.trim())) { toast.error('Ce code existe déjà'); return; }
    const body = {
      workshopId: selectedWorkshopId,
      code: newCode.trim().toUpperCase(),
      label: newLabel.trim(),
      color: newColor,
      contractStart: newStartDate ? format(newStartDate, 'yyyy-MM-dd') : null,
      contractEnd: newEndDate ? format(newEndDate, 'yyyy-MM-dd') : null,
      plannedStart: newStartDate ? format(newStartDate, 'yyyy-MM-dd') : null,
      plannedEnd: newEndDate ? format(newEndDate, 'yyyy-MM-dd') : null,
      status: newStatus,
      progressPct: newProgress,
      isActive: true,
    };
    if (isApiEnabled() && selectedWorkshopId) {
      try {
        const saved = await api.projects.create(body as any);
        setProjects(prev => [...prev, { id: saved.id, code: saved.code, label: saved.label, color: saved.color, contract_start: saved.contractStart, contract_end: saved.contractEnd, planned_start: saved.plannedStart, planned_end: saved.plannedEnd, status: saved.status, progress_pct: saved.progressPct, is_active: saved.isActive, created_at: new Date().toISOString() } as Project]);
        toast.success('Chantier créé');
      } catch { toast.error('Erreur lors de la création'); return; }
    } else {
      const newProject: Project = { id: crypto.randomUUID(), code: body.code, label: body.label, color: body.color, contract_start: body.contractStart, contract_end: body.contractEnd, planned_start: body.plannedStart, planned_end: body.plannedEnd, status: body.status, progress_pct: body.progressPct, is_active: true, created_at: new Date().toISOString() } as Project;
      setProjects(prev => [...prev, newProject]);
      toast.success('Chantier créé');
    }
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewCode('');
    setNewLabel('');
    setNewColor(getRandomProjectColor());
    setNewStartDate(undefined);
    setNewEndDate(undefined);
    setNewStatus('A_PLANIFIER');
    setNewProgress(0);
    setShowAddForm(false);
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setEditCode(project.code);
    setEditLabel(project.label);
    setEditColor(project.color);
    setEditStartDate(project.planned_start ? new Date(project.planned_start) : undefined);
    setEditEndDate(project.planned_end ? new Date(project.planned_end) : undefined);
    setEditStatus(project.status);
    setEditProgress(project.progress_pct);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editCode.trim() || !editLabel.trim()) { toast.error('Le code et le libellé sont requis'); return; }
    const patch = { code: editCode.trim().toUpperCase(), label: editLabel.trim(), color: editColor, plannedStart: editStartDate ? format(editStartDate, 'yyyy-MM-dd') : null, plannedEnd: editEndDate ? format(editEndDate, 'yyyy-MM-dd') : null, status: editStatus, progressPct: editProgress };
    if (isApiEnabled()) {
      try { await api.projects.update(id, patch as any); } catch { toast.error('Erreur lors de la modification'); return; }
    }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, code: patch.code, label: patch.label, color: patch.color, planned_start: patch.plannedStart, planned_end: patch.plannedEnd, status: patch.status as any, progress_pct: patch.progressPct } : p));
    setEditingId(null);
    toast.success('Chantier modifié');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce chantier ?')) return;
    if (isApiEnabled()) {
      try { await api.projects.delete(id); } catch { toast.error('Erreur lors de la suppression'); return; }
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success('Chantier supprimé');
  };

  const handleToggleActive = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    if (isApiEnabled()) {
      try { await api.projects.update(id, { isActive: !project.is_active } as any); } catch { toast.error('Erreur'); return; }
    }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p));
  };

  const ColorPicker = ({ value, onChange }: { value: string; onChange: (color: string) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:opacity-80"
          style={{ backgroundColor: `hsl(${value})` }}
        >
          <Palette className="w-4 h-4 text-white drop-shadow-md" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <div className="grid grid-cols-5 gap-2">
          {PROJECT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={cn(
                "w-8 h-8 rounded-md border-2 transition-transform hover:scale-110",
                value === color ? "border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: `hsl(${color})` }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  const DatePickerButton = ({ 
    date, 
    onSelect, 
    placeholder 
  }: { 
    date: Date | undefined; 
    onSelect: (date: Date | undefined) => void; 
    placeholder: string;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-[120px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd/MM/yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 text-muted-foreground 
                           hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Accueil
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Gestion des Chantiers</h1>
                  <p className="text-sm text-muted-foreground">{projects.length} chantier(s)</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground 
                         rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau chantier
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search + filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Rechercher par code ou libellé..."
              className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'A_PLANIFIER', 'EN_COURS', 'BLOQUE', 'TERMINE'] as const).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}>
                {s === 'all' ? 'Tous' : PROJECT_STATUS_LABELS[s as ProjectStatus]}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{filteredProjects.length} résultat(s) — page {page + 1}/{totalPages || 1}</span>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-3">Nouveau chantier</h3>
                <div className="space-y-4">
                  <div className="flex gap-3 items-center">
                    <ColorPicker value={newColor} onChange={setNewColor} />
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="Code (ex: F25010)"
                      className="w-32 px-3 py-2 bg-secondary rounded-lg text-foreground 
                                 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Libellé du chantier"
                      className="flex-1 px-3 py-2 bg-secondary rounded-lg text-foreground 
                                 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm text-muted-foreground">Dates prévisionnelles :</span>
                    <DatePickerButton date={newStartDate} onSelect={setNewStartDate} placeholder="Début" />
                    <span className="text-muted-foreground">→</span>
                    <DatePickerButton date={newEndDate} onSelect={setNewEndDate} placeholder="Fin" />
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm text-muted-foreground">Statut :</span>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as ProjectStatus)}
                      className="px-2 py-1.5 bg-secondary rounded-lg text-sm text-foreground focus:outline-none"
                    >
                      {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
                        <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <span className="text-sm text-muted-foreground">Avancement :</span>
                    <input
                      type="number" min={0} max={100}
                      value={newProgress}
                      onChange={e => setNewProgress(Number(e.target.value))}
                      className="w-20 px-2 py-1.5 bg-secondary rounded-lg text-sm text-foreground focus:outline-none"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAdd}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                      Créer
                    </button>
                    <button
                      onClick={resetAddForm}
                      className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground w-12"></th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground w-32">Code</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Libellé</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground w-48">Période prévue</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-foreground w-24">Statut</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-foreground w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProjects.map((project) => {
                const projectOFs = manufacturingOrders.filter(mo => mo.project_id === project.id);
                const isExpanded = expandedProjectId === project.id;
                return (
                <React.Fragment key={project.id}>
                <tr className="border-t border-border hover:bg-muted/30">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={`${projectOFs.length} OF(s)`}
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {editingId === project.id ? (
                        <ColorPicker value={editColor} onChange={setEditColor} />
                      ) : (
                        <div className="w-5 h-5 rounded-md" style={{ backgroundColor: `hsl(${project.color})` }} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === project.id ? (
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="w-full px-2 py-1 bg-secondary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <span className="font-mono font-medium text-primary">{project.code}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === project.id ? (
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full px-2 py-1 bg-secondary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    ) : (
                      <span className="text-foreground">{project.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === project.id ? (
                      <div className="flex gap-2 items-center">
                        <DatePickerButton date={editStartDate} onSelect={setEditStartDate} placeholder="Début" />
                        <DatePickerButton date={editEndDate} onSelect={setEditEndDate} placeholder="Fin" />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {project.planned_start && project.planned_end 
                          ? `${format(new Date(project.planned_start), 'dd/MM/yy')} → ${format(new Date(project.planned_end), 'dd/MM/yy')}`
                          : project.planned_start 
                            ? `Début: ${format(new Date(project.planned_start), 'dd/MM/yy')}`
                            : '-'
                        }
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(project.id)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors
                                 ${project.is_active 
                                   ? 'bg-success/10 text-success' 
                                   : 'bg-muted text-muted-foreground'}`}
                    >
                      {project.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === project.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(project.id)} className="p-2 text-success hover:bg-success/10 rounded-lg">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-muted-foreground hover:bg-secondary rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(project)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {/* OF sub-rows */}
                {isExpanded && projectOFs.length === 0 && (
                  <tr><td colSpan={6} className="pl-12 pr-4 py-2 text-xs text-muted-foreground italic bg-muted/10">Aucun OF pour ce chantier</td></tr>
                )}
                {isExpanded && projectOFs.map(mo => (
                  <tr key={mo.id} className="bg-muted/10 border-t border-border/40">
                    <td className="pl-8 pr-2 py-2">
                      <Package className="w-3.5 h-3.5 text-muted-foreground/60" />
                    </td>
                    <td className="px-4 py-2" colSpan={2}>
                      <span className="font-mono text-xs font-semibold text-foreground/80">{mo.code}</span>
                    </td>
                    <td className="px-4 py-2" colSpan={3}>
                      <span className="text-xs text-muted-foreground">
                        Créé le {format(new Date(mo.created_at), 'dd/MM/yyyy')}
                      </span>
                    </td>
                  </tr>
                ))}
                </React.Fragment>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun chantier trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setPage(0)} disabled={page === 0}
              className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-40 hover:bg-secondary/80 transition-colors">«</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-40 hover:bg-secondary/80 transition-colors">‹ Préc.</button>
            <span className="text-sm text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredProjects.length)} / {filteredProjects.length}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-40 hover:bg-secondary/80 transition-colors">Suiv. ›</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm disabled:opacity-40 hover:bg-secondary/80 transition-colors">»</button>
          </div>
        )}
      </main>
    </div>
  );
};
