import { useState, useMemo, useCallback, useEffect, type MouseEvent } from 'react';
import { AbsenceType, SlotType } from '@/types/planning';
import { usePlanningData } from '@/hooks/usePlanningData';
import { useDateNavigation } from '@/hooks/useDateNavigation';
import { SubsidiarySelector } from '@/components/planning/SubsidiarySelector';
import { WorkshopSelector } from '@/components/planning/WorkshopSelector';
import { WeekNavigator } from '@/components/planning/WeekNavigator';
import { PlanningGrid, HolidayInfo } from '@/components/planning/PlanningGrid';
import { YearPlanningGrid } from '@/components/planning/YearPlanningGrid';
import { api, isApiEnabled } from '@/lib/api';
import { AssignmentModal } from '@/components/planning/AssignmentModal';
import { CommandPalette } from '@/components/planning/CommandPalette';
import { BulkActionBar } from '@/components/planning/BulkActionBar';
import { DensitySelector } from '@/components/planning/DensitySelector';
import { ContextMenu, ContextMenuAction } from '@/components/planning/ContextMenu';
import { ActivityLog, ActivityEntry } from '@/components/planning/ActivityLog';
import { ChangeRequestPanel } from '@/components/planning/ChangeRequestPanel';
import { TaskResponseDialog } from '@/components/planning/TaskResponseDialog';
import { DensityMode } from '@/components/planning/DayCell';
import { formatDate } from '@/lib/dateUtils';
import { exportToExcel, exportToPDF, duplicateWeekPlanning } from '@/lib/exportUtils';
import { HardHat, Users, FileSpreadsheet, FileText, Copy, Settings, Search, Undo2, Redo2, CheckSquare, BarChart3, Calendar, Clock, ClipboardCheck, Building2, Activity, Printer, CopyMinus, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { subWeeks, addDays, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export const PlanningPage = () => {
  const planningData = usePlanningData();
  const {
    subsidiaries,
    workshopsForSubsidiary,
    selectedSubsidiaryId,
    setSelectedSubsidiaryId,
    selectedWorkshopId,
    setSelectedWorkshopId,
    validationMode,
    setValidationMode,
    changeRequests,
    createChangeRequest,
    approveChangeRequest,
    rejectChangeRequest,
    manufacturingOrders,

    teams, selectedTeamId, setSelectedTeamId, selectedTeam, teamPeople,
    activeProjects, people, getPlanningData, addMultipleAssignments,
    removeAssignment, addAbsence, removeAbsence, hasAbsence,
    assignments, absences, setAssignments, setAbsences,
    tasks, addTask, respondToTask, removeTask,
    loadPeriod,
    isLoading,
  } = planningData;

  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const {
    currentDate, viewType, setViewType,
    goToPreviousPeriod, goToNextPeriod, goToToday,
    visibleDays, periodLabel, weekStart,
  } = useDateNavigation();

  const { saveSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(
    assignments, absences, setAssignments, setAbsences
  );

  useEffect(() => {
    if (!selectedWorkshopId || !weekStart) return;
    let dateFrom: string;
    let dateTo: string;
    if (viewType === 'year') {
      dateFrom = `${currentDate.getFullYear()}-01-01`;
      dateTo = `${currentDate.getFullYear()}-12-31`;
    } else if (viewType === 'month') {
      const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      dateFrom = format(first, 'yyyy-MM-dd');
      dateTo = format(last, 'yyyy-MM-dd');
    } else {
      dateFrom = format(weekStart, 'yyyy-MM-dd');
      dateTo = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    }
    loadPeriod(selectedWorkshopId, dateFrom, dateTo);
  }, [selectedWorkshopId, weekStart, viewType, currentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch calendar/holidays for visible period
  useEffect(() => {
    if (!weekStart || !isApiEnabled()) return;
    let from: string;
    let to: string;
    if (viewType === 'year') {
      from = `${currentDate.getFullYear()}-01-01`;
      to = `${currentDate.getFullYear()}-12-31`;
    } else if (viewType === 'month') {
      from = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 'yyyy-MM-dd');
      to = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), 'yyyy-MM-dd');
    } else {
      from = format(weekStart, 'yyyy-MM-dd');
      to = format(addDays(weekStart, 13), 'yyyy-MM-dd');
    }
    api.calendar.list({ from, to })
      .then(days => {
        const map: Record<string, HolidayInfo> = {};
        for (const d of days) {
          const dateStr = d.date.slice(0, 10);
          if (d.isHoliday || !d.isWorkDay) {
            map[dateStr] = { name: d.holidayName || 'Férié', isWorkDay: d.isWorkDay };
          }
        }
        setHolidays(map);
      })
      .catch(() => setHolidays({}));
  }, [weekStart]);

  const [density, setDensity] = useState<DensityMode>('comfort');
  const [cellWidth, setCellWidth] = useState(130);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [changeRequestPanelOpen, setChangeRequestPanelOpen] = useState(false);
  const [taskResponseDialog, setTaskResponseDialog] = useState<{ task: import('@/types/planning').Task } | null>(null);
  const [showOccupancy, setShowOccupancy] = useState(false);
  const [holidays, setHolidays] = useState<Record<string, HolidayInfo>>({});

  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    personId: string;
    personName: string;
    date: string;
    defaultSlot: SlotType;
  }>({ isOpen: false, personId: '', personName: '', date: '', defaultSlot: 'FULL' });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    personId: string;
    date: string;
  }>({ isOpen: false, x: 0, y: 0, personId: '', date: '' });

  const addActivity = useCallback((action: string, detail: string, personName?: string) => {
    setActivityEntries(prev => [{
      id: crypto.randomUUID(),
      action,
      detail,
      timestamp: new Date(),
      personName,
    }, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const gridData = useMemo(() => getPlanningData(visibleDays), [getPlanningData, visibleDays]);

  const pendingChangeRequestsCount = useMemo(
    () => changeRequests.filter(r => r.status === 'PENDING').length,
    [changeRequests]
  );

  const handleCellClick = (personId: string, date: string, slot: SlotType = 'FULL') => {
    const person = teamPeople.find(p => p.id === personId);
    if (!person) return;

    if (hasAbsence(personId, date)) {
      toast.info('Cette journée est marquée comme absence');
      return;
    }

    setAssignmentModal({ isOpen: true, personId, personName: person.display_name, date, defaultSlot: slot });
  };

  const handleCellContextMenu = useCallback((personId: string, date: string, e: MouseEvent) => {
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, personId, date });
  }, []);

  const handleContextMenuAction = useCallback((action: ContextMenuAction) => {
    const person = people.find(p => p.id === contextMenu.personId);
    const personName = person?.display_name;

    if (action.type === 'delete' && action.assignmentId) {
      if (validationMode) {
        createChangeRequest({ kind: 'REMOVE_ASSIGNMENT', payload: { assignmentId: action.assignmentId } });
        addActivity('Validation', 'Suppression affectation demandée', personName);
        toast.info('Demande de suppression envoyée');
      } else {
        saveSnapshot('Suppression affectation');
        removeAssignment(action.assignmentId);
        addActivity('Suppression', 'Affectation supprimée', personName);
        toast.success('Affectation supprimée');
      }
    } else if (action.type === 'delete' && action.absenceId) {
      if (validationMode) {
        createChangeRequest({ kind: 'REMOVE_ABSENCE', payload: { absenceId: action.absenceId } });
        addActivity('Validation', 'Suppression absence demandée', personName);
        toast.info('Demande de suppression envoyée');
      } else {
        saveSnapshot('Suppression absence');
        removeAbsence(action.absenceId);
        addActivity('Suppression', 'Absence supprimée', personName);
        toast.success('Absence supprimée');
      }
    } else if (action.type === 'duplicate-tomorrow' && action.assignmentId) {
      const assignment = assignments.find(a => a.id === action.assignmentId);
      if (assignment) {
        const tomorrow = format(addDays(new Date(contextMenu.date), 1), 'yyyy-MM-dd');
        if (validationMode) {
          createChangeRequest({
            kind: 'ADD_ASSIGNMENTS',
            payload: {
              personId: contextMenu.personId,
              projectIds: [assignment.project_id],
              date: tomorrow,
              comment: assignment.comment || '',
              manufacturingOrderId: assignment.manufacturing_order_id ?? null,
              slot: assignment.slot,
            }
          });
          addActivity('Validation', `${assignment.project?.code} → demain (demande)`, personName);
          toast.info('Demande de duplication envoyée');
        } else {
          saveSnapshot('Duplication demain');
          addMultipleAssignments(contextMenu.personId, [assignment.project_id], tomorrow, assignment.comment || undefined, assignment.manufacturing_order_id ?? null, assignment.slot);
          addActivity('Duplication', `${assignment.project?.code} → demain`, personName);
          toast.success('Affectation dupliquée sur demain');
        }
      }
    } else if (action.type === 'duplicate-week' && action.assignmentId) {
      const assignment = assignments.find(a => a.id === action.assignmentId);
      if (assignment) {
        const ws = startOfWeek(new Date(contextMenu.date), { weekStartsOn: 1 });
        if (validationMode) {
          for (let i = 0; i < 5; i++) {
            const d = format(addDays(ws, i), 'yyyy-MM-dd');
            if (d !== contextMenu.date) {
              createChangeRequest({
                kind: 'ADD_ASSIGNMENTS',
                payload: {
                  personId: contextMenu.personId,
                  projectIds: [assignment.project_id],
                  date: d,
                  comment: assignment.comment || '',
                  manufacturingOrderId: assignment.manufacturing_order_id ?? null,
                  slot: assignment.slot,
                }
              });
            }
          }
          addActivity('Validation', `${assignment.project?.code} → lun-ven (demande)`, personName);
          toast.info('Demandes de duplication envoyées');
        } else {
          saveSnapshot('Duplication semaine');
          for (let i = 0; i < 5; i++) {
            const d = format(addDays(ws, i), 'yyyy-MM-dd');
            if (d !== contextMenu.date) {
              addMultipleAssignments(contextMenu.personId, [assignment.project_id], d, assignment.comment || undefined, assignment.manufacturing_order_id ?? null, assignment.slot);
            }
          }
          addActivity('Duplication semaine', `${assignment.project?.code} → lun-ven`, personName);
          toast.success('Affectation dupliquée sur la semaine');
        }
      }
    } else if (action.type === 'repeat-weekdays' && action.assignmentId) {
      const assignment = assignments.find(a => a.id === action.assignmentId);
      if (assignment) {
        const ws = startOfWeek(new Date(contextMenu.date), { weekStartsOn: 1 });
        if (validationMode) {
          for (let i = 0; i < 5; i++) {
            const d = format(addDays(ws, i), 'yyyy-MM-dd');
            if (d !== contextMenu.date) {
              createChangeRequest({
                kind: 'ADD_ASSIGNMENTS',
                payload: {
                  personId: contextMenu.personId,
                  projectIds: [assignment.project_id],
                  date: d,
                  comment: assignment.comment || '',
                  manufacturingOrderId: assignment.manufacturing_order_id ?? null,
                  slot: assignment.slot,
                }
              });
            }
          }
          addActivity('Validation', `${assignment.project?.code} → lun-ven (demande)`, personName);
          toast.info('Demandes envoyées');
        } else {
          saveSnapshot('Répétition lun-ven');
          for (let i = 0; i < 5; i++) {
            const d = format(addDays(ws, i), 'yyyy-MM-dd');
            if (d !== contextMenu.date) {
              addMultipleAssignments(contextMenu.personId, [assignment.project_id], d, assignment.comment || undefined, assignment.manufacturing_order_id ?? null, assignment.slot);
            }
          }
          addActivity('Répétition', `${assignment.project?.code} → lun-ven`, personName);
          toast.success('Chantier répété du lundi au vendredi');
        }
      }
    } else if (action.type === 'convert-absence') {
      handleCellClick(contextMenu.personId, contextMenu.date);
    }
  }, [contextMenu, assignments, people, saveSnapshot, removeAssignment, removeAbsence, addMultipleAssignments, addActivity, validationMode, createChangeRequest]);

  const handleTaskCreate = useCallback((personId: string, params: { title: string; description?: string | null; dueDate?: string | null; projectId?: string | null }) => {
    addTask({ personId, ...params });
    const person = people.find(p => p.id === personId);
    addActivity('Tâche', `"${params.title}" créée pour ${person?.display_name || ''}`, person?.display_name);
    toast.success('Tâche créée');
  }, [addTask, people]);

  const handleTaskRespond = useCallback((taskId: string, status: 'DONE' | 'NOT_DONE', comment?: string | null) => {
    respondToTask(taskId, status, comment);
    toast.success(status === 'DONE' ? 'Tâche marquée terminée ✓' : 'Tâche marquée non terminée');
  }, [respondToTask]);

  const handleAssignmentSubmit = (projectIds: string[], comment: string, manufacturingOrderId?: string | null, slot?: SlotType, timeSpentMinutes?: number | null, dateEnd?: string | null, dateStart?: string) => {
    const person = people.find(p => p.id === assignmentModal.personId);
    const effectiveSlot = slot ?? assignmentModal.defaultSlot;

    const startDate = new Date(dateStart || assignmentModal.date);
    const endDate = dateEnd ? new Date(dateEnd) : startDate;
    const days: string[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) days.push(format(cur, 'yyyy-MM-dd'));
      cur.setDate(cur.getDate() + 1);
    }

    if (validationMode) {
      for (const d of days) {
        createChangeRequest({
          kind: 'ADD_ASSIGNMENTS',
          payload: {
            personId: assignmentModal.personId,
            projectIds,
            date: d,
            comment,
            manufacturingOrderId: manufacturingOrderId ?? null,
            slot: effectiveSlot,
            timeSpentMinutes: timeSpentMinutes ?? null,
          }
        });
      }
      addActivity('Validation', `${projectIds.length} chantier(s) × ${days.length} jour(s) demandé(s)`, person?.display_name);
      toast.info(`${days.length} jour(s) de demande envoyés`);
      return;
    }

    saveSnapshot(`Affectation ${projectIds.length} chantier(s) × ${days.length} jour(s)`);
    for (const d of days) {
      addMultipleAssignments(assignmentModal.personId, projectIds, d, comment, manufacturingOrderId, effectiveSlot, timeSpentMinutes);
    }
    addActivity('Affectation', `${projectIds.length} chantier(s) sur ${days.length} jour(s)`, person?.display_name);
    toast.success(`${projectIds.length * days.length} affectation(s) ajoutée(s) sur ${days.length} jour(s)`);
  };

  const handleAbsenceFromModal = (type: AbsenceType, comment: string, slot?: SlotType) => {
    const person = people.find(p => p.id === assignmentModal.personId);
    const effectiveSlot = slot ?? assignmentModal.defaultSlot;

    if (validationMode) {
      createChangeRequest({
        kind: 'ADD_ABSENCE',
        payload: {
          personId: assignmentModal.personId,
          date: assignmentModal.date,
          type,
          comment,
          slot: effectiveSlot,
        }
      });
      addActivity('Validation', `Absence ${type} demandée`, person?.display_name);
      toast.info('Demande envoyée');
      return;
    }

    saveSnapshot('Ajout absence');
    addAbsence(assignmentModal.personId, assignmentModal.date, type, comment, effectiveSlot);
    addActivity('Absence', `${type} ajoutée`, person?.display_name);
    toast.success('Absence ajoutée');
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    if (validationMode) {
      createChangeRequest({ kind: 'REMOVE_ASSIGNMENT', payload: { assignmentId } });
      addActivity('Validation', 'Suppression affectation demandée');
      toast.info('Demande envoyée');
      return;
    }

    saveSnapshot('Suppression affectation');
    removeAssignment(assignmentId);
    addActivity('Suppression', 'Affectation supprimée');
    toast.success('Affectation supprimée');
  };

  const handleDropAssignment = useCallback((assignmentId: string, targetDate: string, targetSlot: SlotType) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    if (assignment.date === targetDate && (assignment.slot || 'FULL') === targetSlot) return; // same spot

    saveSnapshot('Déplacement affectation');
    // Remove old
    removeAssignment(assignmentId);
    // Create new at target date/slot
    addMultipleAssignments(
      assignment.person_id,
      [assignment.project_id],
      targetDate,
      assignment.comment || undefined,
      assignment.manufacturing_order_id ?? undefined,
      targetSlot,
      assignment.time_spent_minutes,
    );
    const person = people.find(p => p.id === assignment.person_id);
    addActivity('Déplacement', `${assignment.project?.code || '?'} → ${targetDate}`, person?.display_name);
    toast.success('Affectation déplacée');
  }, [assignments, removeAssignment, addMultipleAssignments, saveSnapshot, people, addActivity]);

  const handleResizeAssignment = useCallback((data: { personId: string; projectId: string; fromDate: string; toDate: string; slot: string; comment: string; moId: string }) => {
    const { personId, projectId, fromDate, toDate, slot, comment, moId } = data;
    if (fromDate === toDate) return; // no extension

    // Generate all weekdays between fromDate+1 and toDate (inclusive)
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to <= from) return; // only extend forward

    saveSnapshot('Extension affectation');
    const current = new Date(from);
    current.setDate(current.getDate() + 1); // start from day after original
    let created = 0;
    while (current <= to) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) { // skip weekends
        const dateStr = current.toISOString().split('T')[0];
        addMultipleAssignments(
          personId,
          [projectId],
          dateStr,
          comment || undefined,
          moId || undefined,
          (slot as SlotType) || 'FULL',
        );
        created++;
      }
      current.setDate(current.getDate() + 1);
    }
    const person = people.find(p => p.id === personId);
    const project = activeProjects.find(p => p.id === projectId);
    addActivity('Extension', `${project?.code || '?'} étendu +${created}j`, person?.display_name);
    toast.success(`Affectation étendue sur ${created} jour(s)`);
  }, [addMultipleAssignments, saveSnapshot, people, activeProjects, addActivity]);

  const handleToggleSelectPerson = useCallback((personId: string) => {
    setSelectedPersonIds(prev => 
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  }, []);

  const handleBulkAssign = (projectId: string, date: string) => {
    if (validationMode) {
      createChangeRequest({ kind: 'BULK_ADD_ASSIGNMENTS', payload: { personIds: selectedPersonIds, projectId, date } });
      addActivity('Validation', `Affectation en masse demandée (${selectedPersonIds.length})`);
      toast.info('Demande envoyée');
    } else {
      saveSnapshot('Affectation en masse');
      selectedPersonIds.forEach(personId => {
        addMultipleAssignments(personId, [projectId], date);
      });
      addActivity('Affectation en masse', `${selectedPersonIds.length} personne(s)`);
      toast.success(`Chantier affecté à ${selectedPersonIds.length} personne(s)`);
    }
    setSelectedPersonIds([]);
    setShowCheckboxes(false);
  };

  const handleBulkAbsence = (type: AbsenceType, date: string) => {
    if (validationMode) {
      createChangeRequest({ kind: 'BULK_ADD_ABSENCES', payload: { personIds: selectedPersonIds, type, date } });
      addActivity('Validation', `Absence en masse demandée (${selectedPersonIds.length})`);
      toast.info('Demande envoyée');
    } else {
      saveSnapshot('Absence en masse');
      selectedPersonIds.forEach(personId => {
        addAbsence(personId, date, type);
      });
      addActivity('Absence en masse', `${type} pour ${selectedPersonIds.length} personne(s)`);
      toast.success(`Absence ajoutée pour ${selectedPersonIds.length} personne(s)`);
    }
    setSelectedPersonIds([]);
    setShowCheckboxes(false);
  };

  const handleExportExcel = () => {
    exportToExcel(gridData, visibleDays, selectedTeam?.name || 'Équipe', periodLabel);
    addActivity('Export', 'Export Excel');
    toast.success('Export Excel téléchargé');
  };

  const handleExportPDF = () => {
    exportToPDF(gridData, visibleDays, selectedTeam?.name || 'Équipe', periodLabel);
    addActivity('Export', 'Export PDF');
    toast.success('Export PDF téléchargé');
  };

  const handleDuplicateWeek = () => {
    const previousWeekStart = subWeeks(weekStart, 1);
    const teamPeopleIds = teamPeople.map(p => p.id);
    const newAssignments = duplicateWeekPlanning(assignments, previousWeekStart, weekStart, teamPeopleIds);
    
    if (newAssignments.length === 0) {
      toast.info('Aucune affectation à dupliquer');
      return;
    }
    
    if (validationMode) {
      newAssignments.forEach(a => {
        createChangeRequest({
          kind: 'ADD_ASSIGNMENTS',
          payload: {
            personId: a.person_id,
            projectIds: [a.project_id],
            date: a.date,
            comment: a.comment || '',
            manufacturingOrderId: a.manufacturing_order_id ?? null,
          }
        });
      });
      addActivity('Validation', `${newAssignments.length} affectation(s) demandée(s) depuis sem. précédente`);
      toast.info('Demandes envoyées');
    } else {
      saveSnapshot('Duplication semaine');
      newAssignments.forEach(a => {
        addMultipleAssignments(a.person_id, [a.project_id], a.date, a.comment || undefined, a.manufacturing_order_id ?? null);
      });
      addActivity('Duplication', `${newAssignments.length} affectation(s) dupliquée(s) depuis sem. précédente`);
      toast.success(`${newAssignments.length} affectation(s) dupliquée(s)`);
    }
  };

  const kpis = useMemo(() => {
    let totalAbsent = 0;
    let totalDaysFilled = 0;

    gridData.forEach(pd => {
      visibleDays.forEach(date => {
        const dateStr = formatDate(date);
        const dayData = pd.days[dateStr];
        if (!dayData) return;
        if (dayData.absence) totalAbsent++;
        if (dayData.assignments.length > 0) totalDaysFilled++;
      });
    });

    return { totalDaysFilled, totalAbsent };
  }, [gridData, visibleDays]);

  const occupancyData = useMemo(() => {
    const workDays = visibleDays.filter(d => { const dow = d.getDay(); return dow !== 0 && dow !== 6; });
    return gridData.map(pd => {
      let filled = 0; let absent = 0;
      workDays.forEach(d => {
        const dd = pd.days[formatDate(d)];
        if (!dd) return;
        if (dd.absence) absent++;
        else if (dd.assignments.length > 0) filled++;
      });
      const free = workDays.length - filled - absent;
      const pct = workDays.length > 0 ? Math.round((filled / workDays.length) * 100) : 0;
      return { person: pd.person, filled, absent, free, total: workDays.length, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [gridData, visibleDays]);

  // Get context menu data
  const contextMenuData = useMemo(() => {
    if (!contextMenu.isOpen) return { assignments: [], absence: null };
    const personData = gridData.find(d => d.person.id === contextMenu.personId);
    const dayData = personData?.days[contextMenu.date];
    return {
      assignments: dayData?.assignments || [],
      absence: dayData?.absence || null,
    };
  }, [contextMenu, gridData]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link to="/" className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
                <HardHat className="w-4 h-4 text-primary-foreground" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground">Planning prévisionnel</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedTeam?.name || 'Sélectionnez une équipe'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-muted-foreground 
                           rounded-lg hover:bg-secondary/80 transition-colors text-sm"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Rechercher</span>
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono 
                               bg-muted rounded border border-border">⌘K</kbd>
              </button>

              <SubsidiarySelector
                subsidiaries={subsidiaries}
                selectedSubsidiaryId={selectedSubsidiaryId}
                onSelectSubsidiary={setSelectedSubsidiaryId}
              />

              <WorkshopSelector
                workshops={workshopsForSubsidiary}
                selectedWorkshopId={selectedWorkshopId}
                onSelectWorkshop={setSelectedWorkshopId}
              />

              
              <div className="hidden md:flex items-center gap-1 border-l border-border pl-2 ml-1">
                <button
                  onClick={() => setChangeRequestPanelOpen(true)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors relative"
                  title="Validations"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {pendingChangeRequestsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-warning text-warning-foreground 
                                     text-[8px] font-bold rounded-full flex items-center justify-center">
                      {pendingChangeRequestsCount > 9 ? '9+' : pendingChangeRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActivityLogOpen(true)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors relative"
                  title="Historique des modifications"
                >
                  <Clock className="w-4 h-4" />
                  {activityEntries.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground 
                                     text-[8px] font-bold rounded-full flex items-center justify-center">
                      {activityEntries.length > 9 ? '9+' : activityEntries.length}
                    </span>
                  )}
                </button>
                <Link
                  to="/chantier"
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  title="Vue Chantier"
                >
                  <Building2 className="w-4 h-4" />
                </Link>
                <Link
                  to="/gantt"
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  title="Vue Gantt"
                >
                  <BarChart3 className="w-4 h-4" />
                </Link>
                <Link
                  to="/person-calendar"
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  title="Calendrier personnel"
                >
                  <Calendar className="w-4 h-4" />
                </Link>
                <Link
                  to="/admin/teams"
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  title="Administration"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          <WeekNavigator
            periodLabel={periodLabel}
            viewType={viewType}
            onViewTypeChange={setViewType}
            onPrevious={goToPreviousPeriod}
            onNext={goToNextPeriod}
            onToday={goToToday}
          />
        </div>
      </header>

      <main className="w-full px-4 py-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => { undo(); toast.info('Action annulée'); }}
              disabled={!canUndo}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors disabled:opacity-30"
              title="Annuler (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { redo(); toast.info('Action rétablie'); }}
              disabled={!canRedo}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors disabled:opacity-30"
              title="Rétablir (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-border" />

          <button
            onClick={() => { setShowCheckboxes(!showCheckboxes); if (showCheckboxes) setSelectedPersonIds([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                       ${showCheckboxes ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Sélection</span>
          </button>

          <button
            onClick={handleDuplicateWeek}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground 
                       rounded-lg hover:bg-secondary/80 transition-colors text-sm"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Dupliquer sem.</span>
          </button>

          <div className="h-5 w-px bg-border" />

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success 
                       rounded-lg hover:bg-success/20 transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive 
                       rounded-lg hover:bg-destructive/20 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground 
                       rounded-lg hover:bg-secondary/80 transition-colors text-sm"
            title="Imprimer le planning"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Switch
              id="validation-mode"
              checked={validationMode}
              onCheckedChange={setValidationMode}
            />
            <Label htmlFor="validation-mode" className="text-xs text-muted-foreground">
              Mode validation
            </Label>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {teamPeople.length} pers.
            </span>
            <span className="text-border">•</span>
            <span>{kpis.totalDaysFilled} jours remplis</span>
            <span className="text-border">•</span>
            <span>{kpis.totalAbsent} absences</span>
          </div>

          <button
            onClick={() => setShowOccupancy(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors
                       ${showOccupancy ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
            title="Vue occupé/libre"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Taux</span>
          </button>

          <DensitySelector density={density} onChange={setDensity} />

          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setCellWidth(w => Math.max(80, w - 20))}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors disabled:opacity-30"
              title="Réduire les colonnes"
              disabled={cellWidth <= 80}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCellWidth(w => Math.min(220, w + 20))}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors disabled:opacity-30"
              title="Agrandir les colonnes"
              disabled={cellWidth >= 220}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Occupancy panel */}
        <AnimatePresence>
          {showOccupancy && occupancyData.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border bg-muted/20">
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Occupation semaine — {occupancyData.length} personne(s)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {occupancyData.map(({ person, filled, absent, free, total, pct }) => (
                    <div key={person.id} className="bg-card border border-border rounded-lg px-3 py-2">
                      <div className="text-xs font-medium text-foreground truncate mb-1">{person.display_name}</div>
                      <div className="flex h-1.5 rounded-full overflow-hidden mb-1">
                        <div className="bg-primary" style={{ width: `${(filled/total)*100}%` }} />
                        <div className="bg-destructive/50" style={{ width: `${(absent/total)*100}%` }} />
                        <div className="bg-muted" style={{ width: `${(free/total)*100}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="text-primary font-medium">{pct}%</span>
                        <span>{filled}j / {free}j libre{free > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading / empty state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Chargement des données…</p>
          </div>
        )}
        {!isLoading && teamPeople.length === 0 && selectedWorkshopId && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Users className="w-12 h-12 opacity-20" />
            <p className="text-base font-medium">Aucun membre dans cet atelier</p>
            <p className="text-sm">Ajoutez des personnes via <span className="font-medium text-foreground">Admin → Gérer les ateliers</span></p>
            <Link to="/admin/teams" className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Gérer les ateliers
            </Link>
          </div>
        )}
        {!isLoading && !selectedWorkshopId && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Users className="w-12 h-12 opacity-20" />
            <p className="text-base font-medium">Sélectionnez un atelier pour commencer</p>
            <p className="text-sm">Choisissez une filiale et un atelier dans le menu du haut</p>
          </div>
        )}
        {/* Grid */}
        {!isLoading && teamPeople.length > 0 && viewType === 'year' && (
          <YearPlanningGrid
            people={teamPeople}
            assignments={assignments}
            absences={absences}
            year={currentDate.getFullYear()}
            holidays={holidays}
          />
        )}
        {!isLoading && teamPeople.length > 0 && viewType !== 'year' && <PlanningGrid
          data={gridData}
          dates={visibleDays}
          onCellClick={isAdmin ? (personId, date, slot) => handleCellClick(personId, date, slot) : () => {}}
          onRemoveAssignment={isAdmin ? handleRemoveAssignment : () => {}}
          onCellContextMenu={isAdmin ? handleCellContextMenu : undefined}
          onTaskClick={(_personId, task) => setTaskResponseDialog({ task })}
          density={density}
          selectedPersonIds={selectedPersonIds}
          onToggleSelectPerson={isAdmin ? handleToggleSelectPerson : () => {}}
          showCheckboxes={isAdmin && showCheckboxes}
          holidays={holidays}
          onDropAssignment={isAdmin ? handleDropAssignment : undefined}
          onResizeAssignment={isAdmin ? handleResizeAssignment : undefined}
          enableDrag={isAdmin}
          cellWidth={cellWidth}
        />}

        {/* Legend */}
        <div className="mt-4 p-3 bg-card border border-border rounded-xl">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="text-muted-foreground font-medium">Légende :</span>
            <div className="flex items-center gap-1.5">
              <span className="absence-badge bg-absence-cp text-[10px]">🏖️ CP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="absence-badge bg-absence-rtt text-[10px]">🕐 RTT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="absence-badge bg-absence-maladie text-[10px]">🏥 Mal.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="absence-badge bg-absence-formation text-[10px]">📚 Form.</span>
            </div>
            <div className="flex-1" />
            <span className="text-muted-foreground">
              💡 <strong>Clic droit</strong> sur une cellule pour les actions rapides
            </span>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleAssignmentSubmit}
        onAbsenceSubmit={handleAbsenceFromModal}
        onTaskSubmit={params => handleTaskCreate(assignmentModal.personId, params)}
        projects={activeProjects.filter(p => !selectedWorkshopId || (p as any).workshop_id === selectedWorkshopId)}
        manufacturingOrders={manufacturingOrders}
        personName={assignmentModal.personName}
        date={assignmentModal.date}
        defaultSlot={assignmentModal.defaultSlot}
      />

      {taskResponseDialog && (
        <TaskResponseDialog
          task={taskResponseDialog.task}
          onRespond={handleTaskRespond}
          onDelete={removeTask}
          onClose={() => setTaskResponseDialog(null)}
        />
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        projects={activeProjects}
        people={people}
        teams={teams}
        onNavigateToPerson={(id) => navigate(`/person-calendar?personId=${id}`)}
        onNavigateToProject={() => navigate(`/gantt`)}
        onNavigateToTeam={(id) => { setSelectedTeamId(id); toast.success('Atelier sélectionné'); }}
      />

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onAction={handleContextMenuAction}
        assignments={contextMenuData.assignments}
        absence={contextMenuData.absence}
        personId={contextMenu.personId}
        date={contextMenu.date}
      />

      {/* Activity Log */}
      <ActivityLog
        entries={activityEntries}
        isOpen={activityLogOpen}
        onClose={() => setActivityLogOpen(false)}
      />

      <ChangeRequestPanel
        isOpen={changeRequestPanelOpen}
        onClose={() => setChangeRequestPanelOpen(false)}
        requests={changeRequests}
        projects={activeProjects}
        manufacturingOrders={manufacturingOrders}
        people={people}
        onApprove={approveChangeRequest}
        onReject={rejectChangeRequest}
      />

      <AnimatePresence>
        {selectedPersonIds.length > 0 && (
          <BulkActionBar
            selectedCount={selectedPersonIds.length}
            onClearSelection={() => { setSelectedPersonIds([]); setShowCheckboxes(false); }}
            onBulkAssign={handleBulkAssign}
            onBulkAbsence={handleBulkAbsence}
            projects={activeProjects}
            visibleDates={visibleDays}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
