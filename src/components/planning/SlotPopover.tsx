import { DayData, ABSENCE_TYPE_LABELS } from '@/types/planning';
import { X } from 'lucide-react';

interface SlotPopoverProps {
  data: DayData;
  onRemoveAssignment: (assignmentId: string) => void;
}

export const SlotPopover = ({ data, onRemoveAssignment }: SlotPopoverProps) => {
  const { assignments, absence } = data;

  if (!absence && assignments.length === 0) return null;

  return (
    <div className="space-y-1.5 min-w-[200px]">
      {absence && (
        <div className="flex items-center gap-2 text-sm">
          <span>
            {absence.type === 'CP' ? '🏖️' : 
             absence.type === 'RTT' ? '🕐' : 
             absence.type === 'MALADIE' ? '🏥' : 
             absence.type === 'FORMATION' ? '📚' : '📝'}
          </span>
          <span className="font-medium text-foreground">{ABSENCE_TYPE_LABELS[absence.type]}</span>
          {absence.comment && (
            <span className="text-muted-foreground">– {absence.comment}</span>
          )}
        </div>
      )}
      {assignments.map(a => (
        <div key={a.id} className="flex items-center gap-2 group">
          <div 
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: `hsl(${a.project?.color || '217 91% 50%'})` }}
          />
          <span className="text-sm font-medium text-foreground">
            {a.project?.code}
          </span>
          <span className="text-sm text-muted-foreground truncate">
            {a.project?.label}
          </span>
          {a.comment && (
            <span className="text-xs text-muted-foreground italic">({a.comment})</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveAssignment(a.id); }}
            className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
          >
            <X className="w-3 h-3 text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
};
