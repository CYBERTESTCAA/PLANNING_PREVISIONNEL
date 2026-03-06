import { Link } from 'react-router-dom';
import { HardHat, Calendar, ArrowRight, BarChart3, Building2, Check, RefreshCw, Clock, LogIn, Shield, LogOut, Users, Briefcase, Factory, TrendingUp, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { useMemo, useState, useEffect, useRef } from 'react';
import { api, isApiEnabled, type ApiSyncProgress } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PROJECT_STATUS_LABELS } from '@/types/planning';

interface SyncStatus { inProgress: boolean; last: { startedAt?: string; finishedAt?: string; projects?: number; employees?: number } | null }

const Index = () => {
  const store = usePlanningStore();
  const { subsidiaries, workshops, people, projects, assignments, absences, selectedSubsidiaryId, setSelectedSubsidiaryId } = store;
  const auth = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<ApiSyncProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isApiEnabled()) return;
    api.sync.status().then(data => {
      setSyncStatus({ inProgress: data.inProgress, last: data.last });
      if (data.inProgress) setSyncing(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (syncing) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.sync.progress();
          setProgress(res.progress);
          if (!res.inProgress) {
            setSyncing(false);
            api.sync.status().then(s => setSyncStatus({ inProgress: false, last: s.last })).catch(() => {});
          }
        } catch {}
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setProgress(null);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [syncing]);

  const triggerSync = async () => {
    if (!isApiEnabled() || syncing) return;
    setSyncing(true);
    setProgress(null);
    try {
      await api.sync.trigger('manual');
      const s = await api.sync.status();
      setSyncStatus({ inProgress: false, last: s.last });
      // Reload data after sync completes
      window.location.reload();
    } catch {}
    finally { setSyncing(false); }
  };

  // ── Computed stats ──────────────────────────────────────
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  const filteredPeople = useMemo(
    () => people.filter(p => p.is_active && (!selectedSubsidiaryId || p.subsidiary_id === selectedSubsidiaryId)),
    [people, selectedSubsidiaryId]
  );
  const filteredProjects = useMemo(
    () => projects.filter(p => !selectedSubsidiaryId || workshops.find(w => w.id === p.workshop_id)?.subsidiary_id === selectedSubsidiaryId),
    [projects, workshops, selectedSubsidiaryId]
  );
  const filteredWorkshops = useMemo(
    () => workshops.filter(w => !selectedSubsidiaryId || w.subsidiary_id === selectedSubsidiaryId),
    [workshops, selectedSubsidiaryId]
  );

  const activeProjects = useMemo(() => filteredProjects.filter(p => p.is_active), [filteredProjects]);
  const projectsByStatus = useMemo(() => {
    const counts = { A_PLANIFIER: 0, EN_COURS: 0, BLOQUE: 0, TERMINE: 0 };
    filteredProjects.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
    return counts;
  }, [filteredProjects]);

  const todayAssignments = useMemo(
    () => assignments.filter(a => a.date === todayStr),
    [assignments, todayStr]
  );
  const todayAbsences = useMemo(
    () => absences.filter(a => a.date === todayStr),
    [absences, todayStr]
  );

  const avgProgress = useMemo(() => {
    if (activeProjects.length === 0) return 0;
    return Math.round(activeProjects.reduce((s, p) => s + (p.progress_pct || 0), 0) / activeProjects.length);
  }, [activeProjects]);

  const recentProjects = useMemo(
    () => [...activeProjects]
      .sort((a, b) => (b.planned_start || '').localeCompare(a.planned_start || ''))
      .slice(0, 8),
    [activeProjects]
  );

  const statusConfig = [
    { key: 'EN_COURS' as const, label: 'En cours', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { key: 'A_PLANIFIER' as const, label: 'À planifier', icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800/40' },
    { key: 'BLOQUE' as const, label: 'Bloqué', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { key: 'TERMINE' as const, label: 'Terminé', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Page header */}
      <header className="bg-card border-b border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{todayLabel}</p>
          </div>

          {/* Auth card */}
          {auth.isAuthenticated ? (
            <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                {auth.isAdmin
                  ? <Shield className="w-4.5 h-4.5 text-primary" />
                  : <span className="text-sm font-bold text-primary">{(auth.userName || '?')[0].toUpperCase()}</span>
                }
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {auth.userName}
                  {auth.isAdmin && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold uppercase">Admin</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{auth.userEmail}</div>
              </div>
              <button
                onClick={auth.logout}
                title="Se déconnecter"
                className="ml-2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : auth.msalUnavailable ? (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">Authentification indisponible</div>
                <div className="text-xs text-amber-600 dark:text-amber-400">HTTPS requis — déployez sur la VM pour se connecter</div>
              </div>
            </div>
          ) : auth.isAdmin && !auth.isAuthenticated ? (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Mode développement</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Admin activé — pas d'authentification requise</div>
              </div>
            </div>
          ) : (
            <motion.button
              onClick={auth.login}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 px-5 py-3 bg-primary text-primary-foreground rounded-xl
                         font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <LogIn className="w-4.5 h-4.5" />
              Se connecter avec Microsoft
            </motion.button>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        {/* Row 1: Subsidiary selector + Sync */}
        <div className="flex items-center justify-between gap-4">
          {subsidiaries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Filiale</span>
              {subsidiaries.map((sub) => {
                const isSelected = selectedSubsidiaryId === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubsidiaryId(sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                               ${isSelected
                                 ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                 : 'bg-card border-border text-foreground hover:border-primary/40 hover:bg-accent'}`}
                  >
                    <Building2 className="w-3 h-3 shrink-0" />
                    {sub.name}
                    {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          {isApiEnabled() && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {syncing && progress ? (
                <span className="text-primary font-medium">{progress.percent}% — {progress.stepLabel}</span>
              ) : syncStatus?.last ? (
                <span>Sync : {(() => { const d = new Date(syncStatus.last!.finishedAt || syncStatus.last!.startedAt || ''); return isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR'); })()}</span>
              ) : (
                <span>{syncStatus === null ? '…' : 'Pas de sync'}</span>
              )}
              <button onClick={triggerSync} disabled={syncing}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-foreground text-xs rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sync…' : 'Sync'}
              </button>
            </div>
          )}
        </div>

        {/* Row 2: KPI Cards (compact) */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Employés', value: filteredPeople.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
            { label: 'Chantiers actifs', value: activeProjects.length, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
            { label: 'Ateliers', value: filteredWorkshops.length, icon: Factory, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40' },
            { label: 'Avancement moy.', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground leading-tight">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Row 3: Three columns — Status breakdown + Today + Quick access */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Project status breakdown */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              Statut chantiers
            </h2>
            <div className="space-y-2.5">
              {statusConfig.map(st => {
                const count = projectsByStatus[st.key];
                const total = filteredProjects.length || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={st.key} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${st.bg}`}>
                      <st.icon className={`w-3 h-3 ${st.color}`} />
                    </div>
                    <span className="text-xs text-foreground font-medium w-20 shrink-0">{st.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full transition-all duration-700 ${
                        st.key === 'EN_COURS' ? 'bg-blue-500' :
                        st.key === 'A_PLANIFIER' ? 'bg-slate-400' :
                        st.key === 'BLOQUE' ? 'bg-red-500' : 'bg-emerald-500'
                      }`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's snapshot */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Aujourd'hui
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-blue-600">{todayAssignments.length}</div>
                <div className="text-[10px] text-blue-600/70 font-medium">Affectations</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-amber-600">{todayAbsences.length}</div>
                <div className="text-[10px] text-amber-600/70 font-medium">Absences</div>
              </div>
            </div>
            <div className="space-y-1">
              {subsidiaries.map(sub => {
                const subPeople = people.filter(p => p.is_active && p.subsidiary_id === sub.id).length;
                const subWorkshops = workshops.filter(w => w.subsidiary_id === sub.id).length;
                return (
                  <div key={sub.id} className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/50">
                    <span className="font-medium text-foreground truncate">{sub.name}</span>
                    <span className="text-muted-foreground shrink-0">{subPeople} p. / {subWorkshops} a.</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick access */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
              Accès rapide
            </h2>
            <div className="space-y-1.5">
              {[
                { to: '/planning', icon: HardHat, title: 'Planning', desc: 'Grille hebdo', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
                { to: '/gantt', icon: BarChart3, title: 'Vue Gantt', desc: 'Timeline', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                { to: '/chantier', icon: Building2, title: 'Chantiers', desc: 'Suivi détaillé', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40' },
                { to: '/person-calendar', icon: Calendar, title: 'Calendrier', desc: 'Vue individuelle', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted/60 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground text-xs">{item.title}</div>
                    <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: Recent projects table (compact, max 5 rows) */}
        {recentProjects.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                <HardHat className="w-3.5 h-3.5 text-primary" />
                Chantiers actifs récents
              </h2>
              <Link to="/chantier" className="text-[10px] text-primary hover:underline font-medium">Voir tout</Link>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Code</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Libellé</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase hidden md:table-cell">Client</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase hidden lg:table-cell">Statut</th>
                  <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase w-28">Avancement</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.slice(0, 5).map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `hsl(${p.color})` }} />
                        <span className="font-mono font-semibold text-foreground">{p.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-foreground truncate max-w-[180px]">{p.label}</td>
                    <td className="px-4 py-1.5 text-muted-foreground hidden md:table-cell">{p.client_name || '—'}</td>
                    <td className="px-4 py-1.5 hidden lg:table-cell">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        p.status === 'EN_COURS' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        p.status === 'A_PLANIFIER' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' :
                        p.status === 'BLOQUE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-14 bg-muted rounded-full h-1 overflow-hidden">
                          <div className={`h-1 rounded-full ${p.progress_pct >= 80 ? 'bg-emerald-500' : p.progress_pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${p.progress_pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-foreground w-7 text-right">{p.progress_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
