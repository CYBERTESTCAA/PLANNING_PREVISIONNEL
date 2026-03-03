import { Team, Person, Project, Assignment, Absence, ManufacturingOrder, Subsidiary, Workshop, SlotType } from '@/types/planning';
import { addDays, format, startOfWeek, subDays, addWeeks } from 'date-fns';

const generateId = () => crypto.randomUUID();

export const PROJECT_COLORS = [
  '217 91% 50%',
  '145 63% 42%',
  '340 75% 55%',
  '262 83% 58%',
  '24 95% 53%',
  '174 72% 40%',
  '43 96% 56%',
  '351 83% 61%',
  '199 89% 48%',
  '286 60% 50%',
];

export const getRandomProjectColor = (): string => {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
};

export const getProjectColorByIndex = (index: number): string => {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
};

export const mockSubsidiaries: Subsidiary[] = [
  { id: generateId(), code: 'FIL-01', name: 'Filiale Nord', created_at: new Date().toISOString() },
  { id: generateId(), code: 'FIL-02', name: 'Filiale Sud', created_at: new Date().toISOString() },
];

export const mockWorkshops: Workshop[] = [
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, code: 'ATL-A', name: 'Atelier A', theme_color: '217 91% 50%', created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, code: 'ATL-B', name: 'Atelier B', theme_color: '145 63% 42%', created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[1].id, code: 'ATL-C', name: 'Atelier C', theme_color: '262 83% 58%', created_at: new Date().toISOString() },
];

export const mockTeams: Team[] = [
  { id: generateId(), workshop_id: mockWorkshops[0].id, name: 'Équipe Gros Œuvre', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, name: 'Équipe Finitions', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[1].id, name: 'Équipe Atelier B', is_active: true, created_at: new Date().toISOString() },
];

export const mockPeople: Person[] = [
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: mockWorkshops[0].id, team_id: mockTeams[0].id, display_name: 'Jean Dupont', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: mockWorkshops[0].id, team_id: mockTeams[0].id, display_name: 'Pierre Martin', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: mockWorkshops[0].id, team_id: mockTeams[0].id, display_name: 'Marc Leblanc', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: mockWorkshops[0].id, team_id: mockTeams[0].id, display_name: 'Luc Bernard', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: mockWorkshops[0].id, team_id: mockTeams[0].id, display_name: 'François Petit', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: mockWorkshops[0].id, team_id: mockTeams[1].id, display_name: 'Sophie Moreau', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: mockWorkshops[0].id, team_id: mockTeams[1].id, display_name: 'Marie Durand', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: null, team_id: null, display_name: 'Julie Leroy', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: null, team_id: null, display_name: 'Claire Roux', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[0].id, workshop_id: null, team_id: null, display_name: 'Thomas Garcia', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[1].id, workshop_id: mockWorkshops[2].id, team_id: mockTeams[2].id, display_name: 'Nadia Benali', is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), subsidiary_id: mockSubsidiaries[1].id, workshop_id: null, team_id: null, display_name: 'Karim Haddad', is_active: true, created_at: new Date().toISOString() },
];

const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

export const mockProjects: Project[] = [
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25001', label: 'Résidence Les Iris', color: getProjectColorByIndex(0), contract_start: format(subDays(currentWeekStart, 21), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 3), 'yyyy-MM-dd'), planned_start: format(subDays(currentWeekStart, 14), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 4), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 45, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25002', label: 'Centre Commercial Nord', color: getProjectColorByIndex(1), contract_start: format(subDays(currentWeekStart, 14), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 5), 'yyyy-MM-dd'), planned_start: format(subDays(currentWeekStart, 7), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 6), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 30, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25003', label: 'Immeuble Bureau Azur', color: getProjectColorByIndex(2), contract_start: format(currentWeekStart, 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 8), 'yyyy-MM-dd'), planned_start: format(currentWeekStart, 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 8), 'yyyy-MM-dd'), status: 'A_PLANIFIER', progress_pct: 5, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25004', label: 'École Primaire Voltaire', color: getProjectColorByIndex(3), contract_start: format(subDays(currentWeekStart, 28), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 1), 'yyyy-MM-dd'), planned_start: format(subDays(currentWeekStart, 21), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 2), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 80, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25005', label: 'Hôpital Extension Sud', color: getProjectColorByIndex(4), contract_start: format(currentWeekStart, 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 10), 'yyyy-MM-dd'), planned_start: format(currentWeekStart, 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 12), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 15, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25006', label: 'Parking Souterrain Gare', color: getProjectColorByIndex(5), contract_start: format(addWeeks(currentWeekStart, 1), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 5), 'yyyy-MM-dd'), planned_start: format(addWeeks(currentWeekStart, 1), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 5), 'yyyy-MM-dd'), status: 'A_PLANIFIER', progress_pct: 0, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25007', label: 'Maison Individuelle Dupont', color: getProjectColorByIndex(6), contract_start: format(subDays(currentWeekStart, 35), 'yyyy-MM-dd'), contract_end: format(currentWeekStart, 'yyyy-MM-dd'), planned_start: format(subDays(currentWeekStart, 28), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 1), 'yyyy-MM-dd'), status: 'TERMINE', progress_pct: 100, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25008', label: 'Rénovation Mairie', color: getProjectColorByIndex(7), contract_start: format(currentWeekStart, 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 3), 'yyyy-MM-dd'), planned_start: format(currentWeekStart, 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 3), 'yyyy-MM-dd'), status: 'BLOQUE', progress_pct: 20, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25009', label: 'Lotissement Les Chênes', color: getProjectColorByIndex(8), contract_start: format(addWeeks(currentWeekStart, 2), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 9), 'yyyy-MM-dd'), planned_start: format(addWeeks(currentWeekStart, 2), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 10), 'yyyy-MM-dd'), status: 'A_PLANIFIER', progress_pct: 0, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25010', label: 'Usine Logistique Est', color: getProjectColorByIndex(9), contract_start: format(subDays(currentWeekStart, 14), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 6), 'yyyy-MM-dd'), planned_start: format(subDays(currentWeekStart, 7), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 7), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 60, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25011', label: 'Gymnase Municipal', color: getProjectColorByIndex(0), contract_start: format(currentWeekStart, 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 5), 'yyyy-MM-dd'), planned_start: format(currentWeekStart, 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 5), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 10, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25012', label: 'Pont Autoroute A12', color: getProjectColorByIndex(1), contract_start: format(subDays(currentWeekStart, 42), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 7), 'yyyy-MM-dd'), planned_start: format(subDays(currentWeekStart, 35), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 8), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 55, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25013', label: 'Station Épuration', color: getProjectColorByIndex(2), contract_start: format(addWeeks(currentWeekStart, -2), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 5), 'yyyy-MM-dd'), planned_start: format(addWeeks(currentWeekStart, -1), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 6), 'yyyy-MM-dd'), status: 'EN_COURS', progress_pct: 25, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25014', label: 'Tour Horizon', color: getProjectColorByIndex(3), contract_start: format(currentWeekStart, 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 14), 'yyyy-MM-dd'), planned_start: format(currentWeekStart, 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 16), 'yyyy-MM-dd'), status: 'A_PLANIFIER', progress_pct: 5, is_active: true, created_at: new Date().toISOString() },
  { id: generateId(), workshop_id: mockWorkshops[0].id, code: 'F25015', label: 'Clinique Vétérinaire', color: getProjectColorByIndex(4), contract_start: format(addWeeks(currentWeekStart, 1), 'yyyy-MM-dd'), contract_end: format(addWeeks(currentWeekStart, 4), 'yyyy-MM-dd'), planned_start: format(addWeeks(currentWeekStart, 1), 'yyyy-MM-dd'), planned_end: format(addWeeks(currentWeekStart, 4), 'yyyy-MM-dd'), status: 'A_PLANIFIER', progress_pct: 0, is_active: true, created_at: new Date().toISOString() },
];

export const mockManufacturingOrders: ManufacturingOrder[] = [
  { id: generateId(), project_id: mockProjects[0].id, code: 'OF-0001', created_at: new Date().toISOString() },
  { id: generateId(), project_id: mockProjects[0].id, code: 'OF-0002', created_at: new Date().toISOString() },
  { id: generateId(), project_id: mockProjects[3].id, code: 'OF-0101', created_at: new Date().toISOString() },
  { id: generateId(), project_id: mockProjects[4].id, code: 'OF-0201', created_at: new Date().toISOString() },
];

export const generateMockAssignments = (): Assignment[] => {
  const assignments: Assignment[] = [];
  const push = (a: Omit<Assignment, 'slot'> & { slot?: SlotType }) =>
    assignments.push({ slot: 'FULL', ...a } as Assignment);

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = format(addDays(currentWeekStart, dayOffset), 'yyyy-MM-dd');
    const isWeekendDay = dayOffset >= 5;

    if (isWeekendDay) continue; // pas d'affectations le week-end par défaut

    // Jean Dupont — matin sur F25001, après-midi sur F25002 (jour 0 et 2)
    if (dayOffset < 4) {
      push({ id: generateId(), person_id: mockPeople[0].id, project_id: mockProjects[0].id, slot: 'AM', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[0] });
      if (dayOffset % 2 === 0) {
        push({ id: generateId(), person_id: mockPeople[0].id, project_id: mockProjects[1].id, slot: 'PM', date, comment: 'Renfort équipe', created_at: new Date().toISOString(), project: mockProjects[1] });
      }
    }

    // Pierre Martin — journée entière F25004
    push({ id: generateId(), person_id: mockPeople[1].id, project_id: mockProjects[3].id, slot: 'FULL', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[3] });

    // Marc Leblanc — F25005 sauf mercredi
    if (dayOffset !== 2) {
      push({ id: generateId(), person_id: mockPeople[2].id, project_id: mockProjects[4].id, slot: 'FULL', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[4] });
    }

    // Luc Bernard — matin F25007, parfois PM F25008
    push({ id: generateId(), person_id: mockPeople[3].id, project_id: mockProjects[6].id, slot: 'AM', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[6] });
    if (dayOffset === 1 || dayOffset === 3) {
      push({ id: generateId(), person_id: mockPeople[3].id, project_id: mockProjects[7].id, slot: 'PM', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[7] });
    }

    // François Petit — F25010 journée entière lun-mer
    if (dayOffset < 3) {
      push({ id: generateId(), person_id: mockPeople[4].id, project_id: mockProjects[9].id, slot: 'FULL', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[9] });
    }

    // Sophie Moreau — F25011
    push({ id: generateId(), person_id: mockPeople[5].id, project_id: mockProjects[10].id, slot: 'FULL', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[10] });

    // Marie Durand — F25013 à partir de mardi
    if (dayOffset !== 0) {
      push({ id: generateId(), person_id: mockPeople[6].id, project_id: mockProjects[12].id, slot: 'FULL', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[12] });
    }

    // Julie Leroy — matin F25014
    push({ id: generateId(), person_id: mockPeople[7].id, project_id: mockProjects[13].id, slot: 'AM', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[13] });

    // Claire Roux — F25015 jours pairs
    if (dayOffset % 2 === 0) {
      push({ id: generateId(), person_id: mockPeople[8].id, project_id: mockProjects[14].id, slot: 'FULL', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[14] });
    }

    // Thomas Garcia — F25012
    push({ id: generateId(), person_id: mockPeople[9].id, project_id: mockProjects[11].id, slot: 'FULL', date, comment: null, created_at: new Date().toISOString(), project: mockProjects[11] });
  }

  return assignments;
};

export const generateMockAbsences = (): Absence[] => {
  const absences: Absence[] = [];

  absences.push({
    id: generateId(), person_id: mockPeople[0].id,
    date: format(addDays(currentWeekStart, 4), 'yyyy-MM-dd'),
    slot: 'FULL', type: 'CP', comment: 'Vacances', created_at: new Date().toISOString(),
  });

  absences.push({
    id: generateId(), person_id: mockPeople[2].id,
    date: format(addDays(currentWeekStart, 2), 'yyyy-MM-dd'),
    slot: 'FULL', type: 'FORMATION', comment: 'Formation sécurité', created_at: new Date().toISOString(),
  });

  absences.push({
    id: generateId(), person_id: mockPeople[6].id,
    date: format(addDays(currentWeekStart, 0), 'yyyy-MM-dd'),
    slot: 'AM', type: 'MALADIE', comment: null, created_at: new Date().toISOString(),
  });

  absences.push({
    id: generateId(), person_id: mockPeople[5].id,
    date: format(addDays(currentWeekStart, 4), 'yyyy-MM-dd'),
    slot: 'FULL', type: 'RTT', comment: null, created_at: new Date().toISOString(),
  });

  absences.push({
    id: generateId(), person_id: mockPeople[4].id,
    date: format(addDays(currentWeekStart, 3), 'yyyy-MM-dd'),
    slot: 'FULL', type: 'AUTRE', comment: 'Déplacement siège', created_at: new Date().toISOString(),
  });

  absences.push({
    id: generateId(), person_id: mockPeople[4].id,
    date: format(addDays(currentWeekStart, 4), 'yyyy-MM-dd'),
    slot: 'PM', type: 'AUTRE', comment: 'Déplacement siège', created_at: new Date().toISOString(),
  });

  return absences;
};

export const mockAssignments = generateMockAssignments();
export const mockAbsences = generateMockAbsences();
