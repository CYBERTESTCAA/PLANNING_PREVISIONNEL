import { useState } from 'react';
import { Subsidiary, Workshop } from '@/types/planning';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Building2, Check, X, ChevronDown, ChevronRight, Factory } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { api, isApiEnabled } from '@/lib/api';

export const AdminSubsidiariesPage = () => {
  const store = usePlanningStore();
  const subsidiaries = store.subsidiaries;
  const setSubsidiaries = store.setSubsidiaries;
  const workshops = store.workshops;
  const setWorkshops = store.setWorkshops;
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Subsidiary CRUD
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubCode, setEditSubCode] = useState('');
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');

  // Workshop CRUD
  const [editingWkId, setEditingWkId] = useState<string | null>(null);
  const [editWkName, setEditWkName] = useState('');
  const [editWkColor, setEditWkColor] = useState('');
  const [addingWkForSub, setAddingWkForSub] = useState<string | null>(null);
  const [newWkName, setNewWkName] = useState('');
  const [newWkCode, setNewWkCode] = useState('');

  const workshopsForSub = (subId: string) => workshops.filter(w => w.subsidiary_id === subId);

  const handleAddSub = async () => {
    if (!newSubName.trim() || !newSubCode.trim()) { toast.error('Code et nom requis'); return; }
    if (isApiEnabled()) {
      try {
        const saved = await api.subsidiaries.create({ code: newSubCode.trim().toUpperCase(), name: newSubName.trim() });
        setSubsidiaries(prev => [...prev, { id: saved.id, code: saved.code, name: saved.name, created_at: new Date().toISOString() } as unknown as Subsidiary]);
        toast.success('Filiale créée');
      } catch { toast.error('Erreur lors de la création'); return; }
    } else {
      setSubsidiaries(prev => [...prev, { id: crypto.randomUUID(), code: newSubCode.trim().toUpperCase(), name: newSubName.trim(), created_at: new Date().toISOString() } as unknown as Subsidiary]);
      toast.success('Filiale créée');
    }
    setNewSubName(''); setNewSubCode(''); setShowAddSub(false);
  };

  const handleSaveSub = async (id: string) => {
    if (!editSubName.trim()) { toast.error('Le nom est requis'); return; }
    if (isApiEnabled()) {
      try { await api.subsidiaries.update(id, { name: editSubName.trim(), code: editSubCode.trim() }); }
      catch { toast.error('Erreur lors de la modification'); return; }
    }
    setSubsidiaries(prev => prev.map(s => s.id === id ? { ...s, name: editSubName.trim(), code: editSubCode.trim() } : s));
    setEditingSubId(null);
    toast.success('Filiale modifiée');
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm('Supprimer cette filiale et tous ses ateliers ?')) return;
    if (isApiEnabled()) {
      try { await api.subsidiaries.delete(id); } catch { toast.error('Erreur lors de la suppression'); return; }
    }
    setSubsidiaries(prev => prev.filter(s => s.id !== id));
    setWorkshops(prev => prev.filter(w => w.subsidiary_id !== id));
    toast.success('Filiale supprimée');
  };

  const handleAddWorkshop = async (subId: string) => {
    if (!newWkName.trim() || !newWkCode.trim()) { toast.error('Code et nom requis'); return; }
    if (isApiEnabled()) {
      try {
        const saved = await api.workshops.create({ subsidiaryId: subId, code: newWkCode.trim().toUpperCase(), name: newWkName.trim() });
        setWorkshops(prev => [...prev, { id: saved.id, subsidiary_id: saved.subsidiaryId, code: saved.code, name: saved.name, created_at: new Date().toISOString() } as unknown as Workshop]);
        toast.success('Atelier créé');
      } catch { toast.error('Erreur lors de la création'); return; }
    } else {
      setWorkshops(prev => [...prev, { id: crypto.randomUUID(), subsidiary_id: subId, code: newWkCode.trim().toUpperCase(), name: newWkName.trim(), created_at: new Date().toISOString() } as unknown as Workshop]);
      toast.success('Atelier créé');
    }
    setNewWkName(''); setNewWkCode(''); setAddingWkForSub(null);
  };

  const handleSaveWorkshop = async (id: string) => {
    if (!editWkName.trim()) { toast.error('Le nom est requis'); return; }
    if (isApiEnabled()) {
      try { await api.workshops.update(id, { name: editWkName.trim(), themeColor: editWkColor || undefined }); }
      catch { toast.error('Erreur lors de la modification'); return; }
    }
    setWorkshops(prev => prev.map(w => w.id === id ? { ...w, name: editWkName.trim(), theme_color: editWkColor || undefined } : w));
    setEditingWkId(null);
    toast.success('Atelier modifié');
  };

  const handleDeleteWorkshop = async (id: string) => {
    if (!confirm('Supprimer cet atelier ?')) return;
    if (isApiEnabled()) {
      try { await api.workshops.delete(id); } catch { toast.error('Erreur lors de la suppression'); return; }
    }
    setWorkshops(prev => prev.filter(w => w.id !== id));
    toast.success('Atelier supprimé');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />Accueil
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Filiales & Ateliers</h1>
                  <p className="text-sm text-muted-foreground">{subsidiaries.length} filiale(s), {workshops.length} atelier(s)</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowAddSub(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />Nouvelle filiale
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-3">
        <AnimatePresence>
          {showAddSub && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="bg-card border border-primary/30 rounded-xl p-4 mb-2">
                <h3 className="font-medium text-foreground mb-3">Nouvelle filiale</h3>
                <div className="flex gap-3 flex-wrap">
                  <input type="text" value={newSubCode} onChange={e => setNewSubCode(e.target.value)}
                    placeholder="Code (ex: GUAD)" className="w-32 px-3 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)}
                    placeholder="Nom de la filiale" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddSub()}
                    className="flex-1 min-w-[200px] px-3 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  <button onClick={handleAddSub} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">Créer</button>
                  <button onClick={() => { setShowAddSub(false); setNewSubName(''); setNewSubCode(''); }}
                    className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80">Annuler</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {subsidiaries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Aucune filiale — créez-en une ci-dessus</div>
        )}

        {subsidiaries.map(sub => {
          const subWorkshops = workshopsForSub(sub.id);
          const isExpanded = expandedSubId === sub.id;

          return (
            <div key={sub.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Sub header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {editingSubId === sub.id ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <input type="text" value={editSubCode} onChange={e => setEditSubCode(e.target.value)}
                      className="w-24 px-2 py-1 bg-secondary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    <input type="text" value={editSubName} onChange={e => setEditSubName(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveSub(sub.id); if (e.key === 'Escape') setEditingSubId(null); }}
                      className="flex-1 px-2 py-1 bg-secondary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    <button onClick={() => handleSaveSub(sub.id)} className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingSubId(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => setExpandedSubId(isExpanded ? null : sub.id)} className="flex-1 flex items-center gap-2 text-left">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-mono text-xs font-bold text-primary">{sub.code}</span>
                    <span className="font-semibold text-foreground">{sub.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{subWorkshops.length} atelier(s)</span>
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingSubId(sub.id); setEditSubName(sub.name); setEditSubCode((sub as any).code ?? ''); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteSub(sub.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Workshops */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Factory className="w-3.5 h-3.5" />Ateliers
                        </span>
                        <button onClick={() => { setAddingWkForSub(sub.id); setNewWkName(''); setNewWkCode(''); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                          <Plus className="w-3 h-3" />Ajouter
                        </button>
                      </div>

                      <AnimatePresence>
                        {addingWkForSub === sub.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <div className="flex gap-2 flex-wrap mb-2">
                              <input type="text" value={newWkCode} onChange={e => setNewWkCode(e.target.value)}
                                placeholder="Code" className="w-24 px-2 py-1.5 bg-secondary rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                              <input type="text" value={newWkName} onChange={e => setNewWkName(e.target.value)}
                                placeholder="Nom de l'atelier" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddWorkshop(sub.id)}
                                className="flex-1 px-2 py-1.5 bg-secondary rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                              <button onClick={() => handleAddWorkshop(sub.id)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90">Créer</button>
                              <button onClick={() => setAddingWkForSub(null)} className="px-3 py-1.5 bg-secondary text-foreground rounded text-xs hover:bg-secondary/80">Annuler</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {subWorkshops.length === 0 && addingWkForSub !== sub.id && (
                        <p className="text-xs text-muted-foreground italic py-1">Aucun atelier — cliquez sur "Ajouter"</p>
                      )}

                      {subWorkshops.map(wk => (
                        <div key={wk.id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                          {wk.theme_color && (
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${wk.theme_color})` }} />
                          )}
                          {editingWkId === wk.id ? (
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                              <input type="text" value={editWkName} onChange={e => setEditWkName(e.target.value)} autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveWorkshop(wk.id); if (e.key === 'Escape') setEditingWkId(null); }}
                                className="flex-1 px-2 py-1 bg-secondary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                              <input type="text" value={editWkColor} onChange={e => setEditWkColor(e.target.value)}
                                placeholder="Couleur HSL (ex: 221 83% 53%)" className="w-48 px-2 py-1 bg-secondary rounded text-foreground focus:outline-none text-xs" />
                              <button onClick={() => handleSaveWorkshop(wk.id)} className="p-1 text-green-500 hover:bg-green-500/10 rounded"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingWkId(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <span className="font-mono text-xs text-primary font-bold mr-2">{(wk as any).code}</span>
                              <span className="text-sm text-foreground">{wk.name}</span>
                            </div>
                          )}
                          {editingWkId !== wk.id && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditingWkId(wk.id); setEditWkName(wk.name); setEditWkColor(wk.theme_color ?? ''); }}
                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteWorkshop(wk.id)}
                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </main>
    </div>
  );
};
