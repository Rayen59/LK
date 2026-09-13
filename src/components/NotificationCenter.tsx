import React, { useState } from 'react';
import { AppNotification, User } from '../types';
import { api } from '../lib/api';
import {
  Bell,
  BellOff,
  Heart,
  MessageSquare,
  CornerDownRight,
  BarChart3,
  BookOpen,
  CheckCheck,
  Trash2,
  X,
  Sparkles,
  Send,
  AlertCircle
} from 'lucide-react';

interface NotificationCenterProps {
  currentUser: User;
  notifications: AppNotification[];
  onNotificationsChange: (notifications: AppNotification[]) => void;
  onNavigateTab: (tab: 'feed' | 'forums' | 'quizzes' | 'polls' | 'spaces' | 'admin') => void;
  notificationsEnabled: boolean;
  onToggleNotificationsEnabled: () => void;
  latestPushNotification: AppNotification | null;
  onDismissPushNotification: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentUser,
  notifications,
  onNotificationsChange,
  onNavigateTab,
  notificationsEnabled,
  onToggleNotificationsEnabled,
  latestPushNotification,
  onDismissPushNotification,
  isOpen,
  onToggleOpen,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.notifications.markAsRead(id);
      onNotificationsChange(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      onNotificationsChange(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.notifications.clearAll();
      onNotificationsChange([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      setIsSendingTest(true);
      const res = await api.notifications.sendTestNotification();
      if (res.notification) {
        onNotificationsChange([
          res.notification,
          ...notifications.filter((n) => n.id !== res.notification.id),
        ]);
      }
    } catch (err) {
      console.error('Failed to trigger test notification', err);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleClickNotification = async (notif: AppNotification) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
    onClose();

    // Route to appropriate tab
    if (notif.targetType === 'post') {
      onNavigateTab('feed');
    } else if (notif.targetType === 'quiz') {
      onNavigateTab('quizzes');
    } else if (notif.targetType === 'poll') {
      onNavigateTab('polls');
    } else if (notif.targetType === 'forum') {
      onNavigateTab('forums');
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = new Date();
      const date = new Date(isoString);
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return "À l'instant";
      if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
      if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`;
      return `Il y a ${Math.floor(diffSec / 86400)} j`;
    } catch {
      return 'Récemment';
    }
  };

  const renderIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'post_like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'post_comment':
        return <MessageSquare className="w-4 h-4 text-teal-500 fill-teal-500/20" />;
      case 'comment_reply':
        return <CornerDownRight className="w-4 h-4 text-indigo-500" />;
      case 'poll_vote':
        return <BarChart3 className="w-4 h-4 text-amber-500" />;
      case 'quiz_submission':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="relative">
      
      {/* PHONE-STYLE PUSH NOTIFICATION TOAST (Non-intrusive, looks like a native phone push banner) */}
      {notificationsEnabled && latestPushNotification && (
        <aside
          aria-label="Notification push"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md px-3 pointer-events-auto animate-in slide-in-from-top duration-300"
        >
          <div
            onClick={() => {
              handleClickNotification(latestPushNotification);
              onDismissPushNotification();
            }}
            className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl shadow-slate-950/60 flex items-start space-x-3 cursor-pointer hover:border-teal-500/60 transition group"
          >
            {/* App / Actor icon */}
            <div className="relative flex-shrink-0">
              <img
                src={latestPushNotification.actorAvatar}
                alt={latestPushNotification.actorName}
                className="w-10 h-10 rounded-full object-cover border border-teal-500/50"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full border border-slate-800 shadow">
                {renderIcon(latestPushNotification.type)}
              </div>
            </div>

            {/* Notification content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-1">
                  <span>Faculté Médecine Sfax</span>
                  <span>•</span>
                  <span>{formatRelativeTime(latestPushNotification.createdAt)}</span>
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-teal-300 transition">
                  Ouvrir
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate">
                {latestPushNotification.title}
              </p>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                {latestPushNotification.message}
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismissPushNotification();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition flex-shrink-0"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Bell Trigger Button in Header */}
      <button
        id="notification-bell-btn"
        onClick={onToggleOpen}
        className={`relative p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-teal-600 text-white shadow-md shadow-teal-950/50'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
        }`}
        title={notificationsEnabled ? "Boîte de notifications" : "Notifications en sourdine"}
        aria-label="Boîte de notifications FMS"
      >
        {notificationsEnabled ? (
          <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        ) : (
          <BellOff className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 shadow animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notification Box - Perfectly responsive for Mobile and Desktop */}
      {isOpen && (
        <>
          {/* Backdrop on mobile & desktop */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
            onClick={onClose}
          />

          <div className="fixed sm:absolute top-16 sm:top-full right-2 sm:right-0 mt-1 sm:mt-2 w-[calc(100vw-16px)] sm:w-[410px] max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Boîte de Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Toggle Banner (Allows user to enable/disable easily) */}
            <div className="px-3.5 py-2.5 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-100/80 dark:border-teal-900/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {notificationsEnabled ? (
                  <Bell className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                ) : (
                  <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <div>
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    {notificationsEnabled ? 'Bannières mobile actives' : 'Bannières en sourdine'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {notificationsEnabled ? 'Alertes discrètes en haut d’écran' : 'Visible uniquement dans cette boîte'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleNotificationsEnabled}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationsEnabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title="Activer ou désactiver les bannières push"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Subheader & Action bar */}
            <div className="px-3.5 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    filter === 'all'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Toutes ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    filter === 'unread'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Non lues ({unreadCount})
                </button>
              </div>

              <div className="flex items-center space-x-2 text-[11px]">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
                    title="Tout marquer comme lu"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tout lire</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-slate-400 hover:text-rose-500 transition p-1 cursor-pointer"
                    title="Effacer tout l'historique"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotification(notif)}
                    className={`p-3 sm:p-3.5 flex items-start space-x-3 cursor-pointer transition ${
                      notif.isRead
                        ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        : 'bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-50/80 dark:hover:bg-teal-950/40'
                    }`}
                  >
                    {/* Avatar with type badge */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={notif.actorAvatar}
                        alt={notif.actorName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
                        {renderIcon(notif.type)}
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {notif.actorName}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug font-medium">
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase">
                          {notif.actorPromo}
                        </span>
                        {!notif.isRead && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-7 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Aucune notification pour le moment
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Vous recevrez une alerte dès qu'un carabin réagit à vos publications, vocaux, commentaires ou sondages.
                  </p>

                  {/* Interactive Button to Test Notification Center */}
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    disabled={isSendingTest}
                    className="mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSendingTest ? "Envoi..." : "Envoyer une notification test"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer with quick test link */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                Temps réel MK actif
              </span>
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isSendingTest}
                className="text-teal-600 dark:text-teal-400 hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Tester la boîte</span>
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
};
