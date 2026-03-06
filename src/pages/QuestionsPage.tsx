import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiQuestion, ApiQuestionAttachment, ApiProject, QuestionAvancement } from '@/lib/api';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';
import { MessageCircleQuestion, Plus, RotateCcw, Trash2, CheckCircle2, Clock, AlertCircle, Paperclip, Image, FileText as FileIcon, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AVANC_CONFIG: Record<QuestionAvancement, { label: string; color: string; bg: string; icon: typeof AlertCircle }> = {
  NON_TRAITE: { label: 'Non traité', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertCircle },
  EN_COURS_Q: { label: 'En cours', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: Clock },
  TERMINE: { label: 'Terminé', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2 },
};

export function QuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const { selectedSubsidiaryId, workshops } = usePlanningStore();

  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { api.projects.list().then(setAllProjects).catch(console.error); }, []);

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
    if (!projectId) { setQuestions([]); return; }
    setLoading(true);
    try { setQuestions(await api.questions.list({ projectId })); } catch (e) { console.error(e); }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id: string, body: any) => {
    try { await api.questions.update(id, body); await load(); } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette question ?')) return;
    try { await api.questions.delete(id); await load(); } catch (e) { console.error(e); }
  };

  // Group by avancement for kanban
  const groups: Record<QuestionAvancement, ApiQuestion[]> = {
    NON_TRAITE: [], EN_COURS_Q: [], TERMINE: [],
  };
  questions.forEach(q => { (groups[q.avancement] || groups.NON_TRAITE).push(q); });

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircleQuestion className="w-6 h-6 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold">Questions Techniques</h1>
              {selectedProject && <p className="text-sm text-purple-600 font-medium">{selectedProject.code} — {selectedProject.label}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={projectId}
              onChange={e => setSearchParams(e.target.value ? { projectId: e.target.value } : {})}
              className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[250px]"
              title="Sélectionner un chantier"
            >
              <option value="">Sélectionner un chantier…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.label}</option>)}
            </select>
            {projectId && (
              <button onClick={() => setShowCreate(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Nouvelle question
              </button>
            )}
          </div>
        </div>
      </header>

      {!projectId ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageCircleQuestion className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Sélectionne un chantier pour voir ses questions</p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Chargement…</div>
      ) : (
        <>
          {/* Stats */}
          <div className="px-6 py-3 flex gap-3">
            {(Object.entries(AVANC_CONFIG) as [QuestionAvancement, typeof AVANC_CONFIG[QuestionAvancement]][]).map(([key, cfg]) => (
              <div key={key} className={`rounded-xl border px-4 py-2 ${cfg.bg}`}>
                <div className={`text-xs ${cfg.color}`}>{cfg.label}</div>
                <div className={`text-2xl font-bold ${cfg.color}`}>{groups[key].length}</div>
              </div>
            ))}
            <div className="flex-1" />
            <button onClick={load} className="self-center p-2 rounded-lg hover:bg-slate-200 text-muted-foreground" title="Rafraîchir">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Kanban */}
          <div className="flex-1 px-6 py-3 flex gap-4 overflow-x-auto">
            {(Object.entries(AVANC_CONFIG) as [QuestionAvancement, typeof AVANC_CONFIG[QuestionAvancement]][]).map(([status, cfg]) => (
              <div key={status} className="flex-1 min-w-[300px] flex flex-col">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${cfg.bg} border border-b-0`}>
                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className={`ml-auto text-xs font-bold ${cfg.color}`}>{groups[status as QuestionAvancement].length}</span>
                </div>
                <div className="flex-1 border rounded-b-xl bg-white p-2 space-y-2 overflow-y-auto">
                  {groups[status as QuestionAvancement].length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-6">Aucune question</div>
                  ) : (
                    groups[status as QuestionAvancement].map(q => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        isEditing={editingId === q.id}
                        onEdit={() => setEditingId(editingId === q.id ? null : q.id)}
                        onUpdate={(body) => handleUpdate(q.id, body)}
                        onDelete={() => handleDelete(q.id)}
                        onRefresh={load}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create modal */}
      {showCreate && projectId && (
        <CreateQuestionModal projectId={projectId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function QuestionCard({ question: q, isEditing, onEdit, onUpdate, onDelete, onRefresh }: {
  question: ApiQuestion; isEditing: boolean;
  onEdit: () => void; onUpdate: (body: any) => void; onDelete: () => void; onRefresh: () => void;
}) {
  const [reponse, setReponse] = useState(q.reponse || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await api.questions.uploadAttachments(q.id, Array.from(files));
      onRefresh();
    } catch (err: any) { alert(err.message || 'Erreur upload'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await api.questions.deleteAttachment(attachmentId);
      onRefresh();
    } catch (err: any) { alert(err.message || 'Erreur suppression'); }
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <div className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{q.designation}</div>
          {q.zone && <div className="text-xs text-muted-foreground">Zone: {q.zone}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={q.avancement}
            onChange={e => onUpdate({ avancement: e.target.value })}
            className="text-xs border rounded px-1 py-0.5 bg-white"
            title="Avancement"
          >
            {Object.entries(AVANC_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-red-500" title="Supprimer"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>

      <div className="mt-2 text-xs bg-slate-50 rounded p-2">
        <span className="font-medium">Q:</span> {q.question}
      </div>

      {q.auteur && <div className="text-xs text-muted-foreground mt-1">De: {q.auteur}{q.destinataire ? ` → ${q.destinataire}` : ''}</div>}
      <div className="text-xs text-muted-foreground flex items-center gap-3">
        <span>Posée le {new Date(q.dateQuestion).toLocaleDateString('fr-FR')}</span>
        {q.dateReponse && <span className="text-green-600">Répondue le {new Date(q.dateReponse).toLocaleDateString('fr-FR')}</span>}
      </div>

      {/* Attachments */}
      {q.attachments && q.attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1"><Paperclip className="w-3 h-3" /> Pièces jointes</div>
          <div className="flex flex-wrap gap-1.5">
            {q.attachments.map(att => (
              <div key={att.id} className="relative group">
                {isImage(att.mimeType) ? (
                  <a href={`${API_BASE}/uploads/${att.path}`} target="_blank" rel="noopener noreferrer" title={att.filename}>
                    <img src={`${API_BASE}/uploads/${att.path}`} alt={att.filename} className="w-16 h-16 object-cover rounded border hover:opacity-80" />
                  </a>
                ) : (
                  <a href={`${API_BASE}/uploads/${att.path}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-slate-100 border rounded px-2 py-1 text-[10px] hover:bg-slate-200" title={att.filename}>
                    <FileIcon className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate max-w-[80px]">{att.filename}</span>
                  </a>
                )}
                <button
                  onClick={() => handleDeleteAttachment(att.id)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      <div className="mt-1.5 flex items-center gap-2">
        <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFileUpload} className="hidden" title="Pièces jointes" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1" title="Ajouter une pièce jointe">
          {uploading ? 'Envoi…' : <><Paperclip className="w-3 h-3" /> Joindre</>}
        </button>
      </div>

      <div className="mt-2">
        {isEditing ? (
          <div className="space-y-1">
            <textarea
              value={reponse}
              onChange={e => setReponse(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
              rows={2}
              placeholder="Réponse…"
            />
            <div className="flex gap-1">
              <button onClick={() => { onUpdate({ reponse, avancement: 'TERMINE' }); onEdit(); }} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                Valider
              </button>
              <button onClick={() => { onUpdate({ reponse, avancement: 'EN_COURS_Q' }); onEdit(); }} className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">
                En cours
              </button>
              <button onClick={onEdit} className="text-xs border px-2 py-0.5 rounded">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            {q.reponse ? (
              <div className="text-xs bg-green-50 border border-green-200 rounded p-2 cursor-pointer" onClick={onEdit}>
                <span className="font-medium">R:</span> {q.reponse}
              </div>
            ) : (
              <button onClick={onEdit} className="text-xs text-blue-600 hover:underline">Répondre</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateQuestionModal({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: () => void }) {
  const [designation, setDesignation] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [zone, setZone] = useState('');
  const [auteur, setAuteur] = useState('');
  const [destinataire, setDestinataire] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim() || !questionText.trim()) return;
    setSaving(true);
    try {
      await api.questions.create({
        projectId,
        designation: designation.trim(),
        question: questionText.trim(),
        zone: zone.trim() || undefined,
        auteur: auteur.trim() || undefined,
        destinataire: destinataire.trim() || undefined,
      });
      onCreated();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Nouvelle question technique</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Désignation *</label>
            <input value={designation} onChange={e => setDesignation(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Désignation" required />
          </div>
          <div>
            <label className="text-sm font-medium">Question *</label>
            <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={3} placeholder="Votre question" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Zone</label>
              <input value={zone} onChange={e => setZone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Zone" />
            </div>
            <div>
              <label className="text-sm font-medium">Auteur</label>
              <input value={auteur} onChange={e => setAuteur(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Auteur" />
            </div>
            <div>
              <label className="text-sm font-medium">Destinataire</label>
              <input value={destinataire} onChange={e => setDestinataire(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Destinataire" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm border hover:bg-slate-50">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              {saving ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
