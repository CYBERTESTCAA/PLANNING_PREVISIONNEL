import { useState, useCallback, useRef, useEffect } from 'react';
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
  onDropAssignment?: (assignmentId: string, targetDate: string, targetSlot: SlotType) => void;
  onResizeAssignment?: (data: { personId: string; projectId: string; fromDate: string; toDate: string; slot: string; comment: string; moId: string }) => void;
  enableDrag?: boolean;
  cellWidth?: number;
}

export const PlanningGrid = ({
  data, dates, onCellClick, onRemoveAssignment, onCellContextMenu, onTaskClick,
  density = 'comfort',
  selectedPersonIds = [], onToggleSelectPerson, showCheckboxes = false,
  holidays = {},
  onDropAssignment, onResizeAssignment, enableDrag = false,
  cellWidth = 130,
}: PlanningGridProps) => {
  // ── Column resize state ──────────────────────────────────────────────
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const resizeRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const rowResizeRef = useRef<{ rowIdx: number; startY: number; startH: number } | null>(null);

  const getColWidth = useCallback((idx: number) => colWidths[idx] ?? cellWidth, [colWidths, cellWidth]);

  // Reset column widths when cellWidth (zoom) changes
  useEffect(() => { setColWidths({}); }, [cellWidth]);

  const getRowHeight = useCallback((idx: number) => rowHeights[idx] ?? 0, [rowHeights]); // 0 = auto

  const onRowResizeStart = useCallback((rowIdx: number, startY: number, currentH: number) => {
    rowResizeRef.current = { rowIdx, startY, startH: currentH };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onResizeMouseDown = useCallback((colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { colIdx, startX: e.clientX, startW: colWidths[colIdx] ?? cellWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [colWidths, cellWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizeRef.current) {
        const { colIdx, startX, startW } = resizeRef.current;
        const delta = e.clientX - startX;
        const newW = Math.max(60, Math.min(400, startW + delta));
        setColWidths(prev => ({ ...prev, [colIdx]: newW }));
      }
      if (rowResizeRef.current) {
        const { rowIdx, startY, startH } = rowResizeRef.current;
        const delta = e.clientY - startY;
        const newH = Math.max(50, Math.min(400, startH + delta));
        setRowHeights(prev => ({ ...prev, [rowIdx]: newH }));
      }
    };
    const onMouseUp = () => {
      if (resizeRef.current) {
        resizeRef.current = null;
      }
      if (rowResizeRef.current) {
        rowResizeRef.current = null;
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

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
      <table className="planning-grid" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '200px', minWidth: '180px' }} />
          {dates.map((_, idx) => (
            <col key={idx} style={{ width: `${getColWidth(idx)}px` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-grid-header text-grid-header-foreground 
                          text-left px-3 py-3 border-r border-grid-border">
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

            {dates.map((date, colIdx) => {
              const isTodayDate = isToday(date);
              const isWknd = isWeekend(date);
              const dateStr = formatDate(date);
              const holiday = holidays[dateStr];
              const isHoliday = holiday?.isWorkDay === false || (holiday && !holiday.isWorkDay);
              return (
                <th
                  key={dateStr}
                  className={`relative text-center py-2 px-1 border-r border-grid-border last:border-r-0
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
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => onResizeMouseDown(colIdx, e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10
                               hover:bg-primary/30 active:bg-primary/50 transition-colors"
                  />
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
              onDropAssignment={onDropAssignment}
              onResizeAssignment={onResizeAssignment}
              enableDrag={enableDrag}
              rowHeight={getRowHeight(index)}
              onRowResizeStart={(startY, currentH) => onRowResizeStart(index, startY, currentH)}
            />
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
