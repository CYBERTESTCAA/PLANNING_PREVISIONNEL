import { PersonPlanningData, SlotType, Task } from '@/types/planning';
import { PersonRow } from './PersonRow';
import { DensityMode } from './DayCell';
import { formatDate, getDayName, getDayNumber, isToday, isWeekend } from '@/lib/dateUtils';
import { motion } from 'framer-motion';

export interface HolidayInfo {
  name: string;
  isWorkDay: boolean;
}

interface PlanningGridProps {
  data: PersonPlanningData[];
  dates: Date[];
  onCellClick: (personId: string, date: string, slot: SlotType) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onCellContextMenu?: (personId: string, date: string, e: React.MouseEvent) => void;
  onTaskClick?: (personId: string, task: Task) => void;
  density?: DensityMode;
  selectedPersonIds?: string[];
  onToggleSelectPerson?: (personId: string) => void;
  showCheckboxes?: boolean;
  holidays?: Record<string, HolidayInfo>;
}

export const PlanningGrid = ({
  data, dates, onCellClick, onRemoveAssignment, onCellContextMenu, onTaskClick,
  density = 'comfort',
  selectedPersonIds = [], onToggleSelectPerson, showCheckboxes = false,
  holidays = {},
}: PlanningGridProps) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Aucune personne dans cette équipe
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-x-auto border border-grid-border rounded-xl bg-card shadow-sm"
    >
      <table className="planning-grid w-full">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-grid-header text-grid-header-foreground 
                          min-w-[180px] max-w-[220px] text-left px-3 py-3 border-r border-grid-border">
              <div className="flex items-center gap-2">
                {showCheckboxes && (
                  <input
                    type="checkbox"
                    checked={selectedPersonIds.length === data.length && data.length > 0}
                    onChange={() => {
                      if (selectedPersonIds.length === data.length) {
                        data.forEach(d => onToggleSelectPerson?.(d.person.id));
                      } else {
                        data.forEach(d => {
                          if (!selectedPersonIds.includes(d.person.id)) {
                            onToggleSelectPerson?.(d.person.id);
                          }
                        });
                      }
                    }}
                    className="w-4 h-4 rounded border-border"
                  />
                )}
                <span className="text-sm font-semibold">Personnel</span>
              </div>
            </th>

            {dates.map((date) => {
              const isTodayDate = isToday(date);
              const isWknd = isWeekend(date);
              const dateStr = formatDate(date);
              const holiday = holidays[dateStr];
              const isHoliday = holiday?.isWorkDay === false || (holiday && !holiday.isWorkDay);
              return (
                <th
                  key={dateStr}
                  className={`min-w-[130px] text-center py-2 px-1 border-r border-grid-border last:border-r-0
                             ${isTodayDate ? 'bg-primary text-primary-foreground' : isHoliday ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' : isWknd ? 'bg-muted/60 text-muted-foreground' : 'bg-grid-header text-grid-header-foreground'}`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider opacity-80">
                      {getDayName(date, true)}
                    </span>
                    <span className="text-base font-bold leading-none">
                      {getDayNumber(date)}
                    </span>
                    {isHoliday && holiday?.name ? (
                      <span className="text-[8px] font-bold uppercase tracking-wider truncate max-w-[110px]">{holiday.name}</span>
                    ) : isWknd && !isTodayDate ? (
                      <span className="text-[8px] opacity-50 uppercase tracking-widest">W-E</span>
                    ) : !isWknd ? (
                      <div className="flex gap-1 mt-0.5 opacity-40">
                        <span className="text-[8px]">M</span>
                        <span className="text-[8px]">·</span>
                        <span className="text-[8px]">A</span>
                      </div>
                    ) : null}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((personData, index) => (
            <PersonRow
              key={personData.person.id}
              person={personData.person}
              days={personData.days}
              dates={dates}
              isEven={index % 2 === 0}
              onCellClick={onCellClick}
              onRemoveAssignment={onRemoveAssignment}
              onCellContextMenu={onCellContextMenu}
              onTaskClick={onTaskClick}
              density={density}
              isSelected={selectedPersonIds.includes(personData.person.id)}
              onToggleSelect={onToggleSelectPerson}
              showCheckbox={showCheckboxes}
            />
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
