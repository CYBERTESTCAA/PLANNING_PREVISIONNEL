// Types for the planning application

export type AbsenceType = 'CP' | 'RTT' | 'MALADIE' | 'FORMATION' | 'AUTRE';

export type SlotType = 'AM' | 'PM' | 'FULL';

export type ProjectStatus = 'A_PLANIFIER' | 'EN_COURS' | 'BLOQUE' | 'TERMINE';

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ChangeRequestKind =
  | 'ADD_ASSIGNMENTS'
  | 'REMOVE_ASSIGNMENT'
  | 'ADD_ABSENCE'
  | 'REMOVE_ABSENCE'
  | 'BULK_ADD_ASSIGNMENTS'
  | 'BULK_ADD_ABSENCES';

export interface Subsidiary {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface Workshop {
  id: string;
  subsidiary_id: string;
  code: string;
  name: string;
  theme_color: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  workshop_id?: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Person {
  id: string;
  subsidiary_id: string;
  workshop_id: string | null;
  team_id: string | null;
  display_name: string;
  code?: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  workshop_id?: string;
  code: string;
  label: string;
  color: string; // HSL color string e.g. "217 91% 50%"
  // Contractuel (baseline) – ne bouge pas sauf décision explicite
  contract_start: string | null; // ISO date string YYYY-MM-DD
  contract_end: string | null; // ISO date string YYYY-MM-DD
  // Prévisionnel – peut évoluer
  planned_start: string | null; // ISO date string YYYY-MM-DD
  planned_end: string | null; // ISO date string YYYY-MM-DD
  status: ProjectStatus;
  progress_pct: number; // 0-100
  foc_source?: string | null; // source de données FOC
  foc_last_updated?: string | null; // ISO date
  is_active: boolean;
  // Enriched from warehouse
  client_name?: string | null;
  affaire_code?: string | null;
  montant_vente?: number | null;
  quantite_commandee?: number | null;
  is_soldee?: boolean;
  is_interne?: boolean;
  commercial_name?: string | null;
  technicien_name?: string | null;
  responsable_name?: string | null;
  created_at: string;
}

export interface ManufacturingOrder {
  id: string;
  project_id: string;
  code: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  person_id: string;
  project_id: string;
  manufacturing_order_id?: string | null;
  date: string; // ISO date string YYYY-MM-DD
  slot: SlotType; // AM | PM | FULL
  time_spent_minutes?: number | null;
  comment: string | null;
  created_at: string;
  // Joined data
  project?: Project;
  manufacturing_order?: ManufacturingOrder;
}

export interface Absence {
  id: string;
  person_id: string;
  subsidiary_id?: string;
  workshop_id?: string;
  date: string; // ISO date string YYYY-MM-DD
  slot: SlotType; // AM | PM | FULL
  type: AbsenceType;
  comment: string | null;
  created_at: string;
}

export type TaskStatus = 'PENDING' | 'DONE' | 'NOT_DONE';

export interface Task {
  id: string;
  person_id: string;          // employeeId in DB
  project_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;    // ISO date YYYY-MM-DD
  status: TaskStatus;
  response_comment: string | null;
  responded_at: string | null;
  created_at: string;
  // Joined
  person?: Person;
  project?: Project;
}

export interface ChangeRequest {
  id: string;
  kind: ChangeRequestKind;
  status: ChangeRequestStatus;
  created_at: string;
  payload: Record<string, unknown>;
}

// UI-specific types
export interface DayData {
  assignments: Assignment[];
  absence: Absence | null;
  absenceAM: Absence | null;
  absencePM: Absence | null;
  tasks: Task[];
}

export interface PersonPlanningData {
  person: Person;
  days: Record<string, DayData>; // key is ISO date string
}

export interface PlanningGridData {
  team: Team;
  people: PersonPlanningData[];
  startDate: string;
  endDate: string;
}

// View types
export type ViewType = 'day' | 'week' | 'month' | 'year';

// Calendar event type for FullCalendar
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: {
    type: 'assignment' | 'absence';
    projectCode?: string;
    absenceType?: AbsenceType;
    comment?: string;
  };
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

// Form types
export interface AssignmentFormData {
  projectIds: string[];
  comment: string;
}

export interface AbsenceFormData {
  type: AbsenceType;
  comment: string;
}

// Absence type labels
export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  CP: 'Congés Payés',
  RTT: 'RTT',
  MALADIE: 'Maladie',
  FORMATION: 'Formation',
  AUTRE: 'Autre',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  A_PLANIFIER: 'À planifier',
  EN_COURS: 'En cours',
  BLOQUE: 'Bloqué',
  TERMINE: 'Terminé',
};

export const SLOT_LABELS: Record<SlotType, string> = {
  AM: 'Matin',
  PM: 'Après-midi',
  FULL: 'Journée entière',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  A_PLANIFIER: '215 16% 47%',
  EN_COURS: '217 91% 50%',
  BLOQUE: '0 84% 60%',
  TERMINE: '145 63% 42%',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'En attente',
  DONE: 'Terminée',
  NOT_DONE: 'Non terminée',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: '38 92% 50%',   // amber
  DONE: '145 63% 42%',     // green
  NOT_DONE: '0 84% 60%',   // red
};
