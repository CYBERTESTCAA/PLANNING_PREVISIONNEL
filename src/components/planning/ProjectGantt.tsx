import { useMemo, useState } from 'react';
import { Project, Assignment, ProjectStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/planning';
import { 
  format, 
  startOfWeek,
  addDays, 
  differenceInDays, 
  isWeekend,
  addWeeks,
  subWeeks,
  isSameDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Info, Filter, Search, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const STATUS_ICONS: Record<ProjectStatus, string> = {
  A_PLANIFIER: '📋',
  EN_COURS: '🔨',
  BLOQUE: '🚫',
  TERMINE: '✅',
};

interface GanttData {
  project: Project;
  contractStart: Date | null;
  contractEnd: Date | null;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  assignmentCount: number;
  uniquePeople: string[];
}

interface ProjectGanttProps {
  projects: Project[];
  assignments: Assignment[];
  people: { id: string; display_name: string }[];
}

export const ProjectGantt = ({ projects, assignments, people }: ProjectGanttProps) => {
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeksToShow, setWeeksToShow] = useState(8);
  const [showOnlyWithActivity, setShowOnlyWithActivity] = useState(true);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const viewEnd = useMemo(() => 
    addDays(viewStart, weeksToShow * 7 - 1), 
    [viewStart, weeksToShow]
  );

  // Calculate days array for header
  const days = useMemo(() => {
    const result: Date[] = [];
    let current = viewStart;
    while (current <= viewEnd) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [viewStart, viewEnd]);

  // Calculate Gantt data for each project
  const ganttData = useMemo((): GanttData[] => {
    const query = searchQuery.toLowerCase().trim();
    return projects
      .filter(p => p.is_active)
      .map(project => {
        const projectAssignments = assignments.filter(a => a.project_id === project.id);
        
        // Get actual dates from assignments
        let actualStart: Date | null = null;
        let actualEnd: Date | null = null;
        const uniquePeopleIds = new Set<string>();
        
        projectAssignments.forEach(a => {
          const date = new Date(a.date);
          if (!actualStart || date < actualStart) actualStart = date;
          if (!actualEnd || date > actualEnd) actualEnd = date;
          uniquePeopleIds.add(a.person_id);
        });

        // Get planned dates
        const contractStart = project.contract_start ? new Date(project.contract_start) : null;
        const contractEnd = project.contract_end ? new Date(project.contract_end) : null;
        const plannedStart = project.planned_start ? new Date(project.planned_start) : null;
        const plannedEnd = project.planned_end ? new Date(project.planned_end) : null;

        return {
          project,
          contractStart,
          contractEnd,
          plannedStart,
          plannedEnd,
          actualStart,
          actualEnd,
          assignmentCount: projectAssignments.length,
          uniquePeople: Array.from(uniquePeopleIds).map(id => 
            people.find(p => p.id === id)?.display_name || 'Inconnu'
          ),
        };
      })
      .filter(data => {
        // Must have at least SOME data to display a Gantt bar
        const hasAnyDates = data.contractStart || data.plannedStart || data.actualStart;
        if (!hasAnyDates) return false;

        // Search filter
        if (query) {
          const matches = data.project.code.toLowerCase().includes(query)
            || data.project.label.toLowerCase().includes(query)
            || (data.project.client_name || '').toLowerCase().includes(query);
          if (!matches) return false;
        }

        // Period filter
        if (showOnlyWithActivity) {
          const effectiveStart = data.plannedStart || data.contractStart;
          const effectiveEnd = data.plannedEnd || data.contractEnd;
          const hasPlanned = effectiveStart && effectiveEnd &&
            !(effectiveEnd < viewStart || effectiveStart > viewEnd);
          const hasActual = data.actualStart && data.actualEnd &&
            !(data.actualEnd < viewStart || data.actualStart > viewEnd);
          return hasPlanned || hasActual;
        }
        return true;
      })
      .sort((a, b) => {
        const aStart = a.plannedStart || a.contractStart || a.actualStart;
        const bStart = b.plannedStart || b.contractStart || b.actualStart;
        if (aStart && bStart) return aStart.getTime() - bStart.getTime();
        if (aStart) return -1;
        if (bStart) return 1;
        return a.project.code.localeCompare(b.project.code);
      });
  }, [projects, assignments, people, viewStart, viewEnd, showOnlyWithActivity, searchQuery]);

  // Count projects that have no dates at all (for info message)
  const projectsWithoutDates = useMemo(
    () => projects.filter(p => p.is_active && !p.contract_start && !p.planned_start && assignments.filter(a => a.project_id === p.id).length === 0).length,
    [projects, assignments]
  );

  // Calculate bar position and width
  const calculateBarStyle = (start: Date | null, end: Date | null) => {
    if (!start || !end) return null;
    
    const clampedStart = start < viewStart ? viewStart : start;
    const clampedEnd = end > viewEnd ? viewEnd : end;
    
    if (clampedStart > viewEnd || clampedEnd < viewStart) return null;

    const startOffset = differenceInDays(clampedStart, viewStart);
    const duration = differenceInDays(clampedEnd, clampedStart) + 1;
    const totalDays = days.length;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  // Navigation
  const goToPrevious = () => setViewStart(prev => subWeeks(prev, 2));
  const goToNext = () => setViewStart(prev => addWeeks(prev, 2));
  const goToToday = () => setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Zoom
  const zoomIn = () => setWeeksToShow(prev => Math.max(4, prev - 2));
  const zoomOut = () => setWeeksToShow(prev => Math.min(16, prev + 2));

  // Get week headers
  const weekHeaders = useMemo(() => {
    const weeks: { start: Date; label: string }[] = [];
    let current = viewStart;
    while (current <= viewEnd) {
      weeks.push({
        start: current,
        label: format(current, "'S'w", { locale: fr }),
      });
      current = addWeeks(current, 1);
    }
    return weeks;
  }, [viewStart, viewEnd]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{ganttData.length} chantier(s)</span>
          {projectsWithoutDates > 0 && (
            <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full font-medium">
              {projectsWithoutDates} sans dates
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un chantier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
            />
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Filter toggle */}
          <button
            onClick={() => setShowOnlyWithActivity(!showOnlyWithActivity)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                       ${showOnlyWithActivity 
                         ? 'bg-primary text-primary-foreground' 
                         : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Période
          </button>

          <div className="h-6 w-px bg-border" />

          {/* Zoom controls */}
          <button
            onClick={zoomIn}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
            title="Zoom +"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
            title="Zoom -"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-border" />

          {/* Navigation */}
          <button
            onClick={goToPrevious}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-secondary text-foreground hover:bg-secondary/80 rounded-lg"
          >
            Aujourd'hui
          </button>
          <button
            onClick={goToNext}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-border bg-muted/20 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm border-2 border-dashed border-slate-500" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(100,100,100,0.15) 2px, rgba(100,100,100,0.15) 4px)' }} />
          <span className="text-xs text-muted-foreground">Contractuel (baseline)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm bg-primary/30 border border-primary/60" />
          <span className="text-xs text-muted-foreground">Prévisionnel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm bg-primary" />
          <span className="text-xs text-muted-foreground">Réel (affectations)</span>
        </div>
        <div className="flex items-center gap-6 ml-auto">
          {(['A_PLANIFIER', 'EN_COURS', 'BLOQUE', 'TERMINE'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="text-xs">{STATUS_ICONS[s]}</span>
              <span className="text-xs text-muted-foreground">{PROJECT_STATUS_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${days.length * 24}px` }}>
          {/* Header - Weeks */}
          <div className="flex border-b border-border sticky top-0 bg-card z-10">
            <div className="w-64 shrink-0 px-4 py-2 border-r border-border bg-muted/50 font-medium text-sm text-foreground">
              Chantier
            </div>
            <div className="flex-1 flex">
              {weekHeaders.map((week, i) => (
                <div
                  key={i}
                  className="flex-1 text-center py-2 border-r border-border last:border-r-0 bg-muted/50 text-sm font-medium text-foreground"
                  style={{ minWidth: `${7 * 24}px` }}
                >
                  {week.label} - {format(week.start, 'dd MMM', { locale: fr })}
                </div>
              ))}
            </div>
          </div>

          {/* Header - Days */}
          <div className="flex border-b border-border sticky top-[41px] bg-card z-10">
            <div className="w-64 shrink-0 border-r border-border" />
            <div className="flex-1 flex">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`w-6 shrink-0 text-center py-1 border-r border-border last:border-r-0 text-xs
                             ${isWeekend(day) ? 'bg-muted text-muted-foreground' : ''}
                             ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground font-bold' : ''}`}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {ganttData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {searchQuery ? 'Aucun chantier trouvé' : 'Pas de vue Gantt disponible'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery
                    ? `Aucun résultat pour "${searchQuery}"`
                    : 'Des données sont manquantes — les chantiers affichés ici doivent avoir des dates contractuelles, prévisionnelles ou des affectations.'}
                </p>
                {!searchQuery && showOnlyWithActivity && (
                  <button
                    onClick={() => setShowOnlyWithActivity(false)}
                    className="mt-3 text-xs text-primary hover:underline font-medium"
                  >
                    Afficher tous les chantiers avec des dates
                  </button>
                )}
              </div>
            </div>
          ) : (
            ganttData.map((data, index) => {
              const contractStyle = calculateBarStyle(data.contractStart, data.contractEnd);
              const effectivePlannedStart = data.plannedStart ?? data.contractStart;
              const effectivePlannedEnd = data.plannedEnd ?? data.contractEnd;
              const plannedStyle = calculateBarStyle(effectivePlannedStart, effectivePlannedEnd);
              const actualStyle = calculateBarStyle(data.actualStart, data.actualEnd);
              const statusColor = `hsl(${PROJECT_STATUS_COLORS[data.project.status]})`;

              return (
                <div
                  key={data.project.id}
                  className={`flex border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors
                             ${index % 2 === 0 ? 'bg-card' : 'bg-muted/10'}`}
                  onMouseEnter={() => setHoveredProject(data.project.id)}
                  onMouseLeave={() => setHoveredProject(null)}
                >
                  {/* Project info */}
                  <div className="w-64 shrink-0 px-3 py-2.5 border-r border-border flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: `hsl(${data.project.color})` }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary truncate">{data.project.code}</span>
                        <span className="text-[10px]" title={PROJECT_STATUS_LABELS[data.project.status]}>{STATUS_ICONS[data.project.status]}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{data.project.label}</div>
                      {/* Progress bar */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${data.project.progress_pct}%`, backgroundColor: statusColor }} />
                        </div>
                        <span className="text-[10px] font-semibold shrink-0" style={{ color: statusColor }}>{data.project.progress_pct}%</span>
                      </div>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1 text-muted-foreground hover:text-foreground shrink-0">
                          <Info className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs space-y-1.5">
                        <div className="font-medium text-sm">{data.project.code} – {data.project.label}</div>
                        <div className="text-xs" style={{ color: statusColor }}>{STATUS_ICONS[data.project.status]} {PROJECT_STATUS_LABELS[data.project.status]} · {data.project.progress_pct}%</div>
                        {data.contractStart && data.contractEnd && (
                          <div className="text-xs"><span className="text-muted-foreground">Contractuel: </span>{format(data.contractStart, 'dd/MM/yy')} → {format(data.contractEnd, 'dd/MM/yy')}</div>
                        )}
                        {data.plannedStart && data.plannedEnd && (
                          <div className="text-xs"><span className="text-muted-foreground">Prévisionnel: </span>{format(data.plannedStart, 'dd/MM/yy')} → {format(data.plannedEnd, 'dd/MM/yy')}</div>
                        )}
                        {data.actualStart && data.actualEnd && (
                          <div className="text-xs"><span className="text-muted-foreground">Réel: </span>{format(data.actualStart, 'dd/MM/yy')} → {format(data.actualEnd, 'dd/MM/yy')}</div>
                        )}
                        <div className="text-xs"><span className="text-muted-foreground">Affectations: </span>{data.assignmentCount}</div>
                        {data.uniquePeople.length > 0 && (
                          <div className="text-xs"><span className="text-muted-foreground">Intervenants: </span>{data.uniquePeople.join(', ')}</div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Gantt bars — 3 layers stacked vertically */}
                  <div className="flex-1 relative h-16">
                    {/* Weekend backgrounds */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((day, i) => (
                        <div key={i} className={`w-6 shrink-0 h-full ${isWeekend(day) ? 'bg-muted/40' : ''}`} />
                      ))}
                    </div>

                    {/* Today line */}
                    {days.some(d => isSameDay(d, new Date())) && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary/70 z-10"
                        style={{ left: `${(differenceInDays(new Date(), viewStart) / days.length) * 100}%` }}
                      />
                    )}

                    {/* Layer 1: Contractuel (hatched, baseline) */}
                    {contractStyle && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        className="absolute top-1.5 h-3 rounded-sm border-2 border-dashed"
                        style={{
                          ...contractStyle,
                          borderColor: `hsl(${data.project.color} / 0.6)`,
                          background: `repeating-linear-gradient(45deg, transparent, transparent 3px, hsl(${data.project.color} / 0.08) 3px, hsl(${data.project.color} / 0.08) 6px)`,
                          transformOrigin: 'left',
                        }}
                      />
                    )}

                    {/* Layer 2: Prévisionnel (light fill) */}
                    {plannedStyle && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        className="absolute top-6 h-3 rounded-sm border"
                        style={{
                          ...plannedStyle,
                          backgroundColor: `hsl(${data.project.color} / 0.25)`,
                          borderColor: `hsl(${data.project.color} / 0.7)`,
                          transformOrigin: 'left',
                        }}
                      />
                    )}

                    {/* Layer 3: Réel (solid) + progress overlay */}
                    {actualStyle && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        className="absolute top-[42px] h-3 rounded-sm shadow-sm overflow-hidden"
                        style={{
                          ...actualStyle,
                          backgroundColor: `hsl(${data.project.color} / 0.35)`,
                          transformOrigin: 'left',
                        }}
                      >
                        {/* Progress fill inside réel bar */}
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${data.project.progress_pct}%`,
                            backgroundColor: `hsl(${data.project.color})`,
                          }}
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
