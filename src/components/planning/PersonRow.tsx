import { useRef } from 'react';
import { Person, DayData, SlotType, Task } from '@/types/planning';
import { DayCell, DensityMode } from './DayCell';
import { formatDate, isToday, isWeekend } from '@/lib/dateUtils';
import { User } from 'lucide-react';

interface PersonRowProps {
  person: Person;
  days: Record<string, DayData>;
  dates: Date[];
  isEven: boolean;
  onCellClick: (personId: string, date: string, slot: SlotType) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onCellContextMenu?: (personId: string, date: string, e: React.MouseEvent) => void;
  onTaskClick?: (personId: string, task: Task) => void;
  density?: DensityMode;
  isSelected?: boolean;
  onToggleSelect?: (personId: string) => void;
  showCheckbox?: boolean;
  onDropAssignment?: (assignmentId: string, targetDate: string, targetSlot: SlotType) => void;
  onResizeAssignment?: (data: { personId: string; projectId: string; fromDate: string; toDate: string; slot: string; comment: string; moId: string }) => void;
  enableDrag?: boolean;
  rowHeight?: number;
  onRowResizeStart?: (startY: number, currentH: number) => void;
}

export const PersonRow = ({
  person, days, dates, isEven,
  onCellClick, onRemoveAssignment, onCellContextMenu, onTaskClick,
  density = 'comfort',
  isSelected = false, onToggleSelect, showCheckbox = false,
  onDropAssignment, onResizeAssignment, enableDrag = false,
  rowHeight = 0, onRowResizeStart,
}: PersonRowProps) => {
  const trRef = useRef<HTMLTableRowElement>(null);

  const handleRowResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentH = trRef.current?.getBoundingClientRect().height ?? 80;
    onRowResizeStart?.(e.clientY, currentH);
  };

  return (
    <tr
      ref={trRef}
      className={isEven ? 'grid-row-even' : 'grid-row-odd'}
      style={rowHeight > 0 ? { height: `${rowHeight}px` } : undefined}
    >
      <td className="sticky left-0 z-10 bg-inherit border-r border-grid-border 
                     min-w-[180px] max-w-[220px] relative">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(person.id)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              onClick={e => e.stopPropagation()}
            />
          )}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-foreground text-sm truncate">
            {person.display_name}
          </span>
        </div>
        {/* Row height resize handle */}
        <div
          onMouseDown={handleRowResizeMouseDown}
          className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize z-10
                     hover:bg-primary/30 active:bg-primary/50 transition-colors"
        />
      </td>

      {dates.map((date) => {
        const dateStr = formatDate(date);
        const dayData = days[dateStr] || { assignments: [], absence: null, absenceAM: null, absencePM: null, tasks: [] };
        const isTodayDate = isToday(date);
        const isWknd = isWeekend(date);

        return (
          <td
            key={dateStr}
            className={`p-0 border-r border-grid-border last:border-r-0
                       ${isTodayDate ? 'bg-accent/20' : ''}
                       ${isWknd ? 'bg-muted/20' : ''}`}
          >
            <DayCell
              date={dateStr}
              data={dayData}
              isToday={isTodayDate}
              isWeekend={isWknd}
              onCellClick={(slot) => onCellClick(person.id, dateStr, slot)}
              onRemoveAssignment={onRemoveAssignment}
              onTaskClick={onTaskClick ? (task) => onTaskClick(person.id, task) : undefined}
              onContextMenu={(e) => onCellContextMenu?.(person.id, dateStr, e)}
              density={density}
              onDropAssignment={onDropAssignment}
              onResizeAssignment={onResizeAssignment}
              enableDrag={enableDrag}
            />
          </td>
        );
      })}
    </tr>
  );
};
