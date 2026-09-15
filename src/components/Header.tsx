import React from 'react';
import { User, AppNotification } from '../types';
import {
  Radio,
  MessageSquare,
  BookOpen,
  BarChart3,
  Bookmark,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
  Moon,
  Sun,
  Files,
  Film,
  MessageCircle,
  Users,
  User as UserIcon,
  Sparkles,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { SlidingPanel } from './SlidingPanel';

export type MainTabType = 'feed' | 'reels' | 'chat' | 'profile' | 'forums' | 'quizzes' | 'polls' | 'spaces' | 'admin';

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
  // Sliding panel
  isSlidingPanelOpen: boolean;
  onToggleSlidingPanel: () => void;
  onCloseSlidingPanel: () => void;
  // Friends & Chat badges
  onOpenFriendsModal?: () => void;
  unreadMessagesCount?: number;
  pendingFriendRequestsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onGoBack,
  canGoBack = false,
  onLogout,
  isLiveConnected,
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
  pendingFriendRequestsCount = 0,
}) => {
  const [isNotificationBoxOpen, setIsNotificationBoxOpen] = React.useState(false);
  const isAdmin = currentUser.role === 'admin';
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  interface NavItem {
    id: MainTabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    unreadCount?: number;
  }

  const navItems: NavItem[] = [
    { id: 'feed', label: 'Fil Social', icon: Sparkles },
    { id: 'reels', label: 'Reels', icon: Film, badge: '<60s' },
    { id: 'chat', label: 'Messages', icon: MessageCircle, unreadCount: unreadMessagesCount },
    { id: 'forums', label: 'Communautés', icon: MessageSquare },
    { id: 'quizzes', label: 'Quiz', icon: BookOpen },
    { id: 'polls', label: 'Sondages', icon: BarChart3 },
    { id: 'spaces', label: 'Espaces', icon: Bookmark },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-white/95 dark:bg-[#0a1124]/95 backdrop-blur-xl border-b border-blue-100/80 dark:border-blue-950/80 text-slate-900 dark:text-slate-100 shadow-xs transition-colors">
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-15 sm:h-16 gap-1.5 sm:gap-4">
            
            {/* Left: Back Arrow + Logo & Social Branding */}
            <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 shrink-0">
              {/* Permanent Back Arrow button whenever canGoBack */}
              {canGoBack && onGoBack && (
                <button
                  id="header-back-arrow-btn"
                  onClick={onGoBack}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/80 text-xs font-semibold transition-all active:scale-95 group shrink-0"
                  title="Revenir à la page précédente"
                  aria-label="Revenir à la page précédente"
                >
                  <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-300 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                  <span className="hidden sm:inline">Retour</span>
                </button>
              )}

              <div
                className="flex items-center space-x-2.5 cursor-pointer select-none min-w-0 shrink-0 group"
                onClick={() => onTabChange('feed')}
              >
                <div className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0 border border-blue-400/30">
                  <span className="font-black text-xs sm:text-sm tracking-tight text-white drop-shadow-xs">MK</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1 sm:space-x-1.5">
                    <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                      MK<span className="text-blue-600 dark:text-blue-400 font-semibold ml-0.5">Social</span>
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-blue-300/70 hidden md:block font-medium truncate">
                    Réseau Social Professionnel & Échanges
                  </p>
                </div>
              </div>
            </div>

            {/* Middle: Desktop Navigation links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-btn-${item.id}`}
                    onClick={() => onTabChange(item.id as MainTabType)}
                    className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50/70 dark:hover:bg-blue-950/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.unreadCount !== undefined && item.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                        {item.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {isAdmin && (
                <button
                  id="nav-btn-admin"
                  onClick={() => onTabChange('admin')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Modération</span>
                </button>
              )}
            </nav>

            {/* Right Controls (Carefully scaled to never overflow on mobile) */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
              
              {/* Friends Button */}
              {onOpenFriendsModal && (
                <button
                  onClick={onOpenFriendsModal}
                  className="hidden sm:flex relative p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition items-center space-x-1 text-xs font-semibold shrink-0"
                  title="Gérer les amis et invitations"
                >
                  <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden xl:inline">Amis</span>
                  {pendingFriendRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0a1124] shadow-xs animate-pulse">
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

              {/* Quick Document Search button */}
              <button
                onClick={onOpenDocSearch}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition flex items-center space-x-1 text-xs font-semibold shrink-0"
                title="Rechercher des documents, cours, vocaux"
              >
                <Files className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="hidden 2xl:inline">Docs</span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                id="theme-toggle-btn"
                onClick={onToggleDarkMode}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition shrink-0"
                title={darkMode ? "Passer en mode clair" : "Activer le mode sombre"}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600" />
                )}
              </button>

              {/* Current User Profile chip */}
              <div
                onClick={() => onTabChange('profile')}
                className={`hidden md:flex items-center space-x-2 py-1 px-2.5 rounded-xl transition cursor-pointer shrink-0 border ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-2xs'
                    : 'bg-white dark:bg-[#0f1a38] border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs'
                }`}
                title="Consulter mon profil et mes publications"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.prenom}
                    className="w-7 h-7 rounded-full object-cover border-2 border-blue-500 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  {currentUser.isLocked && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[8px] font-black" title="Profil verrouillé">
                      🔒
                    </span>
                  )}
                </div>
                <div className="text-left min-w-0 max-w-[95px]">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.prenom}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-300 font-medium truncate">
                    {currentUser.promo || 'Profil'}
                  </div>
                </div>
              </div>

              {/* THE 3-TIRETS (HAMBURGER) BUTTON FOR SLIDING PANEL */}
              <button
                id="mobile-sliding-panel-btn"
                onClick={onToggleSlidingPanel}
                className="p-2 sm:px-2.5 sm:py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0f1a38] hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900 rounded-xl transition flex items-center space-x-1.5 shrink-0 shadow-2xs"
                title="Ouvrir le menu complet"
                aria-label="Menu coulissant"
              >
                <Menu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200">
                  Menu
                </span>
              </button>

            </div>
          </div>
        </div>
      </header>

      {/* THE SLIDING PANEL (DRAWER) */}
      <SlidingPanel
        isOpen={isSlidingPanelOpen}
        onClose={onCloseSlidingPanel}
        currentUser={currentUser}
        activeTab={activeTab as any}
        onTabChange={(tab) => onTabChange(tab as MainTabType)}
        onLogout={onLogout}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        notificationsEnabled={notificationsEnabled}
        onToggleNotificationsEnabled={onToggleNotificationsEnabled}
        onOpenDocSearch={onOpenDocSearch}
        onOpenNotifications={() => setIsNotificationBoxOpen(true)}
        unreadNotificationsCount={unreadCount}
      />
    </>
  );
};

