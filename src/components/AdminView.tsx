import React, { useState, useEffect } from 'react';
import { User } from '../types';
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
  Filter,
  CheckCircle,
  XCircle,
  ShieldAlert,
  RefreshCw,
  MessageSquareOff,
  Sparkles
} from 'lucide-react';

interface AdminViewProps {
  currentUser: User;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'restricted' | 'banned'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [messageToast, setMessageToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Ban modal state
  const [banTargetUser, setBanTargetUser] = useState<any | null>(null);
  const [banDuration, setBanDuration] = useState<'1d' | '3d' | '14d' | 'permanent'>('1d');
  const [banReason, setBanReason] = useState('');

  // Delete user modal
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  useEffect(() => {
    loadUsers();

    const unsubscribe = subscribeToLiveUpdates((event) => {
      if (event === 'USER_STATUS_CHANGED' || event === 'USER_DELETED') {
        loadUsers();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.admin.getUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      console.error('Failed to load users for admin', err);
      showToast(err.message || 'Erreur lors du chargement des utilisateurs', 'error');
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
      const res = await api.admin.banUser(banTargetUser.id, banDuration, banReason.trim());
      showToast(res.message || 'Utilisateur banni avec succès', 'success');
      setBanTargetUser(null);
      setBanReason('');
      await loadUsers();
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
      await loadUsers();
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
      await loadUsers();
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
      await loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Échec de la suppression', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      u.nom?.toLowerCase().includes(query) ||
      u.prenom?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.promo?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return !u.isBanned && !u.isRestricted;
    if (statusFilter === 'restricted') return Boolean(u.isRestricted);
    if (statusFilter === 'banned') return Boolean(u.isBanned);

    return true;
  });

  const totalUsers = users.length;
  const bannedCount = users.filter((u) => u.isBanned).length;
  const restrictedCount = users.filter((u) => u.isRestricted).length;
  const activeCount = users.filter((u) => !u.isBanned && !u.isRestricted).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Toast alert */}
      {messageToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
            messageToast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
          }`}
        >
          {messageToast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>{messageToast.text}</span>
        </div>
      )}

      {/* Admin Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 dark:from-slate-950 dark:via-teal-950 dark:to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-lg border border-slate-800 dark:border-slate-800 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-900/60 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Administration MK & Modération Officielle</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Gestion des Membres, Sanctions & Restrictions
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Supervisez les comptes de la communauté MK, appliquez des bannissements temporaires (1j, 3j, 14j) ou définitifs, ou limitez les interactions en mode lecture seule.
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="self-start md:self-auto flex items-center space-x-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-white rounded-xl text-xs font-bold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Inscrits</span>
            <span className="text-2xl font-black text-white">{totalUsers}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Comptes Actifs</span>
            <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Lecture Seule</span>
            <span className="text-2xl font-black text-amber-400">{restrictedCount}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Bannis / Suspendus</span>
            <span className="text-2xl font-black text-rose-400">{bannedCount}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        
        {/* Search Input with Search Button */}
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, email ou promo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <button
            type="button"
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chercher</span>
          </button>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tous ({totalUsers})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            Actifs ({activeCount})
          </button>

          <button
            onClick={() => setStatusFilter('restricted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'restricted'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            Lecture seule ({restrictedCount})
          </button>

          <button
            onClick={() => setStatusFilter('banned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'banned'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            Bannis ({bannedCount})
          </button>
        </div>

      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-xs">
          Chargement de la liste des utilisateurs MK...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <UserX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Aucun utilisateur trouvé</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Aucun compte ne correspond à vos critères de recherche.
          </p>
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
                banDisplay = `Banni jusqu'au ${new Date(user.banUntil).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}`;
              }
            }

            return (
              <div
                key={user.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                  isBanned
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10'
                    : isRestricted
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* User Profile Card */}
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={user.avatarUrl}
                      alt={user.nom}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />

                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {user.prenom} {user.nom}
                        </span>

                        {isAdmin && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Administrateur
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {user.promo || 'Étudiant'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {user.email}
                      </div>

                      {/* Status badges */}
                      <div className="flex items-center space-x-2 mt-2">
                        {isBanned ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <ShieldAlert className="w-3 h-3" />
                            <span>{banDisplay}</span>
                          </span>
                        ) : isRestricted ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Eye className="w-3 h-3" />
                            <span>Lecture seule (interactions limitées)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3" />
                            <span>Compte en règle (Actif)</span>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          • {user.postsCount || 0} publication(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this user */}
                  {!isAdmin && !isSelf && (
                    <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      
                      {/* Limitation Toggle */}
                      <button
                        onClick={() => handleToggleRestriction(user)}
                        disabled={actionLoadingId === user.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                          isRestricted
                            ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}
                        title="Quand activé, l'utilisateur peut uniquement voir les publications et ne peut plus publier ni commenter."
                      >
                        {isRestricted ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Lever restriction</span>
                          </>
                        ) : (
                          <>
                            <MessageSquareOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Limiter (Voir seulement)</span>
                          </>
                        )}
                      </button>

                      {/* Ban / Unban Button */}
                      {isBanned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          disabled={actionLoadingId === user.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
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
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Bannir le carabin</span>
                        </button>
                      )}

                      {/* Delete user */}
                      <button
                        onClick={() => setUserToDelete(user)}
                        disabled={actionLoadingId === user.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                        title="Supprimer définitivement ce compte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>
                  )}

                  {isAdmin && (
                    <div className="text-xs font-bold text-slate-400 italic">
                      Compte Administrateur Protégé
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BAN MODAL (1j, 3j, 14j, ou Permanent) */}
      {banTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bannir l'étudiant
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {banTargetUser.prenom} {banTargetUser.nom} ({banTargetUser.email})
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyBan} className="space-y-4">
              
              {/* Duration Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Durée de la suspension :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBanDuration('1d')}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-center transition ${
                      banDuration === '1d'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    1 Jour (24h)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBanDuration('3d')}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-center transition ${
                      banDuration === '3d'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    3 Jours (72h)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBanDuration('14d')}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-center transition ${
                      banDuration === '14d'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    14 Jours (2 sem.)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBanDuration('permanent')}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-center transition ${
                      banDuration === 'permanent'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    Définitivement
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motif de la sanction (affiché à l'utilisateur) :
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Non respect de la déontologie, diffusion de contenus non conformes..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBanTargetUser(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition"
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
              Êtes-vous sûr de vouloir supprimer définitivement le compte de {userToDelete.prenom} {userToDelete.nom} ? Cette action est irréversible.
            </p>

            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition"
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
