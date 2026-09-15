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
import { Film, MessageCircle, Sparkles, Users } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTabType>('feed');
  const [tabHistory, setTabHistory] = useState<MainTabType[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latestPushNotification, setLatestPushNotification] = useState<AppNotification | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [showGlobalDocSearch, setShowGlobalDocSearch] = useState(false);
  const [isSlidingPanelOpen, setIsSlidingPanelOpen] = useState(false);

  // Social Media Features State
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [isChatConversationOpen, setIsChatConversationOpen] = useState(false);
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

  const navigateToTab = (tab: MainTabType, keepHistory = true) => {
    if (tab !== activeTab && keepHistory) {
      setTabHistory((prev) => [...prev, activeTab]);
    }
    if (tab === 'profile') {
      setSelectedProfileUserId(currentUser?.id || null);
    }
    if (tab !== 'chat') {
      setChatPartnerId(null);
    }
    setActiveTab(tab);
    setIsSlidingPanelOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBack = () => {
    if (activeTab === 'chat' && chatPartnerId) {
      setChatPartnerId(null);
      return;
    }
    if (activeTab === 'profile' && selectedProfileUserId && selectedProfileUserId !== currentUser?.id) {
      setSelectedProfileUserId(currentUser?.id || null);
      return;
    }
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
      if (prevTab !== 'chat') setChatPartnerId(null);
      if (prevTab !== 'profile') setSelectedProfileUserId(currentUser?.id || null);
    } else {
      setActiveTab('feed');
      setChatPartnerId(null);
      setSelectedProfileUserId(currentUser?.id || null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canGoBack =
    activeTab !== 'feed' ||
    (activeTab === 'chat' && chatPartnerId !== null) ||
    (activeTab === 'profile' && selectedProfileUserId !== currentUser?.id) ||
    tabHistory.length > 0;

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setActiveTab('feed');
    setIsSlidingPanelOpen(false);
  };

  const handleOpenUserProfile = (userId: string) => {
    setTabHistory((prev) => [...prev, activeTab]);
    setSelectedProfileUserId(userId);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChatWithUser = (partnerId: string) => {
    setTabHistory((prev) => [...prev, activeTab]);
    setChatPartnerId(partnerId);
    setActiveTab('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070d20] flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent mb-4" />
        <p className="text-blue-400 font-bold text-sm">MK • Connexion en cours...</p>
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
    <div className={`min-h-screen ${activeTab === 'chat' ? 'h-screen overflow-hidden' : ''} bg-slate-50 dark:bg-[#070d20] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 relative`}>
      
      {/* Fixed Top Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        canGoBack={canGoBack}
        onGoBack={handleGoBack}
        onTabChange={(tab) => navigateToTab(tab)}
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

      {/* Main Tab Content - padded top to never hide under fixed header, padded bottom to never hide under fixed bottom nav */}
      <main className={activeTab === 'chat' ? 'flex-1 min-h-0 pt-16 flex flex-col overflow-hidden' : 'flex-1 pt-16 sm:pt-17 pb-24'}>
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
            onOpenChatWithUser={handleOpenChatWithUser}
            onGoBack={handleGoBack}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            currentUser={currentUser}
            initialPartnerId={chatPartnerId}
            onOpenUserProfile={handleOpenUserProfile}
            onGoBack={handleGoBack}
            onConversationStateChange={setIsChatConversationOpen}
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
            onOpenReelsView={() => navigateToTab('reels')}
            onGoBack={handleGoBack}
          />
        )}

        {activeTab === 'forums' && (
          <ForumsView currentUser={currentUser} onGoBack={handleGoBack} />
        )}

        {activeTab === 'quizzes' && (
          <QuizView currentUser={currentUser} onGoBack={handleGoBack} />
        )}

        {activeTab === 'polls' && (
          <PollsView currentUser={currentUser} onGoBack={handleGoBack} />
        )}

        {activeTab === 'spaces' && (
          <SpacesView
            currentUser={currentUser}
            allPosts={posts}
            onRefresh={loadPosts}
            onGoBack={handleGoBack}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView currentUser={currentUser} onGoBack={handleGoBack} />
        )}
      </main>

      {/* Rock-solid Fixed Bottom Navigation Bar (Hidden only inside active chat conversation) */}
      <nav
        id="app-bottom-fixed-nav"
        className={`fixed bottom-0 left-0 right-0 z-40 w-full bg-white/95 dark:bg-[#0a1124]/95 backdrop-blur-xl border-t border-blue-100/90 dark:border-blue-950 items-center justify-around py-1 sm:py-1.5 px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-all h-16 pb-[max(0.25rem,env(safe-area-inset-bottom))] ${
          activeTab === 'chat' && isChatConversationOpen ? 'hidden' : 'flex'
        }`}
      >
        <div className="w-full max-w-lg mx-auto flex items-center justify-around">
          <button
            id="bottom-nav-feed"
            onClick={() => navigateToTab('feed')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[11px] font-bold transition rounded-xl ${
              activeTab === 'feed'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-5 h-5 mb-0.5" />
            <span>Fil</span>
          </button>

          <button
            id="bottom-nav-reels"
            onClick={() => navigateToTab('reels')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[11px] font-bold transition rounded-xl relative ${
              activeTab === 'reels'
                ? 'text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40'
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'
            }`}
          >
            <div className="relative">
              <Film className="w-5 h-5 mb-0.5" />
              <span className="absolute -top-1 -right-2 text-[8px] font-bold bg-rose-500 text-white rounded-full px-1">
                &lt;60s
              </span>
            </div>
            <span>Reels</span>
          </button>

          <button
            id="bottom-nav-chat"
            onClick={() => navigateToTab('chat')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[11px] font-bold transition rounded-xl relative ${
              activeTab === 'chat'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'
            }`}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 mb-0.5" />
              {unreadDirectMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadDirectMessagesCount}
                </span>
              )}
            </div>
            <span>Messages</span>
          </button>

          <button
            id="bottom-nav-friends"
            onClick={() => setShowFriendsModal(true)}
            className="flex flex-col items-center justify-center py-1 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition rounded-xl relative"
          >
            <div className="relative">
              <Users className="w-5 h-5 mb-0.5" />
              {pendingFriendRequestsCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {pendingFriendRequestsCount}
                </span>
              )}
            </div>
            <span>Amis</span>
          </button>

          <button
            id="bottom-nav-profile"
            onClick={() => navigateToTab('profile')}
            className={`flex flex-col items-center justify-center py-1 px-3 text-[11px] font-bold transition rounded-xl ${
              activeTab === 'profile'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white'
            }`}
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.prenom}
              className={`w-5 h-5 rounded-full object-cover mb-0.5 border ${
                activeTab === 'profile' ? 'border-blue-500' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            <span>Profil</span>
          </button>
        </div>
      </nav>

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

      {/* Modern Footer (Hidden when activeTab === 'chat') */}
      {activeTab !== 'chat' && (
        <footer className="bg-white dark:bg-[#0a1124] border-t border-blue-100 dark:border-blue-950 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors mb-16">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              © {new Date().getFullYear()} MK Social • Réseau Professionnel & Collaboratif
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Fil Social en direct, Messagerie instantanée, Reels courts, Quiz et Espaces de travail
            </p>
          </div>
        </footer>
      )}

    </div>
  );
}
