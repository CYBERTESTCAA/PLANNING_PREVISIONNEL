import { useMemo } from 'react';
import { Person, Assignment, Absence } from '@/types/planning';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isWeekend, getDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User } from 'lucide-react';
import { HolidayInfo } from './PlanningGrid';

interface YearPlanningGridProps {
  people: Person[];
  assignments: Assignment[];
  absences: Absence[];
  year: number;
  holidays?: Record<string, HolidayInfo>;
}

const MONTH_LABELS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

interface DayInfo {
  date: Date;
  key: string;
  dayNum: number;
  isWe: boolean;
  isHoliday: boolean;
  isToday: boolean;
  month: number;
}

const todayDate = new Date();
const todayKey = format(todayDate, 'yyyy-MM-dd');

export const YearPlanningGrid = ({
  people,
  assignments,
  absences,
  year,
  holidays = {},
}: YearPlanningGridProps) => {

  // Build all days of the year grouped by month
  const monthDays = useMemo(() => {
    const result: DayInfo[][] = [];
    for (let m = 0; m < 12; m++) {
      const start = startOfMonth(new Date(year, m, 1));
      const end = endOfMonth(start);
      const days = eachDayOfInterval({ start, end }).map(d => {
        const key = format(d, 'yyyy-MM-dd');
        const dayOfWeek = getDay(d);
        return {
          date: d,
          key,
          dayNum: d.getDate(),
          isWe: dayOfWeek === 0 || dayOfWeek === 6,
          isHoliday: !!(holidays[key] && !holidays[key].isWorkDay),
          isToday: key === todayKey,
          month: m,
        };
      });
      result.push(days);
    }
    return result;
  }, [year, holidays]);

  // Build lookup: personId → date → { codes, color (HSL from first assignment's project) }
  const assignByPerson = useMemo(() => {
    const map = new Map<string, Map<string, { codes: string[]; color: string }>>();
    for (const a of assignments) {
      if (!map.has(a.person_id)) map.set(a.person_id, new Map());
      const pm = map.get(a.person_id)!;
      if (!pm.has(a.date)) pm.set(a.date, { codes: [], color: a.project?.color || '217 91% 50%' });
      pm.get(a.date)!.codes.push(a.project?.code || '?');
    }
    return map;
  }, [assignments]);

  // Build lookup: personId → Set of date keys with absences
  const absByPerson = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const a of absences) {
      if (!map.has(a.person_id)) map.set(a.person_id, new Map());
      map.get(a.person_id)!.set(a.date, a.type);
    }
    return map;
  }, [absences]);

  // Total days in the widest month (for colspan alignment)
  const maxDays = 31;

  if (people.length === 0) return null;

  return (
    <div className="overflow-x-auto border border-border rounded-xl bg-card">
      <table className="border-collapse" style={{ minWidth: '100%' }}>
        <thead>
          {/* Month headers */}
          <tr className="bg-muted/50">
            <th className="sticky left-0 z-20 bg-muted/50 border-b border-r border-border px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
              rowSpan={2} style={{ minWidth: 150 }}>
              Personnel
            </th>
            {monthDays.map((days, m) => (
              <th key={m} colSpan={days.length}
                className={`px-0 py-1 text-center text-[10px] font-bold uppercase tracking-wider border-b border-r border-border
                  ${m === todayDate.getMonth() && year === todayDate.getFullYear() ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
                {MONTH_LABELS[m]}
              </th>
            ))}
          </tr>
          {/* Day number headers */}
          <tr className="bg-muted/30">
            {monthDays.map((days, m) =>
              days.map((d, di) => (
                <th key={d.key}
                  className={`px-0 py-0.5 text-center border-b border-border
                    ${d.isWe || d.isHoliday ? 'bg-muted/60 text-muted-foreground/40' : ''}
                    ${d.isToday ? 'bg-primary/20 text-primary font-bold' : ''}
                    ${di === days.length - 1 ? 'border-r' : ''}`}
                  style={{ width: 18, minWidth: 18, maxWidth: 18 }}>
                  <span className="text-[8px]">{d.dayNum}</span>
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {people.map((person, pIdx) => {
            const pAssign = assignByPerson.get(person.id);
            const pAbs = absByPerson.get(person.id);

            return (
              <tr key={person.id} className={pIdx % 2 === 0 ? '' : 'bg-muted/10'}>
                <td className="sticky left-0 z-10 px-2 py-1 border-r border-border bg-inherit" style={{ minWidth: 150 }}>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground text-[11px] truncate max-w-[120px]" title={person.display_name}>
                      {person.display_name}
                    </span>
                  </div>
                </td>
                {monthDays.map((days, m) =>
                  days.map((d, di) => {
                    const assignInfo = pAssign?.get(d.key);
                    const absType = pAbs?.get(d.key);
                    const isOff = d.isWe || d.isHoliday;

                    let bgClass = '';
                    let bgStyle: React.CSSProperties | undefined;
                    let title = `${format(d.date, 'EEEE d MMMM yyyy', { locale: fr })}`;
                    if (isOff) {
                      bgClass = 'bg-muted/40';
                      title += d.isHoliday ? ' (férié)' : ' (week-end)';
                    } else if (absType) {
                      bgClass = absType === 'CP' ? 'bg-blue-400/60' : absType === 'RTT' ? 'bg-teal-400/60' : absType === 'MALADIE' ? 'bg-red-400/60' : 'bg-amber-400/60';
                      title += `\n${absType}`;
                    } else if (assignInfo) {
                      bgStyle = { backgroundColor: `hsl(${assignInfo.color})` };
                      title += `\n${assignInfo.codes.join(', ')}`;
                    }

                    return (
                      <td key={d.key}
                        className={`px-0 py-0 border-border ${di === days.length - 1 ? 'border-r' : ''}
                          ${d.isToday ? 'ring-1 ring-inset ring-primary' : ''}`}
                        style={{ width: 18, minWidth: 18, maxWidth: 18, height: 22 }}
                        title={title}>
                        <div className={`w-full h-full ${bgClass}`} style={bgStyle} />
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
        <span className="font-medium">Légende :</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-primary/50" /> Affecté</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-blue-400/60" /> CP</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-teal-400/60" /> RTT</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-400/60" /> Maladie</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-amber-400/60" /> Formation</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-muted/40" /> WE / Férié</span>
      </div>
    </div>
  );
};
