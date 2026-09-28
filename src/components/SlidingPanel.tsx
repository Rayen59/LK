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
  ChevronRight,
  Users,
  Lock,
  Unlock
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

  const shortcutCards: {
    id: string;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    badgeCount?: number;
    badgeText?: string;
    onClick: () => void;
    isActive?: boolean;
  }[] = [
    {
      id: 'feed',
      label: 'Accueil (Fil)',
      desc: 'Publications & actus',
      icon: Sparkles,
      iconBg: 'bg-blue-600 text-white',
      isActive: activeTab === 'feed',
      onClick: () => {
        onTabChange('feed');
        onClose();
      }
    },
    {
      id: 'friends',
      label: 'Amis & Invitations',
      desc: 'Suggestions & demandes',
      icon: Users,
      iconBg: 'bg-indigo-600 text-white',
      badgeCount: pendingFriendRequestsCount,
      onClick: () => {
        onClose();
        onOpenFriendsModal?.();
      }
    },
    {
      id: 'chat',
      label: 'Messages',
      desc: 'Discussions privées',
      icon: MessageCircle,
      iconBg: 'bg-emerald-600 text-white',
      badgeCount: unreadMessagesCount,
      isActive: activeTab === 'chat',
      onClick: () => {
        onTabChange('chat');
        onClose();
      }
    },
    {
      id: 'reels',
      label: 'Reels Vidéo',
      desc: 'Vidéos courtes <60s',
      icon: Film,
      iconBg: 'bg-rose-600 text-white',
      badgeText: '<60s',
      isActive: activeTab === 'reels',
      onClick: () => {
        onTabChange('reels');
        onClose();
      }
    },
    {
      id: 'forums',
      label: 'Communautés',
      desc: 'Salons & débats',
      icon: MessageSquare,
      iconBg: 'bg-violet-600 text-white',
      isActive: activeTab === 'forums',
      onClick: () => {
        onTabChange('forums');
        onClose();
      }
    },
    {
      id: 'quizzes',
      label: 'Quiz & Défis',
      desc: 'QCM & classements',
      icon: BookOpen,
      iconBg: 'bg-amber-500 text-white',
      isActive: activeTab === 'quizzes',
      onClick: () => {
        onTabChange('quizzes');
        onClose();
      }
    },
    {
      id: 'polls',
      label: 'Sondages',
      desc: 'Votes de la communauté',
      icon: BarChart3,
      iconBg: 'bg-teal-600 text-white',
      isActive: activeTab === 'polls',
      onClick: () => {
        onTabChange('polls');
        onClose();
      }
    },
    {
      id: 'spaces',
      label: 'Mes Espaces',
      desc: 'Publications enregistrées',
      icon: Bookmark,
      iconBg: 'bg-sky-600 text-white',
      isActive: activeTab === 'spaces',
      onClick: () => {
        onTabChange('spaces');
        onClose();
      }
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
    >
      {/* High-contrast Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
      />

      {/* Sliding Drawer Container */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[360px] sm:max-w-[390px] bg-slate-100 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800 animate-fadeIn">
        
        {/* Drawer Header */}
        <div className="shrink-0 px-4 py-3.5 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {/* Clear 3-bars icon badge */}
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center space-y-1 shadow-xs">
              <span className="w-4 h-0.5 bg-white rounded-full" />
              <span className="w-4 h-0.5 bg-white rounded-full" />
              <span className="w-4 h-0.5 bg-white rounded-full" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Menu Principal
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Accès rapide à tout MK Social
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title="Fermer le menu"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5">
          
          {/* 1. User Profile Card (Facebook-style top card) */}
          <div
            onClick={() => {
              onTabChange('profile');
              onClose();
            }}
            className="p-3.5 rounded-2xl bg-white dark:bg-[#131d33] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.prenom}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                  referrerPolicy="no-referrer"
                />
                {currentUser.isLocked && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black"
                    title="Profil verrouillé"
                  >
                    🔒
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {currentUser.prenom} {currentUser.nom}
                  </span>
                  {isAdmin ? (
                    <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded-md">
                      Admin
                    </span>
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                </div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                  Voir mon profil • {currentUser.promo || 'Membre'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center space-x-1">
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
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </div>

          {/* 2. Quick Search & Notifications Bar */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDocSearch();
              }}
              className="p-3 rounded-2xl bg-white dark:bg-[#131d33] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 flex items-center space-x-2.5 text-left shadow-2xs transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Rechercher
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Membres, posts
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNotifications?.();
              }}
              className="p-3 rounded-2xl bg-white dark:bg-[#131d33] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 flex items-center space-x-2.5 text-left shadow-2xs transition cursor-pointer relative"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  Alertes
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {unreadNotificationsCount > 0
                    ? `${unreadNotificationsCount} non lue(s)`
                    : 'Notifications'}
                </div>
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          {/* 3. Raccourcis Principaux (2-Column Clear Cards like Facebook Menu) */}
          <div>
            <div className="px-1 mb-2 text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Toutes les rubriques
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {shortcutCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={card.onClick}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between relative cursor-pointer shadow-2xs ${
                      card.isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-white dark:bg-[#131d33] border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div
                        className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shadow-2xs`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>

                      {card.badgeCount !== undefined && card.badgeCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                          {card.badgeCount}
                        </span>
                      )}

                      {card.badgeText && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                          {card.badgeText}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white leading-snug">
                        {card.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {card.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Moderation Card (if admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onTabChange('admin');
                onClose();
              }}
              className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-white dark:bg-[#131d33] border-purple-300 dark:border-purple-800/80 text-slate-900 dark:text-white hover:bg-purple-50 dark:hover:bg-purple-950/40'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-extrabold">Administration & Modération</div>
                  <div
                    className={`text-[11px] ${
                      activeTab === 'admin'
                        ? 'text-purple-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Gérer les membres, droits et publications
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* 4. Paramètres & Préférences */}
          <div className="space-y-2 pt-1">
            <div className="px-1 text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Paramètres & Affichage
            </div>

            {/* Dark Mode Toggle Row */}
            <div
              onClick={onToggleDarkMode}
              className="p-3 rounded-2xl bg-white dark:bg-[#131d33] border border-slate-200/90 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-400 transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Thème d'affichage
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Actuellement : <strong>{darkMode ? 'Mode Sombre' : 'Mode Clair'}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-label="Basculer le mode sombre"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  darkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications Toggle Row */}
            <div
              onClick={onToggleNotificationsEnabled}
              className="p-3 rounded-2xl bg-white dark:bg-[#131d33] border border-slate-200/90 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-400 transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  {notificationsEnabled ? (
                    <Bell className="w-4.5 h-4.5" />
                  ) : (
                    <BellOff className="w-4.5 h-4.5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Bannières de notification
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {notificationsEnabled ? 'Alertes activées' : 'Alertes en sourdine'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-label="Basculer les notifications"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Clear Logout Button */}
        <div className="shrink-0 p-3.5 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
