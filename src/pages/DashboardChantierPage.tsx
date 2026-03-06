import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, ApiProject, ApiPlan, ApiPlanStats, ApiQuestion, ApiManufacturingOrder, ApiTimeEntrySummary, EtatAvancement } from '@/lib/api';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { LayoutDashboard, FileText, MessageCircleQuestion, Clock, CheckCircle2, AlertCircle, BarChart3, ArrowRight, Package, Search } from 'lucide-react';

const ETAT_COLORS: Record<string, { label: string; color: string }> = {
  A_FAIRE: { label: 'À faire', color: '#ef4444' },
  A_DIFFUSER: { label: 'À diffuser', color: '#eab308' },
  DIFFUSE_ARCHI: { label: 'Diffusé archi', color: '#a855f7' },
  EN_ATTENTE: { label: 'En attente', color: '#f97316' },
  EN_COURS_PLAN: { label: 'En cours', color: '#3b82f6' },
  SUPPRIME: { label: 'Supprimé', color: '#9ca3af' },
  VALIDE: { label: 'Validé', color: '#22c55e' },
  A_MODIFIER: { label: 'À modifier', color: '#8b5cf6' },
};

function ProgressBar({ value, max, color = 'bg-blue-500', label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      {label && <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{pct}%</span></div>}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DashboardChantierPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const { selectedSubsidiaryId, workshops } = usePlanningStore();

  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [stats, setStats] = useState<ApiPlanStats | null>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [timeSummary, setTimeSummary] = useState<ApiTimeEntrySummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Global data (when no project selected)
  const [globalPlans, setGlobalPlans] = useState<ApiPlan[]>([]);
  const [globalQuestions, setGlobalQuestions] = useState<ApiQuestion[]>([]);
  const [globalOFs, setGlobalOFs] = useState<ApiManufacturingOrder[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => { api.projects.list().then(setAllProjects).catch(console.error); }, []);

  // Load global stats when no project selected
  useEffect(() => {
    if (projectId) return;
    setGlobalLoading(true);
    Promise.all([
      api.plans.list().catch(() => [] as ApiPlan[]),
      api.questions.list().catch(() => [] as ApiQuestion[]),
      api.manufacturingOrders.list().catch(() => [] as ApiManufacturingOrder[]),
    ]).then(([p, q, o]) => {
      setGlobalPlans(p);
      setGlobalQuestions(q);
      setGlobalOFs(o);
    }).finally(() => setGlobalLoading(false));
  }, [projectId]);

  // Filter projects by selected subsidiary
  const projects = useMemo(() => {
    const filtered = !selectedSubsidiaryId ? allProjects : allProjects.filter(p => {
      const subWorkshopIds = new Set(workshops.filter(w => w.subsidiary_id === selectedSubsidiaryId).map(w => w.id));
      return subWorkshopIds.has(p.workshopId);
    });
    return [...filtered].sort((a, b) => {
      const da = a.plannedStart || a.contractStart || '';
      const db = b.plannedStart || b.contractStart || '';
      if (db !== da) return db.localeCompare(da);
      return b.code.localeCompare(a.code);
    });
  }, [allProjects, selectedSubsidiaryId, workshops]);

  const load = useCallback(async () => {
    if (!projectId) { setStats(null); setQuestions([]); setTimeSummary(null); return; }
    setLoading(true);
    try {
      const [s, q, t] = await Promise.all([
        api.plans.stats(projectId),
        api.questions.list({ projectId }),
        api.timeEntries.summary({ projectId }),
      ]);
      setStats(s);
      setQuestions(q);
      setTimeSummary(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const selectedProject = projects.find(p => p.id === projectId);
  const qNonTraite = questions.filter(q => q.avancement === 'NON_TRAITE').length;
  const qEnCours = questions.filter(q => q.avancement === 'EN_COURS_Q').length;
  const qTermine = questions.filter(q => q.avancement === 'TERMINE').length;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold">Dashboard Chantier</h1>
              {selectedProject && (
                <p className="text-sm text-indigo-600 font-medium">{selectedProject.code} — {selectedProject.label}</p>
              )}
            </div>
          </div>
          <select
            value={projectId}
            onChange={e => setSearchParams(e.target.value ? { projectId: e.target.value } : {})}
            className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[250px]"
            title="Sélectionner un chantier"
          >
            <option value="">Sélectionner un chantier…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.label}</option>)}
          </select>
        </div>
      </header>

      {!projectId ? (
        globalLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Chargement des données globales…</div>
        ) : (
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Row 1: KPIs with links */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FileText className="w-3.5 h-3.5" /> Chantiers</div>
              <div className="text-2xl font-bold">{projects.length}</div>
              <div className="text-[10px] text-green-600 font-medium">{projects.filter(p => p.status === 'EN_COURS').length} en cours</div>
            </div>
            <Link to="/plans" className="bg-white rounded-xl border p-4 hover:bg-blue-50 hover:border-blue-300 transition-all group">
              <div className="flex items-center gap-2 text-blue-600 text-xs mb-1"><FileText className="w-3.5 h-3.5" /> Plans <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" /></div>
              <div className="text-2xl font-bold text-blue-600">{globalPlans.length}</div>
              <div className="text-[10px] text-muted-foreground">{globalPlans.filter(p => p.etatAvancement === 'VALIDE').length} validés</div>
            </Link>
            <Link to="/creer-of" className="bg-white rounded-xl border p-4 hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
              <div className="flex items-center gap-2 text-indigo-600 text-xs mb-1"><Package className="w-3.5 h-3.5" /> Création OF <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" /></div>
              <div className="text-2xl font-bold text-indigo-600">{globalOFs.length}</div>
              <div className="text-[10px] text-muted-foreground">{globalOFs.reduce((s, o) => s + (o.articles?.length || 0), 0)} articles</div>
            </Link>
            <Link to="/questions" className="bg-white rounded-xl border p-4 hover:bg-purple-50 hover:border-purple-300 transition-all group">
              <div className="flex items-center gap-2 text-purple-600 text-xs mb-1"><MessageCircleQuestion className="w-3.5 h-3.5" /> Questions <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" /></div>
              <div className="text-2xl font-bold text-purple-600">{globalQuestions.length}</div>
              <div className="text-[10px] text-red-600 font-medium">{globalQuestions.filter(q => q.avancement === 'NON_TRAITE').length} non traitées</div>
            </Link>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-amber-600 text-xs mb-1"><AlertCircle className="w-3.5 h-3.5" /> À planifier</div>
              <div className="text-2xl font-bold text-amber-600">{projects.filter(p => p.status === 'A_PLANIFIER').length}</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Terminés</div>
              <div className="text-2xl font-bold text-slate-500">{projects.filter(p => p.status === 'TERMINE').length}</div>
            </div>
          </div>

          {/* Row 2: Plans breakdown + Questions + Top chantiers with plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Plans by state */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" /> Répartition des plans</h3>
                <Link to="/plans" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">Voir tous <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {globalPlans.length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(
                    globalPlans.reduce<Record<string, number>>((acc, p) => { acc[p.etatAvancement] = (acc[p.etatAvancement] || 0) + 1; return acc; }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([etat, count]) => {
                    const cfg = ETAT_COLORS[etat] || { label: etat, color: '#6b7280' };
                    const pct = Math.round((count / globalPlans.length) * 100);
                    return (
                      <div key={etat} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                        <span className="text-xs flex-1">{cfg.label}</span>
                        <span className="text-xs font-bold">{count}</span>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                  <div className="pt-2">
                    <ProgressBar value={globalPlans.filter(p => p.etatAvancement === 'VALIDE').length} max={globalPlans.length} label="Validation globale" color="bg-green-500" />
                  </div>
                </div>
              ) : <div className="text-xs text-muted-foreground text-center py-4">Aucun plan</div>}
            </div>

            {/* Questions breakdown */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><MessageCircleQuestion className="w-4 h-4 text-purple-600" /> Questions ({globalQuestions.length})</h3>
                <Link to="/questions" className="text-[10px] text-purple-600 hover:underline flex items-center gap-1">Voir toutes <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {globalQuestions.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-red-600">{globalQuestions.filter(q => q.avancement === 'NON_TRAITE').length}</div>
                      <div className="text-[10px] text-red-600">Non traité</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-orange-600">{globalQuestions.filter(q => q.avancement === 'EN_COURS_Q').length}</div>
                      <div className="text-[10px] text-orange-600">En cours</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-green-600">{globalQuestions.filter(q => q.avancement === 'TERMINE').length}</div>
                      <div className="text-[10px] text-green-600">Terminé</div>
                    </div>
                  </div>
                  <ProgressBar value={globalQuestions.filter(q => q.avancement === 'TERMINE').length} max={globalQuestions.length} label="Résolution globale" color="bg-green-500" />
                  {/* Recent open questions with project link */}
                  {globalQuestions.filter(q => q.avancement === 'NON_TRAITE').length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] font-semibold text-muted-foreground">Questions ouvertes récentes</div>
                      {globalQuestions.filter(q => q.avancement === 'NON_TRAITE').slice(0, 4).map(q => (
                        <Link key={q.id} to={`/questions?projectId=${q.projectId}`} className="block text-[10px] bg-red-50/50 hover:bg-red-50 rounded px-2 py-1 truncate">
                          <span className="font-semibold text-red-700">{q.designation}</span>
                          <span className="text-slate-500 ml-1">— {q.question}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : <div className="text-xs text-muted-foreground text-center py-4">Aucune question</div>}
            </div>

            {/* Top chantiers by plans count */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600" /> Chantiers avec le plus de plans</h3>
              {(() => {
                const plansByProject = globalPlans.reduce<Record<string, number>>((acc, p) => { acc[p.projectId] = (acc[p.projectId] || 0) + 1; return acc; }, {});
                const sorted = Object.entries(plansByProject).sort((a, b) => b[1] - a[1]).slice(0, 8);
                return sorted.length > 0 ? (
                  <div className="space-y-1.5">
                    {sorted.map(([pid, count]) => {
                      const proj = projects.find(p => p.id === pid);
                      if (!proj) return null;
                      return (
                        <Link key={pid} to={`/plans?projectId=${pid}`} className="flex items-center gap-2 hover:bg-blue-50 rounded px-1 py-1 -mx-1 transition-colors group">
                          <span className="font-mono text-[10px] font-bold text-blue-600 w-16 shrink-0">{proj.code}</span>
                          <span className="text-xs text-slate-700 truncate flex-1">{proj.label}</span>
                          <span className="text-xs font-bold text-blue-600 shrink-0">{count}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                ) : <div className="text-xs text-muted-foreground text-center py-4">Aucun plan</div>;
              })()}
            </div>
          </div>

          {/* Row 3: OF par chantier + Raccourcis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OF par chantier */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Package className="w-4 h-4 text-indigo-600" /> OF par chantier</h3>
                <Link to="/creer-of" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1">Création OF <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {(() => {
                const ofsByProject = globalOFs.reduce<Record<string, { count: number; articles: number }>>((acc, o) => {
                  if (!acc[o.projectId]) acc[o.projectId] = { count: 0, articles: 0 };
                  acc[o.projectId].count++;
                  acc[o.projectId].articles += o.articles?.length || 0;
                  return acc;
                }, {});
                const sorted = Object.entries(ofsByProject).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
                return sorted.length > 0 ? (
                  <div className="space-y-1.5">
                    {sorted.map(([pid, data]) => {
                      const proj = projects.find(p => p.id === pid);
                      if (!proj) return null;
                      return (
                        <Link key={pid} to={`/creer-of?projectId=${pid}`} className="flex items-center gap-2 hover:bg-indigo-50 rounded px-1 py-1 -mx-1 transition-colors group">
                          <span className="font-mono text-[10px] font-bold text-indigo-600 w-16 shrink-0">{proj.code}</span>
                          <span className="text-xs text-slate-700 truncate flex-1">{proj.label}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{data.articles} art.</span>
                          <span className="text-xs font-bold text-indigo-600 shrink-0">{data.count} OF</span>
                          <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                ) : <div className="text-xs text-muted-foreground text-center py-4">Aucun OF</div>;
              })()}
            </div>

            {/* Raccourcis rapides */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-slate-600" /> Accès rapides</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/plans" className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-2.5 transition-colors">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-semibold text-blue-800">Liste des Plans</div>
                    <div className="text-[10px] text-blue-600">{globalPlans.length} plans</div>
                  </div>
                </Link>
                <Link to="/creer-of" className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2.5 transition-colors">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs font-semibold text-indigo-800">Création OF</div>
                    <div className="text-[10px] text-indigo-600">{globalOFs.length} OF</div>
                  </div>
                </Link>
                <Link to="/questions" className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg px-3 py-2.5 transition-colors">
                  <MessageCircleQuestion className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="text-xs font-semibold text-purple-800">Questions</div>
                    <div className="text-[10px] text-purple-600">{globalQuestions.length} questions</div>
                  </div>
                </Link>
                <Link to="/gantt" className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 transition-colors">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Vue Gantt</div>
                    <div className="text-[10px] text-slate-500">Timeline projets</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Row 4: More stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plans per status - horizontal bar chart */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" /> Plans par état — barres</h3>
              {globalPlans.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    globalPlans.reduce<Record<string, number>>((acc, p) => { acc[p.etatAvancement] = (acc[p.etatAvancement] || 0) + 1; return acc; }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([etat, count]) => {
                    const cfg = ETAT_COLORS[etat] || { label: etat, color: '#6b7280' };
                    const pct = Math.round((count / globalPlans.length) * 100);
                    return (
                      <div key={etat}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-700 font-medium">{cfg.label}</span>
                          <span className="font-bold">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-xs text-muted-foreground text-center py-4">Aucun plan</div>}
            </div>

            {/* Plans par chantier - top 10 avec barres */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600" /> Plans par chantier — Top 10</h3>
              {(() => {
                const plansByProject = globalPlans.reduce<Record<string, { total: number; valides: number }>>((acc, p) => {
                  if (!acc[p.projectId]) acc[p.projectId] = { total: 0, valides: 0 };
                  acc[p.projectId].total++;
                  if (p.etatAvancement === 'VALIDE') acc[p.projectId].valides++;
                  return acc;
                }, {});
                const maxPlans = Math.max(...Object.values(plansByProject).map(v => v.total), 1);
                const sorted = Object.entries(plansByProject).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
                return sorted.length > 0 ? (
                  <div className="space-y-2">
                    {sorted.map(([pid, data]) => {
                      const proj = projects.find(p => p.id === pid);
                      if (!proj) return null;
                      const pctBar = Math.round((data.total / maxPlans) * 100);
                      const pctVal = data.total > 0 ? Math.round((data.valides / data.total) * 100) : 0;
                      return (
                        <div key={pid}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <Link to={`/plans?projectId=${pid}`} className="text-slate-700 font-medium hover:text-blue-600 truncate max-w-[200px]">
                              <span className="font-mono font-bold text-blue-600">{proj.code}</span> {proj.label}
                            </Link>
                            <span className="font-bold shrink-0 ml-2">{data.total} <span className="text-green-600">({pctVal}% val.)</span></span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pctBar}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="text-xs text-muted-foreground text-center py-4">Aucun plan</div>;
              })()}
            </div>
          </div>

          {/* Row 5: Articles stats + Questions par chantier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Articles par chantier */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-indigo-600" /> Articles par chantier — Top 10</h3>
              {(() => {
                const artByProject = globalOFs.reduce<Record<string, { ofs: number; articles: number }>>((acc, o) => {
                  if (!acc[o.projectId]) acc[o.projectId] = { ofs: 0, articles: 0 };
                  acc[o.projectId].ofs++;
                  acc[o.projectId].articles += o.articles?.length || 0;
                  return acc;
                }, {});
                const maxArt = Math.max(...Object.values(artByProject).map(v => v.articles), 1);
                const sorted = Object.entries(artByProject).sort((a, b) => b[1].articles - a[1].articles).slice(0, 10);
                return sorted.length > 0 ? (
                  <div className="space-y-2">
                    {sorted.map(([pid, data]) => {
                      const proj = projects.find(p => p.id === pid);
                      if (!proj) return null;
                      const pctBar = Math.round((data.articles / maxArt) * 100);
                      return (
                        <div key={pid}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <Link to={`/creer-of?projectId=${pid}`} className="text-slate-700 font-medium hover:text-indigo-600 truncate max-w-[200px]">
                              <span className="font-mono font-bold text-indigo-600">{proj.code}</span> {proj.label}
                            </Link>
                            <span className="font-bold shrink-0 ml-2">{data.articles} art. <span className="text-muted-foreground">({data.ofs} OF)</span></span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pctBar}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="text-xs text-muted-foreground text-center py-4">Aucun OF</div>;
              })()}
            </div>

            {/* Questions par chantier */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><MessageCircleQuestion className="w-4 h-4 text-purple-600" /> Questions par chantier</h3>
              {(() => {
                const qByProject = globalQuestions.reduce<Record<string, { total: number; open: number; done: number }>>((acc, q) => {
                  if (!acc[q.projectId]) acc[q.projectId] = { total: 0, open: 0, done: 0 };
                  acc[q.projectId].total++;
                  if (q.avancement === 'NON_TRAITE') acc[q.projectId].open++;
                  if (q.avancement === 'TERMINE') acc[q.projectId].done++;
                  return acc;
                }, {});
                const sorted = Object.entries(qByProject).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
                return sorted.length > 0 ? (
                  <div className="space-y-2">
                    {sorted.map(([pid, data]) => {
                      const proj = projects.find(p => p.id === pid);
                      if (!proj) return null;
                      const pctDone = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                      return (
                        <Link key={pid} to={`/questions?projectId=${pid}`} className="block hover:bg-purple-50 rounded px-1 py-1 -mx-1 transition-colors">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-700 truncate max-w-[180px]">
                              <span className="font-mono font-bold text-purple-600">{proj.code}</span> {proj.label}
                            </span>
                            <span className="font-bold shrink-0 ml-2">
                              {data.total} quest.
                              {data.open > 0 && <span className="text-red-600 ml-1">({data.open} ouvertes)</span>}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${pctDone}%` }} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : <div className="text-xs text-muted-foreground text-center py-4">Aucune question</div>;
              })()}
            </div>
          </div>

          {/* Row 6: Summary numbers */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-600" /> Résumé global</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{globalPlans.filter(p => p.etatAvancement === 'A_FAIRE').length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Plans à faire</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{globalPlans.filter(p => p.etatAvancement === 'EN_COURS_PLAN').length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Plans en cours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{globalPlans.filter(p => p.etatAvancement === 'A_DIFFUSER').length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">À diffuser</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{globalPlans.filter(p => p.etatAvancement === 'VALIDE').length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Plans validés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{globalQuestions.filter(q => q.avancement === 'NON_TRAITE').length}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Questions ouvertes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{globalOFs.reduce((s, o) => s + (o.articles?.length || 0), 0)}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Articles total</div>
              </div>
            </div>
          </div>
        </div>
        )
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Chargement…</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><FileText className="w-4 h-4" /> Plans</div>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1"><BarChart3 className="w-4 h-4" /> Dessinés</div>
              <div className="text-3xl font-bold text-blue-600">{stats?.pctDessines || 0}%</div>
              <div className="text-xs text-muted-foreground">{stats?.dessines || 0} / {stats?.total || 0}</div>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1"><CheckCircle2 className="w-4 h-4" /> Validés</div>
              <div className="text-3xl font-bold text-green-600">{stats?.pctValides || 0}%</div>
              <div className="text-xs text-muted-foreground">{stats?.valides || 0} / {stats?.total || 0}</div>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center gap-2 text-orange-600 text-sm mb-1"><Clock className="w-4 h-4" /> Heures passées</div>
              <div className="text-3xl font-bold text-orange-600">{timeSummary?.totalHours?.toFixed(0) || 0}h</div>
              <div className="text-xs text-muted-foreground">{timeSummary?.totalEntries || 0} pointages</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Plans by state */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Répartition des plans</h2>
                <Link to={`/plans?projectId=${projectId}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Voir tous <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {stats && stats.total > 0 ? (
                <div className="space-y-2">
                  {Object.entries(stats.byEtat).sort((a, b) => b[1] - a[1]).map(([etat, count]) => {
                    const cfg = ETAT_COLORS[etat] || { label: etat, color: '#6b7280' };
                    const pct = Math.round((count / stats.total) * 100);
                    return (
                      <div key={etat} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                        <span className="text-sm flex-1">{cfg.label}</span>
                        <span className="text-sm font-semibold">{count}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                  <div className="mt-3">
                    <ProgressBar value={stats.dessines} max={stats.total} label="Progression dessin" color="bg-blue-500" />
                  </div>
                  <ProgressBar value={stats.valides} max={stats.total} label="Progression validation" color="bg-green-500" />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-6">Aucun plan</div>
              )}
            </div>

            {/* Questions */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Questions techniques</h2>
                <Link to={`/questions?projectId=${projectId}`} className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                  Voir toutes <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-red-600">{qNonTraite}</div>
                  <div className="text-xs text-red-600">Non traité</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                  <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-orange-600">{qEnCours}</div>
                  <div className="text-xs text-orange-600">En cours</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-600">{qTermine}</div>
                  <div className="text-xs text-green-600">Terminé</div>
                </div>
              </div>
              {questions.length > 0 && (
                <ProgressBar value={qTermine} max={questions.length} label="Résolution" color="bg-green-500" />
              )}
              {/* Last open questions */}
              {qNonTraite > 0 && (
                <div className="mt-4 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Questions ouvertes récentes</div>
                  {questions.filter(q => q.avancement === 'NON_TRAITE').slice(0, 3).map(q => (
                    <div key={q.id} className="text-xs bg-slate-50 rounded px-2 py-1.5 truncate">
                      <span className="font-medium">{q.designation}</span>: {q.question}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hours breakdown */}
          {timeSummary && timeSummary.totalHours > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold mb-4">Heures par employé</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(timeSummary.byEmployee)
                  .sort((a, b) => b[1].hours - a[1].hours)
                  .slice(0, 10)
                  .map(([name, data]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{name}</span>
                      <span className="text-sm font-semibold">{data.hours.toFixed(1)}h</span>
                      <span className="text-xs text-muted-foreground">({data.count})</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
