import React, { useState, useEffect } from 'react';
import { User, Post, AppNotification } from './types';
import { api, getStoredToken, subscribeToLiveUpdates } from './lib/api';
import { AuthModal } from './components/AuthModal';
import { Header, MainTabType } from './components/Header';
import { FeedView } from './components/FeedView';
import { ForumsView } from './components/ForumsView';
import { QuizView } from './components/QuizView';
import { PollsView } from './components/PollsView';
import { SpacesView } from './components/SpacesView';
import { AdminView } from './components/AdminView';
import { DocumentSearchModal } from './components/DocumentSearchModal';
import { ReelsView } from './components/ReelsView';
import { ChatView } from './components/ChatView';
import { ProfileView } from './components/ProfileView';
import { FriendsModal } from './components/FriendsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTabType>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latestPushNotification, setLatestPushNotification] = useState<AppNotification | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [showGlobalDocSearch, setShowGlobalDocSearch] = useState(false);
  const [isSlidingPanelOpen, setIsSlidingPanelOpen] = useState(false);

  // Social Media Features State
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [unreadDirectMessagesCount, setUnreadDirectMessagesCount] = useState(0);
  const [pendingFriendRequestsCount, setPendingFriendRequestsCount] = useState(0);

  // Notifications preference (persistent in localStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pulse_notifications_enabled');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const toggleNotificationsEnabled = () => {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('pulse_notifications_enabled', String(next));
      return next;
    });
  };

  // Executable Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pulse_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to root html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pulse_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pulse_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Check existing session token on startup
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = getStoredToken();
    if (!token) {
      setCurrentUser(null);
      setAuthChecking(false);
      return;
    }

    try {
      const res = await api.auth.getMe();
      setCurrentUser(res.user);
      if (res.user.role === 'admin') {
        setActiveTab('admin');
      }
    } catch {
      api.auth.logout();
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  // Fetch posts for feed
  const loadPosts = async () => {
    try {
      const res = await api.posts.getAll();
      setPosts(res.posts || []);
    } catch (err) {
      console.error('Failed to load posts', err);
    }
  };

  // Fetch notifications for user
  const loadNotifications = async () => {
    try {
      const res = await api.notifications.getAll();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  // Load Social badges (Direct messages unread count & pending friend requests)
  const loadSocialBadges = async () => {
    if (!currentUser) return;
    try {
      const [chatRes, friendsRes] = await Promise.all([
        api.chat.getConversations().catch(() => ({ conversations: [] })),
        api.friends.getAll().catch(() => ({ friends: [], pendingReceived: [], pendingSent: [] }))
      ]);

      const totalUnread = (chatRes.conversations || []).reduce(
        (acc: number, c: any) => acc + (c.unreadCount || 0),
        0
      );
      setUnreadDirectMessagesCount(totalUnread);
      setPendingFriendRequestsCount((friendsRes.pendingReceived || []).length);
    } catch (err) {
      // Silent error in background badge fetch
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadPosts();
      loadNotifications();
      loadSocialBadges();

      // Poll social badges every 8 seconds
      const badgeInterval = setInterval(loadSocialBadges, 8000);

      // Subscribe to Server-Sent Events for instant real-time updates
      const unsubscribe = subscribeToLiveUpdates((event, payload) => {
        setIsLiveConnected(true);

        if (event === 'NEW_POST') {
          setPosts((prev) => {
            if (prev.some((p) => p.id === payload.id)) return prev;
            return [payload, ...prev];
          });
        } else if (event === 'UPDATE_POST') {
          setPosts((prev) => prev.map((p) => (p.id === payload.id ? payload : p)));
        } else if (event === 'DELETE_POST') {
          setPosts((prev) => prev.filter((p) => p.id !== payload.id));
        } else if (event === 'LIKE_POST') {
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.postId ? { ...p, likes: payload.likes } : p))
          );
        } else if (event === 'COMMENT_POST') {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === payload.postId
                ? { ...p, comments: [...(p.comments || []), payload.comment] }
                : p
            )
          );
        } else if (event === 'NEW_NOTIFICATION') {
          if (payload.recipientId === currentUser.id) {
            setNotifications((prev) => [payload, ...prev]);
            setLatestPushNotification(payload);
            setTimeout(() => {
              setLatestPushNotification((curr) => (curr?.id === payload.id ? null : curr));
            }, 5000);
          }
        } else if (event === 'NEW_DIRECT_MESSAGE') {
          if (payload.receiverId === currentUser.id) {
            loadSocialBadges();
            if (activeTab !== 'chat') {
              const pushNotif: AppNotification = {
                id: `dm_${Date.now()}`,
                recipientId: currentUser.id,
                actorId: payload.senderId,
                actorName: payload.senderName,
                actorAvatar: payload.senderAvatar,
                actorPromo: 'Message',
                type: 'direct_message',
                title: 'Nouveau message',
                message: `${payload.senderName} vous a envoyé un message : "${payload.content || 'Pièce jointe'}"`,
                targetId: payload.senderId,
                targetType: 'message',
                isRead: false,
                createdAt: new Date().toISOString()
              };
              setLatestPushNotification(pushNotif);
              setTimeout(() => {
                setLatestPushNotification((curr) => (curr?.id === pushNotif.id ? null : curr));
              }, 5000);
            }
          }
        } else if (event === 'FRIEND_REQUEST') {
          if (payload.receiverId === currentUser.id) {
            loadSocialBadges();
          }
        } else if (event === 'USER_STATUS_CHANGED' && payload.userId === currentUser.id) {
          api.auth.getMe().then((res) => setCurrentUser(res.user)).catch(() => {
            handleLogout();
          });
        }
      });

      return () => {
        clearInterval(badgeInterval);
        unsubscribe();
      };
    }
  }, [currentUser, activeTab]);

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setActiveTab('feed');
    setIsSlidingPanelOpen(false);
  };

  const handleOpenUserProfile = (userId: string) => {
    setSelectedProfileUserId(userId);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChatWithUser = (partnerId: string) => {
    setChatPartnerId(partnerId);
    setActiveTab('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-500 border-t-transparent mb-4" />
        <p className="text-teal-400 font-bold text-sm">Pulse Social • Connexion en cours...</p>
      </div>
    );
  }

  // If not logged in, display the login/registration page first and automatically
  if (!currentUser) {
    return (
      <AuthModal
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('feed');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'profile') {
            setSelectedProfileUserId(currentUser.id);
          }
          setActiveTab(tab);
          setIsSlidingPanelOpen(false);
        }}
        onLogout={handleLogout}
        isLiveConnected={isLiveConnected}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenDocSearch={() => setShowGlobalDocSearch(true)}
        notifications={notifications}
        onNotificationsChange={setNotifications}
        notificationsEnabled={notificationsEnabled}
        onToggleNotificationsEnabled={toggleNotificationsEnabled}
        latestPushNotification={latestPushNotification}
        onDismissPushNotification={() => setLatestPushNotification(null)}
        isSlidingPanelOpen={isSlidingPanelOpen}
        onToggleSlidingPanel={() => setIsSlidingPanelOpen((prev) => !prev)}
        onCloseSlidingPanel={() => setIsSlidingPanelOpen(false)}
        onOpenFriendsModal={() => setShowFriendsModal(true)}
        unreadMessagesCount={unreadDirectMessagesCount}
        pendingFriendRequestsCount={pendingFriendRequestsCount}
      />

      {/* Main Tab Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'feed' && (
          <FeedView
            currentUser={currentUser}
            posts={posts}
            onRefresh={loadPosts}
            onOpenUserProfile={handleOpenUserProfile}
          />
        )}

        {activeTab === 'reels' && (
          <ReelsView
            currentUser={currentUser}
            onOpenUserProfile={handleOpenUserProfile}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            currentUser={currentUser}
            initialPartnerId={chatPartnerId}
            onOpenUserProfile={handleOpenUserProfile}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            targetUserId={selectedProfileUserId || currentUser.id}
            currentUser={currentUser}
            onUpdateCurrentUser={(updated) => {
              setCurrentUser(updated);
            }}
            onOpenChatWithUser={handleOpenChatWithUser}
            onOpenUserProfile={handleOpenUserProfile}
            onOpenReelsView={() => setActiveTab('reels')}
          />
        )}

        {activeTab === 'forums' && (
          <ForumsView currentUser={currentUser} />
        )}

        {activeTab === 'quizzes' && (
          <QuizView currentUser={currentUser} />
        )}

        {activeTab === 'polls' && (
          <PollsView currentUser={currentUser} />
        )}

        {activeTab === 'spaces' && (
          <SpacesView
            currentUser={currentUser}
            allPosts={posts}
            onRefresh={loadPosts}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView currentUser={currentUser} />
        )}
      </main>

      {/* Friends & Invitations Modal */}
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => {
          setShowFriendsModal(false);
          loadSocialBadges();
        }}
        currentUser={currentUser}
        onOpenUserProfile={handleOpenUserProfile}
        onOpenChatWithUser={handleOpenChatWithUser}
      />

      {/* Global Document Search Modal */}
      <DocumentSearchModal
        isOpen={showGlobalDocSearch}
        onClose={() => setShowGlobalDocSearch(false)}
        posts={posts}
      />

      {/* Modern Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            © {new Date().getFullYear()} Pulse Social • Réseau Social & Académique
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-[11px]">
            Partage de publications, Reels &lt;60s, Messagerie instantanée, Contrôle IA de tolérance & Confidentialité
          </p>
        </div>
      </footer>

    </div>
  );
}
