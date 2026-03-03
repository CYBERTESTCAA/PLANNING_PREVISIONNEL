import { useCallback, useMemo } from 'react';
import { 
  AbsenceType, PersonPlanningData, SlotType 
} from '@/types/planning';
import { buildPlanningData } from '@/lib/planningUtils';
import { usePlanningStore } from '@/contexts/PlanningStoreContext';

export const usePlanningData = () => {
  const store = usePlanningStore();

  const workshopsForSubsidiary = useMemo(
    () => store.workshops.filter(w => w.subsidiary_id === store.selectedSubsidiaryId),
    [store.workshops, store.selectedSubsidiaryId]
  );

  const teams = useMemo(
    () => store.teams.filter(t => t.is_active && (!store.selectedWorkshopId || t.workshop_id === store.selectedWorkshopId)),
    [store.teams, store.selectedWorkshopId]
  );

  const people = useMemo(
    () => store.people.filter(p => p.is_active && (!store.selectedWorkshopId || p.workshop_id === store.selectedWorkshopId)),
    [store.people, store.selectedWorkshopId]
  );

  const projects = useMemo(
    () => store.projects.filter(p => (!store.selectedWorkshopId || p.workshop_id === store.selectedWorkshopId)),
    [store.projects, store.selectedWorkshopId]
  );

  const peopleById = useMemo(
    () => new Map(store.people.map(p => [p.id, p])),
    [store.people]
  );
  const projectsById = useMemo(
    () => new Map(store.projects.map(p => [p.id, p])),
    [store.projects]
  );

  const assignments = useMemo(() => {
    if (!store.selectedWorkshopId) return store.assignments;
    return store.assignments.filter(a => {
      const personWorkshopId = peopleById.get(a.person_id)?.workshop_id;
      const projectWorkshopId = (a.project?.workshop_id || projectsById.get(a.project_id)?.workshop_id);
      return personWorkshopId === store.selectedWorkshopId || projectWorkshopId === store.selectedWorkshopId;
    });
  }, [store.assignments, store.selectedWorkshopId, peopleById, projectsById]);

  const setAssignments = store.setAssignments;

  const absences = useMemo(() => {
    if (!store.selectedWorkshopId) return store.absences;
    return store.absences.filter(a => peopleById.get(a.person_id)?.workshop_id === store.selectedWorkshopId);
  }, [store.absences, store.selectedWorkshopId, peopleById]);

  const setAbsences = store.setAbsences;

  const selectedTeamId = store.selectedTeamId;
  const setSelectedTeamId = store.setSelectedTeamId;

  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId) || null, [teams, selectedTeamId]);
  const teamPeople = useMemo(() => people.filter(p => p.is_active), [people]);
  const activeProjects = useMemo(() => projects.filter(p => p.is_active), [projects]);

  const tasks = store.tasks;

  const getPlanningData = useCallback((dates: Date[]): PersonPlanningData[] => {
    return buildPlanningData(teamPeople, assignments, absences, dates, tasks);
  }, [teamPeople, assignments, absences, tasks]);

  const getPersonData = useCallback((personId: string) => {
    const person = people.find(p => p.id === personId);
    const personAssignments = assignments.filter(a => a.person_id === personId);
    const personAbsences = absences.filter(a => a.person_id === personId);
    return { person, assignments: personAssignments, absences: personAbsences };
  }, [people, assignments, absences]);

  const addMultipleAssignments = useCallback((
    personId: string,
    projectIds: string[],
    date: string,
    comment?: string,
    manufacturingOrderId?: string | null,
    slot: SlotType = 'FULL',
    timeSpentMinutes?: number | null
  ) => {
    return store.addMultipleAssignments(personId, projectIds, date, comment, manufacturingOrderId, slot, timeSpentMinutes);
  }, [store]);

  const removeAssignment = useCallback((assignmentId: string) => {
    store.removeAssignment(assignmentId);
  }, [store]);

  const addAbsence = useCallback((
    personId: string,
    date: string,
    type: AbsenceType,
    comment?: string,
    slot?: SlotType
  ) => {
    return store.addAbsence(personId, date, type, comment, slot);
  }, [store]);

  const removeAbsence = useCallback((absenceId: string) => {
    store.removeAbsence(absenceId);
  }, [store]);

  const hasAbsence = useCallback((personId: string, date: string): boolean => {
    return store.hasAbsence(personId, date);
  }, [store]);

  return {
    subsidiaries: store.subsidiaries,
    workshops: store.workshops,
    workshopsForSubsidiary,
    selectedSubsidiaryId: store.selectedSubsidiaryId,
    setSelectedSubsidiaryId: store.setSelectedSubsidiaryId,
    selectedWorkshopId: store.selectedWorkshopId,
    setSelectedWorkshopId: store.setSelectedWorkshopId,
    validationMode: store.validationMode,
    setValidationMode: store.setValidationMode,
    changeRequests: store.changeRequests,
    approveChangeRequest: store.approveChangeRequest,
    rejectChangeRequest: store.rejectChangeRequest,
    createChangeRequest: store.createChangeRequest,
    manufacturingOrders: store.manufacturingOrders,
    setManufacturingOrders: store.setManufacturingOrders,

    teams, people, projects, assignments, absences,
    setAssignments, setAbsences,
    tasks,
    addTask: store.addTask,
    respondToTask: store.respondToTask,
    removeTask: store.removeTask,
    selectedTeamId, setSelectedTeamId,
    selectedTeam, teamPeople, activeProjects,
    getPlanningData, getPersonData,
    addMultipleAssignments, removeAssignment,
    addAbsence, removeAbsence, hasAbsence,
    loadPeriod: store.loadPeriod,
    isLoading: store.isLoading,
  };
};
