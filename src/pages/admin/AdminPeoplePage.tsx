import { useState, useEffect, useMemo } from 'react';
import { Person, Team, Workshop } from '@/types/planning';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, User, Check, X, Search, Users, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePlanningData } from '@/hooks/usePlanningData';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { api, isApiEnabled } from '@/lib/api';

export const AdminPeoplePage = () => {
  const store = usePlanningStore();
  const {
    teams: storeTeams,
    subsidiaries, workshops, workshopsForSubsidiary,
    selectedSubsidiaryId, setSelectedSubsidiaryId,
    selectedWorkshopId, setSelectedWorkshopId,
  } = usePlanningData();

  // Show ALL employees for the selected subsidiary (not filtered by workshop)
  const storePeople = useMemo(
    () => store.people.filter(p => p.is_active && (!selectedSubsidiaryId || p.subsidiary_id === selectedSubsidiaryId)),
    [store.people, selectedSubsidiaryId]
  );

  const [teams, setTeams] = useState<Team[]>(storeTeams);
  const [people, setPeople] = useState<Person[]>(storePeople);

  useEffect(() => { setTeams(storeTeams); }, [storeTeams]);
  useEffect(() => { setPeople(storePeople); }, [storePeople]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorkshopId, setBulkWorkshopId] = useState('');

  const filteredPeople = useMemo(() => {
    let list = people;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.display_name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
      );
    }
    return list;
  }, [people, searchQuery]);

  const unassignedCount = useMemo(() => people.filter(p => !p.workshop_id).length, [people]);

  const handleEdit = (person: Person) => {
    setEditingId(person.id);
    setEditName(person.display_name);
    setEditTeamId(person.team_id ?? '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) { toast.error('Le nom est requis'); return; }
    if (isApiEnabled()) {
      try {
        const parts = editName.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        await api.employees.update(id, { lastName, firstName, teamId: editTeamId || null });
      } catch { toast.error('Erreur lors de la modification'); return; }
    }
    setPeople(prev => prev.map(p => p.id === id ? { ...p, display_name: editName.trim(), team_id: editTeamId } : p));
    setEditingId(null);
    toast.success('Personne modifiée');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette personne ?')) return;
    if (isApiEnabled()) {
      try { await api.employees.delete(id); } catch { toast.error('Erreur lors de la suppression'); return; }
    }
    setPeople(prev => prev.filter(p => p.id !== id));
    toast.success('Personne supprimée');
  };

  const handleBulkAssignWorkshop = async () => {
    if (!bulkWorkshopId || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (isApiEnabled()) {
      try {
        const result = await api.employees.bulkAssignWorkshop({ employeeIds: ids, workshopId: bulkWorkshopId });
        toast.success(`${result.updated} personne(s) affectée(s) à l'atelier`);
      } catch { toast.error('Erreur lors de l\'affectation en masse'); return; }
    }
    setPeople(prev => prev.map(p => ids.includes(p.id) ? { ...p, workshop_id: bulkWorkshopId } : p));
    setSelectedIds(new Set());
  };

  const handleAssignAllUnassigned = async () => {
    if (!selectedWorkshopId || !selectedSubsidiaryId) {
      toast.error('Sélectionnez une filiale et un atelier');
      return;
    }
    if (isApiEnabled()) {
      try {
        const result = await api.employees.bulkAssignUnassigned({ subsidiaryId: selectedSubsidiaryId, workshopId: selectedWorkshopId });
        toast.success(`${result.updated} personne(s) non affectée(s) assignée(s)`);
        // Reload people
        const emps = await api.employees.list();
        setPeople(emps.map(e => ({
          id: e.id, subsidiary_id: e.subsidiaryId, display_name: [e.firstName, e.lastName].filter(Boolean).join(' ') || e.code,
          workshop_id: e.workshopId ?? null, team_id: e.teamId ?? null, is_active: e.isActive, code: e.code, created_at: '',
        } as Person)));
      } catch { toast.error('Erreur'); return; }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPeople.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPeople.map(p => p.id)));
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return '—';
    return teams.find(t => t.id === teamId)?.name || '—';
  };

  const getWorkshopName = (workshopId: string | null) => {
    if (!workshopId) return null;
    return workshops.find(w => w.id === workshopId)?.name || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Accueil
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Gestion du Personnel</h1>
                  <p className="text-sm text-muted-foreground">
                    {people.length} personne(s)
                    {unassignedCount > 0 && <span className="text-amber-600 ml-1">• {unassignedCount} sans atelier</span>}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedSubsidiaryId}
                onChange={(e) => setSelectedSubsidiaryId(e.target.value)}
                className="px-3 py-2 bg-secondary rounded-lg text-foreground text-sm focus:outline-none"
              >
                {subsidiaries.map(s => (
                  <option key={s.id} value={s.id}>{s.code} – {s.name}</option>
                ))}
              </select>
              <select
                value={selectedWorkshopId}
                onChange={(e) => setSelectedWorkshopId(e.target.value)}
                className="px-3 py-2 bg-secondary rounded-lg text-foreground text-sm focus:outline-none"
              >
                {workshopsForSubsidiary.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Bulk actions bar */}
        {unassignedCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">{unassignedCount} personne(s) sans atelier</p>
                <p className="text-xs text-amber-600">Elles n'apparaîtront pas dans le planning tant qu'elles ne sont pas affectées.</p>
              </div>
            </div>
            <button
              onClick={handleAssignAllUnassigned}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Affecter tous à l'atelier sélectionné
            </button>
          </div>
        )}

        {/* Search + bulk selection toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou code…"
              className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.size} sél.</span>
                <select
                  value={bulkWorkshopId}
                  onChange={(e) => setBulkWorkshopId(e.target.value)}
                  className="px-3 py-2 bg-secondary rounded-lg text-foreground text-sm focus:outline-none"
                >
                  <option value="">Choisir un atelier…</option>
                  {workshops.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssignWorkshop}
                  disabled={!bulkWorkshopId}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Affecter
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 text-sm"
                >
                  Annuler
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={selectedIds.size === filteredPeople.length && filteredPeople.length > 0}
                    onChange={toggleSelectAll} className="w-4 h-4 rounded border-border" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase w-28">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Atelier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Équipe</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase w-20">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map((person) => (
                <tr key={person.id} className={`border-t border-border hover:bg-muted/30 ${!person.workshop_id ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(person.id)}
                      onChange={() => toggleSelect(person.id)} className="w-4 h-4 rounded border-border" />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {person.code || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {editingId === person.id ? (
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 bg-secondary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground text-sm">{person.display_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {person.workshop_id ? (
                      <span className="text-sm text-foreground">{getWorkshopName(person.workshop_id)}</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Non affecté</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editingId === person.id ? (
                      <select value={editTeamId} onChange={(e) => setEditTeamId(e.target.value)}
                        className="px-2 py-1 bg-secondary rounded text-foreground text-sm focus:outline-none">
                        <option value="">Aucune équipe</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-muted-foreground">{getTeamName(person.team_id)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium
                      ${person.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {person.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {editingId === person.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(person.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Sauvegarder">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg" title="Annuler">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(person)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors" title="Modifier">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(person.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPeople.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {searchQuery ? 'Aucun résultat' : 'Aucune personne'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Affiche {filteredPeople.length} / {people.length} personne(s)
        </p>
      </main>
    </div>
  );
};
