import { useState } from 'react';
import { api, ApiPlan, ApiDessinateur } from '@/lib/api';
import { XCircle } from 'lucide-react';
import { ETAT_CONFIG, FAB_LABELS, USINAGE_LABELS, fmtDate } from './constants';

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div><label className="text-xs font-medium text-muted-foreground">{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder={label} /></div>;
}

export function PlanEditDrawer({ plan, dessinateurs, onClose, onSaved }: { plan: ApiPlan; dessinateurs: ApiDessinateur[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...plan }); const [saving, setSaving] = useState(false);
  const [newIndice, setNewIndice] = useState(''); const [newIndiceDate, setNewIndiceDate] = useState(new Date().toISOString().slice(0, 10));
  const set = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }));
  const handleSave = async () => { setSaving(true); try { await api.plans.update(plan.id, { numPlan: form.numPlan, cart1: form.cart1, cart2: form.cart2, cart3: form.cart3, cart4: form.cart4, cart5: form.cart5, cart6: form.cart6, cart7: form.cart7, dessinateurId: form.dessinateurId, fabricationType: form.fabricationType, etatAvancement: form.etatAvancement, datePrevisionnelle: form.datePrevisionnelle, dateValidation: form.dateValidation, numFiche: form.numFiche, dateFicheFab: form.dateFicheFab, sousTraitance: form.sousTraitance, etatUsinage: form.etatUsinage, responsableMontage: form.responsableMontage, dateDepartAtelier: form.dateDepartAtelier, paletisation: form.paletisation, dateLivraisonChantier: form.dateLivraisonChantier, commentaires: form.commentaires } as any); onSaved(); } catch (err: any) { alert(err.message); } setSaving(false); };
  const handleAddIndice = async () => { if (!newIndice) return; try { await api.plans.addIndice(plan.id, { indice: newIndice, dateIndice: newIndiceDate }); onSaved(); } catch (err: any) { alert(err.message); } };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[480px] bg-white shadow-2xl flex flex-col overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Détails du plan</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" title="Fermer"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 px-6 py-4 space-y-3 overflow-y-auto text-sm">
          <div className="grid grid-cols-2 gap-3"><div><span className="text-muted-foreground text-xs">HK:</span> <span className="font-mono">{plan.hk}</span></div><div><span className="text-muted-foreground text-xs">OF:</span> {plan.codeOF || '—'}</div></div>
          <Field label="N° Plan" value={form.numPlan || ''} onChange={v => set('numPlan', v)} />
          <div className="grid grid-cols-4 gap-2">{(['cart1','cart2','cart3','cart4'] as const).map(c => <Field key={c} label={c.replace('cart','Cart ')} value={(form as any)[c] || ''} onChange={v => set(c, v)} />)}</div>
          <div><label className="text-xs font-medium text-muted-foreground">Dessinateur</label><select value={form.dessinateurId || ''} onChange={e => set('dessinateurId', e.target.value || null)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" title="Dessinateur"><option value="">—</option>{dessinateurs.map(d => <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Fabrication</label><select value={form.fabricationType || ''} onChange={e => set('fabricationType', e.target.value || null)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" title="Fabrication"><option value="">—</option>{Object.entries(FAB_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="text-xs font-medium text-muted-foreground">État</label><select value={form.etatAvancement} onChange={e => set('etatAvancement', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" title="État">{Object.entries(ETAT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><Field label="Dat. prévisionnelle" value={form.datePrevisionnelle?.slice(0,10) || ''} onChange={v => set('datePrevisionnelle', v || null)} type="date" /><Field label="Validation" value={form.dateValidation?.slice(0,10) || ''} onChange={v => set('dateValidation', v || null)} type="date" /></div>
          <div className="grid grid-cols-2 gap-3"><Field label="N° Fiche" value={form.numFiche || ''} onChange={v => set('numFiche', v)} /><Field label="Dat. fiche" value={form.dateFicheFab?.slice(0,10) || ''} onChange={v => set('dateFicheFab', v || null)} type="date" /></div>
          <Field label="Sous-traitance" value={form.sousTraitance || ''} onChange={v => set('sousTraitance', v)} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Usinage</label><select value={form.etatUsinage || ''} onChange={e => set('etatUsinage', e.target.value || null)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" title="Usinage"><option value="">—</option>{Object.entries(USINAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <Field label="Resp. montage" value={form.responsableMontage || ''} onChange={v => set('responsableMontage', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3"><Field label="Dép. atelier" value={form.dateDepartAtelier?.slice(0,10) || ''} onChange={v => set('dateDepartAtelier', v || null)} type="date" /><Field label="Livraison" value={form.dateLivraisonChantier?.slice(0,10) || ''} onChange={v => set('dateLivraisonChantier', v || null)} type="date" /></div>
          <Field label="Palettisation" value={form.paletisation || ''} onChange={v => set('paletisation', v)} />
          <div><label className="text-xs font-medium text-muted-foreground">Commentaires</label><textarea value={form.commentaires || ''} onChange={e => set('commentaires', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} placeholder="Commentaires" /></div>
          <div className="border-t pt-3">
            <h3 className="text-sm font-bold mb-2">Indices</h3>
            {plan.indices.length > 0 && <div className="space-y-1 mb-2">{plan.indices.map(i => <div key={i.id} className="flex items-center gap-2 text-xs"><span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">{i.indice}</span><span className="text-muted-foreground">{fmtDate(i.dateIndice)}</span>{i.commentaire && <span>— {i.commentaire}</span>}</div>)}</div>}
            <div className="flex gap-2 items-end">
              <div><label className="text-xs text-muted-foreground">Indice</label><input value={newIndice} onChange={e => setNewIndice(e.target.value.toUpperCase())} placeholder="A" className="border rounded px-2 py-1 text-sm w-16 block mt-0.5" maxLength={2} /></div>
              <div><label className="text-xs text-muted-foreground">Date</label><input type="date" value={newIndiceDate} onChange={e => setNewIndiceDate(e.target.value)} className="border rounded px-2 py-1 text-sm block mt-0.5" /></div>
              <button onClick={handleAddIndice} disabled={!newIndice} className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50" title="Ajouter indice">+</button>
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Enreg…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}
