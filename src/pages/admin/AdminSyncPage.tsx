import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Database, Users, Building2, FolderKanban, Wrench, Loader2, Briefcase, FileText, CalendarDays, Contact, Zap, HardDrive, RotateCcw, Shield, Download } from 'lucide-react';
import { toast } from 'sonner';
import { api, isApiEnabled, ApiSyncLog, ApiSyncProgress } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  SUCCESS: { label: 'Succès', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
  PARTIAL: { label: 'Partiel (avec erreurs)', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  FAILED: { label: 'Échec', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
  RUNNING: { label: 'En cours…', icon: Loader2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
};

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export const AdminSyncPage = () => {
  const [history, setHistory] = useState<ApiSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<ApiSyncProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    if (!isApiEnabled()) return;
    try {
      const data = await api.sync.history(50);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Poll progress while syncing
  useEffect(() => {
    if (syncing) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.sync.progress();
          setProgress(res.progress);
          if (!res.inProgress) {
            setSyncing(false);
          }
        } catch { /* ignore */ }
      }, 1500);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [syncing]);

  const handleSync = async (delta = false) => {
    setSyncing(true);
    setProgress(null);
    try {
      await api.sync.trigger('manual', delta);
      toast.success('Synchronisation terminée');
      await loadHistory();
    } catch (e: any) {
      toast.error(`Erreur: ${e.message || 'Synchronisation échouée'}`);
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  };

  // ── Backup / Restore state ──────────────────────────────────────────
  const [backups, setBackups] = useState<{ file: string; sizeBytes: number; date: string }[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreStep, setRestoreStep] = useState<'idle' | 'confirm' | 'password' | 'restoring'>('idle');
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreError, setRestoreError] = useState('');

  const loadBackups = useCallback(async () => {
    if (!isApiEnabled()) return;
    setLoadingBackups(true);
    try {
      const data = await api.backups.list();
      setBackups(data);
    } catch { setBackups([]); }
    finally { setLoadingBackups(false); }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await api.backups.create();
      toast.success(`Backup cr\u00e9\u00e9 : ${res.file}`);
      await loadBackups();
    } catch (e: any) {
      toast.error(`Erreur backup: ${e.message}`);
    } finally { setCreatingBackup(false); }
  };

  const handleSelectRestore = (file: string) => {
    setSelectedBackup(file);
    setRestoreStep('confirm');
    setRestorePassword('');
    setRestoreError('');
  };

  const handleConfirmRestore = () => {
    setRestoreStep('password');
  };

  const handleCancelRestore = () => {
    setRestoreStep('idle');
    setSelectedBackup(null);
    setRestorePassword('');
    setRestoreError('');
  };

  const handleSubmitRestore = async () => {
    if (!selectedBackup) return;
    setRestoreError('');
    setRestoreStep('restoring');
    try {
      const res = await api.backups.restore(selectedBackup, restorePassword);
      if (res.ok) {
        toast.success('Backup restaur\u00e9 avec succ\u00e8s ! La page va se recharger.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setRestoreError(res.message || 'Erreur inconnue');
        setRestoreStep('password');
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('403') || msg.includes('incorrect')) {
        setRestoreError('Mot de passe incorrect');
      } else {
        setRestoreError(msg || 'Erreur lors de la restauration');
      }
      setRestoreStep('password');
    }
  };

  const last = history[0] ?? null;
  const lastConfig = last ? STATUS_CONFIG[last.status] || STATUS_CONFIG.FAILED : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Accueil
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Synchronisation Fabric</h1>
                  <p className="text-sm text-muted-foreground">Microsoft Fabric Warehouse → SQLite</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSync(true)}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50 font-medium border border-border"
                title="Synchronise uniquement les modifications (plus rapide)"
              >
                <Zap className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
                Sync delta
              </button>
              <button
                onClick={() => handleSync(false)}
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation…' : 'Sync complète'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Progress bar during sync */}
        {syncing && (
          <div className="border border-blue-200 bg-blue-50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <h2 className="text-base font-semibold text-blue-900">
                    Synchronisation en cours{progress ? ` — ${progress.stepLabel}` : '…'}
                  </h2>
                  {progress && (
                    <p className="text-sm text-blue-700 mt-0.5">
                      Étape {progress.step}/{progress.totalSteps} • {progress.stepDetail}
                    </p>
                  )}
                </div>
              </div>
              {progress && (
                <span className="text-2xl font-bold text-blue-700">{progress.percent}%</span>
              )}
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            {progress && (
              <div className="flex justify-between mt-2 text-xs text-blue-600">
                <span>{progress.step} / {progress.totalSteps} étapes</span>
                <span>{progress.percent}% terminé</span>
              </div>
            )}
          </div>
        )}

        {/* Last sync summary */}
        {!syncing && last && lastConfig && (
          <div className={`border rounded-xl p-6 ${lastConfig.color}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <lastConfig.icon className={`w-6 h-6 ${last.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                <div>
                  <h2 className="text-lg font-semibold">Dernière synchronisation : {lastConfig.label}</h2>
                  <p className="text-sm opacity-80 mt-0.5">
                    {formatDate(last.startedAt)} • Durée : {formatDuration(last.durationMs)} • Via : {last.triggeredBy}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 mt-5">
              <StatCard icon={Building2} label="Filiales" value={last.subsidiaries} />
              <StatCard icon={Wrench} label="Ateliers" value={last.workshops} />
              <StatCard icon={Users} label="Salariés" value={last.employees} />
              <StatCard icon={Contact} label="Clients" value={last.clients ?? 0} />
              <StatCard icon={Briefcase} label="Affaires" value={last.affaires ?? 0} />
              <StatCard icon={FolderKanban} label="Chantiers" value={last.projects} />
              <StatCard icon={Clock} label="OF" value={last.mfgOrders} />
              <StatCard icon={FileText} label="Temps" value={last.timeEntries ?? 0} />
              <StatCard icon={CalendarDays} label="Calendrier" value={last.calendarDays ?? 0} />
            </div>
            {last.errors && last.errors !== '[]' && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 mb-1">Erreurs :</h4>
                <ul className="text-xs text-red-700 space-y-1">
                  {JSON.parse(last.errors).map((err: string, i: number) => (
                    <li key={i} className="font-mono break-all">• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!syncing && !last && !loading && (
          <div className="border border-border rounded-xl p-12 text-center text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Aucune synchronisation effectuée</p>
            <p className="text-sm mt-1">Cliquez sur "Sync complète" pour importer les données depuis Fabric.</p>
          </div>
        )}

        {/* History table */}
        {history.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Historique ({history.length})</h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Statut</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Durée</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Filiales</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Salariés</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Chantiers</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">OF</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Source</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Erreurs</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => {
                    const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.FAILED;
                    const errors = log.errors && log.errors !== '[]' ? JSON.parse(log.errors) : [];
                    return (
                      <tr key={log.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-sm">{formatDate(log.startedAt)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                            <cfg.icon className={`w-3 h-3 ${log.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatDuration(log.durationMs)}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-mono">{log.subsidiaries}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-mono">{log.employees}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-mono">{log.projects}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-mono">{log.mfgOrders}</td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{log.triggeredBy}</td>
                        <td className="px-4 py-2.5 text-sm">
                          {errors.length > 0 ? (
                            <span className="text-red-600 font-medium" title={errors.join('\n')}>
                              {errors.length} erreur{errors.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Backup / Restore section ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Sauvegardes</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadBackups}
                disabled={loadingBackups}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors border border-border"
                title="Rafraichir la liste"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
                Rafraichir
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                title="Créer une sauvegarde maintenant"
              >
                <Download className={`w-3.5 h-3.5 ${creatingBackup ? 'animate-spin' : ''}`} />
                {creatingBackup ? 'Création...' : 'Nouvelle sauvegarde'}
              </button>
            </div>
          </div>

          {/* Restore modal overlay */}
          {restoreStep !== 'idle' && selectedBackup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                {restoreStep === 'confirm' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Restaurer une sauvegarde</h3>
                        <p className="text-sm text-muted-foreground">Cette action est irréversible</p>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        Vous allez restaurer la sauvegarde :<br />
                        <strong className="font-mono">{selectedBackup}</strong>
                      </p>
                      <p className="text-xs text-amber-700 mt-2">
                        Toutes les données actuelles seront remplacées par celles de cette sauvegarde.
                        Une sauvegarde de sécurité sera créée automatiquement avant la restauration.
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-4">Êtes-vous sûr de vouloir continuer ?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelRestore}
                        className="flex-1 px-4 py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium border border-border"
                      >
                        Non, annuler
                      </button>
                      <button
                        onClick={handleConfirmRestore}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Oui, continuer
                      </button>
                    </div>
                  </>
                )}

                {restoreStep === 'password' && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Mot de passe requis</h3>
                        <p className="text-sm text-muted-foreground">Entrez le mot de passe administrateur</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Restauration de : <strong className="font-mono text-foreground">{selectedBackup}</strong>
                    </p>
                    {restoreError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-red-700 font-medium">{restoreError}</p>
                      </div>
                    )}
                    <input
                      type="password"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && restorePassword && handleSubmitRestore()}
                      placeholder="Mot de passe administrateur"
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary mb-4"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelRestore}
                        className="flex-1 px-4 py-2.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium border border-border"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSubmitRestore}
                        disabled={!restorePassword}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                      >
                        Restaurer
                      </button>
                    </div>
                  </>
                )}

                {restoreStep === 'restoring' && (
                  <div className="text-center py-8">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground">Restauration en cours...</h3>
                    <p className="text-sm text-muted-foreground mt-1">Ne fermez pas cette page.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Backup list */}
          {backups.length > 0 ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Fichier</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Taille</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.file} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-sm font-mono">{b.file}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{b.date}</td>
                      <td className="px-4 py-2.5 text-sm text-right font-mono">
                        {b.sizeBytes < 1024 * 1024
                          ? `${(b.sizeBytes / 1024).toFixed(0)} KB`
                          : `${(b.sizeBytes / 1024 / 1024).toFixed(1)} MB`}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleSelectRestore(b.file)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                          title="Restaurer cette sauvegarde"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loadingBackups ? (
            <div className="border border-border rounded-xl p-8 text-center text-muted-foreground">
              <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune sauvegarde disponible.</p>
              <p className="text-xs mt-1">Cliquez sur "Nouvelle sauvegarde" pour en créer une.</p>
            </div>
          ) : null}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </main>
    </div>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return (
    <div className="bg-white/60 rounded-lg px-3 py-2 border border-current/10">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 opacity-60" />
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-xl font-bold">{value.toLocaleString('fr-FR')}</p>
    </div>
  );
}
