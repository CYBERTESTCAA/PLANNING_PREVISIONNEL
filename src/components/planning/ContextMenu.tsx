import { useState, useEffect, useRef } from 'react';
import { Assignment, Absence } from '@/types/planning';
import { Copy, Trash2, MessageSquare, CalendarPlus, Repeat, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuAction {
  type: 'duplicate-tomorrow' | 'duplicate-week' | 'repeat-weekdays' | 'delete' | 'add-comment' | 'convert-absence';
  assignmentId?: string;
  absenceId?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: ContextMenuAction) => void;
  assignments: Assignment[];
  absence: Absence | null;
  personId: string;
  date: string;
}

export const ContextMenu = ({
  x, y, isOpen, onClose, onAction, assignments, absence,
}: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  if (!isOpen) return null;

  const hasContent = assignments.length > 0 || absence;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[100] min-w-[200px] bg-popover border border-border rounded-xl shadow-xl py-1.5 overflow-hidden"
        style={{ left: adjustedX, top: adjustedY }}
      >
        {assignments.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Affectations
            </div>
            {assignments.map(a => (
              <div key={a.id} className="px-1.5">
                <div className="px-2 py-1 text-xs font-medium text-foreground flex items-center gap-2 mb-0.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `hsl(${a.project?.color || '217 91% 50%'})` }} />
                  <span className="truncate">{a.project?.code} – {a.project?.label}</span>
                </div>
                <button
                  onClick={() => { onAction({ type: 'duplicate-tomorrow', assignmentId: a.id }); onClose(); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  Dupliquer demain
                </button>
                <button
                  onClick={() => { onAction({ type: 'duplicate-week', assignmentId: a.id }); onClose(); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  Dupliquer sur la semaine
                </button>
                <button
                  onClick={() => { onAction({ type: 'repeat-weekdays', assignmentId: a.id }); onClose(); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                  Répéter lun–ven
                </button>
                <button
                  onClick={() => { onAction({ type: 'delete', assignmentId: a.id }); onClose(); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            ))}
          </>
        )}

        {absence && (
          <>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-1.5">
              Absence
            </div>
            <div className="px-1.5">
              <button
                onClick={() => { onAction({ type: 'delete', absenceId: absence.id }); onClose(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer l'absence
              </button>
            </div>
          </>
        )}

        {!hasContent && (
          <>
            <button
              onClick={() => { onAction({ type: 'convert-absence' }); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-muted-foreground" />
              Ajouter une affectation
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
