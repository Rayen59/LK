import React, { useState, useEffect } from 'react';
import { User, ContentReport } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import {
  ShieldCheck,
  Search,
  UserX,
  UserCheck,
  Eye,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle,
  ShieldAlert,
  RefreshCw,
  MessageSquareOff,
  Loader2,
  Flag,
  FileText,
  MessageCircle,
  MessageSquare,
  ChevronRight,
  X,
  Users
} from 'lucide-react';

interface AdminViewProps {
  currentUser: User;
  onGoBack?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'reports'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'restricted' | 'banned' | 'deleted_by_user'
  >('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [messageToast, setMessageToast] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Ban modal state (supports preset durations AND custom period chosen by admin)
  const [banTargetUser, setBanTargetUser] = useState<any | null>(null);
  const [banDuration, setBanDuration] = useState<string>('1d');
  const [customBanValue, setCustomBanValue] = useState<number>(5);
  const [customBanUnit, setCustomBanUnit] = useState<'hours' | 'days'>('days');
  const [banReason, setBanReason] = useState('');

  // Delete user modal
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  useEffect(() => {
    loadAdminData();

    const unsubscribe = subscribeToLiveUpdates((event) => {
      if (
        event === 'USER_STATUS_CHANGED' ||
        event === 'USER_DELETED' ||
        event === 'NEW_REPORT' ||
        event === 'REPORT_UPDATED'
      ) {
        loadAdminData();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersRes, reportsRes] = await Promise.all([
        api.admin.getUsers().catch(() => ({ users: [] })),
        api.admin.getReports().catch(() => ({ reports: [] }))
      ]);
      setUsers(usersRes.users || []);
      setReports(reportsRes.reports || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessageToast({ text, type });
    setTimeout(() => setMessageToast(null), 4000);
  };

  const handleApplyBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banTargetUser) return;

    setActionLoadingId(banTargetUser.id);
    try {
      const res = await api.admin.banUser(
        banTargetUser.id,
        banDuration,
        banReason.trim() || undefined,
        banDuration === 'custom' ? customBanValue : undefined,
        banDuration === 'custom' ? customBanUnit : undefined
      );
      showToast(res.message || 'Utilisateur banni avec succès', 'success');
      setBanTargetUser(null);
      setBanReason('');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Échec du bannissement', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      const res = await api.admin.unbanUser(userId);
      showToast(res.message || 'Compte réactivé avec succès', 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du débannissement', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleRestriction = async (user: any) => {
    setActionLoadingId(user.id);
    const newRestrictedState = !user.isRestricted;
    try {
      const res = await api.admin.restrictUser(
        user.id,
        newRestrictedState,
        newRestrictedState ? 'Interactions limitées par décision administrative' : undefined
      );
      showToast(res.message, 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la modification de la restriction', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setActionLoadingId(userToDelete.id);
    try {
      await api.admin.deleteUser(userToDelete.id);
      showToast('Utilisateur supprimé définitivement', 'success');
      setUserToDelete(null);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Échec de la suppression', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveReport = async (
    report: ContentReport,
    options: { status: 'resolved' | 'dismissed'; deleteContent?: boolean; adminAction?: string }
  ) => {
    setActionLoadingId(report.id);
    try {
      const res = await api.admin.updateReport(report.id, options);
      showToast(res.message || 'Signalement traité.', 'success');
      if (selectedReport?.id === report.id) {
        setSelectedReport(res.report);
      }
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du traitement du signalement.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReportRecord = async (reportId: string) => {
    try {
      await api.admin.deleteReport(reportId);
      if (selectedReport?.id === reportId) setSelectedReport(null);
      await loadAdminData();
      showToast('Signalement archivé / supprimé.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      u.nom?.toLowerCase().includes(query) ||
      u.prenom?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.promo?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return !u.isBanned && !u.isRestricted && !u.isDeletedByUser;
    if (statusFilter === 'restricted') return Boolean(u.isRestricted);
    if (statusFilter === 'banned') return Boolean(u.isBanned);
    if (statusFilter === 'deleted_by_user') return Boolean(u.isDeletedByUser);

    return true;
  });

  const filteredReports = reports.filter((r) => {
    if (reportFilter !== 'all' && r.status !== reportFilter) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      r.offenderName?.toLowerCase().includes(query) ||
      r.reporterName?.toLowerCase().includes(query) ||
      r.reason?.toLowerCase().includes(query) ||
      r.contentSnapshot?.toLowerCase().includes(query)
    );
  });

  const totalUsers = users.length;
  const bannedCount = users.filter((u) => u.isBanned).length;
  const restrictedCount = users.filter((u) => u.isRestricted).length;
  const activeCount = users.filter((u) => !u.isBanned && !u.isRestricted && !u.isDeletedByUser).length;
  const deletedByUserCount = users.filter((u) => u.isDeletedByUser).length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  const getTargetTypeBadge = (type: string) => {
    if (type === 'post') {
      return {
        label: 'Publication',
        icon: FileText,
        cls: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      };
    }
    if (type === 'comment') {
      return {
        label: 'Commentaire',
        icon: MessageSquare,
        cls: 'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
      };
    }
    if (type === 'message') {
      return {
        label: 'Message Direct',
        icon: MessageCircle,
        cls: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      };
    }
    return {
      label: 'Contenu',
      icon: Flag,
      cls: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200'
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Toast alert */}
      {messageToast && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
            messageToast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {messageToast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{messageToast.text}</span>
        </div>
      )}

      {/* Admin Top Banner */}
      <div className="bg-gradient-to-r from-[#0a163a] via-[#0d2358] to-[#0a163a] border border-blue-900 p-5 sm:p-7 rounded-3xl text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-400/40 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Panneau d'Administration & Modération</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Supervision des Membres & Signalements
            </h2>
            <p className="text-blue-200/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Gérez les comptes, examinez les signalements de publications, commentaires et messages, et appliquez des suspensions pour la durée de votre choix.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            disabled={loading}
            className="self-start md:self-auto flex items-center space-x-2 px-4 py-2.5 bg-blue-900/60 hover:bg-blue-800/80 text-white rounded-xl text-xs font-bold border border-blue-700/60 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-blue-900/60">
          <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-800/40">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
              Total Membres
            </span>
            <span className="text-2xl font-black text-white">{totalUsers}</span>
          </div>
          <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-800/40">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Comptes Actifs
            </span>
            <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
          </div>
          <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-800/40">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Lecture Seule
            </span>
            <span className="text-2xl font-black text-amber-400">{restrictedCount}</span>
          </div>
          <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-800/40">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
              Bannis / Suspendus
            </span>
            <span className="text-2xl font-black text-rose-400">{bannedCount}</span>
          </div>
          <div
            onClick={() => setActiveAdminTab('reports')}
            className="p-3 bg-amber-500/20 hover:bg-amber-500/30 rounded-2xl border border-amber-400/40 cursor-pointer transition col-span-2 sm:col-span-1"
          >
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              Signalements
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black text-amber-300">{reports.length}</span>
              {pendingReportsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                  {pendingReportsCount} nouv.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Section Switcher: Membres vs Signalements */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0c142b] p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveAdminTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center space-x-2 transition cursor-pointer ${
              activeAdminTab === 'users'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestion des Membres ({totalUsers})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center space-x-2 transition cursor-pointer ${
              activeAdminTab === 'reports'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>Signalements reçus ({reports.length})</span>
            {pendingReportsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {pendingReportsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeAdminTab === 'users'
                ? 'Rechercher un membre, email...'
                : 'Rechercher dans les signalements...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#070d20] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* TAB 1: GESTION DES MEMBRES (PRINCIPE ANCIEN + BANNISSEMENT SUR PÉRIODE AU CHOIX) */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          {/* Status Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Tous ({totalUsers})
            </button>

            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              Actifs ({activeCount})
            </button>

            <button
              onClick={() => setStatusFilter('restricted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'restricted'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              Lecture seule ({restrictedCount})
            </button>

            <button
              onClick={() => setStatusFilter('banned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'banned'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              Bannis ({bannedCount})
            </button>

            <button
              onClick={() => setStatusFilter('deleted_by_user')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'deleted_by_user'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}
            >
              Supprimés par l'utilisateur ({deletedByUserCount})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <span>Chargement des utilisateurs...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#0c142b] rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <UserX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Aucun utilisateur trouvé
              </h3>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const isAdmin = user.role === 'admin';
                const isSelf = user.id === currentUser.id;
                const isBanned = Boolean(user.isBanned);
                const isRestricted = Boolean(user.isRestricted);

                let banDisplay = '';
                if (isBanned) {
                  if (user.banUntil === 'permanent') {
                    banDisplay = 'Banni définitivement';
                  } else if (user.banUntil) {
                    banDisplay = `Suspendu jusqu'au ${new Date(user.banUntil).toLocaleDateString(
                      'fr-FR',
                      {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      }
                    )}`;
                  }
                }

                return (
                  <div
                    key={user.id}
                    className={`bg-white dark:bg-[#0c142b] rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                      isBanned
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10'
                        : isRestricted
                        ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3.5">
                        <img
                          src={user.avatarUrl}
                          alt={user.nom}
                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-100 dark:border-blue-800 shrink-0"
                          referrerPolicy="no-referrer"
                        />

                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                              {user.prenom} {user.nom}
                            </span>

                            {isAdmin && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Administrateur
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {user.promo || 'Membre'}
                            </span>

                            {user.reportsAgainstCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                {user.reportsAgainstCount} signalement(s)
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            {user.email}
                          </div>

                          <div className="flex items-center flex-wrap gap-2 mt-2">
                            {user.isDeletedByUser ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                <UserX className="w-3 h-3" />
                                <span>Supprimé par l'utilisateur</span>
                              </span>
                            ) : isBanned ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <ShieldAlert className="w-3 h-3" />
                                <span>{banDisplay}</span>
                              </span>
                            ) : isRestricted ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Eye className="w-3 h-3" />
                                <span>Lecture seule</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle className="w-3 h-3" />
                                <span>Compte Actif</span>
                              </span>
                            )}

                            <span className="text-[11px] text-slate-400">
                              • {user.postsCount || 0} publication(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {!isAdmin && !isSelf && (
                        <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleToggleRestriction(user)}
                            disabled={actionLoadingId === user.id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                              isRestricted
                                ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isRestricted ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Lever restriction</span>
                              </>
                            ) : (
                              <>
                                <MessageSquareOff className="w-3.5 h-3.5 text-amber-600" />
                                <span>Limiter</span>
                              </>
                            )}
                          </button>

                          {isBanned ? (
                            <button
                              onClick={() => handleUnban(user.id)}
                              disabled={actionLoadingId === user.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Débannir</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setBanTargetUser(user);
                                setBanDuration('1d');
                                setBanReason('');
                              }}
                              disabled={actionLoadingId === user.id}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Bannir (Choisir période)</span>
                            </button>
                          )}

                          <button
                            onClick={() => setUserToDelete(user)}
                            disabled={actionLoadingId === user.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                            title="Supprimer définitivement ce compte"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SIGNALEMENTS REÇUS (INSPECTION DÉTAILLÉE & ACTIONS DE MODÉRATION) */}
      {activeAdminTab === 'reports' && (
        <div className="space-y-4">
          {/* Filter chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <button
              onClick={() => setReportFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                reportFilter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Tous ({reports.length})
            </button>
            <button
              onClick={() => setReportFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                reportFilter === 'pending'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              En attente ({reports.filter((r) => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setReportFilter('resolved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                reportFilter === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              Traités / Résolus ({reports.filter((r) => r.status === 'resolved').length})
            </button>
            <button
              onClick={() => setReportFilter('dismissed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                reportFilter === 'dismissed'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Classés sans suite ({reports.filter((r) => r.status === 'dismissed').length})
            </button>
          </div>

          {filteredReports.length === 0 ? (
            <div className="bg-white dark:bg-[#0c142b] rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Flag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Aucun signalement dans cette catégorie
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Les signalements de publications, commentaires et messages envoyés par les membres apparaissent ici en temps réel.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((rep) => {
                const badge = getTargetTypeBadge(rep.targetType);
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c142b] border transition shadow-2xs cursor-pointer hover:border-amber-400 ${
                      rep.status === 'pending'
                        ? 'border-amber-300 dark:border-amber-800/80'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${badge.cls}`}
                          >
                            <BadgeIcon className="w-3.5 h-3.5" />
                            <span>{badge.label}</span>
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                              rep.status === 'pending'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : rep.status === 'resolved'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {rep.status === 'pending'
                              ? 'En attente'
                              : rep.status === 'resolved'
                              ? 'Résolu'
                              : 'Classé sans suite'}
                          </span>

                          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                            Motif : {rep.reason}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            • {new Date(rep.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                          Contenu signalé : « {rep.contentSnapshot} »
                        </p>

                        <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500">
                          <span>
                            Compte signalé :{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {rep.offenderName}
                            </strong>
                            {rep.offenderStatus?.isBanned && (
                              <span className="ml-1.5 text-[10px] font-bold text-rose-600">
                                (Déjà banni)
                              </span>
                            )}
                          </span>
                          <span>•</span>
                          <span>
                            Signalé par : <strong>{rep.reporterName}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-extrabold flex items-center space-x-1">
                          <span>Inspecter le signalement</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL D'INSPECTION D'UN SIGNALEMENT ("Entrer au signalement") */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Détails du Signalement
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reçu le {new Date(selectedReport.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Offender & Reporter Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60">
                <span className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400 block mb-1">
                  Auteur du contenu signalé
                </span>
                <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {selectedReport.offenderName}
                </div>
                {selectedReport.offenderEmail && (
                  <div className="text-[11px] font-mono text-slate-500">
                    {selectedReport.offenderEmail}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  Signalé par
                </span>
                <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {selectedReport.reporterName}
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                  Motif : {selectedReport.reason}
                </div>
              </div>
            </div>

            {selectedReport.details && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold block mb-0.5">Précisions de l'utilisateur :</span>
                <span>{selectedReport.details}</span>
              </div>
            )}

            {/* Reported Content Snapshot */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                Contenu exact ({getTargetTypeBadge(selectedReport.targetType).label}) :
              </div>
              <p className="text-xs sm:text-sm text-slate-900 dark:text-white whitespace-pre-wrap break-words font-medium">
                {selectedReport.contentSnapshot}
              </p>
              {selectedReport.attachmentSnapshot &&
                selectedReport.attachmentSnapshot.type === 'image' && (
                  <img
                    src={selectedReport.attachmentSnapshot.url}
                    alt="Pièce jointe signalée"
                    className="max-h-48 rounded-xl object-contain border border-slate-300 dark:border-slate-700 mt-2"
                  />
                )}
            </div>

            {/* Admin Actions inside the Report */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Actions de modération :
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={actionLoadingId === selectedReport.id}
                  onClick={() =>
                    handleResolveReport(selectedReport, {
                      status: 'resolved',
                      deleteContent: true,
                      adminAction: 'Contenu supprimé par l’administration'
                    })
                  }
                  className="py-2.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer le contenu & Résoudre</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const offenderUser = users.find((u) => u.id === selectedReport.offenderId) || {
                      id: selectedReport.offenderId,
                      prenom: selectedReport.offenderName,
                      nom: '',
                      email: selectedReport.offenderEmail || ''
                    };
                    setBanTargetUser(offenderUser);
                    setBanDuration('3d');
                    setBanReason(`Suite au signalement : ${selectedReport.reason}`);
                  }}
                  className="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <UserX className="w-4 h-4" />
                  <span>Bannir le compte (Choisir durée)</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoadingId === selectedReport.id}
                  onClick={() =>
                    handleResolveReport(selectedReport, {
                      status: 'dismissed',
                      deleteContent: false,
                      adminAction: 'Classé sans suite'
                    })
                  }
                  className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                  <span>Classer sans suite</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteReportRecord(selectedReport.id)}
                  className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Retirer de la liste</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BAN MODAL (AVEC PÉRIODE AU CHOIX DE L'ADMINISTRATEUR) */}
      {banTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Suspendre / Bannir le compte
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {banTargetUser.prenom} {banTargetUser.nom}{' '}
                  {banTargetUser.email ? `(${banTargetUser.email})` : ''}
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyBan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Choisissez la durée de la suspension :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1h', label: '1 Heure' },
                    { id: '12h', label: '12 Heures' },
                    { id: '1d', label: '24 Heures' },
                    { id: '3d', label: '3 Jours' },
                    { id: '7d', label: '7 Jours' },
                    { id: '14d', label: '14 Jours' },
                    { id: '30d', label: '30 Jours' },
                    { id: 'custom', label: 'Personnalisée' },
                    { id: 'permanent', label: 'Définitif' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBanDuration(opt.id)}
                      className={`p-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        banDuration === opt.id
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom period input */}
              {banDuration === 'custom' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customBanValue}
                    onChange={(e) => setCustomBanValue(Math.max(1, Number(e.target.value)))}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center text-slate-900 dark:text-white"
                  />
                  <select
                    value={customBanUnit}
                    onChange={(e) => setCustomBanUnit(e.target.value as 'hours' | 'days')}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="hours">Heure(s)</option>
                    <option value="days">Jour(s)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motif de la sanction :
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Non respect des règles de la communauté..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBanTargetUser(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Confirmer le bannissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Supprimer cet utilisateur ?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Êtes-vous sûr de vouloir supprimer définitivement le compte de {userToDelete.prenom}{' '}
              {userToDelete.nom} ? Cette action est irréversible.
            </p>

            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
