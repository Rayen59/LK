import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import {
  MessageSquare,
  BarChart3,
  Bookmark,
  ShieldAlert,
  ShieldCheck,
  Moon,
  Sun,
  Bell,
  BellOff,
  LogOut,
  ChevronRight,
  Users,
  Lock,
  Unlock,
  Wand2,
  ArrowLeft,
  FileText,
  Activity,
  Heart,
  MessageCircle,
  Share2,
  KeyRound,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Film,
  Sparkles,
  Laptop,
  Smartphone,
  Copy,
  Check,
  Info,
  RefreshCw
} from 'lucide-react';
import { MainTabType } from './Header';
import { subscribeToLiveUpdates } from '../lib/api';

export interface MenuPageProps {
  currentUser: User;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  onGoBack?: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: () => void;
  onOpenDocSearch: () => void;
  onOpenFriendsModal?: () => void;
  pendingFriendRequestsCount?: number;
  onUpdateCurrentUser?: (user: User) => void;
  onRefreshPosts?: () => void;
}

type MenuSubView = 'main' | 'activity' | 'profile_edit' | 'password_security' | 'validation_code';
type ActivityTab = 'likes' | 'comments' | 'shares';

export const MenuPageView: React.FC<MenuPageProps> = ({
  currentUser,
  onTabChange,
  onLogout,
  darkMode,
  onToggleDarkMode,
  notificationsEnabled,
  onToggleNotificationsEnabled,
  onOpenDocSearch,
  onOpenFriendsModal,
  pendingFriendRequestsCount = 0,
  onUpdateCurrentUser,
  onRefreshPosts
}) => {
  const [subView, setSubView] = useState<MenuSubView>('main');
  const [activityTab, setActivityTab] = useState<ActivityTab>('likes');

  // PC Validation Code state
  const [validationCode, setValidationCode] = useState<string>('------');
  const [validationExpiresIn, setValidationExpiresIn] = useState<number>(600);
  const [pendingPcSession, setPendingPcSession] = useState<{
    sessionId: string;
    code: string;
    deviceInfo: string;
    createdAt: string;
    expiresInSeconds: number;
  } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Activity data state
  const [activityLoading, setActivityLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [likedReels, setLikedReels] = useState<any[]>([]);
  const [myComments, setMyComments] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myReels, setMyReels] = useState<any[]>([]);
  const [myQuizzes, setMyQuizzes] = useState<any[]>([]);

  // Profile name & info edit state (14-day cooldown on name)
  const [prenom, setPrenom] = useState(currentUser.prenom || '');
  const [nom, setNom] = useState(currentUser.nom || '');
  const [promo, setPromo] = useState(currentUser.promo || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);

  // Feedback toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    setPrenom(currentUser.prenom || '');
    setNom(currentUser.nom || '');
    setPromo(currentUser.promo || '');
    setBio(currentUser.bio || '');
  }, [currentUser]);

  const loadValidationCodeData = async () => {
    try {
      setCodeLoading(true);
      const res = await api.auth.getPcValidationCode();
      if (res.activeValidationCode) {
        setValidationCode(res.activeValidationCode);
      }
      setValidationExpiresIn(res.codeExpiresInSeconds || 600);
      setPendingPcSession(res.pendingSession || null);
    } catch {
      // ignore
    } finally {
      setCodeLoading(false);
    }
  };

  useEffect(() => {
    loadValidationCodeData();
  }, []);

  useEffect(() => {
    if (subView === 'validation_code') {
      loadValidationCodeData();
    }
  }, [subView]);

  // Live SSE listener for real-time PC login attempts
  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'PC_LOGIN_ATTEMPT' && payload.userId === currentUser.id) {
        setValidationCode(payload.code);
        setPendingPcSession({
          sessionId: payload.sessionId,
          code: payload.code,
          deviceInfo: payload.deviceInfo,
          createdAt: payload.createdAt,
          expiresInSeconds: 600
        });
        setValidationExpiresIn(600);
        showNotice('success', '💻 Tentative de connexion PC détectée ! Code : ' + payload.code);
      } else if (event === 'PC_LOGIN_APPROVED' && payload.userId === currentUser.id) {
        setPendingPcSession(null);
        showNotice('success', '✅ Connexion PC approuvée avec succès !');
      }
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  // Countdown timer for code expiry
  useEffect(() => {
    if (validationExpiresIn <= 0) return;
    const timer = setInterval(() => {
      setValidationExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [validationExpiresIn]);

  const handleCopyValidationCode = () => {
    if (!validationCode || validationCode.includes('-')) return;
    navigator.clipboard.writeText(validationCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleApprovePcSession = async () => {
    if (!pendingPcSession) return;
    try {
      setActionLoading(true);
      await api.auth.approvePcLogin({ sessionId: pendingPcSession.sessionId });
      setPendingPcSession(null);
      showNotice('success', '✅ Ordinateur (PC) déverrouillé avec succès !');
    } catch (err: any) {
      showNotice('error', err.message || "Erreur lors de l'approbation du PC.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPcSession = async () => {
    if (!pendingPcSession) return;
    try {
      setActionLoading(true);
      await api.auth.rejectPcLogin({ sessionId: pendingPcSession.sessionId });
      setPendingPcSession(null);
      showNotice('error', '❌ Connexion PC refusée.');
    } catch (err: any) {
      showNotice('error', err.message || 'Erreur lors du refus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshValidationCode = async () => {
    try {
      setActionLoading(true);
      const res = await api.auth.refreshValidationCode();
      setValidationCode(res.activeValidationCode);
      setValidationExpiresIn(res.codeExpiresInSeconds || 600);
      showNotice('success', 'Nouveau code généré avec succès !');
    } catch (err: any) {
      showNotice('error', err.message || 'Erreur lors de la génération du code.');
    } finally {
      setActionLoading(false);
    }
  };

  const loadUserActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await api.auth.getActivity();
      setLikedPosts(res.likedPosts || []);
      setLikedReels(res.likedReels || []);
      setMyComments(res.myComments || []);
      setMyPosts(res.myPosts || []);
      setMyReels(res.myReels || []);
      setMyQuizzes(res.myQuizzes || []);
    } catch (err: any) {
      showNotice('error', err.message || "Impossible de charger l'historique d'activité.");
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (subView === 'activity') {
      loadUserActivity();
    }
  }, [subView]);

  // Calculate 14-day cooldown status for name change
  const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
  let canChangeName = true;
  let remainingDaysForName = 0;
  let nextAllowedNameDate = '';

  if (currentUser.lastNameChangeAt && currentUser.role !== 'admin') {
    const lastMs = new Date(currentUser.lastNameChangeAt).getTime();
    const elapsed = Date.now() - lastMs;
    if (elapsed < COOLDOWN_MS) {
      canChangeName = false;
      remainingDaysForName = Math.ceil((COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
      nextAllowedNameDate = new Date(lastMs + COOLDOWN_MS).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) {
      showNotice('error', 'Le prénom et le nom sont obligatoires.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.auth.updateProfile({
        prenom: prenom.trim(),
        nom: nom.trim(),
        promo: promo.trim(),
        bio: bio.trim()
      });
      onUpdateCurrentUser?.(res.user);
      onRefreshPosts?.();
      showNotice('success', res.message || 'Profil mis à jour avec succès.');
    } catch (err: any) {
      showNotice('error', err.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showNotice('error', 'Veuillez remplir tous les champs de mot de passe.');
      return;
    }
    if (newPassword.length < 6) {
      showNotice('error', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotice('error', 'La confirmation du nouveau mot de passe ne correspond pas.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotice('success', res.message || 'Mot de passe modifié avec succès.');
    } catch (err: any) {
      showNotice('error', err.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleTogglePrivacyLock = async () => {
    setTogglingLock(true);
    try {
      const res = await api.privacy.toggleLock(!currentUser.isLocked);
      onUpdateCurrentUser?.(res.user);
      showNotice('success', res.message);
    } catch (err: any) {
      showNotice('error', err.message || 'Erreur lors du changement de confidentialité.');
    } finally {
      setTogglingLock(false);
    }
  };

  const handleUnlikePostFromActivity = async (postId: string) => {
    try {
      await api.posts.toggleLike(postId);
      setLikedPosts((prev) => prev.filter((p) => p.id !== postId));
      onRefreshPosts?.();
      showNotice('success', "Mention J'aime retirée.");
    } catch (err: any) {
      showNotice('error', err.message || 'Erreur');
    }
  };

  const handleDeleteCommentFromActivity = async (postId: string, commentId: string) => {
    try {
      await api.posts.deleteComment(postId, commentId);
      setMyComments((prev) => prev.filter((c) => c.commentId !== commentId));
      onRefreshPosts?.();
      showNotice('success', 'Commentaire supprimé.');
    } catch (err: any) {
      showNotice('error', err.message || 'Impossible de supprimer ce commentaire.');
    }
  };

  const handleDeletePostFromActivity = async (postId: string) => {
    try {
      await api.posts.delete(postId);
      setMyPosts((prev) => prev.filter((p) => p.id !== postId));
      onRefreshPosts?.();
      showNotice('success', 'Publication supprimée.');
    } catch (err: any) {
      showNotice('error', err.message || 'Impossible de supprimer cette publication.');
    }
  };

  const isAdmin = currentUser.role === 'admin';

  const shortcutCards = [
    {
      id: 'quizzes',
      label: 'Quiz & Studio IA (PDF)',
      subtitle: 'Générez des Quiz 1, 2... par IA depuis un PDF et vérifiez les réponses exactes',
      meta: 'IA & Classement',
      icon: Wand2,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      onClick: () => onTabChange('quizzes')
    },
    {
      id: 'forums',
      label: 'Communautés & Salons',
      subtitle: 'Groupes thématiques, débats et salons collaboratifs publics ou privés',
      meta: 'Groupes & Salons',
      icon: MessageSquare,
      iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
      onClick: () => onTabChange('forums')
    },
    {
      id: 'polls',
      label: 'Sondages & Votes',
      subtitle: 'Consultations en direct et avis de la communauté en temps réel',
      meta: 'Consultations',
      icon: BarChart3,
      iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400',
      onClick: () => onTabChange('polls')
    },
    {
      id: 'spaces',
      label: 'Enregistrements & Espaces',
      subtitle: 'Dossiers personnels, cours PDF et publications sauvegardées',
      meta: 'Bibliothèque',
      icon: Bookmark,
      iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
      onClick: () => onTabChange('spaces')
    },
    {
      id: 'friends',
      label: 'Retrouver des Amis',
      subtitle: 'Invitations reçues, suggestions de membres et répertoire d’amis',
      meta:
        pendingFriendRequestsCount > 0
          ? `${pendingFriendRequestsCount} invitation(s) en attente`
          : 'Réseau & Contacts',
      badgeCount: pendingFriendRequestsCount,
      icon: Users,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      onClick: () => onOpenFriendsModal?.()
    },
    {
      id: 'documents',
      label: 'Explorateur de Documents',
      subtitle: 'Recherche rapide de fichiers PDF, supports de cours et membres',
      meta: 'Recherche globale',
      icon: FileText,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      onClick: () => onOpenDocSearch()
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center space-x-2 text-xs font-bold animate-fadeIn max-w-[90vw] ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* SUB-VIEW 1: VOTRE ACTIVITÉ (J'AIME, COMMENTAIRES, PARTAGES) */}
      {subView === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Votre Activité sur MK
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Consultez et gérez vos mentions J'aime, commentaires et partages
                </p>
              </div>
            </div>
          </div>

          {/* Activity Filter Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-white dark:bg-[#0f172a] p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setActivityTab('likes')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                activityTab === 'likes'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>J'aime ({likedPosts.length + likedReels.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivityTab('comments')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                activityTab === 'comments'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Commentaires ({myComments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivityTab('shares')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                activityTab === 'shares'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Partages ({myPosts.length + myReels.length + myQuizzes.length})</span>
            </button>
          </div>

          {activityLoading ? (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Chargement de votre historique d'activité...</p>
            </div>
          ) : (
            <>
              {/* TAB: LIKES */}
              {activityTab === 'likes' && (
                <div className="space-y-3">
                  {likedPosts.length === 0 && likedReels.length === 0 ? (
                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                      <Heart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        Aucune mention J'aime enregistrée
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Les publications et reels que vous aimez apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <>
                      {likedPosts.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <img
                              src={p.authorAvatar}
                              alt={p.authorName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                  Publication de {p.authorName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  • {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                {p.content || 'Publication avec pièce jointe'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onTabChange('feed')}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              Voir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnlikePostFromActivity(p.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs font-bold cursor-pointer"
                            >
                              Retirer J'aime
                            </button>
                          </div>
                        </div>
                      ))}

                      {likedReels.map((r) => (
                        <div
                          key={r.id}
                          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                              <Film className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                Reel de {r.authorName}
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {r.caption || 'Vidéo courte'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onTabChange('reels')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                          >
                            Ouvrir Reels
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* TAB: COMMENTS */}
              {activityTab === 'comments' && (
                <div className="space-y-3">
                  {myComments.length === 0 ? (
                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                      <MessageCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        Aucun commentaire publié
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Tous vos commentaires sur les publications et reels s'afficheront ici.
                      </p>
                    </div>
                  ) : (
                    myComments.map((c) => (
                      <div
                        key={c.commentId}
                        className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              Sur la publication de {c.postAuthorName}
                            </span>
                            <span>•</span>
                            <span>{new Date(c.createdAt).toLocaleString('fr-FR')}</span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            « {c.content} »
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            Contexte : {c.postExcerpt}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onTabChange(c.targetType === 'reel' ? 'reels' : 'feed')
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            Voir
                          </button>
                          {c.targetType === 'post' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteCommentFromActivity(c.postId, c.commentId)
                              }
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="Supprimer ce commentaire"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB: SHARES & PUBLICATIONS */}
              {activityTab === 'shares' && (
                <div className="space-y-3">
                  {myPosts.length === 0 && myReels.length === 0 && myQuizzes.length === 0 ? (
                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                      <Share2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        Aucun contenu partagé pour l'instant
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Vos publications, cours PDF, reels et quiz partagés apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <>
                      {myPosts.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                                Publication partagée
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(p.createdAt).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                              {p.content || 'Fichier / média partagé'}
                            </p>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-3">
                              <span>{p.likesCount} J'aime</span>
                              <span>•</span>
                              <span>{p.commentsCount} commentaire(s)</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onTabChange('feed')}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              Ouvrir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePostFromActivity(p.id)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="Supprimer cette publication"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {myQuizzes.map((q) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                Quiz partagé ({q.questionsCount} questions)
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                              {q.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onTabChange('quizzes')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                          >
                            Voir Quiz
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: CHANGER LE NOM DE PROFIL (LIMITE 1 FOIS / 14 JOURS) & INFOS */}
      {subView === 'profile_edit' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setSubView('main')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Nom de profil & Informations personnelles
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gérez votre identité visible sur le réseau MK
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-[#0f172a] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4"
          >
            {/* 14-Day Cooldown Notice Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                canChangeName
                  ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              <Clock className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div className="text-xs leading-relaxed">
                <span className="font-extrabold block">
                  Règle de sécurité : Changement du nom limité à 1 fois tous les 14 jours
                </span>
                {canChangeName ? (
                  <span>
                    Vous êtes autorisé(e) à modifier votre prénom et votre nom aujourd'hui. Après validation, vous devrez patienter 14 jours avant un nouveau changement.
                  </span>
                ) : (
                  <span>
                    Vous avez modifié votre nom récemment. Vous pourrez le changer à nouveau dans{' '}
                    <strong>{remainingDaysForName} jour(s)</strong> (à partir du {nextAllowedNameDate}).
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prénom
                </label>
                <input
                  type="text"
                  value={prenom}
                  disabled={!canChangeName}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-60 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  value={nom}
                  disabled={!canChangeName}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-60 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Spécialité / Filière / Statut
              </label>
              <input
                type="text"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Ex: Étudiant, Médecine, Tech, Design..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Biographie
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Présentez-vous en quelques mots..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSubView('main')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-2xs transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Enregistrer les modifications</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 3: MOT DE PASSE & SÉCURITÉ DU COMPTE */}
      {subView === 'password_security' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setSubView('main')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Mot de passe & Sécurité
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modifiez votre mot de passe et protégez la confidentialité de votre profil
              </p>
            </div>
          </div>

          {/* Password Change Form */}
          <form
            onSubmit={handleChangePassword}
            className="bg-white dark:bg-[#0f172a] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Changer votre mot de passe</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1 cursor-pointer"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? 'Masquer' : 'Afficher'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Mot de passe actuel
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Saisissez votre mot de passe actuel"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nouveau mot de passe (min. 6 caractères)
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-2xs transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Mettre à jour le mot de passe</span>
              </button>
            </div>
          </form>

          {/* Profile Lock Toggle Card */}
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                {currentUser.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  Verrouillage du profil ({currentUser.isLocked ? 'Activé' : 'Public'})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lorsque votre profil est verrouillé, seuls vos amis acceptés peuvent voir vos publications et vos reels.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={togglingLock}
              onClick={handleTogglePrivacyLock}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
                currentUser.isLocked
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {currentUser.isLocked ? 'Déverrouiller' : 'Verrouiller'}
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: CODE DE VALIDATION (CONNEXION PC & APPAREILS) */}
      {subView === 'validation_code' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setSubView('main')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Code de validation
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[10px] font-black text-blue-700 dark:text-blue-300">
                  Connexion PC 💻
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Générez votre code sécurisé et validez les connexions depuis votre ordinateur
              </p>
            </div>
          </div>

          {/* Pending PC session approval card */}
          {pendingPcSession && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 dark:border-amber-500/40 space-y-3 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      Tentative de connexion PC en cours !
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {pendingPcSession.deviceInfo} tente de se connecter à votre compte.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/80 dark:bg-[#0a1120]/80 rounded-xl border border-amber-500/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Code demandé par le PC :
                </span>
                <span className="font-mono text-base font-black tracking-widest text-amber-600 dark:text-amber-400">
                  {pendingPcSession.code}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApprovePcSession}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Autoriser & Déverrouiller le PC</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectPcSession}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Refuser la connexion
                </button>
              </div>
            </div>
          )}

          {/* Active 6-digit dynamic code card */}
          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Votre code de validation actuel pour PC</span>
            </div>

            <div className="py-2">
              {codeLoading ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 sm:space-x-3 select-all">
                  {validationCode.split('').map((digit, idx) => (
                    <span
                      key={idx}
                      className="w-10 sm:w-12 h-14 sm:h-16 rounded-2xl bg-slate-50 dark:bg-[#121c33] border-2 border-blue-500/40 dark:border-blue-400/30 flex items-center justify-center font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white shadow-sm"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#121c33] border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  Valable encore :{' '}
                  <strong className="text-blue-600 dark:text-blue-400 font-mono">
                    {Math.floor(validationExpiresIn / 60)}:{(validationExpiresIn % 60).toString().padStart(2, '0')}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyValidationCode}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#121c33] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{codeCopied ? 'Copié !' : 'Copier'}</span>
              </button>

              <button
                type="button"
                onClick={handleRefreshValidationCode}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Nouveau code</span>
              </button>
            </div>
          </div>

          {/* Guide explicatif pas à pas */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 text-xs sm:text-sm">
              <Info className="w-4 h-4 text-blue-500" />
              <span>Comment déverrouiller votre connexion sur votre PC ?</span>
            </h4>
            <ol className="space-y-2 text-slate-600 dark:text-slate-300 text-xs">
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>Ouvrez le site MK sur votre ordinateur (PC) et saisissez votre email et mot de passe.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>Votre PC affiche un écran de validation demandant un code de validation à 6 chiffres.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Saisissez les 6 chiffres affichés ci-dessus dans les cases de votre PC, ou cliquez sur le bouton vert <strong>« Autoriser le PC »</strong> ci-dessus !
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* MAIN MENU VIEW */}
      {subView === 'main' && (
        <>
          {/* User Profile Card (Facebook Top Menu Card) */}
          <div
            onClick={() => onTabChange('profile')}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 shadow-2xs flex items-center justify-between gap-4 cursor-pointer transition group"
          >
            <div className="flex items-center space-x-3.5 min-w-0">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.prenom}
                className="w-14 h-14 rounded-full object-cover border-2 border-blue-500 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                    {currentUser.prenom} {currentUser.nom}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 mt-0.5">
                  <span>{currentUser.promo || 'Membre MK'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center space-x-1">
                    {currentUser.isLocked ? (
                      <>
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Profil verrouillé</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 text-emerald-500" />
                        <span>Profil public</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                  Voir votre profil public et vos publications
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>

          {/* Admin Console Card (if user is Admin) */}
          {isAdmin && (
            <div>
              <button
                type="button"
                onClick={() => onTabChange('admin')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-[#0d2358] to-blue-950 text-white border border-blue-700/80 hover:border-blue-400 shadow-sm flex items-center justify-between gap-4 transition cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 text-left min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-white flex items-center space-x-2">
                      <span>Console d'Administration & Signalements</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-xs text-blue-200/90 truncate mt-0.5">
                      Inspecter les signalements (publications, commentaires, messages) et bannir des comptes
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          )}

          {/* SECTION 1: Paramètres, Activité & Sécurité du Compte */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/60 dark:bg-[#0a1120] flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Paramètres, Activité & Sécurité du Compte
              </h3>
              <span className="text-[11px] text-slate-400">Espace personnel</span>
            </div>

            {/* 1. Votre Activité (Likes, Comments, Shares) */}
            <button
              type="button"
              onClick={() => setSubView('activity')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    Votre Activité (J'aime, Commentaires & Partages)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Revoyez tout ce que vous avez aimé, commenté et partagé sur MK
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </button>

            {/* 2. Changer le nom de profil (1 fois / 14 jours) & infos */}
            <button
              type="button"
              onClick={() => setSubView('profile_edit')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center space-x-2">
                    <span>Nom de profil & Informations</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {canChangeName ? 'Modifiable' : `14j (${remainingDaysForName}j restants)`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Changement du nom autorisé une seule fois tous les 14 jours, biographie et filière
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </button>

            {/* 3. Mot de passe & Sécurité */}
            <button
              type="button"
              onClick={() => setSubView('password_security')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    Mot de passe & Confidentialité du profil
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Modifier votre mot de passe et verrouiller/déverrouiller votre profil
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </button>

            {/* 4. Code de validation (Connexion PC & Appareils) */}
            <button
              type="button"
              onClick={() => setSubView('validation_code')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 relative">
                  <Laptop className="w-5 h-5" />
                  {pendingPcSession && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  )}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center space-x-2">
                    <span>Code de validation (Connexion PC)</span>
                    {pendingPcSession && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-[10px] font-black text-amber-700 dark:text-amber-300 animate-pulse">
                        Connexion en attente !
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Générez votre code à 6 chiffres ou autorisez une connexion depuis un ordinateur
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </button>

            {/* 5. Dark mode toggle row */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-700" />
                  )}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Mode Sombre / Apparence
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Actuellement en thème {darkMode ? 'Sombre' : 'Clair'}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400">
                {darkMode ? 'Actif' : 'Désactivé'}
              </span>
            </button>

            {/* 5. Notifications toggle row */}
            <button
              type="button"
              onClick={onToggleNotificationsEnabled}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <BellOff className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Notifications en temps réel
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alertes de messages, invitations et activités
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400">
                {notificationsEnabled ? 'Activées' : 'Sourdine'}
              </span>
            </button>
          </div>

          {/* SECTION 2: Vos Raccourcis & Espaces Collaboratifs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                Tous vos raccourcis
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Outils & Espaces MK
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {shortcutCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={card.onClick}
                    className="group p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 shadow-2xs text-left flex items-start justify-between gap-3.5 transition cursor-pointer"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                            {card.label}
                          </span>
                          {card.badgeCount !== undefined && card.badgeCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-mono tabular-nums font-bold">
                              {card.badgeCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {card.subtitle}
                        </p>
                        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-2">
                          {card.meta}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full-width Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3 px-4 rounded-2xl bg-slate-200/80 hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-600 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </>
      )}
    </div>
  );
};
