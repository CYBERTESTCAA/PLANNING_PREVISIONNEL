import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Absence, AbsenceType, Assignment, ChangeRequest, ChangeRequestKind, ManufacturingOrder, Person, Project, SlotType, Subsidiary, Task, TaskStatus, Team, Workshop } from '@/types/planning';
import { mockAbsences, mockAssignments, mockManufacturingOrders, mockPeople, mockProjects, mockSubsidiaries, mockTeams, mockWorkshops } from '@/data/mockData';
import { api, isApiEnabled, ApiEmployee, ApiProject, ApiWorkshop, ApiTeam, ApiSubsidiary, ApiManufacturingOrder, ApiAssignment, ApiAbsence, ApiTask } from '@/lib/api';
import { toast } from 'sonner';

// ─── Mappers API → types frontend ────────────────────────────────────────────
const NOW = new Date().toISOString();

const mapSubsidiary = (s: ApiSubsidiary): Subsidiary =>
  ({ id: s.id, code: s.code, name: s.name, created_at: NOW } as unknown as Subsidiary);

const mapWorkshop = (w: ApiWorkshop): Workshop =>
  ({
    id: w.id, code: w.code, name: w.name,
    subsidiary_id: w.subsidiaryId,
    theme_color: w.themeColor ?? undefined,
    created_at: NOW,
  } as unknown as Workshop);

const mapTeam = (t: ApiTeam): Team =>
  ({ id: t.id, name: t.name, workshop_id: t.workshopId, is_active: t.isActive, created_at: NOW } as unknown as Team);

const mapPerson = (e: ApiEmployee): Person =>
  ({
    id: e.id,
    subsidiary_id: e.subsidiaryId,
    display_name: [e.firstName, e.lastName].filter(Boolean).join(' ') || e.code,
    workshop_id: e.workshopId ?? null,
    team_id: e.teamId ?? null,
    is_active: e.isActive,
    code: e.code,
    created_at: NOW,
  } as unknown as Person);

const mapProject = (p: ApiProject): Project =>
  ({
    id: p.id, code: p.code, label: p.label, color: p.color,
    workshop_id: p.workshopId,
    is_active: p.isActive,
    contract_start: p.contractStart ?? undefined,
    contract_end: p.contractEnd ?? undefined,
    planned_start: p.plannedStart ?? undefined,
    planned_end: p.plannedEnd ?? undefined,
    status: p.status,
    progress_pct: p.progressPct,
    client_name: p.client?.name ?? null,
    affaire_code: p.affaire?.code ?? null,
    montant_vente: p.montantVente ?? null,
    quantite_commandee: p.quantiteCommandee ?? null,
    is_soldee: p.isSoldee ?? false,
    is_interne: p.isInterne ?? false,
    commercial_name: p.commercialName ?? null,
    technicien_name: p.technicienName ?? null,
    responsable_name: p.responsableName ?? null,
    created_at: NOW,
  } as unknown as Project);

const mapMO = (mo: ApiManufacturingOrder): ManufacturingOrder =>
  ({ id: mo.id, code: mo.code, label: mo.label ?? mo.code, project_id: mo.projectId, created_at: NOW } as unknown as ManufacturingOrder);

const toDateStr = (d: string) => d.slice(0, 10);

const mapAssignment = (a: ApiAssignment, allProjects: Project[], allMOs: ManufacturingOrder[]): Assignment =>
  ({
    id: a.id,
    person_id: a.employeeId,
    project_id: a.projectId,
    manufacturing_order_id: a.manufacturingOrderId ?? undefined,
    date: toDateStr(a.date),
    slot: a.slot as SlotType,
    time_spent_minutes: a.timeSpentMinutes ?? null,
    comment: a.comment ?? null,
    created_at: NOW,
    project: a.project ? mapProject(a.project as ApiProject) : allProjects.find(p => p.id === a.projectId),
    manufacturing_order: a.manufacturingOrder ? mapMO(a.manufacturingOrder) : allMOs.find(mo => mo.id === a.manufacturingOrderId),
  } as unknown as Assignment);

const mapAbsence = (a: ApiAbsence): Absence =>
  ({ id: a.id, person_id: a.employeeId, date: toDateStr(a.date), slot: a.slot || 'FULL', type: a.type, comment: a.comment ?? null, created_at: NOW } as unknown as Absence);

const mapTask = (t: ApiTask, allProjects: Project[], allPeople: Person[]): Task =>
  ({
    id: t.id,
    person_id: t.employeeId,
    project_id: t.projectId ?? null,
    title: t.title,
    description: t.description ?? null,
    due_date: t.dueDate ?? null,
    status: t.status,
    response_comment: t.responseComment ?? null,
    responded_at: t.respondedAt ?? null,
    created_at: t.createdAt,
    person: allPeople.find(p => p.id === t.employeeId),
    project: t.project ? allProjects.find(p => p.id === t.projectId) : null,
  } as unknown as Task);

interface CreateChangeRequestInput {
  kind: ChangeRequestKind;
  payload: Record<string, unknown>;
}

interface PlanningStore {
  subsidiaries: Subsidiary[];
  setSubsidiaries: Dispatch<SetStateAction<Subsidiary[]>>;
  workshops: Workshop[];
  setWorkshops: Dispatch<SetStateAction<Workshop[]>>;
  teams: Team[];
  setTeams: Dispatch<SetStateAction<Team[]>>;
  people: Person[];
  setPeople: Dispatch<SetStateAction<Person[]>>;
  projects: Project[];
  manufacturingOrders: ManufacturingOrder[];
  setManufacturingOrders: Dispatch<SetStateAction<ManufacturingOrder[]>>;

  assignments: Assignment[];
  absences: Absence[];
  setAssignments: Dispatch<SetStateAction<Assignment[]>>;
  setAbsences: Dispatch<SetStateAction<Absence[]>>;

  selectedSubsidiaryId: string;
  setSelectedSubsidiaryId: (id: string) => void;
  selectedWorkshopId: string;
  setSelectedWorkshopId: (id: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (id: string) => void;

  validationMode: boolean;
  setValidationMode: (enabled: boolean) => void;

  changeRequests: ChangeRequest[];
  createChangeRequest: (input: CreateChangeRequestInput) => ChangeRequest;
  approveChangeRequest: (id: string) => void;
  rejectChangeRequest: (id: string) => void;

  isLoading: boolean;
  addMultipleAssignments: (personId: string, projectIds: string[], date: string, comment?: string, manufacturingOrderId?: string | null, slot?: SlotType, timeSpentMinutes?: number | null) => Assignment[];
  removeAssignment: (assignmentId: string) => void;
  addAbsence: (personId: string, date: string, type: AbsenceType, comment?: string, slot?: SlotType) => Absence;
  removeAbsence: (absenceId: string) => void;
  hasAbsence: (personId: string, date: string) => boolean;
  loadPeriod: (workshopId: string, dateFrom: string, dateTo: string) => Promise<void>;

  tasks: Task[];
  addTask: (params: { personId: string; projectId?: string | null; title: string; description?: string | null; dueDate?: string | null }) => Task;
  respondToTask: (taskId: string, status: 'DONE' | 'NOT_DONE', comment?: string | null) => void;
  removeTask: (taskId: string) => void;
}

const PlanningStoreContext = createContext<PlanningStore | null>(null);

export const PlanningStoreProvider = ({ children }: { children: ReactNode }) => {
  const apiEnabled = isApiEnabled();

  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>(apiEnabled ? [] : mockSubsidiaries);
  const [workshops, setWorkshops] = useState<Workshop[]>(apiEnabled ? [] : mockWorkshops);
  const [teams, setTeams] = useState<Team[]>(apiEnabled ? [] : mockTeams);
  const [people, setPeople] = useState<Person[]>(apiEnabled ? [] : mockPeople);
  const [projects, setProjects] = useState<Project[]>(apiEnabled ? [] : mockProjects);
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>(apiEnabled ? [] : mockManufacturingOrders);

  const [assignments, setAssignments] = useState<Assignment[]>(apiEnabled ? [] : mockAssignments);
  const [absences, setAbsences] = useState<Absence[]>(apiEnabled ? [] : mockAbsences);
  const [isLoading, setIsLoading] = useState(apiEnabled);

  useEffect(() => {
    if (!apiEnabled) return;
    (async () => {
      setIsLoading(true);
      try {
        const [subs, wks, tms, emps, projs, mos] = await Promise.all([
          api.subsidiaries.list(),
          api.workshops.list(),
          api.teams.list(),
          api.employees.list(),
          api.projects.list(),
          api.manufacturingOrders.list(),
        ]);
        setSubsidiaries(subs.map(mapSubsidiary));
        setWorkshops(wks.map(mapWorkshop));
        setTeams(tms.map(mapTeam));
        setPeople(emps.map(mapPerson));
        setProjects(projs.map(mapProject));
        setManufacturingOrders(mos.map(mapMO));
      } catch (e) {
        console.error('[PlanningStore] Erreur chargement API :', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [apiEnabled]);

  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedSubsidiaryId, setSelectedSubsidiaryIdState] = useState<string>('');
  const [selectedWorkshopId, setSelectedWorkshopIdState] = useState<string>('');
  const [selectedTeamId, setSelectedTeamIdState] = useState<string>('');

  useEffect(() => {
    if (subsidiaries.length === 0) return;
    const saved = {
      sub: localStorage.getItem('planning:subsidiaryId') ?? '',
      wk: localStorage.getItem('planning:workshopId') ?? '',
      tm: localStorage.getItem('planning:teamId') ?? '',
    };
    const subId = subsidiaries.find(s => s.id === saved.sub)?.id ?? subsidiaries[0].id;
    const wk = workshops.find(w => w.subsidiary_id === subId && w.id === saved.wk)
      ?? workshops.find(w => w.subsidiary_id === subId)
      ?? workshops[0];
    const wkId = wk?.id ?? '';
    const tm = teams.find(t => t.workshop_id === wkId && t.id === saved.tm)
      ?? teams.find(t => t.workshop_id === wkId);
    setSelectedSubsidiaryIdState(subId);
    setSelectedWorkshopIdState(wkId);
    setSelectedTeamIdState(tm?.id ?? '');
  }, [subsidiaries, workshops, teams]);

  useEffect(() => { if (selectedSubsidiaryId) localStorage.setItem('planning:subsidiaryId', selectedSubsidiaryId); }, [selectedSubsidiaryId]);
  useEffect(() => { if (selectedWorkshopId) localStorage.setItem('planning:workshopId', selectedWorkshopId); }, [selectedWorkshopId]);
  useEffect(() => { if (selectedTeamId) localStorage.setItem('planning:teamId', selectedTeamId); }, [selectedTeamId]);

  const selectedWorkshop = useMemo(
    () => workshops.find(w => w.id === selectedWorkshopId) || null,
    [workshops, selectedWorkshopId]
  );

  useEffect(() => {
    const theme = selectedWorkshop?.theme_color;
    if (theme) {
      document.documentElement.style.setProperty('--primary', theme);
      document.documentElement.style.setProperty('--ring', theme);
      document.documentElement.style.setProperty('--sidebar-primary', theme);
    }
  }, [selectedWorkshop]);

  const setSelectedSubsidiaryId = useCallback((id: string) => {
    setSelectedSubsidiaryIdState(id);
    const firstWorkshop = workshops.find(w => w.subsidiary_id === id);
    const nextWorkshopId = firstWorkshop?.id || workshops[0]?.id || '';
    setSelectedWorkshopIdState(nextWorkshopId);
    const firstTeam = teams.find(t => t.workshop_id === nextWorkshopId);
    setSelectedTeamIdState(firstTeam?.id || '');
  }, [teams, workshops]);

  const setSelectedWorkshopId = useCallback((id: string) => {
    setSelectedWorkshopIdState(id);
    const firstTeam = teams.find(t => t.workshop_id === id);
    setSelectedTeamIdState(firstTeam?.id || '');
  }, [teams]);

  const setSelectedTeamId = useCallback((id: string) => {
    setSelectedTeamIdState(id);
  }, []);

  const [validationMode, setValidationModeState] = useState(false);
  const setValidationMode = useCallback((enabled: boolean) => setValidationModeState(enabled), []);

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  const addMultipleAssignments = useCallback((
    personId: string,
    projectIds: string[],
    date: string,
    comment?: string,
    manufacturingOrderId?: string | null,
    slot: SlotType = 'FULL',
    timeSpentMinutes?: number | null
  ) => {
    const tempIds: string[] = [];
    const newAssignments = projectIds.map(projectId => {
      const project = projects.find(p => p.id === projectId);
      const manufacturingOrder = manufacturingOrderId
        ? manufacturingOrders.find(mo => mo.id === manufacturingOrderId) || undefined
        : undefined;
      const tempId = crypto.randomUUID();
      tempIds.push(tempId);
      return {
        id: tempId,
        person_id: personId,
        project_id: projectId,
        manufacturing_order_id: manufacturingOrderId ?? undefined,
        date,
        slot,
        time_spent_minutes: timeSpentMinutes ?? null,
        comment: comment || null,
        created_at: new Date().toISOString(),
        project,
        manufacturing_order: manufacturingOrder,
      } as Assignment;
    });
    setAssignments(prev => [...prev, ...newAssignments]);
    if (apiEnabled) {
      api.assignments.bulk({ employeeId: personId, projectIds, date, slot, manufacturingOrderId: manufacturingOrderId ?? null, timeSpentMinutes: timeSpentMinutes ?? null, comment: comment || null })
        .then(saved => {
          setAssignments(prev => {
            const tempSet = new Set(tempIds);
            const kept = prev.filter(a => !tempSet.has(a.id));
            const mapped = saved.map(sa => mapAssignment(sa, projects, manufacturingOrders));
            return [...kept, ...mapped];
          });
        })
        .catch(() => {
          setAssignments(prev => { const s = new Set(tempIds); return prev.filter(a => !s.has(a.id)); });
          toast.error('Affectation non sauvegardée — vérifiez la connexion');
        });
    }
    return newAssignments;
  }, [manufacturingOrders, projects, apiEnabled]);

  const removeAssignment = useCallback((assignmentId: string) => {
    if (!assignmentId) return;
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    if (apiEnabled) {
      api.assignments.delete(assignmentId).catch((err: any) => {
        console.error('[removeAssignment] failed', assignmentId, err?.status, err?.message ?? err);
      });
    }
  }, [apiEnabled]);

  const addAbsence = useCallback((personId: string, date: string, type: AbsenceType, comment?: string, slot: SlotType = 'FULL') => {
    const tempId = crypto.randomUUID();
    const newAbsence: Absence = { id: tempId, person_id: personId, date, slot, type, comment: comment || null, created_at: new Date().toISOString() };
    setAbsences(prev => [...prev, newAbsence]);
    if (apiEnabled) {
      api.absences.create({ employeeId: personId, date, slot, type, comment: comment || null })
        .then(saved => setAbsences(prev => prev.map(a => a.id === tempId ? { ...a, id: saved.id } : a)))
        .catch(() => { setAbsences(prev => prev.filter(a => a.id !== tempId)); toast.error('Absence non sauvegardée'); });
    }
    return newAbsence;
  }, [apiEnabled]);

  const removeAbsence = useCallback((absenceId: string) => {
    setAbsences(prev => prev.filter(a => a.id !== absenceId));
    if (apiEnabled) {
      api.absences.delete(absenceId).catch(() => {});
    }
  }, [apiEnabled]);

  const loadPeriod = useCallback(async (workshopId: string, dateFrom: string, dateTo: string) => {
    if (!apiEnabled || !workshopId) return;
    try {
      const data = await api.planning.get({ workshopId, dateFrom, dateTo });
      // Merge fresh employees from the planning endpoint so workshop assignments are up-to-date
      if (data.employees?.length) {
        const freshPeople = data.employees.map(mapPerson);
        setPeople(prev => {
          const byId = new Map(prev.map(p => [p.id, p]));
          for (const fp of freshPeople) byId.set(fp.id, fp);
          return Array.from(byId.values());
        });
      }
      const newA = data.assignments.map(a => mapAssignment(a, projects, manufacturingOrders));
      const newAbs = data.absences.map(mapAbsence);
      const newT = data.tasks.map(t => mapTask(t, projects, people));
      setAssignments(prev => [...prev.filter(a => a.date < dateFrom || a.date > dateTo), ...newA]);
      setAbsences(prev => [...prev.filter(a => a.date < dateFrom || a.date > dateTo), ...newAbs]);
      setTasks(prev => { const ids = new Set(newT.map(t => t.id)); return [...prev.filter(t => !ids.has(t.id)), ...newT]; });
    } catch (e) {
      console.error('[PlanningStore] loadPeriod error:', e);
    }
  }, [apiEnabled, projects, manufacturingOrders, people]);

  const hasAbsence = useCallback((personId: string, date: string) => {
    return absences.some(a => a.person_id === personId && a.date === date);
  }, [absences]);

  const addTask = useCallback((params: { personId: string; projectId?: string | null; title: string; description?: string | null; dueDate?: string | null }) => {
    const person = people.find(p => p.id === params.personId);
    const project = params.projectId ? projects.find(p => p.id === params.projectId) : undefined;
    const tempId = crypto.randomUUID();
    const newTask: Task = {
      id: tempId,
      person_id: params.personId,
      project_id: params.projectId ?? null,
      title: params.title,
      description: params.description ?? null,
      due_date: params.dueDate ?? null,
      status: 'PENDING',
      response_comment: null,
      responded_at: null,
      created_at: new Date().toISOString(),
      person,
      project,
    };
    setTasks(prev => [newTask, ...prev]);
    if (apiEnabled) {
      api.tasks.create({ employeeId: params.personId, projectId: params.projectId ?? null, title: params.title, description: params.description ?? null, dueDate: params.dueDate ?? null })
        .then(saved => setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: saved.id } : t)))
        .catch(() => { setTasks(prev => prev.filter(t => t.id !== tempId)); toast.error('Tâche non sauvegardée'); });
    }
    return newTask;
  }, [people, projects, apiEnabled]);

  const respondToTask = useCallback((taskId: string, status: 'DONE' | 'NOT_DONE', comment?: string | null) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status, response_comment: comment ?? null, responded_at: new Date().toISOString() } : t
    ));
    if (apiEnabled) {
      api.tasks.respond(taskId, { status, responseComment: comment ?? null }).catch(() => toast.error('Réponse non sauvegardée'));
    }
  }, [apiEnabled]);

  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (apiEnabled) {
      api.tasks.delete(taskId).catch(() => {});
    }
  }, [apiEnabled]);

  const createChangeRequest = useCallback((input: CreateChangeRequestInput) => {
    const req: ChangeRequest = {
      id: crypto.randomUUID(),
      kind: input.kind,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      payload: input.payload,
    };
    setChangeRequests(prev => [req, ...prev]);
    return req;
  }, []);

  const applyChangeRequest = useCallback((req: ChangeRequest) => {
    switch (req.kind) {
      case 'ADD_ASSIGNMENTS': {
        const personId = String(req.payload.personId || '');
        const date = String(req.payload.date || '');
        const projectIds = Array.isArray(req.payload.projectIds) ? req.payload.projectIds.map(String) : [];
        const comment = typeof req.payload.comment === 'string' ? req.payload.comment : undefined;
        const manufacturingOrderId = req.payload.manufacturingOrderId === null
          ? null
          : (typeof req.payload.manufacturingOrderId === 'string' ? req.payload.manufacturingOrderId : undefined);
        const slot = (req.payload.slot as SlotType) || 'FULL';
        const timeSpentMinutes = typeof req.payload.timeSpentMinutes === 'number' ? req.payload.timeSpentMinutes : null;
        if (personId && date && projectIds.length > 0) addMultipleAssignments(personId, projectIds, date, comment, manufacturingOrderId, slot, timeSpentMinutes);
        break;
      }
      case 'REMOVE_ASSIGNMENT': {
        const assignmentId = String(req.payload.assignmentId || '');
        if (assignmentId) removeAssignment(assignmentId);
        break;
      }
      case 'ADD_ABSENCE': {
        const personId = String(req.payload.personId || '');
        const date = String(req.payload.date || '');
        const type = String(req.payload.type || '') as AbsenceType;
        const comment = typeof req.payload.comment === 'string' ? req.payload.comment : undefined;
        if (personId && date && type) addAbsence(personId, date, type, comment);
        break;
      }
      case 'REMOVE_ABSENCE': {
        const absenceId = String(req.payload.absenceId || '');
        if (absenceId) removeAbsence(absenceId);
        break;
      }
      case 'BULK_ADD_ASSIGNMENTS': {
        const personIds = Array.isArray(req.payload.personIds) ? req.payload.personIds.map(String) : [];
        const projectId = String(req.payload.projectId || '');
        const date = String(req.payload.date || '');
        if (personIds.length > 0 && projectId && date) {
          personIds.forEach(pid => addMultipleAssignments(pid, [projectId], date));
        }
        break;
      }
      case 'BULK_ADD_ABSENCES': {
        const personIds = Array.isArray(req.payload.personIds) ? req.payload.personIds.map(String) : [];
        const type = String(req.payload.type || '') as AbsenceType;
        const date = String(req.payload.date || '');
        if (personIds.length > 0 && type && date) {
          personIds.forEach(pid => addAbsence(pid, date, type));
        }
        break;
      }
    }
  }, [addAbsence, addMultipleAssignments, removeAbsence, removeAssignment]);

  const approveChangeRequest = useCallback((id: string) => {
    setChangeRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (r.status !== 'PENDING') return r;
      applyChangeRequest(r);
      return { ...r, status: 'APPROVED' };
    }));
  }, [applyChangeRequest]);

  const rejectChangeRequest = useCallback((id: string) => {
    setChangeRequests(prev => prev.map(r => r.id === id && r.status === 'PENDING' ? { ...r, status: 'REJECTED' } : r));
  }, []);

  const value = useMemo<PlanningStore>(() => ({
    subsidiaries,
    setSubsidiaries,
    workshops,
    setWorkshops,
    teams,
    setTeams,
    people,
    setPeople,
    projects,
    manufacturingOrders,
    setManufacturingOrders,
    assignments,
    absences,
    setAssignments,
    setAbsences,
    isLoading,
    selectedSubsidiaryId,
    setSelectedSubsidiaryId,
    selectedWorkshopId,
    setSelectedWorkshopId,
    selectedTeamId,
    setSelectedTeamId,
    validationMode,
    setValidationMode,
    changeRequests,
    createChangeRequest,
    approveChangeRequest,
    rejectChangeRequest,
    addMultipleAssignments,
    removeAssignment,
    addAbsence,
    removeAbsence,
    hasAbsence,
    loadPeriod,
    tasks,
    addTask,
    respondToTask,
    removeTask,
  }), [
    subsidiaries,
    setSubsidiaries,
    workshops,
    setWorkshops,
    teams,
    setTeams,
    people,
    setPeople,
    projects,
    manufacturingOrders,
    assignments,
    absences,
    isLoading,
    selectedSubsidiaryId,
    setSelectedSubsidiaryId,
    selectedWorkshopId,
    setSelectedWorkshopId,
    selectedTeamId,
    setSelectedTeamId,
    validationMode,
    setValidationMode,
    changeRequests,
    createChangeRequest,
    approveChangeRequest,
    rejectChangeRequest,
    addMultipleAssignments,
    removeAssignment,
    addAbsence,
    removeAbsence,
    hasAbsence,
    loadPeriod,
    tasks,
    addTask,
    respondToTask,
    removeTask,
  ]);

  return (
    <PlanningStoreContext.Provider value={value}>
      {children}
    </PlanningStoreContext.Provider>
  );
};

export const usePlanningStore = () => {
  const ctx = useContext(PlanningStoreContext);
  if (!ctx) throw new Error('PlanningStoreProvider is missing');
  return ctx;
};
