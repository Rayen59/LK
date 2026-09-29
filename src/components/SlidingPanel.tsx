import React from 'react';
import { User } from '../types';
import {
  Sparkles,
  Film,
  MessageCircle,
  User as UserIcon,
  MessageSquare,
  BookOpen,
  BarChart3,
  Bookmark,
  ShieldAlert,
  ShieldCheck,
  Search,
  Moon,
  Sun,
  Bell,
  BellOff,
  LogOut,
  X,
  ArrowUpRight,
  Users,
  Lock,
  Unlock,
  LayoutGrid,
  Compass
} from 'lucide-react';
import { MainTabType } from './Header';

interface SlidingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: () => void;
  onOpenDocSearch: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onOpenFriendsModal?: () => void;
  unreadMessagesCount?: number;
  pendingFriendRequestsCount?: number;
}

export const SlidingPanel: React.FC<SlidingPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeTab,
  onTabChange,
  onLogout,
  darkMode,
  onToggleDarkMode,
  notificationsEnabled,
  onToggleNotificationsEnabled,
  onOpenDocSearch,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenFriendsModal,
  unreadMessagesCount = 0,
  pendingFriendRequestsCount = 0
}) => {
  const isAdmin = currentUser.role === 'admin';

  if (!isOpen) return null;

  const socialPages = [
    {
      id: 'feed',
      label: "Fil d'actualité",
      subtitle: 'Publications, documents, notes vocales et actualités du réseau',
      meta: 'Flux principal',
      icon: Sparkles,
      accent: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
      isActive: activeTab === 'feed',
      onClick: () => {
        onTabChange('feed');
        onClose();
      }
    },
    {
      id: 'reels',
      label: 'Reels Vidéo',
      subtitle: 'Créations courtes et vidéos verticales de moins de 60 secondes',
      meta: 'Format < 60s',
      icon: Film,
      accent: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
      isActive: activeTab === 'reels',
      onClick: () => {
        onTabChange('reels');
        onClose();
      }
    },
    {
      id: 'chat',
      label: 'Messagerie Directe',
      subtitle: 'Conversations privées instantanées, envoi de fichiers et audio',
      meta: unreadMessagesCount > 0 ? `${unreadMessagesCount} non lu(s)` : 'Temps réel',
      badgeCount: unreadMessagesCount,
      icon: MessageCircle,
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
      isActive: activeTab === 'chat',
      onClick: () => {
        onTabChange('chat');
        onClose();
      }
    },
    {
      id: 'friends',
      label: 'Réseau & Amis',
      subtitle: 'Gérez vos contacts, vos demandes reçues et découvrez des membres',
      meta: pendingFriendRequestsCount > 0 ? `${pendingFriendRequestsCount} demande(s)` : 'Annuaire membres',
      badgeCount: pendingFriendRequestsCount,
      icon: Users,
      accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
      isActive: false,
      onClick: () => {
        onClose();
        onOpenFriendsModal?.();
      }
    }
  ];

  const workspacePages = [
    {
      id: 'forums',
      label: 'Communautés & Salons',
      subtitle: 'Espaces de discussion thématiques publics ou privés par code',
      meta: 'Salons collaboratifs',
      icon: MessageSquare,
      accent: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60',
      isActive: activeTab === 'forums',
      onClick: () => {
        onTabChange('forums');
        onClose();
      }
    },
    {
      id: 'quizzes',
      label: 'Quiz & Classements',
      subtitle: 'Testez vos connaissances avec des QCM interactifs et suivez le podium',
      meta: 'Évaluations & Scores',
      icon: BookOpen,
      accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
      isActive: activeTab === 'quizzes',
      onClick: () => {
        onTabChange('quizzes');
        onClose();
      }
    },
    {
      id: 'polls',
      label: 'Sondages Communautaires',
      subtitle: 'Consultations rapides et votes en direct avec résultats visuels',
      meta: 'Votes & Opinions',
      icon: BarChart3,
      accent: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
      isActive: activeTab === 'polls',
      onClick: () => {
        onTabChange('polls');
        onClose();
      }
    },
    {
      id: 'spaces',
      label: 'Mes Espaces & Favoris',
      subtitle: 'Classez et retrouvez les publications et ressources que vous avez sauvegardées',
      meta: 'Bibliothèque personnelle',
      icon: Bookmark,
      accent: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60',
      isActive: activeTab === 'spaces',
      onClick: () => {
        onTabChange('spaces');
        onClose();
      }
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Portail de navigation MK"
    >
      {/* Clean Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      />

      {/* Centered Executive Hub Modal */}
      <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#0d1528] text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] animate-fadeIn">
        
        {/* Top Header of the Hub */}
        <div className="shrink-0 px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4 bg-slate-50/60 dark:bg-[#0a1120]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                Portail des Pages & Organisation MK
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Accédez directement à chaque espace de la plateforme en un clic
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDocSearch();
              }}
              className="hidden sm:flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Recherche globale</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-300/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Fermer le portail"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Bento Directory */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
          
          {/* Top Account & Quick Utility Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            {/* Profile Summary Card */}
            <div
              onClick={() => {
                onTabChange('profile');
                onClose();
              }}
              className={`md:col-span-7 p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                activeTab === 'profile'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500'
                  : 'bg-slate-50/80 dark:bg-[#131d35] border-slate-200/80 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.prenom}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
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
                </div>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0 whitespace-nowrap">
                Mon Profil
              </span>
            </div>

            {/* Quick Search & Alerts */}
            <div className="md:col-span-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDocSearch();
                }}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#131d35] border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 flex flex-col justify-between text-left transition cursor-pointer"
              >
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-2" />
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Rechercher
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Posts, PDF, membres
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNotifications?.();
                }}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#131d35] border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 flex flex-col justify-between text-left transition cursor-pointer relative"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <Bell className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  {unreadNotificationsCount > 0 && (
                    <span className="text-xs font-mono tabular-nums font-extrabold text-rose-600 dark:text-rose-400">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Notifications
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {unreadNotificationsCount > 0
                      ? `${unreadNotificationsCount} nouvelle(s)`
                      : 'Centre d’alertes'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 1: Espace Social & Échanges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                01. Réseau Social & Communication
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                4 espaces principaux
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {socialPages.map((page) => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={page.onClick}
                    className={`group p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      page.isActive
                        ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 dark:border-blue-500'
                        : 'bg-white dark:bg-[#131d35] border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${page.accent}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {page.label}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {page.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{page.meta}</span>
                      {page.isActive && (
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          Page active
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Collaboration, Culture & Savoir */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                02. Espaces Collaboratifs, Quiz & Bibliothèque
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Outils interactifs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {workspacePages.map((page) => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={page.onClick}
                    className={`group p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      page.isActive
                        ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 dark:border-blue-500'
                        : 'bg-white dark:bg-[#131d35] border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${page.accent}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {page.label}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {page.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{page.meta}</span>
                      {page.isActive && (
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          Page active
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Console Banner (if admin) */}
          {isAdmin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onTabChange('admin');
                  onClose();
                }}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-blue-900 text-white border-blue-700'
                    : 'bg-slate-50 dark:bg-[#131d35] border-slate-200 dark:border-slate-800 hover:border-blue-500'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">
                      03. Console d'Administration & Modération
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Supervision des membres, gestion des rôles, restrictions et contenus signalés
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Preferences & Session Bar */}
        <div className="shrink-0 px-5 sm:px-7 py-3.5 bg-slate-50 dark:bg-[#0a1120] border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition cursor-pointer"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
              <span>Thème : {darkMode ? 'Sombre' : 'Clair'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleNotificationsEnabled}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition cursor-pointer"
            >
              {notificationsEnabled ? (
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-400" />
              )}
              <span>Alertes : {notificationsEnabled ? 'Activées' : 'Sourdine'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
