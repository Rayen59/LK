import React from 'react';
import { User, AppNotification } from '../types';
import {
  MessageSquare,
  BookOpen,
  BarChart3,
  Bookmark,
  LogOut,
  ShieldAlert,
  Moon,
  Sun,
  Film,
  MessageCircle,
  Users,
  Sparkles,
  ArrowLeft,
  Search,
  Compass,
  User as UserIcon
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { SlidingPanel } from './SlidingPanel';

export type MainTabType =
  | 'feed'
  | 'reels'
  | 'chat'
  | 'profile'
  | 'forums'
  | 'quizzes'
  | 'polls'
  | 'spaces'
  | 'admin';

interface HeaderProps {
  currentUser: User;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  onLogout: () => void;
  isLiveConnected: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenDocSearch: () => void;
  // Notifications
  notifications: AppNotification[];
  onNotificationsChange: (notifications: AppNotification[]) => void;
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: () => void;
  latestPushNotification: AppNotification | null;
  onDismissPushNotification: () => void;
  // Portal hub modal
  isSlidingPanelOpen: boolean;
  onToggleSlidingPanel: () => void;
  onCloseSlidingPanel: () => void;
  // Friends & Chat badges
  onOpenFriendsModal?: () => void;
  unreadMessagesCount?: number;
  pendingFriendRequestsCount?: number;
}

const PAGE_METADATA: Record<
  MainTabType,
  { category: string; title: string; subtitle: string }
> = {
  feed: {
    category: 'Espace Social',
    title: "Fil d'actualité",
    subtitle: 'Publications, documents partagés et actualités des membres'
  },
  reels: {
    category: 'Médias Courts',
    title: 'Reels Vidéo',
    subtitle: 'Créations et vidéos verticales de moins de 60 secondes'
  },
  chat: {
    category: 'Communication',
    title: 'Messagerie Directe',
    subtitle: 'Discussions privées instantanées et partage multimédia'
  },
  forums: {
    category: 'Collaboration',
    title: 'Communautés & Salons',
    subtitle: 'Espaces de discussion thématiques publics et privés'
  },
  quizzes: {
    category: 'Apprentissage',
    title: 'Quiz & Classements',
    subtitle: 'Évaluations QCM interactives et tableau d’honneur'
  },
  polls: {
    category: 'Consultations',
    title: 'Sondages',
    subtitle: 'Votes en temps réel et avis de la communauté'
  },
  spaces: {
    category: 'Bibliothèque',
    title: 'Mes Espaces',
    subtitle: 'Dossiers personnels et publications enregistrées'
  },
  profile: {
    category: 'Compte Membre',
    title: 'Profil & Publications',
    subtitle: 'Informations personnelles, amis et paramètres de confidentialité'
  },
  admin: {
    category: 'Supervision',
    title: 'Administration & Modération',
    subtitle: 'Gestion des membres, permissions et sécurité du réseau'
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onGoBack,
  canGoBack = false,
  onLogout,
  darkMode,
  onToggleDarkMode,
  onOpenDocSearch,
  notifications,
  onNotificationsChange,
  notificationsEnabled,
  onToggleNotificationsEnabled,
  latestPushNotification,
  onDismissPushNotification,
  isSlidingPanelOpen,
  onToggleSlidingPanel,
  onCloseSlidingPanel,
  onOpenFriendsModal,
  unreadMessagesCount = 0,
  pendingFriendRequestsCount = 0
}) => {
  const [isNotificationBoxOpen, setIsNotificationBoxOpen] = React.useState(false);
  const isAdmin = currentUser.role === 'admin';
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const currentMeta = PAGE_METADATA[activeTab] || PAGE_METADATA.feed;

  const mobileTabs: {
    id: MainTabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    unreadCount?: number;
  }[] = [
    { id: 'feed', label: 'Accueil', icon: Sparkles },
    { id: 'reels', label: 'Reels', icon: Film },
    { id: 'chat', label: 'Messages', icon: MessageCircle, unreadCount: unreadMessagesCount },
    { id: 'forums', label: 'Communautés', icon: MessageSquare },
    { id: 'quizzes', label: 'Quiz', icon: BookOpen },
    { id: 'polls', label: 'Sondages', icon: BarChart3 },
    { id: 'spaces', label: 'Espaces', icon: Bookmark },
    { id: 'profile', label: 'Mon Profil', icon: UserIcon }
  ];

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0a1124]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="w-full px-3 sm:px-5 lg:px-7">
          {/* Primary Top Workspace Bar (3-Zone Contract) */}
          <div className="flex items-center justify-between h-14 sm:h-15 gap-3">
            
            {/* ZONE 1: Brand (on mobile) + Back Button + Clear Page Breadcrumb Title */}
            <div className="flex items-center space-x-2.5 min-w-0 shrink-0">
              {/* Mobile/Tablet Brand Mark (Desktop has the Left Workspace Sidebar) */}
              <button
                type="button"
                onClick={() => onTabChange('feed')}
                className="lg:hidden flex items-center space-x-2 shrink-0 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs tracking-tight shadow-xs">
                  MK
                </div>
              </button>

              {canGoBack && onGoBack && (
                <button
                  id="header-back-arrow-btn"
                  type="button"
                  onClick={onGoBack}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
                  title="Revenir à la page précédente"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Retour</span>
                </button>
              )}

              {/* Contextual Breadcrumb & Page Title */}
              <div className="min-w-0 flex items-center space-x-2">
                <span className="hidden xl:inline text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {currentMeta.category}
                </span>
                <span
                  aria-hidden="true"
                  className="hidden xl:inline text-slate-300 dark:text-slate-700 text-xs"
                >
                  /
                </span>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate whitespace-nowrap">
                  {currentMeta.title}
                </h1>
              </div>
            </div>

            {/* ZONE 2: Global Search Bar Trigger */}
            <div className="flex-1 max-w-md mx-2 hidden md:block">
              <button
                type="button"
                onClick={onOpenDocSearch}
                className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 transition cursor-pointer"
              >
                <span className="flex items-center space-x-2 truncate">
                  <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">
                    Rechercher un membre, un cours, une publication...
                  </span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-2 shrink-0">
                  Explorer
                </span>
              </button>
            </div>

            {/* ZONE 3: Primary Workspace Actions */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              {/* Mobile Search Trigger */}
              <button
                type="button"
                onClick={onOpenDocSearch}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Rechercher"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Friends & Network Button */}
              {onOpenFriendsModal && (
                <button
                  type="button"
                  onClick={onOpenFriendsModal}
                  className="relative px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center space-x-1.5 text-xs font-semibold shrink-0 cursor-pointer whitespace-nowrap"
                  title="Réseau, amis et invitations"
                >
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">Réseau</span>
                  {pendingFriendRequestsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-mono tabular-nums font-bold">
                      {pendingFriendRequestsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Notification Center */}
              <NotificationCenter
                currentUser={currentUser}
                notifications={notifications}
                onNotificationsChange={onNotificationsChange}
                onNavigateTab={(tab) => onTabChange(tab as MainTabType)}
                notificationsEnabled={notificationsEnabled}
                onToggleNotificationsEnabled={onToggleNotificationsEnabled}
                latestPushNotification={latestPushNotification}
                onDismissPushNotification={onDismissPushNotification}
                isOpen={isNotificationBoxOpen}
                onToggleOpen={() => setIsNotificationBoxOpen((prev) => !prev)}
                onClose={() => setIsNotificationBoxOpen(false)}
              />

              {/* Dark Mode Toggle */}
              <button
                id="theme-toggle-btn"
                type="button"
                onClick={onToggleDarkMode}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition shrink-0 cursor-pointer"
                title={darkMode ? 'Passer en mode clair' : 'Activer le mode sombre'}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {/* Portail des Pages Button (Opens the Centered Bento Hub Modal) */}
              <button
                id="mobile-sliding-panel-btn"
                type="button"
                onClick={onToggleSlidingPanel}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 cursor-pointer whitespace-nowrap border ${
                  isSlidingPanelOpen
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-slate-700'
                }`}
                title="Ouvrir la vue d'ensemble de toutes les pages"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="hidden sm:inline">Toutes les pages</span>
              </button>

              {/* Profile Quick Chip */}
              <button
                type="button"
                onClick={() => onTabChange('profile')}
                className={`hidden sm:flex items-center space-x-2 py-1 px-2 rounded-xl transition cursor-pointer shrink-0 border ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600'
                    : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
                title="Voir mon profil"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.prenom}
                  className="w-6 h-6 rounded-full object-cover border border-blue-500 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[90px] truncate">
                  {currentUser.prenom}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Horizontal Section Switcher (Visible when Left Sidebar is hidden) */}
          <div className="lg:hidden flex items-center gap-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-100 dark:border-slate-800/80">
            {mobileTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.unreadCount !== undefined && item.unreadCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums font-bold ${
                        isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}

            {isAdmin && (
              <button
                type="button"
                onClick={() => onTabChange('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Centered Executive Page Directory Modal */}
      <SlidingPanel
        isOpen={isSlidingPanelOpen}
        onClose={onCloseSlidingPanel}
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        notificationsEnabled={notificationsEnabled}
        onToggleNotificationsEnabled={onToggleNotificationsEnabled}
        onOpenDocSearch={onOpenDocSearch}
        onOpenNotifications={() => setIsNotificationBoxOpen(true)}
        unreadNotificationsCount={unreadCount}
        onOpenFriendsModal={onOpenFriendsModal}
        unreadMessagesCount={unreadMessagesCount}
        pendingFriendRequestsCount={pendingFriendRequestsCount}
      />
    </>
  );
};
