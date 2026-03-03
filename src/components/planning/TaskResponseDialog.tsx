import { useState } from 'react';
import { Task, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/types/planning';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X, CalendarDays, HardHat, MessageSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskResponseDialogProps {
  task: Task;
  onRespond: (taskId: string, status: 'DONE' | 'NOT_DONE', comment?: string | null) => void;
  onDelete?: (taskId: string) => void;
  onClose: () => void;
}

export const TaskResponseDialog = ({ task, onRespond, onDelete, onClose }: TaskResponseDialogProps) => {
  const [comment, setComment] = useState(task.response_comment ?? '');
  const [pending, setPending] = useState<'DONE' | 'NOT_DONE' | null>(null);

  const statusColor = `hsl(${TASK_STATUS_COLORS[task.status]})`;

  const handleRespond = (status: 'DONE' | 'NOT_DONE') => {
    setPending(status);
    onRespond(task.id, status, comment.trim() || null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `hsl(${TASK_STATUS_COLORS[task.status]} / 0.15)`,
                    color: statusColor,
                  }}
                >
                  {TASK_STATUS_LABELS[task.status]}
                </span>
                {task.due_date && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="w-3 h-3" />
                    {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-foreground leading-tight">{task.title}</h2>
              {task.person && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pour : {task.person.display_name}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {task.description && (
              <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {task.description}
              </div>
            )}
            {task.project && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `hsl(${task.project.color})` }} />
                <HardHat className="w-3 h-3" />
                <span>{task.project.code} – {task.project.label}</span>
              </div>
            )}

            {/* Response comment */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Commentaire de retour (facultatif)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Ajoutez un commentaire sur votre retour..."
                rows={3}
                className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground 
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Prior response if already answered */}
            {task.status !== 'PENDING' && task.responded_at && (
              <p className="text-[11px] text-muted-foreground">
                Répondu le {format(new Date(task.responded_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-border flex items-center gap-2">
            <button
              onClick={() => handleRespond('DONE')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                         bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terminée
            </button>
            <button
              onClick={() => handleRespond('NOT_DONE')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                         bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium text-sm transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Non terminée
            </button>
            {onDelete && (
              <button
                onClick={() => { onDelete(task.id); onClose(); }}
                className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                title="Supprimer la tâche"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
