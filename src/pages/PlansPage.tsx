import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiPlan, ApiProject, ApiDessinateur, ApiPlanStats, ApiManufacturingOrder, ApiArticle, EtatAvancement, FabricationType, EtatUsinage } from '@/lib/api';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { FileText, Search, Download, Upload, Pencil, Trash2, XCircle, Users, Archive, Plus, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { ETAT_CONFIG, FAB_LABELS, USINAGE_LABELS, GH, TH, TD, fmtDate, type TabId } from './plans/constants';
import { InlineEdit } from './plans/InlineEdit';
import { CreatePlanFromSelectionForm } from './plans/CreatePlanFromSelectionForm';
import { CreateFromArticlesModal } from './plans/CreateFromArticlesModal';
import { PlanEditDrawer } from './plans/PlanEditDrawer';
import { DessinateursPanel } from './plans/DessinateursPanel';

export function PlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const { selectedSubsidiaryId, subsidiaries, workshops } = usePlanningStore();

  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [stats, setStats] = useState<ApiPlanStats | null>(null);
  const [dessinateurs, setDessinateurs] = useState<ApiDessinateur[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtreEtat, setFiltreEtat] = useState<EtatAvancement | ''>('');
  const [expandedOFs, setExpandedOFs] = useState<Set<string>>(new Set());
  const [showOFPanel, setShowOFPanel] = useState(true);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [showCreateFromSelection, setShowCreateFromSelection] = useState(false);
  const [chantierSearch, setChantierSearch] = useState('');
  const [chantierDropdownOpen, setChantierDropdownOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setChantierDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [tab, setTab] = useState<TabId>('bureau');
  const [editingPlan, setEditingPlan] = useState<ApiPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDessinateurs, setShowDessinateurs] = useState(false);
  const [ofs, setOfs] = useState<ApiManufacturingOrder[]>([]);
  const [allOFs, setAllOFs] = useState<ApiManufacturingOrder[]>([]);

  const loadDessinateurs = useCallback(() => {
    api.dessinateurs.list(true).then(setDessinateurs).catch(console.error);
  }, []);

  useEffect(() => {
    api.projects.list().then(setAllProjects).catch(console.error);
    loadDessinateurs();
  }, [loadDessinateurs]);

  const loadOFs = useCallback(async () => {
    if (!projectId) { setOfs([]); return; }
    try { setOfs(await api.manufacturingOrders.list({ projectId })); } catch (e) { console.error(e); }
  }, [projectId]);

  useEffect(() => { loadOFs(); }, [loadOFs]);

  // Load all OFs globally for project cards
  useEffect(() => {
    if (!projectId) {
      api.manufacturingOrders.list().then(setAllOFs).catch(console.error);
    }
  }, [projectId]);

  const projects = useMemo(() => {
    const filtered = !selectedSubsidiaryId ? allProjects : allProjects.filter(p => {
      const subWkIds = new Set(workshops.filter(w => w.subsidiary_id === selectedSubsidiaryId).map(w => w.id));
      return subWkIds.has(p.workshopId);
    });
    return [...filtered].sort((a, b) => {
      const da = a.plannedStart || a.contractStart || '';
      const db = b.plannedStart || b.contractStart || '';
      if (db !== da) return db.localeCompare(da);
      return b.code.localeCompare(a.code);
    });
  }, [allProjects, selectedSubsidiaryId, workshops]);

  const loadPlans = useCallback(async () => {
    if (!projectId) { setPlans([]); setStats(null); return; }
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.plans.list({ projectId }), api.plans.stats(projectId)]);
      setPlans(p); setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const filtered = plans.filter(p => {
    if (filtreEtat && p.etatAvancement !== filtreEtat) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.hk?.toLowerCase().includes(q) || p.numPlan?.toLowerCase().includes(q) || p.codeOF?.toLowerCase().includes(q) || p.commentaires?.toLowerCase().includes(q) || p.dessinateur?.nom?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleUpdate = async (id: string, field: string, value: any) => {
    try { await api.plans.update(id, { [field]: value } as any); await loadPlans(); } catch (e) { console.error(e); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce plan ?')) return;
    try { await api.plans.delete(id); await loadPlans(); } catch (e) { console.error(e); }
  };

  const selectedProject = projects.find(p => p.id === projectId);
  const currentSub = subsidiaries.find(s => s.id === selectedSubsidiaryId);
  const existingHks = useMemo(() => new Set(plans.map(p => p.hk).filter(Boolean)), [plans]);
  const existingPlans = useMemo(() => {
    const m = new Map<string, { numPlan?: string | null; hk: string }>();
    for (const p of plans) { if (p.hk) m.set(p.hk, { numPlan: p.numPlan, hk: p.hk }); }
    return m;
  }, [plans]);

  const toggleArticle = (ofCode: string, articleCode: string) => {
    const key = `${ofCode}::${articleCode}`;
    setSelectedArticles(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const toggleAllOFArticles = (of: ApiManufacturingOrder) => {
    if (!of.articles) return;
    const selectable = of.articles.filter(a => !existingHks.has(a.code));
    const keys = selectable.map(a => `${of.code}::${a.code}`);
    const allSelected = keys.every(k => selectedArticles.has(k));
    setSelectedArticles(prev => {
      const n = new Set(prev);
      keys.forEach(k => allSelected ? n.delete(k) : n.add(k));
      return n;
    });
  };

  const selectedArticlesList = useMemo(() => {
    const list: Array<{ ofCode: string; articleCode: string }> = [];
    for (const key of selectedArticles) {
      const [ofCode, articleCode] = key.split('::');
      list.push({ ofCode, articleCode });
    }
    return list;
  }, [selectedArticles]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b px-5 py-2 text-xs text-muted-foreground">
        {currentSub && <span className="font-semibold text-foreground">{currentSub.name}</span>}
        {currentSub && <span className="mx-1.5">—</span>}
        <span>Suivi de Plans</span>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-5 py-3 flex items-center gap-3 flex-wrap">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <div ref={comboRef} className="relative min-w-[320px]">
          <div className="flex border rounded-lg overflow-hidden bg-white">
            <input
              type="text"
              value={chantierSearch}
              onChange={e => { setChantierSearch(e.target.value); setChantierDropdownOpen(true); }}
              onFocus={() => setChantierDropdownOpen(true)}
              placeholder={selectedProject ? `${selectedProject.code} — ${selectedProject.label}` : 'Rechercher un chantier…'}
              className="flex-1 px-3 py-1.5 text-sm outline-none bg-transparent"
              title="Rechercher un chantier"
            />
            <button
              onClick={() => setChantierDropdownOpen(!chantierDropdownOpen)}
              className="px-2 border-l hover:bg-slate-50"
              title="Ouvrir la liste"
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {chantierDropdownOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {projects.filter(p => {
                if (!chantierSearch) return true;
                const q = chantierSearch.toLowerCase();
                return p.code.toLowerCase().includes(q) || (p.label || '').toLowerCase().includes(q);
              }).length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Aucun chantier trouvé</div>
              ) : (
                projects.filter(p => {
                  if (!chantierSearch) return true;
                  const q = chantierSearch.toLowerCase();
                  return p.code.toLowerCase().includes(q) || (p.label || '').toLowerCase().includes(q);
                }).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSearchParams(p.id ? { projectId: p.id } : {});
                      setChantierSearch('');
                      setChantierDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${p.id === projectId ? 'bg-blue-50 font-semibold text-blue-700' : ''}`}
                  >
                    <span className="font-mono text-xs font-semibold text-blue-600 w-20 shrink-0">{p.code}</span>
                    <span className="truncate">{p.label}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <input
          type="text" placeholder="Filtrer…" value={search} onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm w-44"
        />

        {projectId && (
          <>
            <button onClick={() => setShowDessinateurs(true)} className="ml-auto border px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50 font-medium">
              <Users className="w-4 h-4" /> Dessinateurs
            </button>
            <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4" /> Créer un plan
            </button>
            <button className="border px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50 font-medium">
              <Download className="w-4 h-4" /> Export
            </button>
          </>
        )}
      </div>

      {!projectId ? (
        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">Chantiers en cours ({projects.filter(p => p.status === 'EN_COURS' || p.isActive).length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {projects.filter(p => p.status === 'EN_COURS' || p.isActive).map(p => {
              const pOFs = allOFs.filter(o => o.projectId === p.id);
              const pOFCount = pOFs.length;
              const pArtCount = pOFs.reduce((s, o) => s + (o.articles?.length || 0), 0);
              return (
              <button
                key={p.id}
                onClick={() => setSearchParams({ projectId: p.id })}
                className="text-left border rounded-lg px-4 py-3 hover:bg-blue-50 hover:border-blue-300 transition-all bg-white group"
              >
                <div className="font-mono text-xs font-bold text-blue-600 group-hover:text-blue-700">{p.code}</div>
                <div className="text-sm text-slate-700 truncate mt-0.5">{p.label}</div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.status === 'EN_COURS' ? 'bg-green-100 text-green-700' : p.status === 'TERMINE' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status === 'EN_COURS' ? 'En cours' : p.status === 'TERMINE' ? 'Terminé' : p.status === 'BLOQUE' ? 'Bloqué' : 'À planifier'}
                  </span>
                  {pOFCount > 0 && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{pOFCount} OF</span>}
                  {pArtCount > 0 && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{pArtCount} art.</span>}
                </div>
              </button>
              );
            })}
          </div>
          {projects.filter(p => p.status === 'EN_COURS' || p.isActive).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun chantier en cours</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* OFs Panel */}
          <div className="bg-white border-b">
            <button onClick={() => setShowOFPanel(!showOFPanel)} className="w-full px-5 py-2 flex items-center gap-2 hover:bg-slate-50 text-left">
              {showOFPanel ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold">Ordres de fabrication</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{ofs.length} OF</span>
              <span className="text-[10px] text-muted-foreground">{ofs.reduce((s, o) => s + (o.articles?.length || 0), 0)} articles</span>
            </button>
            {showOFPanel && (
              <div className="px-5 pb-3">
                {ofs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Aucun OF synchronisé pour ce chantier. Lance une sync depuis Administration → Sync Fabric.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {ofs.map(of => {
                        const expanded = expandedOFs.has(of.id);
                        const artCount = of.articles?.length || 0;
                        const selectableArts = (of.articles || []).filter(a => !existingHks.has(a.code));
                        const allChecked = selectableArts.length > 0 && selectableArts.every(a => selectedArticles.has(`${of.code}::${a.code}`));
                        const someChecked = selectableArts.some(a => selectedArticles.has(`${of.code}::${a.code}`));
                        return (
                          <div key={of.id} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center bg-slate-50/50">
                              {selectableArts.length > 0 && (
                                <label className="pl-3 flex items-center" title="Tout sélectionner">
                                  <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }} onChange={() => toggleAllOFArticles(of)} />
                                </label>
                              )}
                              <button
                                onClick={() => setExpandedOFs(prev => { const n = new Set(prev); if (n.has(of.id)) n.delete(of.id); else n.add(of.id); return n; })}
                                className="flex-1 px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-left"
                              >
                                {expanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                <span className="font-mono font-bold text-blue-700 text-xs">{of.code}</span>
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium ml-auto">{artCount} art.</span>
                              </button>
                            </div>
                            {expanded && (
                              <div className="px-3 py-1.5 space-y-0.5 bg-white border-t">
                                {artCount === 0 ? (
                                  <p className="text-[10px] text-muted-foreground">Aucun article</p>
                                ) : of.articles!.map(art => {
                                  const hasPlan = existingHks.has(art.code);
                                  const planInfo = existingPlans.get(art.code);
                                  const key = `${of.code}::${art.code}`;
                                  const isChecked = selectedArticles.has(key);
                                  return (
                                    <label key={art.id} className={`flex items-center gap-2 text-[10px] px-1 py-0.5 rounded cursor-pointer ${hasPlan ? 'opacity-50 cursor-default' : 'hover:bg-blue-50'}`}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={hasPlan}
                                        onChange={() => toggleArticle(of.code, art.code)}
                                      />
                                      <span className="font-mono font-semibold">{art.code}</span>
                                      {art.designation && art.designation !== art.code && <span className="text-muted-foreground truncate">{art.designation}</span>}
                                      {hasPlan && planInfo && (
                                        <span className="text-green-700 bg-green-50 border border-green-200 px-1 py-0.5 rounded font-mono font-semibold ml-auto shrink-0">
                                          Plan {planInfo.numPlan || '—'}
                                        </span>
                                      )}
                                      {hasPlan && !planInfo && <span className="text-green-600 ml-auto">✓ Plan</span>}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {selectedArticles.size > 0 && !showCreateFromSelection && (
                      <div className="mt-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                        <span className="text-xs font-medium text-blue-800">{selectedArticles.size} article{selectedArticles.size > 1 ? 's' : ''} sélectionné{selectedArticles.size > 1 ? 's' : ''}</span>
                        <button
                          onClick={() => setShowCreateFromSelection(true)}
                          className="ml-auto bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Créer un plan
                        </button>
                        <button onClick={() => setSelectedArticles(new Set())} className="text-xs text-blue-600 hover:underline">Tout désélectionner</button>
                      </div>
                    )}
                    {showCreateFromSelection && (
                      <CreatePlanFromSelectionForm
                        projectId={projectId}
                        articles={selectedArticlesList}
                        onCreated={() => { setShowCreateFromSelection(false); setSelectedArticles(new Set()); loadPlans(); }}
                        onCancel={() => setShowCreateFromSelection(false)}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Stats line */}
          <div className="px-5 py-2 flex items-center gap-4 text-xs flex-wrap bg-white border-b">
            <span className="font-bold text-foreground">{filtered.length} plans</span>
            <span className="text-muted-foreground">MOE: <b>0.0H</b></span>
            <span className="text-muted-foreground">DES prévu: <b>0.0H</b></span>
            <span className="text-muted-foreground">DES eff: <b>0.0H</b></span>
            <span className="text-muted-foreground">MET prévu: <b>0.0H</b></span>
            <span className="text-muted-foreground">MET eff: <b>0.0H</b></span>
            <span className="ml-auto font-semibold text-blue-600">% dessin: {stats?.pctDessines?.toFixed(2) || '0.00'}%</span>
            <span className="font-semibold text-green-600">% validation: {stats?.pctValides?.toFixed(2) || '0.00'}%</span>
          </div>

          {/* État legend */}
          <div className="px-5 py-1.5 flex items-center gap-2 flex-wrap bg-white border-b">
            {Object.entries(ETAT_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setFiltreEtat(filtreEtat === key ? '' : key as EtatAvancement)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                  filtreEtat === key ? `${cfg.bg} ${cfg.color} border-current` : 'border-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="px-5 pt-2 flex items-center gap-0 bg-white border-b">
            {([
              { id: 'bureau' as TabId, label: "Bureau d'études" },
              { id: 'production' as TabId, label: 'Production' },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="flex-1" />
            <select value={filtreEtat} onChange={e => setFiltreEtat(e.target.value as any)} className="border rounded px-2 py-1 text-xs bg-white mr-2" title="Filtrer par état">
              <option value="">Tous les états</option>
              {Object.entries(ETAT_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
            <span className="text-[10px] text-muted-foreground">{filtered.length} / {plans.length} lignes</span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{plans.length === 0 ? 'Aucun plan pour ce chantier' : 'Aucun résultat'}</div>
            ) : tab === 'bureau' ? (
              <table className="w-full text-xs border-collapse min-w-[1600px]">
                <thead className="sticky top-0 z-10">
                  {/* Group headers */}
                  <tr>
                    <th colSpan={2} className={`${GH} py-1 bg-indigo-50`}>INDICE</th>
                    <th colSpan={4} className={`${GH} py-1`}>IDENTIFICATION</th>
                    <th colSpan={1} className={`${GH} py-1`}>DESSINATEUR</th>
                    <th colSpan={1} className={`${GH} py-1`}>FABRICATION</th>
                    <th colSpan={5} className={`${GH} py-1 bg-blue-50`}>TEMPS</th>
                    <th colSpan={4} className={`${GH} py-1 bg-amber-50`}>ÉTAT</th>
                    <th colSpan={3} className={`${GH} py-1 bg-green-50`}>DATES / FICHE</th>
                    <th colSpan={1} className={`${GH} py-1`}></th>
                  </tr>
                  {/* Column headers */}
                  <tr className="bg-white border-b-2 border-slate-300">
                    <th className={TH}>#</th>
                    <th className={`${TH} bg-indigo-50/50`}>IND</th>
                    <th className={TH}>HK</th>
                    <th className={TH}>OF</th>
                    <th className={TH}>N° Plan</th>
                    <th className={TH}>Désignation</th>
                    <th className={TH}>Dessinateur</th>
                    <th className={TH}>Fabrication</th>
                    <th className={`${TH} bg-blue-50/50`} title="Total (web)">MOE</th>
                    <th className={`${TH} bg-blue-50/50`} title="Dessin (HK)">DES</th>
                    <th className={`${TH} bg-blue-50/50`} title="Métrés gestion (HK)">MET</th>
                    <th className={`${TH} bg-blue-50/50`} title="Temps réalisé (HK)">Réalisé</th>
                    <th className={`${TH} bg-blue-50/50`} title="% estimé (web)">%</th>
                    <th className={`${TH} bg-amber-50/50`}>État</th>
                    <th className={`${TH} bg-amber-50/50`}>Dat. prévi.</th>
                    <th className={`${TH} bg-amber-50/50`}>Dat. indice</th>
                    <th className={`${TH} bg-amber-50/50`}>Valid.</th>
                    <th className={`${TH} bg-green-50/50`}>N° Fiche</th>
                    <th className={`${TH} bg-green-50/50`}>Dat. fiche</th>
                    <th className={`${TH} bg-green-50/50`}>Commentaires</th>
                    <th className={`${TH} !border-r-0`}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((plan, idx) => {
                    const lastInd = plan.indices.length > 0 ? plan.indices[plan.indices.length - 1] : null;
                    const etatCfg = ETAT_CONFIG[plan.etatAvancement] || ETAT_CONFIG.A_FAIRE;
                    return (
                      <tr key={plan.id} className={`border-b border-slate-100 hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className={`${TD} text-muted-foreground text-center`}>{idx + 1}</td>
                        <td className={`${TD} bg-indigo-50/30 text-center`}>
                          {lastInd ? <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{lastInd.indice}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className={`${TD} font-mono font-semibold`}>{plan.hk}</td>
                        <td className={`${TD} text-blue-600 font-medium`}>{plan.codeOF || '—'}</td>
                        <td className={TD}><InlineEdit value={plan.numPlan || ''} onSave={v => handleUpdate(plan.id, 'numPlan', v || null)} placeholder="—" /></td>
                        <td className={`${TD} max-w-[180px] truncate`}>{plan.cart1 || '—'}</td>
                        <td className={TD}>
                          <select value={plan.dessinateurId || ''} onChange={e => handleUpdate(plan.id, 'dessinateurId', e.target.value || null)} className="text-xs border-0 bg-transparent p-0 w-full cursor-pointer" title="Dessinateur">
                            <option value="">—</option>
                            {dessinateurs.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>)}
                          </select>
                        </td>
                        <td className={TD}>
                          <select value={plan.fabricationType || ''} onChange={e => handleUpdate(plan.id, 'fabricationType', e.target.value || null)} className="text-xs border-0 bg-transparent p-0 w-full cursor-pointer" title="Fabrication">
                            <option value="">—</option>
                            {Object.entries(FAB_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td className={`${TD} bg-blue-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-blue-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-blue-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-blue-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-blue-50/30 text-center font-semibold`}>0%</td>
                        <td className={`${TD} bg-amber-50/30`}>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${etatCfg.bg} ${etatCfg.color}`}>{etatCfg.label}</span>
                        </td>
                        <td className={`${TD} bg-amber-50/30`}>{fmtDate(plan.datePrevisionnelle)}</td>
                        <td className={`${TD} bg-amber-50/30`}>{lastInd ? fmtDate(lastInd.dateIndice) : ''}</td>
                        <td className={`${TD} bg-amber-50/30`}>{fmtDate(plan.dateValidation)}</td>
                        <td className={`${TD} bg-green-50/30`}>{plan.numFiche || ''}</td>
                        <td className={`${TD} bg-green-50/30`}>{fmtDate(plan.dateFicheFab)}</td>
                        <td className={`${TD} bg-green-50/30 max-w-[160px] truncate`}>{plan.commentaires || ''}</td>
                        <td className={`${TD} !border-r-0`}>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => setEditingPlan(plan)} className="p-0.5 rounded hover:bg-slate-200 text-slate-400" title="Détails"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDelete(plan.id)} className="p-0.5 rounded hover:bg-red-100 text-red-400" title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* ─── Production tab ─── */
              <table className="w-full text-xs border-collapse min-w-[1400px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th colSpan={5} className={`${GH} py-1`}>IDENTIFICATION</th>
                    <th colSpan={2} className={`${GH} py-1`}>ARTICLE</th>
                    <th colSpan={1} className={`${GH} py-1 bg-amber-50`}>ÉTAT</th>
                    <th colSpan={2} className={`${GH} py-1 bg-purple-50`}>USINAGE / S-TRAIT.</th>
                    <th colSpan={4} className={`${GH} py-1 bg-teal-50`}>MONTAGE / LIVRAISON</th>
                    <th colSpan={5} className={`${GH} py-1 bg-orange-50`}>HEURES ATELIER</th>
                    <th colSpan={1} className={`${GH} py-1`}></th>
                    <th colSpan={1} className={`${GH} py-1`}></th>
                  </tr>
                  <tr className="bg-white border-b-2 border-slate-300">
                    <th className={TH}>#</th>
                    <th className={TH}>HK</th>
                    <th className={TH}>OF</th>
                    <th className={TH}>N° Art</th>
                    <th className={TH}>Désignation</th>
                    <th className={TH}>Qté</th>
                    <th className={TH}>IND</th>
                    <th className={`${TH} bg-amber-50/50`}>État avanc.</th>
                    <th className={`${TH} bg-purple-50/50`}>Usinage</th>
                    <th className={`${TH} bg-purple-50/50`}>Sous-trait.</th>
                    <th className={`${TH} bg-teal-50/50`}>Resp. montage</th>
                    <th className={`${TH} bg-teal-50/50`}>Dép. atelier</th>
                    <th className={`${TH} bg-teal-50/50`}>Palette</th>
                    <th className={`${TH} bg-teal-50/50`}>Livraison</th>
                    <th className={`${TH} bg-orange-50/50`}>H. Usin.</th>
                    <th className={`${TH} bg-orange-50/50`}>H. Fab</th>
                    <th className={`${TH} bg-orange-50/50`}>H. Man.</th>
                    <th className={`${TH} bg-orange-50/50`}>H. Pose</th>
                    <th className={`${TH} bg-orange-50/50`}>H. Tot.</th>
                    <th className={TH}>Commentaires</th>
                    <th className={`${TH} !border-r-0`}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((plan, idx) => {
                    const lastInd = plan.indices.length > 0 ? plan.indices[plan.indices.length - 1] : null;
                    const etatCfg = ETAT_CONFIG[plan.etatAvancement] || ETAT_CONFIG.A_FAIRE;
                    return (
                      <tr key={plan.id} className={`border-b border-slate-100 hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className={`${TD} text-muted-foreground text-center`}>{idx + 1}</td>
                        <td className={`${TD} font-mono font-semibold`}>{plan.hk}</td>
                        <td className={`${TD} text-blue-600 font-medium`}>{plan.codeOF || '—'}</td>
                        <td className={TD}>{plan.numPlan || '—'}</td>
                        <td className={`${TD} max-w-[180px] truncate`}>{plan.cart1 || '—'}</td>
                        <td className={`${TD} text-center`}>{plan.cart2 || '—'}</td>
                        <td className={`${TD} text-center font-bold`}>{lastInd?.indice || '—'}</td>
                        <td className={`${TD} bg-amber-50/30`}>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${etatCfg.bg} ${etatCfg.color}`}>{etatCfg.label}</span>
                        </td>
                        <td className={`${TD} bg-purple-50/30`}>
                          <select value={plan.etatUsinage || ''} onChange={e => handleUpdate(plan.id, 'etatUsinage', e.target.value || null)} className="text-xs border-0 bg-transparent p-0 w-full cursor-pointer" title="Usinage">
                            <option value="">—</option>
                            {Object.entries(USINAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td className={`${TD} bg-purple-50/30`}><InlineEdit value={plan.sousTraitance || ''} onSave={v => handleUpdate(plan.id, 'sousTraitance', v || null)} placeholder="—" /></td>
                        <td className={`${TD} bg-teal-50/30`}><InlineEdit value={plan.responsableMontage || ''} onSave={v => handleUpdate(plan.id, 'responsableMontage', v || null)} placeholder="—" /></td>
                        <td className={`${TD} bg-teal-50/30`}>{fmtDate(plan.dateDepartAtelier)}</td>
                        <td className={`${TD} bg-teal-50/30`}><InlineEdit value={plan.paletisation || ''} onSave={v => handleUpdate(plan.id, 'paletisation', v || null)} placeholder="—" /></td>
                        <td className={`${TD} bg-teal-50/30`}>{fmtDate(plan.dateLivraisonChantier)}</td>
                        <td className={`${TD} bg-orange-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-orange-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-orange-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-orange-50/30 text-center`}>0.0</td>
                        <td className={`${TD} bg-orange-50/30 text-center font-bold`}>0.0</td>
                        <td className={`${TD} max-w-[160px] truncate`}>{plan.commentaires || ''}</td>
                        <td className={`${TD} !border-r-0`}>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => setEditingPlan(plan)} className="p-0.5 rounded hover:bg-slate-200 text-slate-400" title="Détails"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDelete(plan.id)} className="p-0.5 rounded hover:bg-red-100 text-red-400" title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showCreateModal && projectId && (
        <CreateFromArticlesModal projectId={projectId} ofs={ofs} existingHks={existingHks} existingPlans={existingPlans} onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); loadPlans(); loadOFs(); }} />
      )}

      {editingPlan && (
        <PlanEditDrawer plan={editingPlan} dessinateurs={dessinateurs} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); loadPlans(); }} />
      )}
      {showDessinateurs && (
        <DessinateursPanel dessinateurs={dessinateurs} onClose={() => setShowDessinateurs(false)} onChanged={loadDessinateurs} />
      )}
    </div>
  );
}
