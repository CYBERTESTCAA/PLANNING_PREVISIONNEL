/**
 * Typed API client for the planning backend.
 * Set VITE_API_URL in .env to enable (e.g. http://localhost:3001).
 * When VITE_API_URL is not set, the app falls back to mock data.
 */

const BASE = import.meta.env.VITE_API_URL as string | undefined;

export const isApiEnabled = (): boolean => Boolean(BASE);

// Auth token provider — set by AuthContext so API calls include the Bearer token
let _getToken: (() => Promise<string | null>) | null = null;
export const setAuthTokenProvider = (fn: (() => Promise<string | null>) | null) => { _getToken = fn; };

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new ApiError(0, 'API not configured');
  const hasBody = init?.body !== undefined;
  const isWrite = init?.method && init.method !== 'GET';
  const headers: Record<string, string> = hasBody ? { 'Content-Type': 'application/json' } : {};

  // Attach auth token for all requests (read + write)
  if (_getToken) {
    const token = await _getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...init?.headers },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as any).message ?? 'API error');
  return data as T;
}

const get = <T>(path: string) => req<T>(path);
const post = <T>(path: string, body: unknown) => req<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) => req<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = (path: string) => req<void>(path, { method: 'DELETE' });

// ─── Types (mirrors Prisma output) ───────────────────────────────────────────

export interface ApiSubsidiary {
  id: string; code: string; name: string;
  address?: string | null; city?: string | null; postalCode?: string | null;
  phone?: string | null; email?: string | null; siret?: string | null;
}
export interface ApiWorkshop { id: string; subsidiaryId: string; code: string; name: string; themeColor?: string | null }
export interface ApiTeam { id: string; workshopId: string; name: string; isActive: boolean }
export interface ApiEmployee {
  id: string; subsidiaryId: string; workshopId: string | null; teamId: string | null;
  code: string; lastName: string; firstName: string; isActive: boolean;
  matriculeRH?: string | null; service?: string | null; qualification?: string | null;
  isInterim?: boolean; hireDate?: string | null; managerCode?: string | null;
  team?: ApiTeam | null;
}
export interface ApiProject {
  id: string; workshopId: string; code: string; label: string; color: string;
  contractStart: string | null; contractEnd: string | null;
  plannedStart: string | null; plannedEnd: string | null;
  status: 'A_PLANIFIER' | 'EN_COURS' | 'BLOQUE' | 'TERMINE';
  progressPct: number; isActive: boolean;
  clientId?: string | null; affaireId?: string | null;
  montantVente?: number | null; quantiteCommandee?: number | null;
  isSoldee?: boolean; isInterne?: boolean;
  commercialName?: string | null; technicienName?: string | null; responsableName?: string | null;
  client?: ApiClient | null; affaire?: ApiAffaire | null;
  manufacturingOrders?: ApiManufacturingOrder[];
}
export interface ApiArticle { id: string; manufacturingOrderId: string; code: string; designation?: string | null; quantity?: number | null }
export interface ApiManufacturingOrder { id: string; projectId: string; code: string; label?: string | null; articles?: ApiArticle[] }
export interface ApiAssignment {
  id: string; employeeId: string; projectId: string;
  manufacturingOrderId: string | null;
  date: string; slot: 'AM' | 'PM' | 'FULL';
  timeSpentMinutes: number | null; comment: string | null;
  project?: ApiProject; manufacturingOrder?: ApiManufacturingOrder | null;
}
export interface ApiAbsence {
  id: string; employeeId: string; date: string;
  slot: 'AM' | 'PM' | 'FULL';
  type: 'CP' | 'RTT' | 'MALADIE' | 'FORMATION' | 'AUTRE';
  comment: string | null;
}
export interface ApiSyncLog {
  id: string; startedAt: string; finishedAt: string | null;
  durationMs: number | null; status: string; triggeredBy: string;
  subsidiaries: number; workshops: number; employees: number;
  projects: number; mfgOrders: number;
  clients: number; affaires: number; timeEntries: number; calendarDays: number;
  errors: string;
}
export interface ApiSyncProgress {
  step: number;
  totalSteps: number;
  stepLabel: string;
  stepDetail: string;
  percent: number;
  startedAt: string;
}
export interface ApiClient {
  id: string; subsidiaryId: string; code: string; name: string;
  groupName?: string | null; address?: string | null; city?: string | null;
  postalCode?: string | null; phone?: string | null; email?: string | null;
}
export interface ApiAffaire {
  id: string; code: string; label: string;
  clientId?: string | null; subsidiaryCode?: string | null;
  status?: string | null;
  dateCreation?: string | null; dateAccord?: string | null; dateSignature?: string | null;
  commercialName?: string | null; technicienName?: string | null;
  caPrevu?: number | null; tauxReussite?: number | null;
  client?: ApiClient | null;
}
export interface ApiTimeEntry {
  id: string; employeeId: string; projectId: string | null;
  date: string; hours: number; cost: number | null;
  ofCode?: string | null; articleCode?: string | null;
  employee?: { id: string; code: string; firstName: string; lastName: string };
  project?: { id: string; code: string; label: string } | null;
}
export interface ApiTimeEntrySummary {
  totalHours: number; totalCost: number; totalEntries: number;
  byEmployee: Record<string, { hours: number; cost: number; count: number }>;
}
export interface ApiCalendarDay {
  id: string; date: string; dayName?: string | null; weekNumber?: string | null;
  monthName?: string | null; year?: number | null;
  isWorkDay: boolean; isHoliday: boolean; holidayName?: string | null;
}
export interface ApiSubsidiarySchedule {
  id: string; subsidiaryId: string; dayOfWeek: string; hours: string;
}
export interface ApiTask {
  id: string; employeeId: string; projectId: string | null;
  title: string; description: string | null; dueDate: string | null;
  status: 'PENDING' | 'DONE' | 'NOT_DONE';
  responseComment: string | null; respondedAt: string | null;
  employee?: { id: string; firstName: string; lastName: string; code: string };
  project?: { id: string; code: string; label: string; color: string } | null;
  createdAt: string;
}
export interface ApiPlanningPayload {
  employees: ApiEmployee[];
  assignments: ApiAssignment[];
  absences: ApiAbsence[];
  tasks: ApiTask[];
}

// ─── Liste de Plans types ────────────────────────────────────────────────────
export type EtatAvancement = 'A_DIFFUSER' | 'DIFFUSE_ARCHI' | 'EN_ATTENTE' | 'EN_COURS_PLAN' | 'SUPPRIME' | 'VALIDE' | 'A_MODIFIER' | 'A_FAIRE';
export type EtatUsinage = 'EN_DEBIT' | 'PROGRAMME' | 'USINE';
export type FabricationType = 'FILIALE' | 'SOUS_TRAITANT' | 'LES_DEUX';
export type QuestionAvancement = 'NON_TRAITE' | 'EN_COURS_Q' | 'TERMINE';

export interface ApiDessinateur {
  id: string; nom: string; prenom: string; societe: string; isActive: boolean;
}
export interface ApiPlanIndice {
  id: string; planId: string; indice: string; dateIndice: string; commentaire?: string | null;
}
export interface ApiPlan {
  id: string; projectId: string; hk: string;
  numPhase?: string | null; numPhaseOF?: string | null; codeOF?: string | null;
  numPlan?: string | null;
  cart1?: string | null; cart2?: string | null; cart3?: string | null; cart4?: string | null;
  cart5?: string | null; cart6?: string | null; cart7?: string | null;
  dessinateurId?: string | null;
  fabricationType?: FabricationType | null;
  etatAvancement: EtatAvancement;
  datePrevisionnelle?: string | null;
  dateValidation?: string | null;
  numFiche?: string | null; dateFicheFab?: string | null;
  sousTraitance?: string | null;
  etatUsinage?: EtatUsinage | null;
  responsableMontage?: string | null;
  dateDepartAtelier?: string | null;
  paletisation?: string | null;
  dateLivraisonChantier?: string | null;
  commentaires?: string | null;
  dessinateur?: ApiDessinateur | null;
  indices: ApiPlanIndice[];
  project?: { id: string; code: string; label: string; color: string; workshopId?: string };
  createdAt: string;
}
export interface ApiPlanStats {
  total: number; dessines: number; valides: number;
  pctDessines: number; pctValides: number;
  byEtat: Record<string, number>;
  questions: Record<string, number>;
}
export interface ApiQuestionAttachment {
  id: string; questionId: string; filename: string; mimeType: string; size: number; path: string; createdAt: string;
}
export interface ApiQuestion {
  id: string; projectId: string; designation: string;
  zone?: string | null; question: string;
  auteur?: string | null; destinataire?: string | null;
  dateQuestion: string;
  reponse?: string | null; dateReponse?: string | null;
  avancement: QuestionAvancement;
  project?: { id: string; code: string; label: string; color: string };
  attachments?: ApiQuestionAttachment[];
  createdAt: string;
}

// ─── Subsidiaries ─────────────────────────────────────────────────────────────
export const api = {
  subsidiaries: {
    list: () => get<ApiSubsidiary[]>('/subsidiaries'),
    get: (id: string) => get<ApiSubsidiary>(`/subsidiaries/${id}`),
    create: (body: { code: string; name: string }) => post<ApiSubsidiary>('/subsidiaries', body),
    update: (id: string, body: Partial<{ code: string; name: string }>) => patch<ApiSubsidiary>(`/subsidiaries/${id}`, body),
    delete: (id: string) => del(`/subsidiaries/${id}`),
  },

  workshops: {
    list: (subsidiaryId?: string) => get<ApiWorkshop[]>(`/workshops${subsidiaryId ? `?subsidiaryId=${subsidiaryId}` : ''}`),
    create: (body: { subsidiaryId: string; code: string; name: string; themeColor?: string }) => post<ApiWorkshop>('/workshops', body),
    update: (id: string, body: Partial<{ code: string; name: string; themeColor: string }>) => patch<ApiWorkshop>(`/workshops/${id}`, body),
    delete: (id: string) => del(`/workshops/${id}`),
  },

  teams: {
    list: (workshopId?: string) => get<ApiTeam[]>(`/teams${workshopId ? `?workshopId=${workshopId}` : ''}`),
    create: (body: { workshopId: string; name: string }) => post<ApiTeam>('/teams', body),
    update: (id: string, body: Partial<{ name: string; isActive: boolean }>) => patch<ApiTeam>(`/teams/${id}`, body),
    delete: (id: string) => del(`/teams/${id}`),
  },

  employees: {
    list: (params: { subsidiaryId?: string; workshopId?: string; teamId?: string; unassigned?: boolean } = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
      ).toString();
      return get<ApiEmployee[]>(`/employees${q ? `?${q}` : ''}`);
    },
    create: (body: { subsidiaryId: string; workshopId?: string | null; teamId?: string | null; code: string; lastName: string; firstName: string }) =>
      post<ApiEmployee>('/employees', body),
    update: (id: string, body: Partial<{ subsidiaryId: string; workshopId: string | null; teamId: string | null; code: string; lastName: string; firstName: string; isActive: boolean }>) =>
      patch<ApiEmployee>(`/employees/${id}`, body),
    delete: (id: string) => del(`/employees/${id}`),
    bulkAssignWorkshop: (body: { employeeIds: string[]; workshopId: string }) =>
      post<{ updated: number; workshopId: string }>('/employees/bulk-assign-workshop', body),
    bulkAssignUnassigned: (body: { subsidiaryId: string; workshopId: string }) =>
      post<{ updated: number; workshopId: string }>('/employees/bulk-assign-unassigned', body),
  },

  projects: {
    list: (params: { workshopId?: string; isActive?: boolean } = {}) => {
      const q = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
      return get<ApiProject[]>(`/projects${q ? `?${q}` : ''}`);
    },
    get: (id: string) => get<ApiProject>(`/projects/${id}`),
    create: (body: Omit<ApiProject, 'id' | 'manufacturingOrders'>) => post<ApiProject>('/projects', body),
    update: (id: string, body: Partial<Omit<ApiProject, 'id' | 'manufacturingOrders'>>) => patch<ApiProject>(`/projects/${id}`, body),
    delete: (id: string) => del(`/projects/${id}`),
  },

  manufacturingOrders: {
    list: (params: { projectId?: string; workshopId?: string } = {}) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return get<ApiManufacturingOrder[]>(`/manufacturing-orders${q ? `?${q}` : ''}`);
    },
    create: (body: { projectId: string; code: string; label?: string }) => post<ApiManufacturingOrder>('/manufacturing-orders', body),
    update: (id: string, body: Partial<{ code: string; label: string }>) => patch<ApiManufacturingOrder>(`/manufacturing-orders/${id}`, body),
    delete: (id: string) => del(`/manufacturing-orders/${id}`),
  },

  assignments: {
    list: (params: { employeeId?: string; projectId?: string; workshopId?: string; dateFrom?: string; dateTo?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return get<ApiAssignment[]>(`/assignments${q ? `?${q}` : ''}`);
    },
    create: (body: {
      employeeId: string; projectId: string; date: string; slot: 'AM' | 'PM' | 'FULL';
      manufacturingOrderId?: string | null; timeSpentMinutes?: number | null; comment?: string | null;
    }) => post<ApiAssignment>('/assignments', body),
    bulk: (body: {
      employeeId: string; projectIds: string[]; date: string; slot: 'AM' | 'PM' | 'FULL';
      manufacturingOrderId?: string | null; timeSpentMinutes?: number | null; comment?: string | null;
    }) => post<ApiAssignment[]>('/assignments/bulk', body),
    update: (id: string, body: Partial<{ slot: string; timeSpentMinutes: number | null; comment: string | null }>) =>
      patch<ApiAssignment>(`/assignments/${id}`, body),
    delete: (id: string) => del(`/assignments/${id}`),
  },

  absences: {
    list: (params: { employeeId?: string; workshopId?: string; dateFrom?: string; dateTo?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return get<ApiAbsence[]>(`/absences${q ? `?${q}` : ''}`);
    },
    create: (body: { employeeId: string; date: string; slot?: 'AM' | 'PM' | 'FULL'; type: string; comment?: string | null }) =>
      post<ApiAbsence>('/absences', body),
    delete: (id: string) => del(`/absences/${id}`),
    deleteByEmployeeDate: (employeeId: string, date: string) =>
      del(`/absences?employeeId=${employeeId}&date=${date}`),
  },

  tasks: {
    list: (params: { employeeId?: string; projectId?: string; workshopId?: string; status?: string } = {}) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return get<ApiTask[]>(`/tasks${q ? `?${q}` : ''}`);
    },
    get: (id: string) => get<ApiTask>(`/tasks/${id}`),
    create: (body: { employeeId: string; projectId?: string | null; title: string; description?: string | null; dueDate?: string | null }) =>
      post<ApiTask>('/tasks', body),
    update: (id: string, body: Partial<{ title: string; description: string | null; dueDate: string | null; projectId: string | null }>) =>
      patch<ApiTask>(`/tasks/${id}`, body),
    respond: (id: string, body: { status: 'DONE' | 'NOT_DONE'; responseComment?: string | null }) =>
      patch<ApiTask>(`/tasks/${id}/respond`, body),
    delete: (id: string) => del(`/tasks/${id}`),
  },

  planning: {
    get: (params: { workshopId: string; dateFrom: string; dateTo: string; teamId?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return get<ApiPlanningPayload>(`/planning?${q}`);
    },
  },

  sync: {
    trigger: (triggeredBy?: string, delta = false) => {
      const params = new URLSearchParams();
      if (triggeredBy) params.set('triggeredBy', triggeredBy);
      if (delta) params.set('delta', '1');
      const qs = params.toString();
      return post<any>(`/sync/fabric${qs ? `?${qs}` : ''}`, {});
    },
    status: () => get<{ inProgress: boolean; last: ApiSyncLog | null; progress: ApiSyncProgress | null }>('/sync/status'),
    progress: () => get<{ inProgress: boolean; progress: ApiSyncProgress | null }>('/sync/progress'),
    history: (limit = 20) => get<ApiSyncLog[]>(`/sync/history?limit=${limit}`),
  },

  clients: {
    list: (params: { subsidiaryId?: string; search?: string } = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
      return get<ApiClient[]>(`/clients${q ? `?${q}` : ''}`);
    },
    get: (id: string) => get<ApiClient & { projects?: ApiProject[] }>(`/clients/${id}`),
  },

  affaires: {
    list: (params: { subsidiaryCode?: string; search?: string } = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
      return get<ApiAffaire[]>(`/affaires${q ? `?${q}` : ''}`);
    },
    get: (id: string) => get<ApiAffaire & { projects?: ApiProject[] }>(`/affaires/${id}`),
  },

  timeEntries: {
    list: (params: { employeeId?: string; projectId?: string; from?: string; to?: string; limit?: string } = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
      return get<ApiTimeEntry[]>(`/time-entries${q ? `?${q}` : ''}`);
    },
    summary: (params: { projectId?: string; employeeId?: string; from?: string; to?: string } = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
      return get<ApiTimeEntrySummary>(`/time-entries/summary${q ? `?${q}` : ''}`);
    },
  },

  plans: {
    list: (params: { projectId?: string; workshopId?: string; etatAvancement?: string } = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
      return get<ApiPlan[]>(`/plans${q ? `?${q}` : ''}`);
    },
    get: (id: string) => get<ApiPlan>(`/plans/${id}`),
    create: (body: { projectId: string; hk?: string; numPhase?: string; numPhaseOF?: string; codeOF?: string; numPlan?: string }) =>
      post<ApiPlan>('/plans', body),
    bulkCreate: (plans: Array<{ projectId: string; hk?: string; numPhase?: string; numPhaseOF?: string; codeOF?: string; numPlan?: string }>) =>
      post<ApiPlan[]>('/plans/bulk', { plans }),
    update: (id: string, body: Partial<ApiPlan>) => patch<ApiPlan>(`/plans/${id}`, body),
    delete: (id: string) => del(`/plans/${id}`),
    stats: (projectId: string) => get<ApiPlanStats>(`/plans/stats/${projectId}`),
    addIndice: (planId: string, body: { indice: string; dateIndice: string; commentaire?: string }) =>
      post<ApiPlanIndice>(`/plans/${planId}/indices`, body),
    deleteIndice: (indiceId: string) => del(`/plan-indices/${indiceId}`),
  },

  dessinateurs: {
    list: (all = false) => get<ApiDessinateur[]>(`/dessinateurs${all ? '?all=true' : ''}`),
    create: (body: { nom: string; prenom: string; societe: string }) => post<ApiDessinateur>('/dessinateurs', body),
    update: (id: string, body: Partial<{ nom: string; prenom: string; societe: string; isActive: boolean }>) =>
      patch<ApiDessinateur>(`/dessinateurs/${id}`, body),
    toggle: (id: string) => patch<ApiDessinateur>(`/dessinateurs/${id}/toggle`, {}),
    delete: (id: string) => del(`/dessinateurs/${id}`),
  },

  questions: {
    list: (params: { projectId?: string; workshopId?: string; avancement?: string } = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
      return get<ApiQuestion[]>(`/questions${q ? `?${q}` : ''}`);
    },
    create: (body: { projectId: string; designation: string; question: string; zone?: string; auteur?: string; destinataire?: string }) =>
      post<ApiQuestion>('/questions', body),
    update: (id: string, body: Partial<{ designation: string; question: string; reponse: string; dateReponse: string; avancement: QuestionAvancement }>) =>
      patch<ApiQuestion>(`/questions/${id}`, body),
    delete: (id: string) => del(`/questions/${id}`),
    uploadAttachments: async (questionId: string, files: File[]): Promise<ApiQuestionAttachment[]> => {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const token = sessionStorage.getItem('api_token') || localStorage.getItem('api_token') || '';
      const res = await fetch(`${BASE}/questions/${questionId}/attachments`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    deleteAttachment: (id: string) => del(`/attachments/${id}`),
  },

  backups: {
    list: () => get<{ file: string; sizeBytes: number; date: string }[]>('/backups'),
    create: () => post<{ ok: boolean; file: string; sizeBytes: number }>('/backup', {}),
    restore: (file: string, password: string) => post<{ ok: boolean; message: string }>('/backups/restore', { file, password }),
  },

  calendar: {
    list: (params: { from?: string; to?: string; year?: string } = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
      return get<ApiCalendarDay[]>(`/calendar${q ? `?${q}` : ''}`);
    },
    holidays: (year?: number) => get<ApiCalendarDay[]>(`/calendar/holidays${year ? `?year=${year}` : ''}`),
    schedules: (subsidiaryId?: string) =>
      get<ApiSubsidiarySchedule[]>(`/subsidiary-schedules${subsidiaryId ? `?subsidiaryId=${subsidiaryId}` : ''}`),
  },
};
