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
  Files,
  Moon,
  Sun,
  Bell,
  BellOff,
  LogOut,
  X,
  ChevronRight,
  ExternalLink,
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
}) => {
  const isAdmin = currentUser.role === 'admin';

  const navItems = [
    { id: 'feed', label: 'Fil d\'actualité & Posts', icon: Sparkles, desc: 'Partage de publications, photos et actus' },
    { id: 'reels', label: 'Reels Vidéo (<60s)', icon: Film, desc: 'Courtes vidéos avec commentaires' },
    { id: 'chat', label: 'Messagerie Directe', icon: MessageCircle, desc: 'Chat instantané, photos, vocaux, docs' },
    { id: 'profile', label: 'Mon Profil & Confidentialité', icon: UserIcon, desc: 'Verrouiller profil, voir mes publications' },
    { id: 'forums', label: 'Communautés & Salons', icon: MessageSquare, desc: 'Discussions ouvertes et salons thématiques' },
    { id: 'quizzes', label: 'Quiz & Défis', icon: BookOpen, desc: 'Quiz communautaires et classements' },
    { id: 'polls', label: 'Sondages Communautaires', icon: BarChart3, desc: 'Votes et avis des membres' },
    { id: 'spaces', label: 'Mes Espaces & Collections', icon: Bookmark, desc: 'Classement de vos contenus enregistrés' },
  ] as const;

  return (
    <div
      className={`fixed inset-0 z-50 transition-visibility duration-300 ${
        isOpen ? 'visible' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sliding Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 dark:border-slate-800 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <span className="font-extrabold text-sm tracking-tight">MK</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  MK <span className="text-indigo-600 dark:text-indigo-400 font-normal">Social</span>
                </span>
                <span className="text-[9px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Plateforme Sociale Connectée</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Fermer le panneau coulissant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card - Clickable to open Profile */}
        <div
          onClick={() => {
            onTabChange('profile');
            onClose();
          }}
          className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-850 transition"
          title="Consulter et gérer mon profil"
        >
          <div className="flex items-center space-x-3">
            <div className="relative shrink-0">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.prenom}
                className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500"
                referrerPolicy="no-referrer"
              />
              {currentUser.isLocked && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black" title="Profil verrouillé">
                  🔒
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {currentUser.prenom} {currentUser.nom}
                </span>
                {isAdmin ? (
                  <span className="text-[9px] font-bold uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                    Admin
                  </span>
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
              </div>
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                {currentUser.promo || 'Membre'}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 flex items-center space-x-1">
                {currentUser.isLocked ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Profil verrouillé (Amis)</span>
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                    <Unlock className="w-3 h-3" />
                    <span>Profil public</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">

          {/* Direct Boîte de Notifications Button */}
          {onOpenNotifications && (
            <button
              onClick={() => {
                onClose();
                onOpenNotifications();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition cursor-pointer text-left shadow-2xs mb-2"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded-full shadow-xs">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Alertes, mentions & interactions
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          )}

          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive 
                        ? 'bg-white/20 dark:bg-slate-900/15 text-white dark:text-slate-900' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold truncate">{item.label}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                      {item.desc}
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
              </button>
            );
          })}

          {/* Admin moderation tab */}
          {isAdmin && (
            <button
              onClick={() => {
                onTabChange('admin');
                onClose();
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-semibold truncate">Modération Admin</div>
                  <div className="text-[10px] text-purple-500/80 dark:text-purple-400 truncate">Gestion des comptes & sanctions</div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            </button>
          )}

          {/* Quick Document Search */}
          <div className="pt-2">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Ressources
            </div>
            <button
              onClick={() => {
                onOpenDocSearch();
                onClose();
              }}
              className="w-full flex items-center space-x-3 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 transition text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                <Files className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold">Recherche Fichiers</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">Documents, vocaux, notes</div>
              </div>
            </button>
          </div>

          {/* Preferences Section: Dark Mode & Push Notifications */}
          <div className="pt-2">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Affichage
            </div>

            {/* Dark Mode Switch */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/70 dark:bg-slate-850/60">
              <div className="flex items-center space-x-2.5">
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Mode Sombre</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {darkMode ? 'Activé' : 'Désactivé'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  darkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications Switch */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/70 dark:bg-slate-850/60 mt-1.5">
              <div className="flex items-center space-x-2.5">
                {notificationsEnabled ? (
                  <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Bannières d'alerte</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {notificationsEnabled ? 'Actives' : 'En sourdine'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleNotificationsEnabled}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Logout button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter</span>
          </button>
        </div>

      </div>
    </div>
  );
};
