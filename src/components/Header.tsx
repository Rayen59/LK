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
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#0b0f19]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-850 text-slate-900 dark:text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-colors">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-15 sm:h-16 gap-2 sm:gap-4">
            
            {/* Left: Back Arrow + Logo & Social Branding */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink-0">
              {/* Permanent Back Arrow button whenever canGoBack */}
              {canGoBack && onGoBack && (
                <button
                  id="header-back-arrow-btn"
                  onClick={onGoBack}
                  className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold transition-all active:scale-95 group shrink-0"
                  title="Revenir à la page précédente"
                  aria-label="Revenir à la page précédente"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                  <span className="hidden sm:inline">Retour</span>
                </button>
              )}

              <div
                className="flex items-center space-x-2.5 cursor-pointer select-none min-w-0 shrink-0 group"
                onClick={() => onTabChange('feed')}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
                  <span className="font-extrabold text-sm tracking-tight">MK</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                      MK<span className="text-indigo-600 dark:text-indigo-400 font-normal ml-0.5">Social</span>
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900 shrink-0">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden md:block font-medium truncate">
                    Fil • Reels • Messagerie
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
                    className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive 
                          ? 'bg-indigo-500 text-white dark:bg-indigo-600' 
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.unreadCount !== undefined && item.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Modération</span>
                </button>
              )}
            </nav>

            {/* Right: Reels + Messages (exterior for mobile) + Friends Button + Notification Box + Document Search + Dark Mode + Profile + Menu Button */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
              
              {/* Direct Exterior REELS button for mobile/tablet */}
              <button
                id="header-direct-reels-btn"
                onClick={() => onTabChange('reels')}
                className={`lg:hidden relative p-2 rounded-xl transition flex items-center space-x-1 text-xs font-semibold shrink-0 ${
                  activeTab === 'reels'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
                title="Reels (<60s)"
              >
                <Film className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="text-[9px] font-bold px-1 rounded-full bg-indigo-500 text-white hidden sm:inline">
                  &lt;60s
                </span>
              </button>

              {/* Direct Exterior CONVERSATIONS button for mobile/tablet */}
              <button
                id="header-direct-chat-btn"
                onClick={() => onTabChange('chat')}
                className={`lg:hidden relative p-2 rounded-xl transition flex items-center space-x-1 text-xs font-semibold shrink-0 ${
                  activeTab === 'chat'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
                title="Messagerie instantanée"
              >
                <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0b0f19] animate-pulse">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              {/* Amis & Invitations Button */}
              {onOpenFriendsModal && (
                <button
                  onClick={onOpenFriendsModal}
                  className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition flex items-center space-x-1 text-xs font-medium shrink-0"
                  title="Gérer les amis et invitations"
                >
                  <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden xl:inline">Amis</span>
                  {pendingFriendRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0b0f19] shadow-xs animate-pulse">
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
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition flex items-center space-x-1 text-xs font-medium shrink-0"
                title="Rechercher des documents, cours, vocaux"
              >
                <Files className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="hidden 2xl:inline">Docs</span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                id="theme-toggle-btn"
                onClick={onToggleDarkMode}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition shrink-0"
                title={darkMode ? "Passer en mode clair" : "Activer le mode sombre"}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600" />
                )}
              </button>

              {/* Current User Profile chip (Clicks to open Mon Profil directly!) */}
              <div
                onClick={() => onTabChange('profile')}
                className={`hidden sm:flex items-center space-x-2 py-1 px-2 rounded-xl transition cursor-pointer shrink-0 border ${
                  activeTab === 'profile'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                    : 'bg-slate-100/80 dark:bg-slate-850 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                title="Consulter mon profil et mes publications"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.prenom}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  {currentUser.isLocked && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[8px] font-black" title="Profil verrouillé">
                      🔒
                    </span>
                  )}
                </div>
                <div className="text-left min-w-0 max-w-[100px]">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {currentUser.prenom}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.promo || 'Profil'}
                  </div>
                </div>
              </div>

              {/* THE 3-TIRETS (HAMBURGER) BUTTON FOR SLIDING PANEL */}
              <button
                id="mobile-sliding-panel-btn"
                onClick={onToggleSlidingPanel}
                className="p-2 sm:px-2.5 sm:py-2 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 rounded-xl transition flex items-center space-x-1.5 shrink-0"
                title="Ouvrir le menu complet"
                aria-label="Menu coulissant"
              >
                <Menu className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                <span className="hidden sm:inline text-xs font-semibold">
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

