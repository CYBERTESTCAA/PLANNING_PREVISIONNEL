import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiProject, ApiManufacturingOrder, ApiPlan, ApiArticle } from '@/lib/api';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { Package, RefreshCw, X, Search, Save, FolderOpen, ChevronDown, ChevronUp, ArrowUpDown, FileDown, Eye, EyeOff } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Generate codes AA → ZZ ────────────────────────────────────────────────
const ALL_CODES: string[] = [];
for (let i = 0; i < 26; i++) {
  for (let j = 0; j < 26; j++) {
    ALL_CODES.push(String.fromCharCode(65 + i) + String.fromCharCode(65 + j));
  }
}

// ─── Draft: article → code mapping, persisted in localStorage ───────────────
interface CodeAssignment { [articleId: string]: string }
const STORAGE_KEY = (pid: string) => `planning:ofCodes:${pid}`;
function loadCodes(projectId: string): CodeAssignment {
  try { const raw = localStorage.getItem(STORAGE_KEY(projectId)); if (raw) return JSON.parse(raw); } catch {}
  return {};
}
function saveCodes(projectId: string, codes: CodeAssignment) {
  localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(codes));
}

// ─── Flat article with OF info ──────────────────────────────────────────────
interface FlatArticle {
  id: string;
  code: string;
  designation: string;
  ofId: string;
  ofCode: string;
  quantity: number | null;
}

export function CreerOFPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const { selectedSubsidiaryId, subsidiaries, workshops } = usePlanningStore();

  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [ofs, setOfs] = useState<ApiManufacturingOrder[]>([]);
  const [allOFs, setAllOFs] = useState<ApiManufacturingOrder[]>([]);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [codes, setCodes] = useState<CodeAssignment>({});
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [codeSearch, setCodeSearch] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Sort state
  const [sortCol, setSortCol] = useState<'ofCode' | 'code' | 'designation' | 'ofNum' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Project search combo
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  // Expanded OF detail in summary
  const [expandedOFCode, setExpandedOFCode] = useState<string | null>(null);

  // Close combo on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setProjectDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { api.projects.list().then(setAllProjects).catch(console.error); }, []);

  // Load all OFs globally for project cards
  useEffect(() => {
    if (!projectId) {
      api.manufacturingOrders.list().then(setAllOFs).catch(console.error);
    }
  }, [projectId]);

  const projects = useMemo(() => {
    if (!selectedSubsidiaryId) return allProjects;
    const subWkIds = new Set(workshops.filter(w => w.subsidiary_id === selectedSubsidiaryId).map(w => w.id));
    return allProjects.filter(p => subWkIds.has(p.workshopId));
  }, [allProjects, selectedSubsidiaryId, workshops]);

  const loadOFs = useCallback(async () => {
    if (!projectId) { setOfs([]); setPlans([]); return; }
    try {
      const [o, p] = await Promise.all([
        api.manufacturingOrders.list({ projectId }),
        api.plans.list({ projectId }),
      ]);
      setOfs(o);
      setPlans(p);
    } catch (e) { console.error(e); }
  }, [projectId]);

  useEffect(() => { loadOFs(); }, [loadOFs]);

  useEffect(() => {
    if (projectId) setCodes(loadCodes(projectId));
    else setCodes({});
    setSelectedArticleId(null);
  }, [projectId]);

  const selectedProject = projects.find(p => p.id === projectId);
  const currentSub = subsidiaries.find(s => s.id === selectedSubsidiaryId);

  // Projects sorted by most recent first (plannedStart desc, then code desc)
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const da = a.plannedStart || a.contractStart || '';
      const db = b.plannedStart || b.contractStart || '';
      if (db !== da) return db.localeCompare(da);
      return b.code.localeCompare(a.code);
    });
  }, [projects]);

  // Filtered projects for search combo
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return sortedProjects;
    const q = projectSearch.toLowerCase();
    return sortedProjects.filter(p => p.code.toLowerCase().includes(q) || (p.label || '').toLowerCase().includes(q));
  }, [sortedProjects, projectSearch]);

  // Map article code → plan info
  const planByHk = useMemo(() => {
    const m = new Map<string, { numPlan?: string | null }>();
    for (const p of plans) { if (p.hk) m.set(p.hk, { numPlan: p.numPlan }); }
    return m;
  }, [plans]);

  // Flatten all articles from all OFs
  const allArticles = useMemo<FlatArticle[]>(() => {
    const result: FlatArticle[] = [];
    for (const of_ of ofs) {
      for (const art of of_.articles || []) {
        result.push({
          id: art.id,
          code: art.code,
          designation: art.designation || '',
          ofId: of_.id,
          ofCode: of_.code,
          quantity: art.quantity ?? null,
        });
      }
    }
    return result;
  }, [ofs]);

  // Count articles per code
  const codeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of Object.values(codes)) {
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [codes]);

  // Compute OF number for each code (sorted, 1-indexed)
  const codeToOF = useMemo(() => {
    const usedCodes = [...new Set(Object.values(codes))].sort();
    const m = new Map<string, number>();
    usedCodes.forEach((c, i) => m.set(c, i + 1));
    return m;
  }, [codes]);

  // Assign code to an article
  const assignCode = useCallback((articleId: string, code: string | null) => {
    setCodes(prev => {
      const next = { ...prev };
      if (code) next[articleId] = code;
      else delete next[articleId];
      saveCodes(projectId, next);
      return next;
    });
  }, [projectId]);

  const selectedArticle = allArticles.find(a => a.id === selectedArticleId);

  // Filtered codes for dropdown search
  const filteredCodes = useMemo(() => {
    const q = codeSearch.toUpperCase().trim();
    if (!q) return ALL_CODES;
    return ALL_CODES.filter(c => c.includes(q));
  }, [codeSearch]);

  // Sorted articles
  const sortedArticles = useMemo(() => {
    if (!sortCol) return allArticles;
    return [...allArticles].sort((a, b) => {
      if (sortCol === 'ofNum') {
        const na = codes[a.id] ? (codeToOF.get(codes[a.id]) ?? 9999) : 9999;
        const nb = codes[b.id] ? (codeToOF.get(codes[b.id]) ?? 9999) : 9999;
        return sortDir === 'asc' ? na - nb : nb - na;
      }
      const va = (a[sortCol] || '').toString().toLowerCase();
      const vb = (b[sortCol] || '').toString().toLowerCase();
      const cmp = va.localeCompare(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allArticles, sortCol, sortDir, codes, codeToOF]);

  const toggleSort = (col: 'ofCode' | 'code' | 'designation' | 'ofNum') => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Articles grouped by OF for detail view
  const articlesByOF = useMemo(() => {
    const m = new Map<string, FlatArticle[]>();
    for (const art of allArticles) {
      if (!m.has(art.ofCode)) m.set(art.ofCode, []);
      m.get(art.ofCode)!.push(art);
    }
    return m;
  }, [allArticles]);

  // Stats
  const assignedCount = Object.keys(codes).length;
  const ofCount = codeToOF.size;

  // PDF Export
  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = selectedProject ? `Création OF — ${selectedProject.code} — ${selectedProject.label}` : 'Création OF';
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`${allArticles.length} articles — ${assignedCount} attribués — ${ofCount} OF`, 14, 22);

    const rows = sortedArticles.map(art => {
      const assignedCode = codes[art.id] || '';
      const ofNum = assignedCode ? codeToOF.get(assignedCode) ?? '' : '';
      const plan = planByHk.get(art.code);
      return [art.code, art.designation, art.ofCode, art.quantity ?? '', assignedCode, ofNum, plan?.numPlan || ''];
    });

    autoTable(doc, {
      startY: 26,
      head: [['Code article', 'Désignation', 'OF source', 'Qté', 'Code', 'OF n°', 'Plan']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`creation-of-${selectedProject?.code || 'export'}.pdf`);
  }, [selectedProject, allArticles, sortedArticles, codes, codeToOF, planByHk, assignedCount, ofCount]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b px-5 py-2 text-xs text-muted-foreground flex items-center gap-2">
        {currentSub && <span className="font-semibold text-foreground">{currentSub.name}</span>}
        {currentSub && <span className="mx-1">—</span>}
        <span>Création OF</span>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-5 py-3 flex items-center gap-3 flex-wrap">
        <Package className="w-5 h-5 text-blue-600 shrink-0" />
        {/* Searchable project combo */}
        <div ref={comboRef} className="relative min-w-[320px]">
          <div className="flex border rounded-lg overflow-hidden bg-white">
            <Search className="w-4 h-4 text-slate-400 ml-3 self-center shrink-0" />
            <input
              type="text"
              value={projectSearch}
              onChange={e => { setProjectSearch(e.target.value); setProjectDropdownOpen(true); }}
              onFocus={() => setProjectDropdownOpen(true)}
              placeholder={selectedProject ? `${selectedProject.code} — ${selectedProject.label}` : 'Rechercher un chantier…'}
              className="flex-1 px-2 py-1.5 text-sm outline-none bg-transparent"
              title="Rechercher un chantier"
            />
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="px-2 border-l hover:bg-slate-50"
              title="Ouvrir la liste"
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {projectDropdownOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Aucun chantier trouvé</div>
              ) : (
                filteredProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSearchParams(p.id ? { projectId: p.id } : {});
                      setProjectSearch('');
                      setProjectDropdownOpen(false);
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
        {projectId && (
          <button onClick={loadOFs} className="text-xs text-muted-foreground hover:text-blue-600 flex items-center gap-1" title="Rafraîchir">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {projectId && allArticles.length > 0 && (
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="text-slate-500">{allArticles.length} articles</span>
            <span className="text-blue-600 font-semibold">{assignedCount} attribués</span>
            <span className="text-emerald-600 font-semibold">{ofCount} OF</span>
            <span className="text-green-600 flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Auto-save</span>
            <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium" title="Exporter en PDF">
              <FileDown className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        )}
      </div>

      {!projectId ? (
        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700">Chantiers en cours ({projects.filter(p => p.status === 'EN_COURS' || p.isActive).length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {projects.filter(p => p.status === 'EN_COURS' || p.isActive).map(p => {
              const pArtCount = allOFs.filter(o => o.projectId === p.id).reduce((s, o) => s + (o.articles?.length || 0), 0);
              return (
                <button
                  key={p.id}
                  onClick={() => setSearchParams({ projectId: p.id })}
                  className="text-left border rounded-lg px-4 py-3 hover:bg-indigo-50 hover:border-indigo-300 transition-all bg-white group"
                >
                  <div className="font-mono text-xs font-bold text-indigo-600 group-hover:text-indigo-700">{p.code}</div>
                  <div className="text-sm text-slate-700 truncate mt-0.5">{p.label}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.status === 'EN_COURS' ? 'bg-green-100 text-green-700' : p.status === 'TERMINE' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                      {p.status === 'EN_COURS' ? 'En cours' : p.status === 'TERMINE' ? 'Termin\u00e9' : p.status === 'BLOQUE' ? 'Bloqu\u00e9' : '\u00c0 planifier'}
                    </span>
                    {pArtCount > 0 && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{pArtCount} articles</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {projects.filter(p => p.status === 'EN_COURS' || p.isActive).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun chantier en cours</p>
            </div>
          )}
        </div>
      ) : allArticles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun article trouvé pour ce chantier</p>
            <p className="text-xs mt-1">Les articles sont importés via la synchronisation Fabric</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* ── TABLE: full-width articles list ── */}
          <div className={`flex-1 overflow-auto transition-all duration-300 ${selectedArticleId ? 'mr-0' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold w-[140px] cursor-pointer select-none hover:bg-slate-700" onClick={() => toggleSort('code')}>
                    <span className="flex items-center gap-1">Code article {sortCol === 'code' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-slate-700" onClick={() => toggleSort('designation')}>
                    <span className="flex items-center gap-1">Désignation {sortCol === 'designation' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</span>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold w-[60px]">Qté</th>
                  <th className="px-4 py-3 text-center font-semibold w-[90px]">Code</th>
                  <th className="px-4 py-3 text-center font-semibold w-[70px] cursor-pointer select-none hover:bg-slate-700" onClick={() => toggleSort('ofNum')}>
                    <span className="flex items-center justify-center gap-1">OF n° {sortCol === 'ofNum' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedArticles.map((art, idx) => {
                  const assignedCode = codes[art.id];
                  const ofNum = assignedCode ? codeToOF.get(assignedCode) : undefined;
                  const plan = planByHk.get(art.code);
                  const isSelected = selectedArticleId === art.id;
                  return (
                    <tr
                      key={art.id}
                      onClick={() => { setSelectedArticleId(isSelected ? null : art.id); setCodeSearch(''); }}
                      className={`
                        cursor-pointer border-b border-slate-100 transition-colors
                        ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                        hover:bg-blue-50/60
                      `}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800">{art.code}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[400px]">
                        {art.designation || <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">
                        {art.quantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {assignedCode ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-white bg-blue-600 px-2.5 py-1 rounded-md text-xs">
                            {assignedCode}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ofNum !== undefined ? (
                          <span className="inline-flex items-center justify-center font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 w-8 h-8 rounded-full text-xs">
                            {ofNum}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Footer: OF summary — clickable to expand articles */}
            {ofCount > 0 && (
              <div className="sticky bottom-0 bg-white border-t px-5 py-3">
                <div className="text-xs text-slate-500 mb-2 font-semibold uppercase">Résumé des OF ({ofCount}) — cliquez pour voir les articles</div>
                <div className="flex flex-wrap gap-2">
                  {[...codeToOF.entries()].map(([code, num]) => {
                    const count = codeCounts.get(code) || 0;
                    const isExpanded = expandedOFCode === code;
                    return (
                      <button
                        key={code}
                        onClick={() => setExpandedOFCode(isExpanded ? null : code)}
                        className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 transition-all ${isExpanded ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{num}</span>
                        <span className="font-mono font-bold text-blue-700 text-xs">{code}</span>
                        <span className="text-[10px] text-slate-400">({count} art.)</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <Eye className="w-3 h-3 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
                {/* Expanded OF articles detail */}
                {expandedOFCode && (
                  <div className="mt-3 bg-blue-50/50 border border-blue-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-blue-100/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-800">
                        Articles du code <span className="font-mono">{expandedOFCode}</span> — OF n°{codeToOF.get(expandedOFCode)}
                      </span>
                      <button onClick={() => setExpandedOFCode(null)} className="text-blue-400 hover:text-blue-600" title="Fermer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="divide-y divide-blue-100">
                      {allArticles.filter(a => codes[a.id] === expandedOFCode).map(art => (
                        <div key={art.id} className="px-4 py-1.5 flex items-center gap-3 text-xs">
                          <span className="font-mono font-bold text-slate-800 w-28 shrink-0">{art.code}</span>
                          <span className="text-slate-600 truncate flex-1">{art.designation || '—'}</span>
                          <span className="font-mono text-blue-600 text-[10px] shrink-0">OF: {art.ofCode}</span>
                          <span className="text-slate-400 shrink-0">Qté: {art.quantity ?? '—'}</span>
                        </div>
                      ))}
                      {allArticles.filter(a => codes[a.id] === expandedOFCode).length === 0 && (
                        <div className="px-4 py-2 text-xs text-muted-foreground">Aucun article avec ce code</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Source OFs — click to see articles */}
            {ofs.length > 0 && (
              <div className="bg-white border-t px-5 py-3">
                <div className="text-xs text-slate-500 mb-2 font-semibold uppercase">OF sources ({ofs.length}) — cliquez pour voir les articles</div>
                <div className="flex flex-wrap gap-2">
                  {ofs.map(of_ => {
                    const artCount = of_.articles?.length || 0;
                    const isExpanded = expandedOFCode === `src:${of_.code}`;
                    return (
                      <div key={of_.id}>
                        <button
                          onClick={() => setExpandedOFCode(isExpanded ? null : `src:${of_.code}`)}
                          className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 transition-all ${isExpanded ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}
                        >
                          <span className="font-mono font-bold text-blue-700 text-xs">{of_.code}</span>
                          <span className="text-[10px] text-slate-400">({artCount} art.)</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <Eye className="w-3 h-3 text-slate-400" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* Expanded source OF articles */}
                {expandedOFCode?.startsWith('src:') && (() => {
                  const ofCode = expandedOFCode.slice(4);
                  const of_ = ofs.find(o => o.code === ofCode);
                  if (!of_) return null;
                  return (
                    <div className="mt-3 bg-slate-50 border rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          Articles de l'OF <span className="font-mono text-blue-700">{ofCode}</span> ({of_.articles?.length || 0} articles)
                        </span>
                        <button onClick={() => setExpandedOFCode(null)} className="text-slate-400 hover:text-slate-600" title="Fermer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {(of_.articles || []).map(art => {
                          const assignedCode = codes[art.id];
                          const ofNum = assignedCode ? codeToOF.get(assignedCode) : undefined;
                          return (
                            <div key={art.id} className="px-4 py-1.5 flex items-center gap-3 text-xs">
                              <span className="font-mono font-bold text-slate-800 w-28 shrink-0">{art.code}</span>
                              <span className="text-slate-600 truncate flex-1">{art.designation || '—'}</span>
                              <span className="text-slate-400 shrink-0">Qté: {art.quantity ?? '—'}</span>
                              {assignedCode && (
                                <span className="font-mono font-bold text-white bg-blue-600 px-2 py-0.5 rounded text-[10px] shrink-0">{assignedCode} → OF {ofNum}</span>
                              )}
                            </div>
                          );
                        })}
                        {(!of_.articles || of_.articles.length === 0) && (
                          <div className="px-4 py-2 text-xs text-muted-foreground">Aucun article</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── SIDE PANEL: code assignment ── */}
          {selectedArticle && (
            <div
              ref={panelRef}
              className="w-[360px] shrink-0 bg-white border-l shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
            >
              {/* Panel header */}
              <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Attribution code</div>
                  <div className="font-mono font-bold text-lg mt-0.5">{selectedArticle.code}</div>
                </div>
                <button onClick={() => setSelectedArticleId(null)} className="p-1.5 rounded-lg hover:bg-slate-700 transition" title="Fermer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Article info */}
              <div className="px-5 py-4 border-b space-y-3 shrink-0">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Désignation</div>
                  <div className="text-sm font-medium text-slate-800 mt-0.5">{selectedArticle.designation || '—'}</div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">OF source</div>
                    <div className="text-sm font-mono text-blue-700 mt-0.5">{selectedArticle.ofCode}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Quantité</div>
                    <div className="text-sm mt-0.5">{selectedArticle.quantity ?? '—'}</div>
                  </div>
                </div>
                {codes[selectedArticle.id] && (
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Code actuel :</div>
                    <span className="font-mono font-bold text-white bg-blue-600 px-2.5 py-1 rounded text-sm">{codes[selectedArticle.id]}</span>
                    <span className="text-emerald-600 text-xs font-semibold">→ OF {codeToOF.get(codes[selectedArticle.id])}</span>
                    <button onClick={() => assignCode(selectedArticle.id, null)} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Retirer</button>
                  </div>
                )}
              </div>

              {/* Code selector */}
              <div className="px-5 pt-4 pb-2 shrink-0">
                <div className="text-xs font-semibold text-slate-700 mb-2">Attribuer un code (AA → ZZ)</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={codeSearch}
                    onChange={e => setCodeSearch(e.target.value)}
                    placeholder="Rechercher un code…"
                    className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Code list */}
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {filteredCodes.map(code => {
                    const count = codeCounts.get(code) || 0;
                    const isActive = codes[selectedArticle.id] === code;
                    return (
                      <button
                        key={code}
                        onClick={() => assignCode(selectedArticle.id, isActive ? null : code)}
                        className={`
                          relative flex flex-col items-center justify-center py-2 rounded-lg text-xs font-mono font-bold transition-all
                          ${isActive
                            ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md'
                            : count > 0
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                          }
                        `}
                      >
                        <span>{code}</span>
                        {count > 0 && (
                          <span className={`text-[9px] mt-0.5 ${isActive ? 'text-blue-200' : 'text-blue-400'}`}>({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {filteredCodes.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">Aucun code trouvé pour « {codeSearch} »</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
