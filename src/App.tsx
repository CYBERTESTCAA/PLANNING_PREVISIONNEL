import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import { PlanningPage } from "./pages/PlanningPage";
import { PersonCalendarPage } from "./pages/PersonCalendarPage";
import { GanttPage } from "./pages/GanttPage";
import { AdminTeamsPage } from "./pages/admin/AdminTeamsPage";
import { AdminPeoplePage } from "./pages/admin/AdminPeoplePage";
import { AdminProjectsPage } from "./pages/admin/AdminProjectsPage";
import { AdminManufacturingOrdersPage } from './pages/admin/AdminManufacturingOrdersPage';
import { AdminSubsidiariesPage } from './pages/admin/AdminSubsidiariesPage';
import { AdminSyncPage } from './pages/admin/AdminSyncPage';
import { ChantierPage } from "./pages/ChantierPage";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";
import "./styles/fullcalendar.css";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/person-calendar" element={<PersonCalendarPage />} />
            <Route path="/gantt" element={<GanttPage />} />
            <Route path="/admin/teams" element={<AdminRoute><AdminTeamsPage /></AdminRoute>} />
            <Route path="/admin/people" element={<AdminRoute><AdminPeoplePage /></AdminRoute>} />
            <Route path="/admin/projects" element={<AdminRoute><AdminProjectsPage /></AdminRoute>} />
            <Route path="/admin/manufacturing-orders" element={<AdminRoute><AdminManufacturingOrdersPage /></AdminRoute>} />
            <Route path="/admin/subsidiaries" element={<AdminRoute><AdminSubsidiariesPage /></AdminRoute>} />
            <Route path="/admin/sync" element={<AdminRoute><AdminSyncPage /></AdminRoute>} />
            <Route path="/chantier" element={<ChantierPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
