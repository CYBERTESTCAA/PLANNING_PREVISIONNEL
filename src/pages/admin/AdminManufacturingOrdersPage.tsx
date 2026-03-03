import { useMemo, useState } from 'react';
import { ManufacturingOrder } from '@/types/planning';
import { usePlanningData } from '@/hooks/usePlanningData';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Factory, Check, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const AdminManufacturingOrdersPage = () => {
  const {
    projects,
    manufacturingOrders,
    setManufacturingOrders,
  } = usePlanningData();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editProjectId, setEditProjectId] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newProjectId, setNewProjectId] = useState(projects[0]?.id || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProjectId, setFilterProjectId] = useState<string>('');

  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return manufacturingOrders
      .filter(mo => {
        if (filterProjectId && mo.project_id !== filterProjectId) return false;
        if (!q) return true;
        const project = projectsById.get(mo.project_id);
        const hay = `${mo.code} ${project?.code || ''} ${project?.label || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [manufacturingOrders, filterProjectId, projectsById, searchQuery]);

  const handleAdd = () => {
    if (!newCode.trim() || !newProjectId) {
      toast.error('Le code et le chantier sont requis');
      return;
    }

    const code = newCode.trim().toUpperCase();
    const exists = manufacturingOrders.some(mo => mo.project_id === newProjectId && mo.code.toUpperCase() === code);
    if (exists) {
      toast.error('Cet OF existe déjà pour ce chantier');
      return;
    }

    const newMo: ManufacturingOrder = {
      id: crypto.randomUUID(),
      project_id: newProjectId,
      code,
      created_at: new Date().toISOString(),
    };

    setManufacturingOrders(prev => [...prev, newMo]);
    setNewCode('');
    setShowAddForm(false);
    toast.success('OF créé');
  };

  const handleEdit = (mo: ManufacturingOrder) => {
    setEditingId(mo.id);
    setEditCode(mo.code);
    setEditProjectId(mo.project_id);
  };

  const handleSaveEdit = (id: string) => {
    if (!editCode.trim() || !editProjectId) {
      toast.error('Le code et le chantier sont requis');
      return;
    }

    const code = editCode.trim().toUpperCase();
    const exists = manufacturingOrders.some(mo => mo.id !== id && mo.project_id === editProjectId && mo.code.toUpperCase() === code);
    if (exists) {
      toast.error('Cet OF existe déjà pour ce chantier');
      return;
    }

    setManufacturingOrders(prev => prev.map(mo => mo.id === id ? { ...mo, code, project_id: editProjectId } : mo));
    setEditingId(null);
    toast.success('OF modifié');
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cet OF ?')) {
      setManufacturingOrders(prev => prev.filter(mo => mo.id !== id));
      toast.success('OF supprimé');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 text-muted-foreground 
                           hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Accueil
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Factory className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Ordres de fabrication</h1>
                  <p className="text-sm text-muted-foreground">{manufacturingOrders.length} OF</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground 
                         rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvel OF
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un OF, code chantier..."
                className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg text-sm text-foreground 
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none md:w-[360px]"
            >
              <option value="">Tous les chantiers</option>
              {projects.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-3">Nouvel OF</h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Code OF (ex: OF-0001)"
                    className="flex-1 px-3 py-2 bg-secondary rounded-lg text-foreground 
                               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none md:w-[420px]"
                  >
                    {projects.filter(p => p.is_active).map(p => (
                      <option key={p.id} value={p.id}>{p.code} — {p.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Créer
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewCode(''); }}
                    className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground">OF</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Chantier</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-foreground w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mo) => {
                const project = projectsById.get(mo.project_id);
                return (
                  <tr key={mo.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {editingId === mo.id ? (
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full px-2 py-1 bg-secondary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                      ) : (
                        <span className="font-mono font-medium text-foreground">{mo.code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === mo.id ? (
                        <select
                          value={editProjectId}
                          onChange={(e) => setEditProjectId(e.target.value)}
                          className="w-full px-2 py-1 bg-secondary rounded text-foreground focus:outline-none"
                        >
                          {projects.filter(p => p.is_active).map(p => (
                            <option key={p.id} value={p.id}>{p.code} — {p.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground">
                          {project ? `${project.code} — ${project.label}` : mo.project_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === mo.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(mo.id)}
                              className="p-2 text-success hover:bg-success/10 rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 text-muted-foreground hover:bg-secondary rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(mo)}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(mo.id)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                    Aucun OF
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
