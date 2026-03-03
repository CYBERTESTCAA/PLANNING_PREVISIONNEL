import { 
  Assignment, 
  Absence,
  Task,
  Person, 
  DayData, 
  PersonPlanningData,
  CalendarEvent 
} from '@/types/planning';
import { formatDate } from './dateUtils';

/**
 * 24-color palette ordered by golden-angle hue steps (~137.5°).
 * Each consecutive entry is ~137° away on the hue wheel → adjacent
 * hash indices always map to perceptually very different colors.
 * Named: tomate → vert → violet → ambre → cyan → rose → forêt → bleu → …
 */
const PROJECT_PALETTE = [
  '4 83% 44%',    //  0 — rouge / tomate
  '141 58% 35%',  //  1 — vert émeraude        (+137°)
  '278 58% 46%',  //  2 — violet               (+137°)
  '55 85% 39%',   //  3 — ambre / jaune-doré   (+137°)
  '192 68% 37%',  //  4 — cyan / pétrole       (+137°)
  '329 66% 43%',  //  5 — rose framboise       (+137°)
  '106 60% 35%',  //  6 — vert pomme / olive   (+137°)
  '243 66% 50%',  //  7 — indigo               (+137°)
  '20 84% 44%',   //  8 — orange               (+137°)
  '157 60% 35%',  //  9 — sarcelle             (+137°)
  '294 52% 44%',  // 10 — orchidée / mauve     (+137°)
  '71 72% 37%',   // 11 — vert-jaune / sauge   (+137°)
  '208 74% 43%',  // 12 — azur / bleu roi      (+137°)
  '345 70% 43%',  // 13 — rose vif             (+137°)
  '122 54% 34%',  // 14 — vert forêt           (+137°)
  '259 62% 49%',  // 15 — bleu lavande         (+137°)
  '36 88% 42%',   // 16 — orange-ambre         (+137°)
  '173 63% 35%',  // 17 — vert sarcelle        (+137°)
  '310 55% 42%',  // 18 — magenta              (+137°)
  '87 66% 37%',   // 19 — vert pomme vif       (+137°)
  '224 70% 47%',  // 20 — bleu moyen           (+137°)
  '1 72% 47%',    // 21 — brique / terra cotta (+137°)
  '138 50% 38%',  // 22 — vert sauge foncé     (+137°)
  '275 50% 51%',  // 23 — lavande              (+137°)
];

/**
 * Deterministic color from a project ID: always the same color for the same ID,
 * spread across the 30-color palette via FNV-style hash.
 */
export const hashProjectColor = (projectId: string): string => {
  let h = 2166136261; // FNV offset basis
  for (let i = 0; i < projectId.length; i++) {
    h = Math.imul(h ^ projectId.charCodeAt(i), 16777619);
    h |= 0;
  }
  return PROJECT_PALETTE[(h >>> 0) % PROJECT_PALETTE.length];
};

/**
 * Returns the display color for a given assignment.
 * Always derived from the project UUID for uniqueness.
 * (Stored project.color from the admin palette is used as override only
 *  when it has been explicitly customised to a non-standard value.)
 */
const STANDARD_COLORS = new Set([
  '217 91% 50%','145 63% 42%','340 75% 55%','25 95% 53%',
  '286 60% 50%','0 84% 60%','199 89% 48%','262 52% 47%',
  '158 64% 40%','38 92% 50%',
]);

export const getAssignmentColor = (assignment: Assignment): string => {
  const id = assignment.project?.id ?? assignment.project_id;
  if (!id) return '217 65% 42%';
  // Use stored color only when it's a real custom pick (not from the standard palette)
  const stored = assignment.project?.color;
  if (stored && !STANDARD_COLORS.has(stored)) return stored;
  return hashProjectColor(id);
};

// Build planning data structure from raw data
export const buildPlanningData = (
  people: Person[],
  assignments: Assignment[],
  absences: Absence[],
  dates: Date[],
  tasks: Task[] = []
): PersonPlanningData[] => {
  return people.map(person => {
    const days: Record<string, DayData> = {};

    dates.forEach(date => {
      const dateStr = formatDate(date);
      const personAssignments = assignments.filter(
        a => a.person_id === person.id && a.date === dateStr
      );
      const dayAbsences = absences.filter(
        a => a.person_id === person.id && a.date === dateStr
      );
      const fullAbsence = dayAbsences.find(a => a.slot === 'FULL') || null;
      const amAbsence = dayAbsences.find(a => a.slot === 'AM') || null;
      const pmAbsence = dayAbsences.find(a => a.slot === 'PM') || null;
      // Tasks shown on their due_date; PENDING tasks with no due_date shown on every day
      const dayTasks = tasks.filter(
        t => t.person_id === person.id && (t.due_date === dateStr || (!t.due_date && t.status === 'PENDING'))
      );

      // Full absence blocks everything; half-day absences only block their slot
      const effectiveAbsence = fullAbsence || (amAbsence && pmAbsence ? amAbsence : null);
      const filteredAssignments = fullAbsence
        ? []
        : personAssignments.filter(a => {
            if (amAbsence && (a.slot === 'AM' || a.slot === 'FULL')) return false;
            if (pmAbsence && (a.slot === 'PM' || a.slot === 'FULL')) return false;
            return true;
          });

      days[dateStr] = {
        assignments: filteredAssignments,
        absence: effectiveAbsence,
        absenceAM: fullAbsence ? fullAbsence : amAbsence,
        absencePM: fullAbsence ? fullAbsence : pmAbsence,
        tasks: dayTasks,
      };
    });

    return { person, days };
  });
};

// Check if a day has an absence that blocks assignments
export const isDayBlocked = (
  personId: string,
  date: string,
  absences: Absence[]
): boolean => {
  return absences.some(
    a => a.person_id === personId && a.date === date
  );
};

// Get chip color class based on project index
export const getChipColorClass = (index: number): string => {
  const colors = ['bg-chip-1', 'bg-chip-2', 'bg-chip-3', 'bg-chip-4', 'bg-chip-5'];
  return colors[index % colors.length];
};

// Get absence badge class based on type
export const getAbsenceBadgeClass = (type: string): string => {
  const classes: Record<string, string> = {
    CP: 'bg-absence-cp',
    RTT: 'bg-absence-rtt',
    MALADIE: 'bg-absence-maladie',
    FORMATION: 'bg-absence-formation',
    AUTRE: 'bg-absence-autre',
  };
  return classes[type] || 'bg-absence-autre';
};

// Convert assignments and absences to calendar events
export const toCalendarEvents = (
  assignments: Assignment[],
  absences: Absence[]
): CalendarEvent[] => {
  const events: CalendarEvent[] = [];

  // Assignment events
  assignments.forEach(assignment => {
    events.push({
      id: assignment.id,
      title: assignment.project 
        ? `${assignment.project.code} – ${assignment.project.label}`
        : 'Chantier',
      start: assignment.date,
      allDay: true,
      extendedProps: {
        type: 'assignment',
        projectCode: assignment.project?.code,
        comment: assignment.comment || undefined,
      },
      backgroundColor: `hsl(${getAssignmentColor(assignment)})`,
      borderColor: `hsl(${getAssignmentColor(assignment)})`,
      textColor: '#ffffff',
    });
  });

  // Absence events
  absences.forEach(absence => {
    const colors: Record<string, { bg: string; border: string }> = {
      CP: { bg: 'hsl(217, 91%, 60%)', border: 'hsl(217, 91%, 55%)' },
      RTT: { bg: 'hsl(145, 63%, 42%)', border: 'hsl(145, 63%, 37%)' },
      MALADIE: { bg: 'hsl(340, 75%, 55%)', border: 'hsl(340, 75%, 50%)' },
      FORMATION: { bg: 'hsl(262, 83%, 58%)', border: 'hsl(262, 83%, 53%)' },
      AUTRE: { bg: 'hsl(215, 16%, 47%)', border: 'hsl(215, 16%, 42%)' },
    };

    const color = colors[absence.type] || colors.AUTRE;

    events.push({
      id: absence.id,
      title: absence.comment ? `${absence.type} - ${absence.comment}` : absence.type,
      start: absence.date,
      allDay: true,
      extendedProps: {
        type: 'absence',
        absenceType: absence.type,
        comment: absence.comment || undefined,
      },
      backgroundColor: color.bg,
      borderColor: color.border,
      textColor: '#ffffff',
    });
  });

  return events;
};

// Filter projects by search query
export const filterProjects = <T extends { id: string; code: string; label: string }>(
  projects: T[],
  query: string
): T[] => {
  if (!query.trim()) return projects;
  
  const lowerQuery = query.toLowerCase();
  return projects.filter(
    p => 
      p.code.toLowerCase().includes(lowerQuery) || 
      p.label.toLowerCase().includes(lowerQuery)
  );
};
