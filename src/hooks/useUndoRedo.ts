import { useState, useCallback, useEffect } from 'react';
import { Assignment, Absence } from '@/types/planning';

interface PlanningSnapshot {
  assignments: Assignment[];
  absences: Absence[];
  label: string; // description of what changed
  timestamp: number;
}

export const useUndoRedo = (
  assignments: Assignment[],
  absences: Absence[],
  setAssignments: (fn: (prev: Assignment[]) => Assignment[]) => void,
  setAbsences: (fn: (prev: Absence[]) => Absence[]) => void,
) => {
  const [undoStack, setUndoStack] = useState<PlanningSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<PlanningSnapshot[]>([]);
  const [history, setHistory] = useState<PlanningSnapshot[]>([]);

  // Save a snapshot before making changes
  const saveSnapshot = useCallback((label: string) => {
    const snapshot: PlanningSnapshot = {
      assignments: [...assignments],
      absences: [...absences],
      label,
      timestamp: Date.now(),
    };
    setUndoStack(prev => [...prev.slice(-49), snapshot]);
    setRedoStack([]);
    setHistory(prev => [...prev.slice(-19), snapshot]);
  }, [assignments, absences]);

  // Undo last action
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const snapshot = undoStack[undoStack.length - 1];
    
    // Save current state to redo stack
    setRedoStack(prev => [...prev, {
      assignments: [...assignments],
      absences: [...absences],
      label: 'Redo',
      timestamp: Date.now(),
    }]);

    // Restore snapshot
    setAssignments(() => snapshot.assignments);
    setAbsences(() => snapshot.absences);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, assignments, absences, setAssignments, setAbsences]);

  // Redo last undone action
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const snapshot = redoStack[redoStack.length - 1];
    
    // Save current state to undo stack
    setUndoStack(prev => [...prev, {
      assignments: [...assignments],
      absences: [...absences],
      label: 'Undo',
      timestamp: Date.now(),
    }]);

    // Restore snapshot
    setAssignments(() => snapshot.assignments);
    setAbsences(() => snapshot.absences);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, assignments, absences, setAssignments, setAbsences]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    saveSnapshot,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    history,
  };
};
