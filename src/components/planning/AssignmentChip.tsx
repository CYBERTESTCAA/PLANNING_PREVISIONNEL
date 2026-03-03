import { Assignment } from '@/types/planning';
import { getAssignmentColor } from '@/lib/planningUtils';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface AssignmentChipProps {
  assignment: Assignment;
  index: number;
  onRemove?: () => void;
  compact?: boolean;
}

export const AssignmentChip = ({ 
  assignment, 
  index, 
  onRemove, 
  compact = false 
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

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      layout
      className="assignment-chip group"
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
    </motion.div>
  );
};
