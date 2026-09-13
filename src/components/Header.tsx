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
      <header className="sticky top-0 z-40 bg-slate-900 dark:bg-slate-950 border-b border-slate-800 text-white shadow-xl transition-colors">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-1.5 sm:gap-3">
            
            {/* Left: Back Arrow + Logo & Social Branding */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink-0">
              {/* Permanent Back Arrow button whenever canGoBack */}
              {canGoBack && onGoBack && (
                <button
                  id="header-back-arrow-btn"
                  onClick={onGoBack}
                  className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/40 hover:border-teal-400 text-xs font-black transition-all shadow-md active:scale-95 group shrink-0"
                  title="Revenir à la page précédente"
                  aria-label="Revenir à la page précédente"
                >
                  <ArrowLeft className="w-4 h-4 text-teal-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform shrink-0" />
                  <span className="hidden sm:inline">Retour</span>
                </button>
              )}

              <div
                className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none min-w-0 shrink-0"
                onClick={() => onTabChange('feed')}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
                  <span className="font-black text-sm sm:text-base tracking-tighter">MK</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-base sm:text-xl tracking-tight text-white whitespace-nowrap">
                      MK <span className="text-teal-400">Social</span>
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-800 shrink-0">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 hidden md:block font-medium truncate">
                    Publications, Reels & Messagerie Instantanée
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
                    className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-950/60'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-pink-500 text-white">
                        {item.badge}
                      </span>
                    )}
                    {item.unreadCount !== undefined && item.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
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
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                      : 'text-purple-300 hover:text-white hover:bg-purple-950/50 border border-purple-500/40'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>Modération</span>
                </button>
              )}
            </nav>

            {/* Right: Friends Button + Notification Box + Document Search + Dark Mode + Profile + Menu Button */}
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              
              {/* Amis & Invitations Button */}
              {onOpenFriendsModal && (
                <button
                  onClick={onOpenFriendsModal}
                  className="relative p-2 text-slate-300 hover:text-teal-300 hover:bg-slate-800/80 rounded-xl transition flex items-center space-x-1 text-xs font-semibold shrink-0"
                  title="Gérer les amis et invitations"
                >
                  <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-teal-400" />
                  <span className="hidden xl:inline">Amis</span>
                  {pendingFriendRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-slate-900 shadow-sm animate-pulse">
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
                className="p-2 text-slate-300 hover:text-teal-300 hover:bg-slate-800/80 rounded-xl transition flex items-center space-x-1 text-xs font-semibold shrink-0"
                title="Rechercher des documents, cours, vocaux"
              >
                <Files className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-teal-400" />
                <span className="hidden 2xl:inline">Docs</span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                id="theme-toggle-btn"
                onClick={onToggleDarkMode}
                className="p-2 text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 rounded-xl transition shrink-0"
                title={darkMode ? "Passer en mode clair" : "Activer le mode sombre"}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-300" />
                )}
              </button>

              {/* Current User Profile chip (Clicks to open Mon Profil directly!) */}
              <div
                onClick={() => onTabChange('profile')}
                className={`hidden sm:flex items-center space-x-2 border cursor-pointer py-1 px-2.5 rounded-xl transition shrink-0 ${
                  activeTab === 'profile'
                    ? 'bg-teal-600/30 border-teal-400 text-white'
                    : 'bg-slate-800/80 dark:bg-slate-900 border-slate-700 hover:border-teal-500/50'
                }`}
                title="Consulter mon profil et mes publications"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.prenom}
                    className="w-7 h-7 rounded-full object-cover border border-teal-500 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  {currentUser.isLocked && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[8px] font-black" title="Profil verrouillé">
                      🔒
                    </span>
                  )}
                </div>
                <div className="text-left min-w-0 max-w-[100px]">
                  <div className="text-xs font-bold text-slate-100 truncate">
                    {currentUser.prenom}
                  </div>
                  <div className="text-[10px] text-teal-300 font-medium truncate">
                    {currentUser.promo || 'Profil'}
                  </div>
                </div>
              </div>

              {/* THE 3-TIRETS (HAMBURGER) BUTTON FOR SLIDING PANEL */}
              <button
                id="mobile-sliding-panel-btn"
                onClick={onToggleSlidingPanel}
                className="p-2 sm:px-2.5 sm:py-2 text-white bg-slate-800 hover:bg-teal-600 border border-slate-700 hover:border-teal-500 rounded-xl transition flex items-center space-x-1.5 shrink-0 shadow-sm"
                title="Ouvrir le menu complet"
                aria-label="Menu coulissant"
              >
                <Menu className="w-5 h-5 text-teal-400" />
                <span className="hidden sm:inline text-xs font-bold text-slate-200">
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

