import { useState, useMemo, useEffect } from 'react';
import { usePlanningData } from '@/hooks/usePlanningData';
import { ProjectGantt } from '@/components/planning/ProjectGantt';
import { Link } from 'react-router-dom';
import { ArrowLeft, HardHat, BarChart3 } from 'lucide-react';
import { SubsidiarySelector } from '@/components/planning/SubsidiarySelector';
import { WorkshopSelector } from '@/components/planning/WorkshopSelector';

export const GanttPage = () => {
  const {
    subsidiaries,
    workshopsForSubsidiary,
    selectedSubsidiaryId,
    setSelectedSubsidiaryId,
    selectedWorkshopId,
    setSelectedWorkshopId,
    projects,
    assignments,
    people,
    loadPeriod,
  } = usePlanningData();

  useEffect(() => {
    if (!selectedWorkshopId) return;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 6, 0);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    loadPeriod(selectedWorkshopId, fmt(from), fmt(to));
  }, [selectedWorkshopId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 text-muted-foreground 
                         hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Accueil
            </Link>

            <div className="flex items-center gap-4">
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Vue Gantt</h1>
                  <p className="text-sm text-muted-foreground">
                    Visualisation timeline du planning prévisionnel
                  </p>
                </div>
              </div>

              <div className="h-6 w-px bg-border hidden md:block" />

              <div className="hidden md:flex items-center gap-3">
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
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6">
        <ProjectGantt 
          projects={projects} 
          assignments={assignments} 
          people={people}
        />
      </main>
    </div>
  );
};
