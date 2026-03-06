import { useState } from 'react';
import { api, ApiDessinateur } from '@/lib/api';
import { XCircle, Users, Archive, Plus, Trash2 } from 'lucide-react';

export function DessinateursPanel({ dessinateurs, onClose, onChanged }: { dessinateurs: ApiDessinateur[]; onClose: () => void; onChanged: () => void }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [societe, setSociete] = useState('');
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active = dessinateurs.filter(d => d.isActive);
  const archived = dessinateurs.filter(d => !d.isActive);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    try {
      await api.dessinateurs.create({ nom: nom.trim(), prenom: prenom.trim(), societe: societe.trim() });
      setNom(''); setPrenom(''); setSociete('');
      onChanged();
    } catch (err: any) { alert(err.message || 'Erreur'); }
    setSaving(false);
  };

  const handleToggle = async (id: string) => {
    try { await api.dessinateurs.toggle(id); onChanged(); } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement ce dessinateur ?')) return;
    try { await api.dessinateurs.delete(id); onChanged(); } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Dessinateurs</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" title="Fermer"><XCircle className="w-5 h-5" /></button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="px-6 py-3 border-b bg-slate-50">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Nom *</label>
              <input value={nom} onChange={e => setNom(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" placeholder="Dupont" required />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Prénom</label>
              <input value={prenom} onChange={e => setPrenom(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" placeholder="Jean" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Société</label>
              <input value={societe} onChange={e => setSociete(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" placeholder="CAA" />
            </div>
            <button type="submit" disabled={saving || !nom.trim()} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 shrink-0 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
        </form>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actifs ({active.length})</div>
          {active.length === 0 ? (
            <div className="px-6 py-3 text-xs text-muted-foreground">Aucun dessinateur actif</div>
          ) : (
            <div className="divide-y">
              {active.map(d => (
                <div key={d.id} className="px-6 py-2 flex items-center gap-3 hover:bg-slate-50">
                  <div className="flex-1">
                    <span className="font-medium text-sm">{d.nom} {d.prenom}</span>
                    {d.societe && <span className="text-xs text-muted-foreground ml-2">— {d.societe}</span>}
                  </div>
                  <button onClick={() => handleToggle(d.id)} className="text-xs px-2 py-1 border rounded hover:bg-amber-50 text-amber-600 flex items-center gap-1" title="Archiver">
                    <Archive className="w-3 h-3" /> Archiver
                  </button>
                </div>
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <>
              <button onClick={() => setShowArchived(!showArchived)} className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground w-full text-left">
                {showArchived ? '▾' : '▸'} Archivés ({archived.length})
              </button>
              {showArchived && (
                <div className="divide-y opacity-60">
                  {archived.map(d => (
                    <div key={d.id} className="px-6 py-2 flex items-center gap-3 hover:bg-slate-50">
                      <div className="flex-1">
                        <span className="text-sm line-through">{d.nom} {d.prenom}</span>
                        {d.societe && <span className="text-xs text-muted-foreground ml-2">— {d.societe}</span>}
                      </div>
                      <button onClick={() => handleToggle(d.id)} className="text-xs px-2 py-1 border rounded hover:bg-green-50 text-green-600" title="Réactiver">
                        Réactiver
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="p-1 rounded hover:bg-red-100 text-red-400" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t px-6 py-3 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Fermer</button>
        </div>
      </div>
    </div>
  );
}
