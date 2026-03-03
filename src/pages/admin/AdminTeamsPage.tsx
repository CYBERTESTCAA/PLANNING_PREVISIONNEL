import { useState, useEffect, useRef, useCallback } from 'react';
import { Person, Workshop, Subsidiary } from '@/types/planning';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Building2, Check, X, ChevronDown, ChevronRight, UserPlus, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { api, isApiEnabled, ApiEmployee } from '@/lib/api';

const NOW = new Date().toISOString();
const mapEmp = (e: ApiEmployee): Person => ({
  id: e.id, subsidiary_id: e.subsidiaryId, workshop_id: e.workshopId ?? null,
  team_id: e.teamId ?? null, display_name: [e.firstName, e.lastName].filter(Boolean).join(' ') || e.code,
  code: e.code, is_active: e.isActive, created_at: NOW,
});

export const AdminTeamsPage = () => {
  const store = usePlanningStore();
  const subsidiaries = store.subsidiaries;
  const workshops = store.workshops;
  const setWorkshops = store.setWorkshops;
  const [empsBySub, setEmpsBySub] = useState<Record<string, Person[]>>({});
  const [loadingSub, setLoadingSub] = useState<Record<string, boolean>>({});

  const [expandedSubId, setExpandedSubId] = useState<string | null>(store.subsidiaries[0]?.id ?? null);
  const [expandedWorkshopId, setExpandedWorkshopId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addingForSubId, setAddingForSubId] = useState<string | null>(null);
  const [newAtelierName, setNewAtelierName] = useState('');
  const [searchByWk, setSearchByWk] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const searchRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadSub = useCallback(async (subId: string) => {
    if (empsBySub[subId] !== undefined || loadingSub[subId]) return;
    if (!isApiEnabled()) {
      setEmpsBySub(prev => ({ ...prev, [subId]: store.people.filter(p => p.subsidiary_id === subId) }));
      return;
    }
    setLoadingSub(prev => ({ ...prev, [subId]: true }));
    try {
      const list = await api.employees.list({ subsidiaryId: subId });
      setEmpsBySub(prev => ({ ...prev, [subId]: list.map(mapEmp) }));
    } catch { toast.error('Erreur chargement employés'); }
    finally { setLoadingSub(prev => ({ ...prev, [subId]: false })); }
  }, [empsBySub, loadingSub, store.people]);

  // Auto-load employees for the initially expanded subsidiary
  useEffect(() => {
    if (expandedSubId) loadSub(expandedSubId);
  }, [expandedSubId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpandSub = (subId: string) => {
    const next = expandedSubId === subId ? null : subId;
    setExpandedSubId(next);
  };

  const subEmps = (subId: string) => empsBySub[subId] ?? [];
  const workshopsForSub = (subId: string) => workshops.filter(w => w.subsidiary_id === subId).sort((a, b) => a.name.localeCompare(b.name));
  const membersOf = (subId: string, wkId: string) => subEmps(subId).filter(p => p.workshop_id === wkId && p.is_active).sort((a, b) => a.display_name.localeCompare(b.display_name));
  const poolOf = (subId: string) => subEmps(subId).filter(p => p.is_active && p.workshop_id === null).sort((a, b) => a.display_name.localeCompare(b.display_name));

  const suggestions = (subId: string, wkId: string, query: string) => {
    const q = query.toLowerCase().trim();
    return subEmps(subId).filter(p => p.is_active && p.workshop_id !== wkId && (!q || p.display_name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q))).sort((a, b) => a.display_name.localeCompare(b.display_name)).slice(0, 30);
  };

  const updateEmp = (subId: string, empId: string, changes: Partial<Person>) =>
    setEmpsBySub(prev => ({ ...prev, [subId]: (prev[subId] ?? []).map(p => p.id === empId ? { ...p, ...changes } : p) }));

  const handleCreateAtelier = async (subsidiaryId: string) => {
    if (!newAtelierName.trim()) { toast.error('Le nom est requis'); return; }
    if (!isApiEnabled()) { toast.error('API non connectée'); return; }
    try {
      const code = newAtelierName.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 20);
      const created = await api.workshops.create({ subsidiaryId, code, name: newAtelierName.trim() });
      const mapped: Workshop = { id: created.id, code: created.code, name: created.name, subsidiary_id: created.subsidiaryId, theme_color: created.themeColor ?? undefined, created_at: NOW } as Workshop;
      setWorkshops(prev => [...prev, mapped]);
      toast.success('Atelier créé');
    } catch (e: any) { toast.error(e?.message ?? 'Erreur'); }
    setNewAtelierName(''); setAddingForSubId(null);
  };

  const handleSaveEdit = async (workshopId: string) => {
    if (!editName.trim()) { toast.error('Le nom est requis'); return; }
    if (isApiEnabled()) { try { await api.workshops.update(workshopId, { name: editName.trim() }); } catch { toast.error('Erreur modification'); return; } }
    setWorkshops(prev => prev.map(w => w.id === workshopId ? { ...w, name: editName.trim() } : w));
    setEditingId(null); toast.success('Atelier modifié');
  };

  const handleDelete = async (workshopId: string) => {
    if (!confirm('Supprimer cet atelier ?')) return;
    if (isApiEnabled()) { try { await api.workshops.delete(workshopId); } catch { toast.error('Erreur suppression'); return; } }
    setWorkshops(prev => prev.filter(w => w.id !== workshopId)); toast.success('Atelier supprimé');
  };

  const handleAssign = async (subId: string, wkId: string, person: Person) => {
    if (isApiEnabled()) { try { await api.employees.update(person.id, { workshopId: wkId }); } catch { toast.error("Erreur affectation"); return; } }
    updateEmp(subId, person.id, { workshop_id: wkId });
    setSearchByWk(prev => ({ ...prev, [wkId]: '' })); setShowDropdown(null);
    toast.success(`${person.display_name} affecté(e)`);
  };

  const handleRemove = async (subId: string, person: Person) => {
    if (isApiEnabled()) { try { await api.employees.update(person.id, { workshopId: null }); } catch { toast.error("Erreur retrait"); return; } }
    updateEmp(subId, person.id, { workshop_id: null });
    toast.success(`${person.display_name} retiré(e) de l'atelier`);
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />Accueil
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Gestion des Ateliers</h1>
              <p className="text-sm text-muted-foreground">{workshops.length} atelier(s) · {subsidiaries.length} filiale(s)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {subsidiaries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Aucune filiale — lancez une synchronisation Fabric</div>
        )}

        {subsidiaries.map(sub => {
          const subWorkshops = workshopsForSub(sub.id);
          return (
            <div key={sub.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-foreground">{sub.name}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{subWorkshops.length} atelier(s)</span>
                <button onClick={() => { setAddingForSubId(sub.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus className="w-3.5 h-3.5" />Nouvel atelier
                </button>
              </div>

              {addingForSubId === sub.id && (
                <div className="flex gap-2 ml-4">
                  <input type="text" value={newAtelierName} onChange={e => setNewAtelierName(e.target.value)}
                    placeholder="Nom du nouvel atelier" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateAtelier(sub.id); if (e.key === 'Escape') { setAddingForSubId(null); setNewAtelierName(''); } }}
                    className="flex-1 max-w-md px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={() => handleCreateAtelier(sub.id)} className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90">Créer</button>
                  <button onClick={() => { setAddingForSubId(null); setNewAtelierName(''); }} className="px-3 py-2 bg-secondary text-foreground text-sm rounded-lg">Annuler</button>
                </div>
              )}

              <div className="space-y-2 ml-4">
                {subWorkshops.length === 0 && addingForSubId !== sub.id && (
                  <p className="text-sm text-muted-foreground italic">Aucun atelier</p>
                )}
                {subWorkshops.map(wk => {
                  const members = membersOf(sub.id, wk.id);
                  const isWkExpanded = expandedWorkshopId === wk.id;
                  const search = searchByWk[wk.id] ?? '';
                  const dropdownItems = suggestions(sub.id, wk.id, search);
                  return (
                    <div key={wk.id} className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <button onClick={() => setExpandedWorkshopId(isWkExpanded ? null : wk.id)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                          {isWkExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {editingId === wk.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(wk.id); if (e.key === 'Escape') setEditingId(null); }}
                              className="flex-1 px-2 py-1 bg-secondary rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                            <button onClick={() => handleSaveEdit(wk.id)} className="p-1 text-success hover:bg-success/10 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setExpandedWorkshopId(isWkExpanded ? null : wk.id)} className="flex-1 flex items-center gap-2 text-left">
                            <span className="font-medium text-foreground">{wk.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{members.length} personne{members.length !== 1 ? 's' : ''}</span>
                          </button>
                        )}
                        <button onClick={() => { setEditingId(wk.id); setEditName(wk.name); }} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg" title="Renommer">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(wk.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <AnimatePresence>
                        {isWkExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border">
                            <div className="px-6 py-3 space-y-2">
                              {members.length > 0 ? (
                                <div className="space-y-1">
                                  {members.map(person => (
                                    <div key={person.id} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        {person.code && <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{person.code}</span>}
                                        <span className="text-sm text-foreground">{person.display_name}</span>
                                      </div>
                                      <button onClick={() => handleRemove(sub.id, person)} title="Retirer de l'atelier" className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                        <UserX className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Aucun membre dans cet atelier</p>
                              )}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border focus-within:ring-2 focus-within:ring-primary/50">
                                  <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <input
                                    ref={el => { searchRefs.current[wk.id] = el; }}
                                    type="text" placeholder="Affecter une personne à cet atelier…"
                                    value={search}
                                    onChange={e => { setSearchByWk(prev => ({ ...prev, [wk.id]: e.target.value })); setShowDropdown(wk.id); }}
                                    onFocus={() => setShowDropdown(wk.id)}
                                    onBlur={() => setTimeout(() => setShowDropdown(null), 150)}
                                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                  />
                                  {search && <button onMouseDown={e => e.preventDefault()} onClick={() => setSearchByWk(prev => ({ ...prev, [wk.id]: '' }))} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
                                </div>
                                {showDropdown === wk.id && (
                                  <div className="bg-card border border-border rounded-lg max-h-52 overflow-y-auto">
                                    {dropdownItems.length === 0
                                      ? <div className="px-3 py-2 text-sm text-muted-foreground italic">Aucun résultat</div>
                                      : dropdownItems.map(person => (
                                        <button key={person.id} onMouseDown={e => e.preventDefault()} onClick={() => handleAssign(sub.id, wk.id, person)}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors border-b border-border last:border-b-0">
                                          {person.code && <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{person.code}</span>}
                                          <span className="flex-1 text-foreground">{person.display_name}</span>
                                          <span className="text-xs text-muted-foreground">{workshops.find(w => w.id === person.workshop_id)?.name ?? ''}</span>
                                          <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                                        </button>
                                      ))
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};
