import { Link, useNavigate } from 'react-router-dom';
import { HardHat, Calendar, ArrowRight, User, Settings, BarChart3, Building2, Check, Zap, RefreshCw, Clock, Database, LogIn, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlanningData } from '@/hooks/usePlanningData';
import { useState, useEffect, useRef } from 'react';
import { api, isApiEnabled, type ApiSyncProgress } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface SyncStatus { inProgress: boolean; last: { startedAt?: string; finishedAt?: string; projects?: number; employees?: number } | null }

const Index = () => {
  const { subsidiaries, selectedSubsidiaryId, setSelectedSubsidiaryId } = usePlanningData();
  const navigate = useNavigate();
  const auth = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<ApiSyncProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isApiEnabled()) return;
    api.sync.status().then(data => {
      setSyncStatus({ inProgress: data.inProgress, last: data.last });
      if (data.inProgress) setSyncing(true);
    }).catch(() => {});
  }, []);

  // Poll progress while syncing
  useEffect(() => {
    if (syncing) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.sync.progress();
          setProgress(res.progress);
          if (!res.inProgress) {
            setSyncing(false);
            api.sync.status().then(s => setSyncStatus({ inProgress: false, last: s.last })).catch(() => {});
          }
        } catch {}
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setProgress(null);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [syncing]);

  const triggerSync = async () => {
    if (!isApiEnabled() || syncing) return;
    setSyncing(true);
    setProgress(null);
    try {
      await api.sync.trigger('manual');
      const s = await api.sync.status();
      setSyncStatus({ inProgress: false, last: s.last });
    } catch {}
    finally { setSyncing(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <header className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <HardHat className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Planning prévisionnel</h1>
                  <p className="text-lg opacity-90">Gestion intelligente des affectations</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {auth.isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div className="font-medium flex items-center gap-1.5">
                        {auth.isAdmin && <Shield className="w-3.5 h-3.5 text-yellow-300" />}
                        {auth.userName}
                      </div>
                      <div className="text-xs opacity-70">{auth.userEmail}</div>
                    </div>
                    <button onClick={auth.logout}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
                      title="Se déconnecter">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={auth.login}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors">
                    <LogIn className="w-4 h-4" />
                    Se connecter
                  </button>
                )}
              </div>
            </div>

            {/* Subsidiary selector */}
            {subsidiaries.length > 0 && (
              <div>
                <p className="text-sm font-medium opacity-70 mb-3 uppercase tracking-wider">Choisir une filiale</p>
                <div className="flex flex-wrap gap-3">
                  {subsidiaries.map((sub) => {
                    const isSelected = selectedSubsidiaryId === sub.id;
                    return (
                      <motion.button
                        key={sub.id}
                        onClick={() => setSelectedSubsidiaryId(sub.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm
                                   border-2 transition-all duration-200 shadow-sm
                                   ${isSelected
                                     ? 'bg-white text-primary border-white shadow-lg'
                                     : 'bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/60'}`}
                      >
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span>{sub.name}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
                {selectedSubsidiaryId && (
                  <p className="text-xs opacity-60 mt-2">
                    Filiale sélectionnée — cliquez sur une vue pour commencer
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </header>


      {/* Navigation Cards */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Link
              to="/planning"
              className="group block bg-card border border-border rounded-2xl p-6 h-full
                         hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4
                             group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <HardHat className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Planning prévisionnel</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Vue grille par atelier avec les personnes en lignes et les jours en colonnes. 
                Affectez plusieurs chantiers par journée.
              </p>
              <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                <span>Accéder au planning</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <Link
              to="/gantt"
              className="group block bg-card border border-border rounded-2xl p-6 h-full
                         hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4
                             group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <BarChart3 className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Vue Gantt</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Diagramme timeline des chantiers. Visualisez les périodes prévisionnelles 
                vs réelles sur une échelle de temps.
              </p>
              <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                <span>Voir le Gantt</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Link
              to="/chantier"
              className="group block bg-card border border-border rounded-2xl p-6 h-full
                         hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4
                             group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <Building2 className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Vue Chantier</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Suivi par chantier : dates contractuelles, intervenants AM/PM, 
                ordres de fabrication et avancement.
              </p>
              <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                <span>Voir les chantiers</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
            <Link
              to="/person-calendar"
              className="group block bg-card border border-border rounded-2xl p-6 h-full
                         hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4
                             group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <Calendar className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Calendrier Personnel</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Vue calendrier individuelle pour chaque personne. 
                Visualisez les affectations et absences par jour/semaine/mois.
              </p>
              <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                <span>Voir le calendrier</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Sync status */}
        {isApiEnabled() && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="max-w-5xl mx-auto mt-8 flex items-center justify-between gap-4 px-4 py-3 bg-card border border-border rounded-xl">
            <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              {syncing && progress ? (
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary">Étape {progress.step}/{progress.totalSteps} — {progress.stepLabel}</span>
                      <span className="text-xs font-bold text-primary">{progress.percent}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress.percent}%` }} />
                    </div>
                  </div>
                </div>
              ) : syncStatus?.last ? (
                <span className="text-muted-foreground">
                  Dernière sync : <span className="text-foreground font-medium">{(() => { const d = new Date(syncStatus.last!.finishedAt || syncStatus.last!.startedAt || ''); return isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR'); })()}</span>
                  {syncStatus.last.projects !== undefined && (
                    <span className="ml-2 text-xs">— {syncStatus.last.projects} chantiers, {syncStatus.last.employees} employés</span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">{syncStatus === null ? 'Chargement…' : 'Aucune synchronisation effectuée'}</span>
              )}
            </div>
            <button onClick={triggerSync} disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-foreground text-sm rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 shrink-0">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sync…' : 'Synchroniser'}
            </button>
          </motion.div>
        )}

        {/* Admin — only visible for admins */}
        {auth.isAdmin && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-5xl mx-auto mt-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Administration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/subsidiaries" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-accent hover:border-primary/30 transition-all">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Filiales & Ateliers</span>
            </Link>
            <Link to="/admin/teams" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-accent hover:border-primary/30 transition-all">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Gérer les ateliers</span>
            </Link>
            <Link to="/admin/people" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-accent hover:border-primary/30 transition-all">
              <User className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Gérer le personnel</span>
            </Link>
            <Link to="/admin/projects" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-accent hover:border-primary/30 transition-all">
              <HardHat className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Gérer les chantiers</span>
            </Link>
            <Link to="/admin/sync" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-accent hover:border-primary/30 transition-all">
              <Database className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Synchronisation Fabric</span>
            </Link>
          </div>
        </motion.div>
        )}

      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Planning prévisionnel • Application de gestion d'équipes
        </div>
      </footer>
    </div>
  );
};

export default Index;
