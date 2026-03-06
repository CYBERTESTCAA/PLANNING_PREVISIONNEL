import { useState } from 'react';
import { api } from '@/lib/api';
import { XCircle, Plus, AlertTriangle } from 'lucide-react';

export function CreatePlanFromSelectionForm({ projectId, articles, onCreated, onCancel }: {
  projectId: string;
  articles: Array<{ ofCode: string; articleCode: string }>;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const ofCodes = [...new Set(articles.map(a => a.ofCode))];
  const articleCodes = articles.map(a => a.articleCode);
  const multiOFError = ofCodes.length > 1;

  const [numPlan, setNumPlan] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (multiOFError) return;
    setSaving(true);
    try {
      await api.plans.create({
        projectId,
        hk: articleCodes.join(', '),
        codeOF: ofCodes[0],
        numPlan: numPlan.trim() || undefined,
      });
      onCreated();
    } catch (err: any) { alert(err.message || 'Erreur'); }
    setSaving(false);
  };

  return (
    <div className={`mt-3 border rounded-lg p-4 space-y-3 ${multiOFError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-bold text-blue-900">Créer un plan</h4>
          <p className="text-[10px] text-blue-700 mt-0.5">
            {articles.length} article{articles.length > 1 ? 's' : ''} sélectionné{articles.length > 1 ? 's' : ''} depuis {ofCodes.length} OF
          </p>
        </div>
        <button onClick={onCancel} className="text-blue-400 hover:text-blue-600" title="Annuler"><XCircle className="w-4 h-4" /></button>
      </div>

      {multiOFError && (
        <div className="flex items-center gap-2 bg-red-100 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-xs text-red-700 font-medium">Impossible de créer un plan avec des articles de différents OFs ({ofCodes.join(', ')}). Sélectionnez les articles d'un seul OF.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {articles.map(a => (
          <span key={`${a.ofCode}::${a.articleCode}`} className="bg-white border border-blue-200 text-[10px] font-mono px-2 py-0.5 rounded font-semibold text-blue-800">
            {a.articleCode} <span className="text-blue-400 font-normal">({a.ofCode})</span>
          </span>
        ))}
      </div>

      {!multiOFError && (
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[10px] font-medium text-blue-800">Articles (HK)</label>
            <div className="text-xs font-mono bg-white border rounded px-2 py-1.5 mt-0.5 text-slate-700 min-w-[200px]">{articleCodes.join(', ')}</div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-blue-800">OF</label>
            <div className="text-xs font-mono bg-white border rounded px-2 py-1.5 mt-0.5 text-slate-700">{ofCodes[0]}</div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-blue-800">N° Plan (optionnel)</label>
            <input value={numPlan} onChange={e => setNumPlan(e.target.value)} placeholder="ex: PL-001" className="block border rounded px-2 py-1.5 text-xs mt-0.5 w-28" />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            {saving ? 'Création…' : 'Créer le plan'}
          </button>
          <button onClick={onCancel} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Annuler</button>
        </div>
      )}
    </div>
  );
}
