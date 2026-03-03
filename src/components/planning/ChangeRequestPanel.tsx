import { ChangeRequest, ChangeRequestKind, ManufacturingOrder, Person, Project } from '@/types/planning';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X, ClipboardCheck, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ChangeRequestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ChangeRequest[];
  projects: Project[];
  manufacturingOrders: ManufacturingOrder[];
  people: Person[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const ChangeRequestPanel = ({
  isOpen,
  onClose,
  requests,
  projects,
  manufacturingOrders,
  people,
  onApprove,
  onReject,
}: ChangeRequestPanelProps) => {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return requests;
    const q = filter.toLowerCase();
    return requests.filter(r => {
      const s = `${r.kind} ${r.status} ${JSON.stringify(r.payload)}`.toLowerCase();
      return s.includes(q);
    });
  }, [filter, requests]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border 
                       shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Validations</h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {requests.filter(r => r.status === 'PENDING').length}
                </span>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filtrer..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-secondary rounded-lg text-sm text-foreground 
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ClipboardCheck className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Aucune demande</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((r) => (
                    <div key={r.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border 
                              ${r.status === 'PENDING' ? 'border-warning/30 text-warning bg-warning/10' :
                                r.status === 'APPROVED' ? 'border-success/30 text-success bg-success/10' :
                                'border-destructive/30 text-destructive bg-destructive/10'}`}
                            >
                              {r.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>

                          <div className="mt-2 text-sm font-medium text-foreground">
                            {labelForKind(r.kind)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground break-words">
                            {renderDetail(r.kind, r.payload, projects, manufacturingOrders, people)}
                          </div>
                        </div>

                        {r.status === 'PENDING' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => onApprove(r.id)}
                              className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                              title="Approuver"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onReject(r.id)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Refuser"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function labelForKind(kind: ChangeRequestKind): string {
  switch (kind) {
    case 'ADD_ASSIGNMENTS':
      return 'Ajouter affectation(s)';
    case 'REMOVE_ASSIGNMENT':
      return 'Supprimer affectation';
    case 'ADD_ABSENCE':
      return 'Ajouter absence';
    case 'REMOVE_ABSENCE':
      return 'Supprimer absence';
    case 'BULK_ADD_ASSIGNMENTS':
      return 'Affectation en masse';
    case 'BULK_ADD_ABSENCES':
      return 'Absence en masse';
  }
}

function renderDetail(
  kind: ChangeRequestKind,
  payload: Record<string, unknown>,
  projects: Project[],
  manufacturingOrders: ManufacturingOrder[],
  people: Person[]
): string {
  const personId = typeof payload.personId === 'string' ? payload.personId : '';
  const date = typeof payload.date === 'string' ? payload.date : '';
  const assignmentId = typeof payload.assignmentId === 'string' ? payload.assignmentId : '';
  const absenceId = typeof payload.absenceId === 'string' ? payload.absenceId : '';

  switch (kind) {
    case 'ADD_ASSIGNMENTS': {
      const projectIds = Array.isArray(payload.projectIds) ? payload.projectIds.map(String) : [];
      const comment = typeof payload.comment === 'string' ? payload.comment : '';
      const moId = payload.manufacturingOrderId === null
        ? null
        : (typeof payload.manufacturingOrderId === 'string' ? payload.manufacturingOrderId : undefined);

      const who = people.find(p => p.id === personId)?.display_name;
      const list = projectIds
        .map(pid => projects.find(p => p.id === pid))
        .filter(Boolean)
        .map(p => `${p!.code} — ${p!.label}`)
        .join(', ');

      const mo = moId ? manufacturingOrders.find(m => m.id === moId)?.code : undefined;
      const moText = mo ? ` • OF: ${mo}` : '';
      const commentText = comment ? ` • “${comment}”` : '';
      return `${who || personId} • ${date} • ${list}${moText}${commentText}`;
    }
    case 'REMOVE_ASSIGNMENT':
      return `Affectation: ${assignmentId}`;
    case 'ADD_ABSENCE': {
      const who = people.find(p => p.id === personId)?.display_name;
      const type = typeof payload.type === 'string' ? payload.type : '';
      const comment = typeof payload.comment === 'string' ? payload.comment : '';
      return `${who || personId} • ${date} • ${type}${comment ? ` • “${comment}”` : ''}`;
    }
    case 'REMOVE_ABSENCE':
      return `Absence: ${absenceId}`;
    case 'BULK_ADD_ASSIGNMENTS': {
      const personIds = Array.isArray(payload.personIds) ? payload.personIds.map(String) : [];
      const projectId = typeof payload.projectId === 'string' ? payload.projectId : '';
      const proj = projects.find(p => p.id === projectId);
      return `${personIds.length} personnes • ${date} • ${proj ? `${proj.code} — ${proj.label}` : projectId}`;
    }
    case 'BULK_ADD_ABSENCES': {
      const personIds = Array.isArray(payload.personIds) ? payload.personIds.map(String) : [];
      const type = typeof payload.type === 'string' ? payload.type : '';
      return `${personIds.length} personnes • ${date} • ${type}`;
    }
  }
}
