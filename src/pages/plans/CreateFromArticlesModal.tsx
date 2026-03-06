import { useState, useMemo } from 'react';
import { api, ApiManufacturingOrder } from '@/lib/api';
import { XCircle, Plus, AlertTriangle } from 'lucide-react';

interface PlanInfo { numPlan?: string | null; hk: string }

export function CreateFromArticlesModal({ projectId, ofs, existingHks, existingPlans, onClose, onCreated }: {
  projectId: string;
  ofs: ApiManufacturingOrder[];
  existingHks: Set<string>;
  existingPlans: Map<string, PlanInfo>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedOF, setExpandedOF] = useState<Set<string>>(new Set(ofs.map(o => o.id)));
  const [saving, setSaving] = useState(false);
  const [manualHk, setManualHk] = useState('');
  const [manualOF, setManualOF] = useState('');
  const [manualNumPlan, setManualNumPlan] = useState('');
  const [createEmpty, setCreateEmpty] = useState(false);
  const [emptyNumPlan, setEmptyNumPlan] = useState('');
  const [emptyOF, setEmptyOF] = useState('');

  const toggle = (articleCode: string, ofCode: string) => {
    const key = `${ofCode}::${articleCode}`;
    setSelected(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const toggleOF = (ofId: string) => {
    setExpandedOF(prev => { const n = new Set(prev); if (n.has(ofId)) n.delete(ofId); else n.add(ofId); return n; });
  };

  // Check if selected articles come from multiple OFs
  const selectedOFs = useMemo(() => {
    const ofSet = new Set<string>();
    for (const key of selected) {
      const [ofCode] = key.split('::');
      ofSet.add(ofCode);
    }
    return ofSet;
  }, [selected]);

  const multiOFError = selectedOFs.size > 1;

  const handleCreate = async () => {
    if (multiOFError) return;
    setSaving(true);
    try {
      const plans: Array<{ projectId: string; hk?: string; codeOF?: string; numPlan?: string }> = [];

      // From selected articles
      for (const key of selected) {
        const [ofCode, articleCode] = key.split('::');
        if (!existingHks.has(articleCode)) {
          plans.push({ projectId, hk: articleCode, codeOF: ofCode });
        }
      }

      // Manual entry with article
      if (manualHk.trim() && !existingHks.has(manualHk.trim())) {
        plans.push({ projectId, hk: manualHk.trim(), codeOF: manualOF.trim() || undefined, numPlan: manualNumPlan.trim() || undefined });
      }

      // Empty plan (0 articles — e.g. gift)
      if (createEmpty) {
        plans.push({ projectId, hk: '', codeOF: emptyOF.trim() || undefined, numPlan: emptyNumPlan.trim() || undefined });
      }

      if (plans.length > 0) await api.plans.bulkCreate(plans);
      onCreated();
    } catch (err: any) { alert(err.message || 'Erreur'); }
    setSaving(false);
  };

  const totalArticles = ofs.reduce((s, o) => s + (o.articles?.length || 0), 0);
  const canCreate = !multiOFError && (selected.size > 0 || manualHk.trim() || createEmpty);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Créer des plans depuis les articles</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{ofs.length} OF — {totalArticles} articles — sélectionne ceux à transformer en plans</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" title="Fermer"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {ofs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">Aucun OF synchronisé pour ce chantier.</p>
              <p className="text-xs mt-1">Lance une synchronisation ou utilise la saisie manuelle ci-dessous.</p>
            </div>
          ) : (
            <div className="divide-y">
              {ofs.map(of => {
                const artWithPlan = (of.articles || []).filter(a => existingHks.has(a.code)).length;
                const artTotal = of.articles?.length || 0;
                return (
                  <div key={of.id}>
                    <button onClick={() => toggleOF(of.id)} className="w-full px-6 py-2.5 flex items-center gap-3 hover:bg-slate-50 text-left">
                      <span className="text-xs">{expandedOF.has(of.id) ? '▾' : '▸'}</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">{of.code}</span>
                      <span className="text-xs text-muted-foreground flex-1">{of.label !== of.code ? of.label : ''}</span>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-medium">{artTotal} art.</span>
                      {artWithPlan > 0 && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">{artWithPlan}/{artTotal} plans</span>
                      )}
                    </button>
                    {expandedOF.has(of.id) && (
                      <div className="pl-12 pr-6 pb-2 space-y-1">
                        {(!of.articles || of.articles.length === 0) ? (
                          <p className="text-xs text-muted-foreground py-1">Aucun article dans cet OF</p>
                        ) : of.articles.map(art => {
                          const key = `${of.code}::${art.code}`;
                          const alreadyExists = existingHks.has(art.code);
                          const planInfo = existingPlans.get(art.code);
                          return (
                            <label key={art.id} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm ${alreadyExists ? 'opacity-50 cursor-default' : 'hover:bg-blue-50 cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={selected.has(key)}
                                onChange={() => toggle(art.code, of.code)}
                                disabled={alreadyExists}
                              />
                              <span className="font-mono text-xs font-semibold">{art.code}</span>
                              <span className="text-xs text-muted-foreground flex-1 truncate">{art.designation !== art.code ? art.designation : ''}</span>
                              {alreadyExists && planInfo && (
                                <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded font-mono font-semibold shrink-0">
                                  Plan {planInfo.numPlan || '—'}
                                </span>
                              )}
                              {alreadyExists && !planInfo && <span className="text-[10px] text-green-600 font-medium shrink-0">✓ Plan</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Multi-OF error */}
          {multiOFError && (
            <div className="mx-6 my-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-xs text-red-700 font-medium">Impossible de créer un plan avec des articles de différents OFs ({[...selectedOFs].join(', ')}). Sélectionnez les articles d'un seul OF.</span>
            </div>
          )}

          {/* Manual entry with article */}
          <div className="px-6 py-3 border-t bg-slate-50">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-2">Saisie manuelle</p>
            <div className="flex gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground">HK / Article</label>
                <input value={manualHk} onChange={e => setManualHk(e.target.value)} placeholder="ART-001" className="block border rounded px-2 py-1.5 text-sm w-32 mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Code OF</label>
                <input value={manualOF} onChange={e => setManualOF(e.target.value)} placeholder="OF-001" className="block border rounded px-2 py-1.5 text-sm w-28 mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">N° Plan</label>
                <input value={manualNumPlan} onChange={e => setManualNumPlan(e.target.value)} placeholder="PL-001" className="block border rounded px-2 py-1.5 text-sm w-24 mt-0.5" />
              </div>
            </div>
          </div>

          {/* Create plan with 0 articles */}
          <div className="px-6 py-3 border-t bg-amber-50/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={createEmpty} onChange={e => setCreateEmpty(e.target.checked)} />
              <span className="text-xs font-semibold text-amber-800">Créer un plan sans article (cadeau, hors vente…)</span>
            </label>
            {createEmpty && (
              <div className="flex gap-2 items-end mt-2">
                <div>
                  <label className="text-xs text-muted-foreground">N° Plan</label>
                  <input value={emptyNumPlan} onChange={e => setEmptyNumPlan(e.target.value)} placeholder="CADEAU-001" className="block border rounded px-2 py-1.5 text-sm w-32 mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Code OF (optionnel)</label>
                  <input value={emptyOF} onChange={e => setEmptyOF(e.target.value)} placeholder="OF-001" className="block border rounded px-2 py-1.5 text-sm w-28 mt-0.5" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.size} article{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
            {selectedOFs.size === 1 && <span className="text-blue-600 font-medium ml-1">(OF: {[...selectedOFs][0]})</span>}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Annuler</button>
            <button onClick={handleCreate} disabled={saving || !canCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {saving ? 'Création…' : `Créer ${selected.size + (manualHk.trim() ? 1 : 0) + (createEmpty ? 1 : 0)} plan${(selected.size + (manualHk.trim() ? 1 : 0) + (createEmpty ? 1 : 0)) > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
