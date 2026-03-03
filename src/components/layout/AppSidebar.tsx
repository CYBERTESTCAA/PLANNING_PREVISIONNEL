import { Link, useLocation } from 'react-router-dom';
import { HardHat, BarChart3, Building2, Calendar, Users, Settings, Database, User, LogIn, LogOut, Shield, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/planning', label: 'Planning', icon: HardHat },
  { to: '/gantt', label: 'Vue Gantt', icon: BarChart3 },
  { to: '/chantier', label: 'Chantiers', icon: Building2 },
  { to: '/person-calendar', label: 'Calendrier', icon: Calendar },
];

const ADMIN_ITEMS = [
  { to: '/admin/subsidiaries', label: 'Filiales & Ateliers', icon: Building2 },
  { to: '/admin/teams', label: 'Ateliers & Équipes', icon: Users },
  { to: '/admin/people', label: 'Personnel', icon: User },
  { to: '/admin/projects', label: 'Chantiers', icon: HardHat },
  { to: '/admin/sync', label: 'Sync Fabric', icon: Database },
];

export const AppSidebar = () => {
  const location = useLocation();
  const auth = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-slate-900 text-white flex flex-col z-40">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">Planning Prévi</div>
            <div className="text-[10px] text-slate-400 truncate">CAA Agencement</div>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Admin section */}
        {auth.isAdmin && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <Settings className="w-3 h-3" />
                Administration
              </div>
            </div>
            {ADMIN_ITEMS.map(item => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-3 py-3">
        {auth.isAuthenticated ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              {auth.isAdmin ? (
                <Shield className="w-4 h-4 text-yellow-400" />
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-white truncate">{auth.userName}</div>
              <div className="text-[10px] text-slate-500 truncate">{auth.userEmail}</div>
            </div>
            <button
              onClick={auth.logout}
              title="Se déconnecter"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={auth.login}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </button>
        )}
        <div className="text-[9px] text-slate-600 mt-2 px-1">v1.0 — Planning Prévisionnel</div>
      </div>
    </aside>
  );
};
