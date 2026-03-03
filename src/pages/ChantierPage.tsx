import { useState, useMemo, useEffect } from 'react';
import { api, isApiEnabled, ApiAssignment, ApiTimeEntrySummary } from '@/lib/api';
import { Assignment } from '@/types/planning';
import { usePlanningData } from '@/hooks/usePlanningData';
import { Link } from 'react-router-dom';
import { ArrowLeft, HardHat, Search, Calendar, Users, Factory, TrendingUp, Clock, ChevronLeft, ChevronRight, Briefcase, UserCheck } from 'lucide-react';
import { Project, ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, SLOT_LABELS } from '@/types/planning';
import { SubsidiarySelector } from '@/components/planning/SubsidiarySelector';
import { WorkshopSelector } from '@/components/planning/WorkshopSelector';
import { addWeeks, subWeeks, startOfWeek, addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

const STATUS_ICONS: Record<ProjectStatus, string> = {
  A_PLANIFIER: '📋',
  EN_COURS: '🔨',
  BLOQUE: '🚫',
  TERMINE: '✅',
};

export const ChantierPage = () => {
  const {
    subsidiaries, workshopsForSubsidiary,
    selectedSubsidiaryId, setSelectedSubsidiaryId,
    selectedWorkshopId, setSelectedWorkshopId,
    projects, assignments, people, manufacturingOrders,
  } = usePlanningData();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);
  const [loadingProject, setLoadingProject] = useState(false);
  const [timeSummary, setTimeSummary] = useState<ApiTimeEntrySummary | null>(null);

  useEffect(() => {
    if (!selectedProjectId || !isApiEnabled()) { setLocalAssignments([]); setTimeSummary(null); return; }
    setLoadingProject(true);
    Promise.all([
      api.assignments.list({ projectId: selectedProjectId }),
      api.timeEntries.summary({ projectId: selectedProjectId }).catch(() => null),
    ])
      .then(([data, summary]) => {
        setLocalAssignments(data.map((a: ApiAssignment) => ({
          id: a.id, person_id: a.employeeId, project_id: a.projectId,
          manufacturing_order_id: a.manufacturingOrderId ?? undefined,
          date: a.date.slice(0, 10), slot: a.slot as any,
          time_spent_minutes: a.timeSpentMinutes ?? null, comment: a.comment ?? null,
          created_at: new Date().toISOString(), project: a.project as any, manufacturing_order: a.manufacturingOrder as any,
        } as unknown as Assignment)));
        setTimeSummary(summary);
      })
      .catch(console.error)
      .finally(() => setLoadingProject(false));
  }, [selectedProjectId]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const activeProjects = useMemo(() => projects.filter(p => p.is_active), [projects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return activeProjects;
    const q = searchQuery.toLowerCase();
    return activeProjects.filter(p =>
      p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
    );
  }, [activeProjects, searchQuery]);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const projectAssignments = useMemo(
    () => isApiEnabled() && localAssignments.length > 0
      ? localAssignments
      : assignments.filter(a => a.project_id === selectedProjectId),
    [assignments, localAssignments, selectedProjectId]
  );

  const projectOFs = useMemo(
    () => manufacturingOrders.filter(mo => mo.project_id === selectedProjectId),
    [manufacturingOrders, selectedProjectId]
  );

  const weekAssignments = useMemo(() => {
    const weekDateStrs = weekDays.map(d => format(d, 'yyyy-MM-dd'));
    return projectAssignments.filter(a => weekDateStrs.includes(a.date));
  }, [projectAssignments, weekDays]);

  const peopleById = useMemo(() => new Map(people.map(p => [p.id, p])), [people]);

  const dayBreakdown = useMemo(() => {
    return weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayAssignments = weekAssignments.filter(a => a.date === dateStr);
      const amAssignments = dayAssignments.filter(a => a.slot === 'AM' || a.slot === 'FULL');
      const pmAssignments = dayAssignments.filter(a => a.slot === 'PM' || a.slot === 'FULL');
      const uniquePeople = [...new Set(dayAssignments.map(a => a.person_id))];
      return { date: day, dateStr, dayAssignments, amAssignments, pmAssignments, uniquePeople };
    });
  }, [weekDays, weekAssignments]);

  const allProjectPeople = useMemo(() => {
    const ids = [...new Set(projectAssignments.map(a => a.person_id))];
    return ids.map(id => peopleById.get(id)).filter(Boolean);
  }, [projectAssignments, peopleById]);

  const totalMinutes = useMemo(
    () => projectAssignments.reduce((acc, a) => acc + (a.time_spent_minutes ?? 0), 0),
    [projectAssignments]
  );

  const ofBreakdown = useMemo(() => {
    return projectOFs.map(of => {
      const ofAssignments = projectAssignments.filter(a => a.manufacturing_order_id === of.id);
      const ofMinutes = ofAssignments.reduce((acc, a) => acc + (a.time_spent_minutes ?? 0), 0);
      const ofPeople = [...new Set(ofAssignments.map(a => a.person_id))];
      return { of, assignments: ofAssignments, minutes: ofMinutes, people: ofPeople };
    });
  }, [projectOFs, projectAssignments]);

  const formatMinutes = (min: number) => {
    if (min === 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? (m > 0 ? `${h}h${m}` : `${h}h`) : `${m}min`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
                Accueil
              </Link>
              <div className="h-5 w-px bg-border" />
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <HardHat className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Vue Chantier</h1>
                <p className="text-xs text-muted-foreground">Planification et suivi par chantier</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SubsidiarySelector subsidiaries={subsidiaries} selectedSubsidiaryId={selectedSubsidiaryId} onSelectSubsidiary={setSelectedSubsidiaryId} />
              <WorkshopSelector workshops={workshopsForSubsidiary} selectedWorkshopId={selectedWorkshopId} onSelectWorkshop={setSelectedWorkshopId} />
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-4 flex gap-4">
        {/* Left panel: project picker */}
        <aside className="w-72 shrink-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher un chantier..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
              {filteredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors
                             ${selectedProjectId === project.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/40'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: `hsl(${project.color})` }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">{project.code}</span>
                        <span className="text-[10px]">{STATUS_ICONS[project.status]}</span>
                        {project.is_interne && <span className="text-[8px] px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-bold">INT</span>}
                        {project.is_soldee && <span className="text-[8px] px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded font-bold">SOLDÉ</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{project.label}</div>
                      {project.client_name && <div className="text-[10px] text-primary/70 truncate">{project.client_name}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold" style={{ color: `hsl(${PROJECT_STATUS_COLORS[project.status]})` }}>
                        {project.progress_pct}%
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredProjects.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">Aucun chantier trouvé</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {!selectedProject ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sélectionnez un chantier</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Project header card */}
              <motion.div
                key={selectedProject.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `hsl(${selectedProject.color} / 0.15)` }}>
                      <HardHat className="w-5 h-5" style={{ color: `hsl(${selectedProject.color})` }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-foreground">{selectedProject.code}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `hsl(${PROJECT_STATUS_COLORS[selectedProject.status]} / 0.15)`,
                            color: `hsl(${PROJECT_STATUS_COLORS[selectedProject.status]})`,
                          }}
                        >
                          {STATUS_ICONS[selectedProject.status]} {PROJECT_STATUS_LABELS[selectedProject.status]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedProject.label}</p>
                      {selectedProject.client_name && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Client : <strong className="text-foreground">{selectedProject.client_name}</strong></span>
                          {selectedProject.affaire_code && (
                            <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-muted rounded">Affaire {selectedProject.affaire_code}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="text-right min-w-[120px]">
                    <div className="text-2xl font-bold text-foreground">{selectedProject.progress_pct}%</div>
                    <div className="w-full h-2 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${selectedProject.progress_pct}%`,
                          backgroundColor: `hsl(${selectedProject.color})`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Info badges */}
                {(selectedProject.is_interne || selectedProject.is_soldee) && (
                  <div className="flex items-center gap-2 mt-3">
                    {selectedProject.is_interne && (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold">Commande interne</span>
                    )}
                    {selectedProject.is_soldee && (
                      <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-bold">Soldée</span>
                    )}
                  </div>
                )}

                {/* Dates grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Contractuel début</div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedProject.contract_start ? format(new Date(selectedProject.contract_start), 'dd/MM/yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Contractuel fin</div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedProject.contract_end ? format(new Date(selectedProject.contract_end), 'dd/MM/yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Prévisionnel début</div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedProject.planned_start ? format(new Date(selectedProject.planned_start), 'dd/MM/yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">Prévisionnel fin</div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedProject.planned_end ? format(new Date(selectedProject.planned_end), 'dd/MM/yyyy') : '—'}
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span><strong className="text-foreground">{allProjectPeople.length}</strong> intervenant(s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span><strong className="text-foreground">{projectAssignments.length}</strong> affectation(s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Factory className="w-4 h-4" />
                    <span><strong className="text-foreground">{projectOFs.length}</strong> OF</span>
                  </div>
                  {totalMinutes > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span><strong className="text-foreground">{formatMinutes(totalMinutes)}</strong> temps planifié</span>
                    </div>
                  )}
                  {timeSummary && timeSummary.totalHours > 0 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                      <span><strong>{timeSummary.totalHours.toFixed(1)}h</strong> temps réel (ERP)</span>
                    </div>
                  )}
                </div>

                {/* Personnel (commercial, technicien, responsable) */}
                {(selectedProject.commercial_name || selectedProject.technicien_name || selectedProject.responsable_name) && (
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/30">
                    {selectedProject.responsable_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Responsable : <strong className="text-foreground">{selectedProject.responsable_name}</strong></span>
                      </div>
                    )}
                    {selectedProject.commercial_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Commercial : <strong className="text-foreground">{selectedProject.commercial_name}</strong></span>
                      </div>
                    )}
                    {selectedProject.technicien_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HardHat className="w-3.5 h-3.5" />
                        <span>Technicien : <strong className="text-foreground">{selectedProject.technicien_name}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Weekly planning view */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Planning de la semaine
                  </h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setWeekStart(prev => subWeeks(prev, 1))} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-muted-foreground min-w-[140px] text-center">
                      {format(weekStart, 'd MMM', { locale: fr })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}
                    </span>
                    <button onClick={() => setWeekStart(prev => addWeeks(prev, 1))} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Créneau</th>
                        {dayBreakdown.map(({ date, dateStr }) => {
                          const isWknd = date.getDay() === 0 || date.getDay() === 6;
                          const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                          return (
                            <th key={dateStr} className={`text-center px-2 py-2 text-xs font-semibold uppercase tracking-wider
                                       ${isToday ? 'bg-primary text-primary-foreground' : isWknd ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                              <div>{format(date, 'EEE', { locale: fr })}</div>
                              <div className="text-base font-bold">{format(date, 'd')}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* AM row */}
                      <tr className="border-b border-border/50">
                        <td className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/20">
                          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold">Matin</span>
                        </td>
                        {dayBreakdown.map(({ dateStr, amAssignments }) => (
                          <td key={dateStr} className="px-2 py-2 align-top">
                            {amAssignments.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {amAssignments.map(a => {
                                  const person = peopleById.get(a.person_id);
                                  return (
                                    <span key={a.id} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md font-medium text-foreground whitespace-nowrap">
                                      {person?.display_name.split(' ')[0] ?? '?'}
                                      {a.slot === 'FULL' && <span className="ml-1 opacity-50">↕</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                      {/* PM row */}
                      <tr className="border-b border-border/50">
                        <td className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/20">
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold">Après-midi</span>
                        </td>
                        {dayBreakdown.map(({ dateStr, pmAssignments }) => (
                          <td key={dateStr} className="px-2 py-2 align-top">
                            {pmAssignments.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {pmAssignments.map(a => {
                                  const person = peopleById.get(a.person_id);
                                  return (
                                    <span key={a.id} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md font-medium text-foreground whitespace-nowrap">
                                      {person?.display_name.split(' ')[0] ?? '?'}
                                      {a.slot === 'FULL' && <span className="ml-1 opacity-50">↕</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                      {/* Unique people count */}
                      <tr>
                        <td className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/20">
                          <span className="text-[10px] text-muted-foreground">Total</span>
                        </td>
                        {dayBreakdown.map(({ dateStr, uniquePeople }) => (
                          <td key={dateStr} className="px-2 py-1.5 text-center">
                            {uniquePeople.length > 0 ? (
                              <span className="text-xs font-bold text-primary">{uniquePeople.length} pers.</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/30">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* OFs breakdown */}
              {projectOFs.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Factory className="w-4 h-4 text-primary" />
                      Ordres de Fabrication
                    </h2>
                  </div>
                  <div className="divide-y divide-border">
                    {ofBreakdown.map(({ of, assignments: ofA, minutes, people: ofPeople }) => (
                      <div key={of.id} className="px-4 py-3 flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm font-bold text-foreground">{of.code}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {ofA.length} affectation(s) · {ofPeople.length} intervenant(s)
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {ofPeople.map(personId => {
                            const person = peopleById.get(personId);
                            return (
                              <span key={personId} className="text-xs px-2 py-0.5 bg-secondary rounded-full text-foreground">
                                {person?.display_name.split(' ')[0] ?? '?'}
                              </span>
                            );
                          })}
                          {minutes > 0 && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                              <Clock className="w-3.5 h-3.5" />
                              {formatMinutes(minutes)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intervenants */}
              {allProjectPeople.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-primary" />
                    Intervenants sur ce chantier
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {allProjectPeople.map(person => {
                      if (!person) return null;
                      const personAssignments = projectAssignments.filter(a => a.person_id === person.id);
                      const personMinutes = personAssignments.reduce((acc, a) => acc + (a.time_spent_minutes ?? 0), 0);
                      return (
                        <div key={person.id} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {person.display_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">{person.display_name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {personAssignments.length} aff.{personMinutes > 0 ? ` · ${formatMinutes(personMinutes)}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
