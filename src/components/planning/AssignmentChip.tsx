import { Assignment } from '@/types/planning';
import { getAssignmentColor } from '@/lib/planningUtils';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface AssignmentChipProps {
  assignment: Assignment;
  index: number;
  onRemove?: () => void;
  compact?: boolean;
  draggable?: boolean;
  enableResize?: boolean;
}

export const AssignmentChip = ({ 
  assignment, 
  index, 
  onRemove, 
  compact = false,
  draggable: isDraggable = false,
  enableResize = false,
}: AssignmentChipProps) => {
  const projectColor = getAssignmentColor(assignment);
  const mo = assignment.manufacturing_order;
  const project = assignment.project;
  const displayText = mo
    ? `${mo.code}`
    : project
      ? `${project.code} – ${project.label}`
      : 'Chantier';
  const tooltip = mo
    ? `${project?.code ?? ''} › ${mo.code}${project?.label ? '\n' + project.label : ''}${assignment.comment ? '\n' + assignment.comment : ''}`
    : project
      ? `${project.code} – ${project.label}${assignment.comment ? '\n' + assignment.comment : ''}`
      : '';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/assignment-id', assignment.id);
    e.dataTransfer.setData('application/person-id', assignment.person_id);
    e.dataTransfer.setData('application/project-id', assignment.project_id);
    e.dataTransfer.setData('application/slot', assignment.slot || 'FULL');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleResizeDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/resize-assignment-id', assignment.id);
    e.dataTransfer.setData('application/resize-person-id', assignment.person_id);
    e.dataTransfer.setData('application/resize-project-id', assignment.project_id);
    e.dataTransfer.setData('application/resize-date', assignment.date);
    e.dataTransfer.setData('application/resize-slot', assignment.slot || 'FULL');
    e.dataTransfer.setData('application/resize-comment', assignment.comment || '');
    e.dataTransfer.setData('application/resize-mo-id', assignment.manufacturing_order_id || '');
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      layout
      draggable={isDraggable}
      onDragStart={isDraggable ? handleDragStart as any : undefined}
      className={`assignment-chip group relative ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{ 
        backgroundColor: `hsl(${projectColor})`,
        color: 'white',
      }}
      title={tooltip}
    >
      <span className={`truncate ${compact ? 'max-w-[80px]' : 'max-w-[140px]'}`}>
        {displayText}
      </span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 
                     hover:bg-white/20 rounded-full p-0.5"
          aria-label="Supprimer l'affectation"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {enableResize && (
        <div
          draggable
          onDragStart={handleResizeDragStart}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize 
                     opacity-0 group-hover:opacity-100 transition-opacity
                     bg-white/30 hover:bg-white/50 rounded-r-sm"
          title="Glisser pour étendre sur plusieurs jours"
        />
      )}
    </motion.div>
  );
};
