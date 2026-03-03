import { useState } from 'react';
import { Assignment, DayData, SlotType, Task, TASK_STATUS_COLORS } from '@/types/planning';
import { AssignmentChip } from './AssignmentChip';
import { AbsenceBadge } from './AbsenceBadge';
import { Plus, ListTodo } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type DensityMode = 'compact' | 'comfort' | 'large';

interface DayCellProps {
  date: string;
  data: DayData;
  isToday: boolean;
  isWeekend?: boolean;
  onCellClick: (slot: SlotType) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onTaskClick?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  density?: DensityMode;
  onDropAssignment?: (assignmentId: string, targetDate: string, targetSlot: SlotType) => void;
  onResizeAssignment?: (data: { personId: string; projectId: string; fromDate: string; toDate: string; slot: string; comment: string; moId: string }) => void;
  enableDrag?: boolean;
}

const DENSITY_CONFIG = {
  compact: { slotMinH: 'min-h-[28px]', maxVisible: 2, chipCompact: true },
  comfort: { slotMinH: 'min-h-[36px]', maxVisible: 3, chipCompact: false },
  large: { slotMinH: 'min-h-[52px]', maxVisible: 5, chipCompact: false },
};

const getSlotAssignments = (assignments: Assignment[], slot: 'AM' | 'PM'): Assignment[] =>
  assignments.filter(a => a.slot === slot || a.slot === 'FULL');

interface SlotHalfProps {
  slot: 'AM' | 'PM';
  assignments: Assignment[];
  label: string;
  minH: string;
  maxVisible: number;
  chipCompact: boolean;
  isToday: boolean;
  isEmpty: boolean;
  onCellClick: () => void;
  onRemoveAssignment: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDrop?: (assignmentId: string, slot: 'AM' | 'PM') => void;
  onResizeDrop?: (data: { personId: string; projectId: string; fromDate: string; toDate: string; slot: string; comment: string; moId: string }) => void;
  enableDrag?: boolean;
  date: string;
}

const SlotHalf = ({
  slot, assignments, label, minH, maxVisible, chipCompact,
  isToday, isEmpty, onCellClick, onRemoveAssignment, onContextMenu,
  onDrop: onDropHandler, onResizeDrop, enableDrag, date,
}: SlotHalfProps) => {
  const visible = assignments.slice(0, maxVisible);
  const hidden = assignments.length - maxVisible;
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    const isMove = e.dataTransfer.types.includes('application/assignment-id');
    const isResize = e.dataTransfer.types.includes('application/resize-assignment-id');
    if (!isMove && !isResize) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isResize ? 'copy' : 'move';
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Resize drop
    const resizeId = e.dataTransfer.getData('application/resize-assignment-id');
    if (resizeId && onResizeDrop) {
      onResizeDrop({
        personId: e.dataTransfer.getData('application/resize-person-id'),
        projectId: e.dataTransfer.getData('application/resize-project-id'),
        fromDate: e.dataTransfer.getData('application/resize-date'),
        toDate: date,
        slot: e.dataTransfer.getData('application/resize-slot'),
        comment: e.dataTransfer.getData('application/resize-comment'),
        moId: e.dataTransfer.getData('application/resize-mo-id'),
      });
      return;
    }
    // Move drop
    const assignmentId = e.dataTransfer.getData('application/assignment-id');
    if (assignmentId && onDropHandler) onDropHandler(assignmentId, slot);
  };

  return (
    <div
      onClick={onCellClick}
      onContextMenu={onContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${minH} px-1 py-0.5 cursor-pointer group/slot relative transition-all duration-100
                 hover:bg-primary/5 flex flex-col gap-0.5
                 ${dragOver ? 'ring-2 ring-inset ring-primary/50 bg-primary/10' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-semibold uppercase tracking-wider leading-none
                         ${isToday ? 'text-primary/70' : 'text-muted-foreground/60'}`}>
          {label}
        </span>
        {isEmpty && (
          <motion.button
            initial={{ opacity: 0 }}
            className="opacity-0 group-hover/slot:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onCellClick(); }}
            aria-label={`Ajouter ${label}`}
          >
            <Plus className="w-2.5 h-2.5 text-primary/60" />
          </motion.button>
        )}
      </div>
      <AnimatePresence mode="popLayout">
        {visible.map((assignment, index) => (
          <AssignmentChip
            key={`${assignment.id}-${slot}`}
            assignment={assignment}
            index={index}
            compact={chipCompact}
            onRemove={() => onRemoveAssignment(assignment.id)}
            draggable={enableDrag}
            enableResize={enableDrag}
          />
        ))}
      </AnimatePresence>
      {hidden > 0 && (
        <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1 py-0.5 rounded-full self-start">
          +{hidden}
        </span>
      )}
    </div>
  );
};

export const DayCell = ({
  date, data, isToday, isWeekend = false, onCellClick, onRemoveAssignment, onTaskClick, onContextMenu,
  density = 'comfort', onDropAssignment, onResizeAssignment, enableDrag = false,
}: DayCellProps) => {
  const hasAbsence = data.absence !== null;
  const config = DENSITY_CONFIG[density];

  const amAssignments = getSlotAssignments(data.assignments, 'AM');
  const pmAssignments = getSlotAssignments(data.assignments, 'PM');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(e);
  };

  const allAssignments = data.assignments;
  const needsPopover = allAssignments.length > config.maxVisible;

  const cellContent = (
    <div
      className={`flex flex-col transition-all duration-150 relative
                 ${isToday ? 'ring-1 ring-inset ring-primary/30' : ''}
                 ${isWeekend ? 'bg-muted/30' : ''}
                 ${hasAbsence ? 'bg-muted/50' : ''}`}
    >
      {hasAbsence && data.absence ? (
        <div className={`${config.slotMinH} p-1.5`} onContextMenu={handleContextMenu}>
          <AbsenceBadge absence={data.absence} compact={density === 'compact'} />
        </div>
      ) : (
        <>
          {data.absenceAM ? (
            <div className={`${config.slotMinH} px-1 py-0.5`} onContextMenu={handleContextMenu}>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Matin</span>
              <AbsenceBadge absence={data.absenceAM} compact={density === 'compact'} />
            </div>
          ) : (
            <SlotHalf
              slot="AM"
              assignments={amAssignments}
              label="Matin"
              minH={config.slotMinH}
              maxVisible={config.maxVisible}
              chipCompact={config.chipCompact}
              isToday={isToday}
              isEmpty={amAssignments.length === 0}
              onCellClick={() => onCellClick('AM')}
              onRemoveAssignment={onRemoveAssignment}
              onContextMenu={handleContextMenu}
              onDrop={onDropAssignment ? (aId, s) => onDropAssignment(aId, date, s === 'AM' ? 'AM' : 'PM') : undefined}
              onResizeDrop={onResizeAssignment}
              enableDrag={enableDrag}
              date={date}
            />
          )}
          <div className="h-px bg-border/50 mx-1" />
          {data.absencePM ? (
            <div className={`${config.slotMinH} px-1 py-0.5`} onContextMenu={handleContextMenu}>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">Après-midi</span>
              <AbsenceBadge absence={data.absencePM} compact={density === 'compact'} />
            </div>
          ) : (
            <SlotHalf
              slot="PM"
              assignments={pmAssignments}
              label="Après-midi"
              minH={config.slotMinH}
              maxVisible={config.maxVisible}
              chipCompact={config.chipCompact}
              isToday={isToday}
              isEmpty={pmAssignments.length === 0}
              onCellClick={() => onCellClick('PM')}
              onRemoveAssignment={onRemoveAssignment}
              onContextMenu={handleContextMenu}
              onDrop={onDropAssignment ? (aId, s) => onDropAssignment(aId, date, s === 'AM' ? 'AM' : 'PM') : undefined}
              onResizeDrop={onResizeAssignment}
              enableDrag={enableDrag}
              date={date}
            />
          )}
        </>
      )}
      {/* Task badges */}
      {data.tasks.length > 0 && (
        <div className="px-1 pb-0.5 flex flex-wrap gap-0.5">
          {data.tasks.map(task => (
            <button
              key={task.id}
              onClick={e => { e.stopPropagation(); onTaskClick?.(task); }}
              title={task.title}
              className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold truncate max-w-full transition-opacity hover:opacity-80"
              style={{
                backgroundColor: `hsl(${TASK_STATUS_COLORS[task.status]} / 0.15)`,
                color: `hsl(${TASK_STATUS_COLORS[task.status]})`,
              }}
            >
              <ListTodo className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[80px]">{task.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (needsPopover) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {cellContent}
        </PopoverTrigger>
        <PopoverContent
          className="w-auto min-w-[240px] p-3"
          side="right"
          align="start"
          sideOffset={8}
        >
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Matin</div>
              {amAssignments.map((a, i) => (
                <AssignmentChip key={a.id} assignment={a} index={i} compact={false} onRemove={() => onRemoveAssignment(a.id)} />
              ))}
              {amAssignments.length === 0 && <span className="text-[10px] text-muted-foreground">Aucune affectation</span>}
            </div>
            <div className="h-px bg-border" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Après-midi</div>
              {pmAssignments.map((a, i) => (
                <AssignmentChip key={a.id} assignment={a} index={i} compact={false} onRemove={() => onRemoveAssignment(a.id)} />
              ))}
              {pmAssignments.length === 0 && <span className="text-[10px] text-muted-foreground">Aucune affectation</span>}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return cellContent;
};
