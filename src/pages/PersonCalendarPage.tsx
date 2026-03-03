import { useMemo, useState, useEffect, useCallback } from 'react';
import { api, isApiEnabled } from '@/lib/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { usePlanningData } from '@/hooks/usePlanningData';
import { toCalendarEvents } from '@/lib/planningUtils';
import { PersonSelector } from '@/components/planning/PersonSelector';
import { TeamSelector } from '@/components/planning/TeamSelector';
import { SubsidiarySelector } from '@/components/planning/SubsidiarySelector';
import { WorkshopSelector } from '@/components/planning/WorkshopSelector';
import { Calendar, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const PersonCalendarPage = () => {
  const {
    subsidiaries,
    workshopsForSubsidiary,
    selectedSubsidiaryId,
    setSelectedSubsidiaryId,
    selectedWorkshopId,
    setSelectedWorkshopId,
    teams,
    people,
    selectedTeamId,
    setSelectedTeamId,
    selectedTeam,
    teamPeople,
    getPersonData,
  } = usePlanningData();

  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    teamPeople[0]?.id || ''
  );
  const [apiEvents, setApiEvents] = useState<ReturnType<typeof toCalendarEvents>>([]);
  const [loadingPerson, setLoadingPerson] = useState(false);

  useEffect(() => {
    if (teamPeople.length > 0 && !teamPeople.find(p => p.id === selectedPersonId)) {
      setSelectedPersonId(teamPeople[0].id);
    }
  }, [teamPeople, selectedPersonId]);

  useEffect(() => {
    if (!selectedPersonId || !isApiEnabled()) { setApiEvents([]); return; }
    setLoadingPerson(true);
    const year = new Date().getFullYear();
    const dateFrom = `${year - 1}-01-01`;
    const dateTo = `${year + 1}-12-31`;
    Promise.all([
      api.assignments.list({ employeeId: selectedPersonId, dateFrom, dateTo }),
      api.absences.list({ employeeId: selectedPersonId, dateFrom, dateTo }),
    ]).then(([assigns, absences]) => {
      const mappedA = assigns.map(a => ({ id: a.id, person_id: a.employeeId, project_id: a.projectId, date: a.date.slice(0, 10), slot: a.slot, time_spent_minutes: a.timeSpentMinutes ?? null, comment: a.comment ?? null, created_at: '', project: a.project, manufacturing_order: a.manufacturingOrder } as any));
      const mappedAbs = absences.map(ab => ({ id: ab.id, person_id: ab.employeeId, date: ab.date.slice(0, 10), type: ab.type, comment: ab.comment ?? null, created_at: '' } as any));
      setApiEvents(toCalendarEvents(mappedA, mappedAbs));
    }).catch(console.error).finally(() => setLoadingPerson(false));
  }, [selectedPersonId]);

  const personData = useMemo(() => getPersonData(selectedPersonId), [getPersonData, selectedPersonId]);

  const calendarEvents = useMemo(() => {
    if (isApiEnabled() && apiEvents.length > 0) return apiEvents;
    if (!personData.person) return [];
    return toCalendarEvents(personData.assignments, personData.absences);
  }, [personData, apiEvents]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 text-muted-foreground 
                           hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Planning prévisionnel
              </Link>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Calendrier Personnel</h1>
                  <p className="text-sm text-muted-foreground">
                    {personData.person?.display_name || 'Sélectionnez une personne'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
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

              <TeamSelector
                teams={teams}
                selectedTeamId={selectedTeamId}
                onSelectTeam={setSelectedTeamId}
              />
              <PersonSelector
                people={teamPeople}
                selectedPersonId={selectedPersonId}
                onSelectPerson={setSelectedPersonId}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-4 shadow-card"
        >
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear',
            }}
            locale="fr"
            firstDay={1}
            weekNumbers={true}
            weekNumberFormat={{ week: 'numeric' }}
            buttonText={{
              today: "Aujourd'hui",
              month: 'Mois',
              week: 'Semaine',
              day: 'Jour',
              year: 'Année',
            }}
            events={calendarEvents}
            eventDisplay="block"
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={true}
            allDayText="Journée"
            height="auto"
            contentHeight={650}
            expandRows={true}
            dayMaxEvents={3}
            moreLinkText={(num) => `+${num} autres`}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
          />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">
              {personData.assignments.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Affectations totales
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">
              {personData.absences.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Jours d'absence
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-foreground">
              {new Set(personData.assignments.map(a => a.project_id)).size}
            </div>
            <div className="text-sm text-muted-foreground">
              Chantiers différents
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
