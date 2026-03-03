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
}

export const PersonRow = ({
  person, days, dates, isEven,
  onCellClick, onRemoveAssignment, onCellContextMenu, onTaskClick,
  density = 'comfort',
  isSelected = false, onToggleSelect, showCheckbox = false,
}: PersonRowProps) => {
  return (
    <tr className={isEven ? 'grid-row-even' : 'grid-row-odd'}>
      <td className="sticky left-0 z-10 bg-inherit border-r border-grid-border 
                     min-w-[180px] max-w-[220px]">
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
      </td>

      {dates.map((date) => {
        const dateStr = formatDate(date);
        const dayData = days[dateStr] || { assignments: [], absence: null, tasks: [] };
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
            />
          </td>
        );
      })}
    </tr>
  );
};
