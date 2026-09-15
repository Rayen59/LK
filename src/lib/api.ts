import {
  User,
  Post,
  SpaceFolder,
  Forum,
  ForumMessage,
  Quiz,
  QuizSubmission,
  Poll,
  AppNotification,
  Reel,
  ReelComment,
  DirectMessage,
  DirectMessageAttachment
} from '../types';

const TOKEN_KEY = 'mk_social_token';
const LEGACY_TOKEN_KEY = 'med_sfax_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
};

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur requête (${res.status})`);
  }
  return data;
}

// Authentication
export const api = {
  auth: {
    register: async (userData: {
      nom: string;
      prenom: string;
      email: string;
      password?: string;
      avatarUrl: string;
      promo: string;
      bio?: string;
    }): Promise<{ user: User; token: string }> => {
      const data = await fetchWithAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (data.token) {
        setStoredToken(data.token);
      }
      return data;
    },

    login: async (credentials: { email: string; password?: string }): Promise<{ user: User; token: string }> => {
      const data = await fetchWithAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (data.token) {
        setStoredToken(data.token);
      }
      return data;
    },

    getMe: async (): Promise<{ user: User }> => {
      return fetchWithAuth('/api/auth/me');
    },

    updateProfile: async (updates: Partial<User>): Promise<{ user: User }> => {
      return fetchWithAuth('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    logout: () => {
      removeStoredToken();
    },
  },

  posts: {
    getAll: async (): Promise<{ posts: Post[] }> => {
      return fetchWithAuth('/api/posts');
    },

    create: async (postData: {
      content: string;
      attachments?: any[];
      tags?: string[];
    }): Promise<{ post: Post }> => {
      return fetchWithAuth('/api/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
    },

    update: async (id: string, updates: { content?: string; attachments?: any[]; tags?: string[] }): Promise<{ post: Post }> => {
      return fetchWithAuth(`/api/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return fetchWithAuth(`/api/posts/${id}`, {
        method: 'DELETE',
      });
    },

    toggleLike: async (id: string): Promise<{ likes: string[] }> => {
      return fetchWithAuth(`/api/posts/${id}/like`, {
        method: 'POST',
      });
    },

    addComment: async (id: string, content: string, parentId?: string): Promise<{ comment: any; comments: any[] }> => {
      return fetchWithAuth(`/api/posts/${id}/comment`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      });
    },
  },

  spaces: {
    getAll: async (): Promise<{ spaces: SpaceFolder[] }> => {
      return fetchWithAuth('/api/spaces');
    },

    create: async (spaceData: {
      name: string;
      category?: string;
      description?: string;
      color?: string;
    }): Promise<{ space: SpaceFolder }> => {
      return fetchWithAuth('/api/spaces', {
        method: 'POST',
        body: JSON.stringify(spaceData),
      });
    },

    update: async (id: string, updates: Partial<SpaceFolder>): Promise<{ space: SpaceFolder }> => {
      return fetchWithAuth(`/api/spaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      return fetchWithAuth(`/api/spaces/${id}`, {
        method: 'DELETE',
      });
    },

    addPost: async (spaceId: string, postId: string): Promise<{ space: SpaceFolder }> => {
      return fetchWithAuth(`/api/spaces/${spaceId}/add-post`, {
        method: 'POST',
        body: JSON.stringify({ postId }),
      });
    },

    removePost: async (spaceId: string, postId: string): Promise<{ space: SpaceFolder }> => {
      return fetchWithAuth(`/api/spaces/${spaceId}/remove-post/${postId}`, {
        method: 'DELETE',
      });
    },
  },

  forums: {
    getAll: async (): Promise<{ forums: Forum[] }> => {
      return fetchWithAuth('/api/forums');
    },

    create: async (forumData: {
      title: string;
      description?: string;
      category?: string;
      isPrivate: boolean;
      accessCode?: string;
    }): Promise<{ forum: Forum }> => {
      return fetchWithAuth('/api/forums', {
        method: 'POST',
        body: JSON.stringify(forumData),
      });
    },

    verifyCode: async (forumId: string, code: string): Promise<{ authorized: boolean }> => {
      return fetchWithAuth(`/api/forums/${forumId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },

    getMessages: async (forumId: string): Promise<{ messages: ForumMessage[] }> => {
      return fetchWithAuth(`/api/forums/${forumId}/messages`);
    },

    sendMessage: async (forumId: string, content: string): Promise<{ message: ForumMessage }> => {
      return fetchWithAuth(`/api/forums/${forumId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
  },

  quizzes: {
    getAll: async (): Promise<{ quizzes: Quiz[] }> => {
      return fetchWithAuth('/api/quizzes');
    },

    create: async (quizData: {
      title: string;
      description?: string;
      subject: string;
      questions: any[];
      totalPoints?: number;
    }): Promise<{ quiz: Quiz }> => {
      return fetchWithAuth('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify(quizData),
      });
    },

    submit: async (quizId: string, answers: Record<string, string[]>): Promise<any> => {
      return fetchWithAuth(`/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
    },

    getLeaderboard: async (quizId: string): Promise<{ leaderboard: QuizSubmission[] }> => {
      return fetchWithAuth(`/api/quizzes/${quizId}/leaderboard`);
    },

    getGlobalLeaderboard: async (): Promise<any> => {
      return fetchWithAuth('/api/leaderboard/global');
    },
  },

  polls: {
    getAll: async (): Promise<{ polls: Poll[] }> => {
      return fetchWithAuth('/api/polls');
    },

    create: async (pollData: {
      question: string;
      description?: string;
      options: string[];
    }): Promise<{ poll: Poll }> => {
      return fetchWithAuth('/api/polls', {
        method: 'POST',
        body: JSON.stringify(pollData),
      });
    },

    vote: async (pollId: string, optionId: string): Promise<{ poll: Poll }> => {
      return fetchWithAuth(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId }),
      });
    },
  },

  admin: {
    getUsers: async (): Promise<{ users: any[] }> => {
      return fetchWithAuth('/api/admin/users');
    },

    banUser: async (
      userId: string,
      duration: '1d' | '3d' | '14d' | 'permanent',
      reason?: string
    ): Promise<{ user: any; message: string }> => {
      return fetchWithAuth(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ duration, reason }),
      });
    },

    unbanUser: async (userId: string): Promise<{ user: any; message: string }> => {
      return fetchWithAuth(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
      });
    },

    restrictUser: async (
      userId: string,
      isRestricted: boolean,
      reason?: string
    ): Promise<{ user: any; message: string }> => {
      return fetchWithAuth(`/api/admin/users/${userId}/restrict`, {
        method: 'POST',
        body: JSON.stringify({ isRestricted, reason }),
      });
    },

    deleteUser: async (userId: string): Promise<{ success: boolean; id: string }> => {
      return fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },
  },

  notifications: {
    getAll: async (): Promise<{ notifications: AppNotification[] }> => {
      return fetchWithAuth('/api/notifications');
    },
    markAsRead: async (id: string): Promise<{ success: boolean }> => {
      return fetchWithAuth(`/api/notifications/${id}/read`, {
        method: 'POST',
      });
    },
    markAllAsRead: async (): Promise<{ success: boolean }> => {
      return fetchWithAuth('/api/notifications/read-all', {
        method: 'POST',
      });
    },
    clearAll: async (): Promise<{ success: boolean }> => {
      return fetchWithAuth('/api/notifications', {
        method: 'DELETE',
      });
    },
    sendTestNotification: async (): Promise<{ notification: AppNotification }> => {
      return fetchWithAuth('/api/notifications/test', {
        method: 'POST',
      });
    },
  },

  privacy: {
    toggleLock: async (isLocked: boolean): Promise<{ user: User; isLocked: boolean; message: string }> => {
      return fetchWithAuth('/api/auth/privacy', {
        method: 'PUT',
        body: JSON.stringify({ isLocked }),
      });
    },
  },

  users: {
    search: async (query: string): Promise<{ users: User[] }> => {
      return fetchWithAuth(`/api/users/search?q=${encodeURIComponent(query)}`);
    },
    getProfile: async (
      userId: string
    ): Promise<{
      user: User;
      relationship: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none';
      isFriend: boolean;
      isSelf: boolean;
      isBlockedByMe: boolean;
      isBlockedByThem: boolean;
      isRestrictedView: boolean;
      posts: Post[];
      reels: Reel[];
      friendsCount: number;
      postsCount: number;
      reelsCount: number;
    }> => {
      return fetchWithAuth(`/api/users/${userId}/profile`);
    },
    block: async (userId: string): Promise<{ success: boolean; message: string }> => {
      return fetchWithAuth(`/api/users/${userId}/block`, {
        method: 'POST',
      });
    },
    unblock: async (userId: string): Promise<{ success: boolean; message: string }> => {
      return fetchWithAuth(`/api/users/${userId}/unblock`, {
        method: 'POST',
      });
    },
  },

  friends: {
    getAll: async (): Promise<{
      friends: User[];
      pendingReceived: User[];
      pendingSent: User[];
    }> => {
      return fetchWithAuth('/api/friends');
    },
    sendRequest: async (
      targetId: string
    ): Promise<{ status: string; message: string }> => {
      return fetchWithAuth(`/api/friends/request/${targetId}`, {
        method: 'POST',
      });
    },
    acceptRequest: async (
      requesterId: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchWithAuth(`/api/friends/accept/${requesterId}`, {
        method: 'POST',
      });
    },
    rejectRequest: async (
      requesterId: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchWithAuth(`/api/friends/reject/${requesterId}`, {
        method: 'POST',
      });
    },
    removeFriend: async (
      friendId: string
    ): Promise<{ success: boolean; message: string }> => {
      return fetchWithAuth(`/api/friends/remove/${friendId}`, {
        method: 'POST',
      });
    },
  },

  chat: {
    getConversations: async (): Promise<{
      conversations: {
        partner: User;
        lastMessage: DirectMessage;
        unreadCount: number;
      }[];
    }> => {
      return fetchWithAuth('/api/conversations');
    },
    getMessages: async (
      otherUserId: string
    ): Promise<{
      messages: DirectMessage[];
      partner: User;
      isBlocked: boolean;
      isBlockedByMe: boolean;
      isBlockedByThem: boolean;
    }> => {
      return fetchWithAuth(`/api/messages/${otherUserId}`);
    },
    sendMessage: async (data: {
      receiverId: string;
      content?: string;
      attachment?: DirectMessageAttachment;
      replyTo?: { messageId: string; senderName: string; content: string };
      isForwarded?: boolean;
    }): Promise<{ message: DirectMessage }> => {
      return fetchWithAuth('/api/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    toggleReaction: async (
      messageId: string,
      emoji: string,
      action?: 'add' | 'remove' | 'toggle'
    ): Promise<{ success: boolean; reactions: any[] }> => {
      return fetchWithAuth(`/api/messages/${messageId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji, action }),
      });
    },
    editMessage: async (
      messageId: string,
      content: string
    ): Promise<{ success: boolean; message: DirectMessage }> => {
      return fetchWithAuth(`/api/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
    },
    deleteMessage: async (
      messageId: string,
      mode: 'for_me' | 'for_everyone'
    ): Promise<{ success: boolean; mode: string }> => {
      return fetchWithAuth(`/api/messages/${messageId}`, {
        method: 'DELETE',
        body: JSON.stringify({ mode }),
      });
    },
    forwardMessage: async (
      messageId: string,
      targetUserIds: string[]
    ): Promise<{ success: boolean; forwardedCount: number; messages: DirectMessage[] }> => {
      return fetchWithAuth(`/api/messages/${messageId}/forward`, {
        method: 'POST',
        body: JSON.stringify({ targetUserIds }),
      });
    },
  },

  reels: {
    getAll: async (): Promise<{ reels: Reel[] }> => {
      return fetchWithAuth('/api/reels');
    },
    create: async (data: {
      videoUrl: string;
      caption?: string;
      duration?: number;
      tags?: string[];
    }): Promise<{ reel: Reel }> => {
      return fetchWithAuth('/api/reels', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (
      id: string,
      data: { caption?: string; tags?: string[] }
    ): Promise<{ reel: Reel }> => {
      return fetchWithAuth(`/api/reels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return fetchWithAuth(`/api/reels/${id}`, {
        method: 'DELETE',
      });
    },
    like: async (id: string): Promise<{ likes: string[] }> => {
      return fetchWithAuth(`/api/reels/${id}/like`, {
        method: 'POST',
      });
    },
    comment: async (
      id: string,
      content: string
    ): Promise<{ comment: ReelComment; comments: ReelComment[] }> => {
      return fetchWithAuth(`/api/reels/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
  },
};

// Real-time EventSource listener
export function subscribeToLiveUpdates(onEvent: (event: string, payload: any) => void) {
  let eventSource: EventSource | null = null;
  let retryTimeout: any = null;

  function connect() {
    try {
      eventSource = new EventSource('/api/live');

      eventSource.addEventListener('update', (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent(data.event, data.payload);
        } catch (err) {
          console.error('Error parsing live event payload:', err);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
        retryTimeout = setTimeout(connect, 3000);
      };
    } catch (e) {
      retryTimeout = setTimeout(connect, 4000);
    }
  }

  connect();

  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
  };
}

// Helper to convert File to Base64 Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
