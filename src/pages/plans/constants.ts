import { EtatAvancement, FabricationType, EtatUsinage } from '@/lib/api';

export const ETAT_CONFIG: Record<EtatAvancement, { label: string; color: string; bg: string; dot: string }> = {
  A_FAIRE: { label: 'À faire', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  EN_COURS_PLAN: { label: 'En cours', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  A_DIFFUSER: { label: 'À diffuser', color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  DIFFUSE_ARCHI: { label: 'Diffusé archi', color: 'text-purple-700', bg: 'bg-purple-100', dot: 'bg-purple-500' },
  EN_ATTENTE: { label: 'En attente', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  A_MODIFIER: { label: 'À modifier', color: 'text-violet-700', bg: 'bg-violet-100', dot: 'bg-violet-500' },
  VALIDE: { label: 'Validé', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  SUPPRIME: { label: 'Supprimé', color: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400' },
};

export const FAB_LABELS: Record<FabricationType, string> = {
  FILIALE: 'Filiale', SOUS_TRAITANT: 'Sous-traitant', LES_DEUX: 'Les deux',
};

export const USINAGE_LABELS: Record<EtatUsinage, string> = {
  EN_DEBIT: 'En débit', PROGRAMME: 'Programmé', USINE: 'Usiné',
};

export const GH = 'bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center border-b border-r border-slate-200';
export const TH = 'text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-2 py-1.5 text-left border-r border-slate-200 whitespace-nowrap';
export const TD = 'px-2 py-1.5 text-xs border-r border-slate-100 whitespace-nowrap';

export const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

export type TabId = 'bureau' | 'production';
