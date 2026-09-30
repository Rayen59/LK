import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  DirectMessage,
  DirectMessageAttachment,
  DirectMessageReaction,
  DirectMessageReplyQuote
} from '../types';
import { api, fileToDataUrl, subscribeToLiveUpdates } from '../lib/api';
import {
  Send,
  Image as ImageIcon,
  Mic,
  Paperclip,
  X,
  Search,
  CheckCheck,
  Check,
  AlertCircle,
  ShieldAlert,
  ShieldOff,
  User as UserIcon,
  Play,
  Pause,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  MoreVertical,
  Volume2,
  ArrowLeft,
  Heart,
  Reply,
  Edit2,
  Trash2,
  Forward,
  CornerDownRight,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Palette,
  ExternalLink,
  Lock,
  Smile,
  Flag,
  CheckCircle2
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { ForwardMessageModal } from './ForwardMessageModal';

interface ChatViewProps {
  currentUser: User;
  initialPartnerId?: string | null;
  onOpenUserProfile: (userId: string) => void;
  onGoBack?: () => void;
  onConversationStateChange?: (isOpen: boolean) => void;
  onPartnerChange?: (partnerId: string | null) => void;
}

const EMOJI_LIST = ['❤️', '😂', '😮', '😢', '🔥', '👍', '👏', '🎉'];

type BubbleThemeId = 'royal_blue' | 'indigo' | 'emerald' | 'charcoal' | 'violet';

const BUBBLE_THEMES: Record<
  BubbleThemeId,
  {
    label: string;
    swatch: string;
    sentBubble: string;
    sentQuote: string;
    sentSubtleText: string;
    sentMediaBox: string;
    sendBtn: string;
  }
> = {
  royal_blue: {
    label: 'Bleu Royal MK',
    swatch: 'bg-blue-600',
    sentBubble: 'bg-blue-600 text-white shadow-2xs',
    sentQuote: 'bg-black/15 border-white/60 text-blue-50',
    sentSubtleText: 'text-blue-100/90',
    sentMediaBox: 'bg-black/15 border border-white/15',
    sendBtn: 'bg-blue-600 hover:bg-blue-500 text-white'
  },
  indigo: {
    label: 'Indigo Profond',
    swatch: 'bg-indigo-600',
    sentBubble: 'bg-indigo-600 text-white shadow-2xs',
    sentQuote: 'bg-black/15 border-indigo-200 text-indigo-50',
    sentSubtleText: 'text-indigo-100/90',
    sentMediaBox: 'bg-black/15 border border-white/15',
    sendBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white'
  },
  emerald: {
    label: 'Émeraude',
    swatch: 'bg-emerald-600',
    sentBubble: 'bg-emerald-600 text-white shadow-2xs',
    sentQuote: 'bg-black/15 border-emerald-200 text-emerald-50',
    sentSubtleText: 'text-emerald-100/90',
    sentMediaBox: 'bg-black/15 border border-white/15',
    sendBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white'
  },
  charcoal: {
    label: 'Anthracite',
    swatch: 'bg-slate-800',
    sentBubble: 'bg-slate-800 dark:bg-slate-700 text-white shadow-2xs',
    sentQuote: 'bg-white/10 border-slate-400 text-slate-100',
    sentSubtleText: 'text-slate-300',
    sentMediaBox: 'bg-white/10 border border-white/15',
    sendBtn: 'bg-slate-800 hover:bg-slate-700 text-white'
  },
  violet: {
    label: 'Violet Moderne',
    swatch: 'bg-violet-600',
    sentBubble: 'bg-violet-600 text-white shadow-2xs',
    sentQuote: 'bg-black/15 border-violet-200 text-violet-50',
    sentSubtleText: 'text-violet-100/90',
    sentMediaBox: 'bg-black/15 border border-white/15',
    sendBtn: 'bg-violet-600 hover:bg-violet-500 text-white'
  }
};

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  initialPartnerId,
  onOpenUserProfile,
  onGoBack,
  onConversationStateChange,
  onPartnerChange
}) => {
  // Conversation list state
  const [conversations, setConversations] = useState<
    { partner: User; lastMessage: DirectMessage; unreadCount: number }[]
  >([]);
  const [quickContacts, setQuickContacts] = useState<User[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Active chat state
  const [activePartner, setActivePartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);

  // Real-time typing indicators (3 dots)
  const [typingPartners, setTypingPartners] = useState<Record<string, boolean>>({});
  const selfTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentAtRef = useRef<number>(0);

  // Partner Profile Drawer inside Chat + Theme Selector
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showQuickEmojiBar, setShowQuickEmojiBar] = useState(false);
  const [bubbleTheme, setBubbleTheme] = useState<BubbleThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mk_chat_bubble_theme_v3') as BubbleThemeId;
      if (saved && BUBBLE_THEMES[saved]) return saved;
    }
    return 'royal_blue';
  });

  const handleSelectBubbleTheme = (themeId: BubbleThemeId) => {
    setBubbleTheme(themeId);
    localStorage.setItem('mk_chat_bubble_theme_v3', themeId);
    setShowThemeMenu(false);
  };

  // Fullscreen Image Lightbox state
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    name: string;
    senderName?: string;
    createdAt?: string;
  } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);

  // Input & attachments
  const [inputText, setInputText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<DirectMessageAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Reply & Edit state
  const [replyingTo, setReplyingTo] = useState<DirectMessageReplyQuote | null>(null);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);

  // Context Menu state
  const [contextMenuMessage, setContextMenuMessage] = useState<DirectMessage | null>(null);
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);
  const [confirmDeleteEveryone, setConfirmDeleteEveryone] = useState<DirectMessage | null>(null);

  // Forward Modal state
  const [forwardingMessage, setForwardingMessage] = useState<DirectMessage | null>(null);

  // Report Message Modal state
  const [reportMessageTarget, setReportMessageTarget] = useState<DirectMessage | null>(null);
  const [reportReason, setReportReason] = useState('Contenu inapproprié ou offensant');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState<string | null>(null);

  const handleReportMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportMessageTarget) return;
    setSubmittingReport(true);
    try {
      const res = await api.admin.submitReport({
        targetType: 'message',
        targetId: reportMessageTarget.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined
      });
      setReportMessageTarget(null);
      setReportDetails('');
      setReportSuccessToast(res.message || "Signalement envoyé à l'administration.");
      setTimeout(() => setReportSuccessToast(null), 4000);
    } catch (err: any) {
      setChatError(err.message || "Erreur lors de l'envoi du signalement.");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Audio voice note recording modal
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Menu options
  const [showPartnerMenu, setShowPartnerMenu] = useState(false);

  // Cache in-memory messages per partner
  const messagesCache = useRef<{ [partnerId: string]: DirectMessage[] }>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageStreamRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Long press timer ref for both mouse and touch
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ [msgId: string]: number }>({});
  const isLongPressedRef = useRef<boolean>(false);
  const lastTouchLikeRef = useRef<number>(0);

  const activeTheme = BUBBLE_THEMES[bubbleTheme] || BUBBLE_THEMES.royal_blue;

  // Notify parent of active conversation state for responsive mobile navigation
  useEffect(() => {
    onConversationStateChange?.(activePartner !== null);
    onPartnerChange?.(activePartner?.id || null);
  }, [activePartner, onConversationStateChange, onPartnerChange]);

  // Auto scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Ensure when mobile virtual keyboard resizes visualViewport, messages scroll cleanly above input bar
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleResize = () => {
      if (activePartner) {
        setTimeout(() => scrollToBottom('smooth'), 60);
      }
    };
    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, [activePartner, scrollToBottom]);

  // Load conversation list & quick contacts
  const loadConversations = useCallback(async () => {
    try {
      const [data, usersRes] = await Promise.all([
        api.chat.getConversations().catch(() => ({ conversations: [] })),
        api.users.search('').catch(() => ({ users: [] }))
      ]);
      setConversations(data.conversations || []);
      setQuickContacts((usersRes.users || []).slice(0, 12));
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Select a partner conversation
  const selectPartnerById = useCallback(
    async (partnerId: string) => {
      try {
        setChatError(null);
        setReplyingTo(null);
        setEditingMessage(null);
        setContextMenuMessage(null);
        setConfirmDeleteEveryone(null);
        setShowPartnerMenu(false);
        setShowQuickEmojiBar(false);

        const cached = messagesCache.current[partnerId];
        if (cached && cached.length > 0) {
          setMessages(cached);
          setLoadingMessages(false);
          setTimeout(() => scrollToBottom('auto'), 20);
        } else {
          setLoadingMessages(true);
        }

        const res = await api.chat.getMessages(partnerId);
        setActivePartner(res.partner);
        const fetched = res.messages || [];
        setMessages(fetched);
        messagesCache.current[partnerId] = fetched;

        setIsBlocked(res.isBlocked);
        setIsBlockedByMe(res.isBlockedByMe);
        setIsBlockedByThem(res.isBlockedByThem);
        if (typeof res.isPartnerTyping === 'boolean') {
          setTypingPartners((prev) => ({ ...prev, [partnerId]: Boolean(res.isPartnerTyping) }));
        }

        setTimeout(() => scrollToBottom('auto'), 50);
        loadConversations();
      } catch (err: any) {
        setChatError(err.message || "Erreur d'accès à la conversation.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [loadConversations, scrollToBottom]
  );

  // Handle initialPartnerId if passed
  useEffect(() => {
    if (initialPartnerId) {
      selectPartnerById(initialPartnerId);
    }
  }, [initialPartnerId, selectPartnerById]);

  // Real-time SSE Live Updates Subscription
  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'USER_TYPING') {
        if (payload.receiverId === currentUser.id && payload.senderId) {
          setTypingPartners((prev) => ({
            ...prev,
            [payload.senderId]: Boolean(payload.isTyping)
          }));
          if (activePartner && payload.senderId === activePartner.id && payload.isTyping) {
            setTimeout(() => scrollToBottom('smooth'), 40);
          }
        }
      } else if (event === 'NEW_DIRECT_MESSAGE') {
        const newMsg: DirectMessage = payload.message;
        if (!newMsg) return;

        setTypingPartners((prev) => ({ ...prev, [newMsg.senderId]: false }));

        if (
          activePartner &&
          ((newMsg.senderId === activePartner.id && newMsg.receiverId === currentUser.id) ||
            (newMsg.senderId === currentUser.id && newMsg.receiverId === activePartner.id))
        ) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMsg.id);
            let updated: DirectMessage[];
            if (exists) {
              updated = prev.map((m) => (m.id === newMsg.id ? newMsg : m));
            } else {
              const cleaned = prev.filter((m) => !m.isSending || m.content !== newMsg.content);
              updated = [...cleaned, newMsg];
            }
            if (activePartner) {
              messagesCache.current[activePartner.id] = updated;
            }
            return updated;
          });
          setTimeout(() => scrollToBottom('smooth'), 50);
        }

        loadConversations();
      } else if (event === 'MESSAGE_REACTION') {
        const { messageId, reactions } = payload;
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === messageId ? { ...m, reactions } : m));
          if (activePartner) {
            messagesCache.current[activePartner.id] = updated;
          }
          return updated;
        });
      } else if (event === 'MESSAGE_EDITED') {
        const { messageId, content, isEdited, editedAt } = payload;
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === messageId ? { ...m, content, isEdited, editedAt } : m
          );
          if (activePartner) {
            messagesCache.current[activePartner.id] = updated;
          }
          return updated;
        });
      } else if (event === 'MESSAGE_DELETED') {
        const { messageId, mode, userId } = payload;
        if (mode === 'for_everyone') {
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    deletedForEveryone: true,
                    content: 'Ce message a été supprimé',
                    attachment: undefined
                  }
                : m
            );
            if (activePartner) {
              messagesCache.current[activePartner.id] = updated;
            }
            return updated;
          });
        } else if (mode === 'for_me' && userId === currentUser.id) {
          setMessages((prev) => {
            const updated = prev.filter((m) => m.id !== messageId);
            if (activePartner) {
              messagesCache.current[activePartner.id] = updated;
            }
            return updated;
          });
        }
      } else if (event === 'MESSAGES_READ') {
        if (activePartner && payload.readerId === activePartner.id) {
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.senderId === currentUser.id ? { ...m, isRead: true } : m
            );
            if (activePartner) {
              messagesCache.current[activePartner.id] = updated;
            }
            return updated;
          });
        }
      }
    });

    return () => unsubscribe();
  }, [activePartner, currentUser.id, loadConversations, scrollToBottom]);

  // Background polling (2s) for messages & typing state
  useEffect(() => {
    if (!activePartner) return;

    const partnerId = activePartner.id;
    const refreshInterval = setInterval(async () => {
      try {
        const res = await api.chat.getMessages(partnerId);
        if (!res || !res.messages) return;

        if (typeof res.isPartnerTyping === 'boolean') {
          setTypingPartners((prev) => ({
            ...prev,
            [partnerId]: Boolean(res.isPartnerTyping)
          }));
        }

        setMessages((prev) => {
          const prevLast = prev[prev.length - 1];
          const newLast = res.messages[res.messages.length - 1];

          const hasNewMsg = res.messages.length !== prev.length || prevLast?.id !== newLast?.id;
          const hasEditsOrReactions =
            JSON.stringify(prev.map((m) => ({ id: m.id, r: m.reactions?.length, c: m.content }))) !==
            JSON.stringify(
              res.messages.map((m: DirectMessage) => ({
                id: m.id,
                r: m.reactions?.length,
                c: m.content
              }))
            );

          if (hasNewMsg || hasEditsOrReactions) {
            messagesCache.current[partnerId] = res.messages;
            if (hasNewMsg) {
              setTimeout(() => scrollToBottom('smooth'), 50);
            }
            return res.messages;
          }
          return prev;
        });

        setIsBlocked(res.isBlocked);
        setIsBlockedByMe(res.isBlockedByMe);
        setIsBlockedByThem(res.isBlockedByThem);
      } catch {
        // Silent fail in polling
      }
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, [activePartner, scrollToBottom]);

  // Search users to start a new chat
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        setIsSearchingUsers(true);
        const data = await api.users.search(searchQuery.trim());
        setSearchResults(data.users.filter((u) => u.id !== currentUser.id));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  // Handle input text change & emit real-time typing state without layout shift
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!activePartner || isBlocked) return;

    const hasText = val.trim().length > 0;

    if (selfTypingTimeoutRef.current) {
      clearTimeout(selfTypingTimeoutRef.current);
    }

    if (hasText) {
      const now = Date.now();
      if (now - lastTypingSentAtRef.current > 1500) {
        lastTypingSentAtRef.current = now;
        api.chat.sendTyping(activePartner.id, true).catch(() => {});
      }

      selfTypingTimeoutRef.current = setTimeout(() => {
        if (activePartner) {
          api.chat.sendTyping(activePartner.id, false).catch(() => {});
        }
      }, 2800);
    } else {
      lastTypingSentAtRef.current = 0;
      api.chat.sendTyping(activePartner.id, false).catch(() => {});
    }
  };

  // Send or Edit message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    if (!inputText.trim() && !pendingAttachment) return;
    if (isBlocked) return;

    if (selfTypingTimeoutRef.current) {
      clearTimeout(selfTypingTimeoutRef.current);
    }
    api.chat.sendTyping(activePartner.id, false).catch(() => {});
    setShowQuickEmojiBar(false);

    // Handle Editing existing message
    if (editingMessage) {
      const newText = inputText.trim();
      const targetId = editingMessage.id;
      setEditingMessage(null);
      setInputText('');

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === targetId ? { ...m, content: newText, isEdited: true } : m
        );
        messagesCache.current[activePartner.id] = updated;
        return updated;
      });

      try {
        await api.chat.editMessage(targetId, newText);
      } catch (err: any) {
        setChatError(err.message || 'Erreur lors de la modification.');
      }
      return;
    }

    // Normal Send message (with instantaneous optimistic rendering)
    const textToSend = inputText.trim();
    const attToSend = pendingAttachment;
    const replyToSend = replyingTo;

    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const optimisticMsg: DirectMessage = {
      id: tempId,
      senderId: currentUser.id,
      senderName: `${currentUser.prenom} ${currentUser.nom}`,
      senderAvatar: currentUser.avatarUrl,
      receiverId: activePartner.id,
      content: textToSend,
      attachment: attToSend || undefined,
      replyTo: replyToSend || undefined,
      createdAt: new Date().toISOString(),
      isRead: false,
      isSending: true,
      reactions: []
    };

    setMessages((prev) => {
      const updated = [...prev, optimisticMsg];
      messagesCache.current[activePartner.id] = updated;
      return updated;
    });

    setInputText('');
    setPendingAttachment(null);
    setReplyingTo(null);
    setChatError(null);
    setTimeout(() => scrollToBottom('smooth'), 10);

    try {
      setSending(true);
      const res = await api.chat.sendMessage({
        receiverId: activePartner.id,
        content: textToSend,
        attachment: attToSend || undefined,
        replyTo: replyToSend || undefined
      });

      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === tempId ? res.message : m));
        messagesCache.current[activePartner.id] = updated;
        return updated;
      });
      loadConversations();
    } catch (err: any) {
      setChatError(err.message || "Erreur lors de l'envoi du message.");
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== tempId);
        messagesCache.current[activePartner.id] = updated;
        return updated;
      });
    } finally {
      setSending(false);
    }
  };

  // Double Click / Double Tap to LIKE (❤️)
  const handleLikeMessage = async (msg: DirectMessage, forceAdd: boolean = true) => {
    if (msg.deletedForEveryone) return;

    setHeartBurstId(msg.id);
    setTimeout(() => setHeartBurstId(null), 950);

    const currentReactions = msg.reactions || [];
    const hasHeart = currentReactions.some(
      (r) => r.userId === currentUser.id && r.emoji === '❤️'
    );

    let updatedReactions: DirectMessageReaction[];
    if (forceAdd) {
      updatedReactions = [
        ...currentReactions.filter((r) => r.userId !== currentUser.id),
        {
          userId: currentUser.id,
          userName: `${currentUser.prenom} ${currentUser.nom}`,
          emoji: '❤️'
        }
      ];
    } else {
      if (hasHeart) {
        updatedReactions = currentReactions.filter(
          (r) => !(r.userId === currentUser.id && r.emoji === '❤️')
        );
      } else {
        updatedReactions = [
          ...currentReactions.filter((r) => r.userId !== currentUser.id),
          {
            userId: currentUser.id,
            userName: `${currentUser.prenom} ${currentUser.nom}`,
            emoji: '❤️'
          }
        ];
      }
    }

    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === msg.id ? { ...m, reactions: updatedReactions } : m
      );
      if (activePartner) {
        messagesCache.current[activePartner.id] = updated;
      }
      return updated;
    });

    try {
      await api.chat.toggleReaction(msg.id, '❤️', forceAdd ? 'add' : 'toggle');
    } catch (err) {
      console.error('Failed to react', err);
    }
  };

  // Long press handling for desktop mouse
  const handleMouseDown = (msg: DirectMessage) => {
    isLongPressedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setContextMenuMessage(msg);
    }, 450);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (msg: DirectMessage) => {
    isLongPressedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setContextMenuMessage(msg);
    }, 450);
  };

  const handleTouchEnd = (msg: DirectMessage) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressedRef.current) return;

    const now = Date.now();
    const lastTap = lastTapRef.current[msg.id] || 0;
    if (now - lastTap < 350) {
      lastTouchLikeRef.current = now;
      handleLikeMessage(msg, true);
      lastTapRef.current[msg.id] = 0;
    } else {
      lastTapRef.current[msg.id] = now;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Emoji reaction pick from context menu or reaction badge
  const handleSelectEmoji = async (
    msg: DirectMessage,
    emoji: string,
    action: 'add' | 'remove' | 'toggle' = 'toggle'
  ) => {
    setContextMenuMessage(null);
    if (msg.deletedForEveryone) return;

    if (emoji === '❤️' && action !== 'remove') {
      setHeartBurstId(msg.id);
      setTimeout(() => setHeartBurstId(null), 950);
    }

    const currentReactions = msg.reactions || [];
    const existing = currentReactions.find((r) => r.userId === currentUser.id);

    let updatedReactions: DirectMessageReaction[];
    if (action === 'add') {
      updatedReactions = [
        ...currentReactions.filter((r) => r.userId !== currentUser.id),
        {
          userId: currentUser.id,
          userName: `${currentUser.prenom} ${currentUser.nom}`,
          emoji
        }
      ];
    } else if (action === 'remove') {
      updatedReactions = currentReactions.filter((r) => r.userId !== currentUser.id);
    } else {
      if (existing && existing.emoji === emoji) {
        updatedReactions = currentReactions.filter((r) => r.userId !== currentUser.id);
      } else {
        updatedReactions = [
          ...currentReactions.filter((r) => r.userId !== currentUser.id),
          {
            userId: currentUser.id,
            userName: `${currentUser.prenom} ${currentUser.nom}`,
            emoji
          }
        ];
      }
    }

    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === msg.id ? { ...m, reactions: updatedReactions } : m
      );
      if (activePartner) {
        messagesCache.current[activePartner.id] = updated;
      }
      return updated;
    });

    try {
      await api.chat.toggleReaction(msg.id, emoji, action);
    } catch (err) {
      console.error('Failed to react', err);
    }
  };

  // Reply to message
  const handleStartReply = (msg: DirectMessage) => {
    setContextMenuMessage(null);
    setEditingMessage(null);
    setReplyingTo({
      messageId: msg.id,
      senderName: msg.senderName,
      content: msg.content || (msg.attachment ? `[Pièce jointe : ${msg.attachment.name}]` : '')
    });
    textInputRef.current?.focus();
  };

  // Edit message
  const handleStartEdit = (msg: DirectMessage) => {
    setContextMenuMessage(null);
    setReplyingTo(null);
    setEditingMessage(msg);
    setInputText(msg.content || '');
    textInputRef.current?.focus();
  };

  // Delete message for me
  const handleDeleteForMe = async (msg: DirectMessage) => {
    setContextMenuMessage(null);
    setMessages((prev) => {
      const updated = prev.filter((m) => m.id !== msg.id);
      if (activePartner) {
        messagesCache.current[activePartner.id] = updated;
      }
      return updated;
    });

    try {
      await api.chat.deleteMessage(msg.id, 'for_me');
    } catch (err: any) {
      setChatError(err.message || 'Erreur lors de la suppression.');
    }
  };

  // Delete message for everyone
  const handleExecuteDeleteForEveryone = async (msg: DirectMessage) => {
    setConfirmDeleteEveryone(null);
    setContextMenuMessage(null);

    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              deletedForEveryone: true,
              content: 'Ce message a été supprimé',
              attachment: undefined
            }
          : m
      );
      if (activePartner) {
        messagesCache.current[activePartner.id] = updated;
      }
      return updated;
    });

    try {
      await api.chat.deleteMessage(msg.id, 'for_everyone');
    } catch (err: any) {
      setChatError(err.message || 'Erreur lors de la suppression.');
    }
  };

  // Attach Image
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingAttachment({
        type: 'image',
        url: dataUrl,
        name: file.name,
        size: file.size
      });
    } catch {
      setChatError("Impossible de charger l'image.");
    }
    e.target.value = '';
  };

  // Attach Document
  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingAttachment({
        type: 'document',
        url: dataUrl,
        name: file.name,
        size: file.size
      });
    } catch {
      setChatError('Impossible de charger le document.');
    }
    e.target.value = '';
  };

  // Toggle audio playback
  const togglePlayAudio = (msgId: string, url: string) => {
    let audio = audioRefs.current[msgId];
    if (!audio) {
      audio = new Audio(url);
      audioRefs.current[msgId] = audio;
      audio.onended = () => setPlayingAudioId(null);
    }

    if (playingAudioId === msgId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId]?.pause();
      }
      audio.play().catch(console.error);
      setPlayingAudioId(msgId);
    }
  };

  // Block / Unblock user
  const handleToggleBlock = async () => {
    if (!activePartner) return;
    try {
      if (isBlockedByMe) {
        await api.users.unblock(activePartner.id);
        setIsBlockedByMe(false);
        setIsBlocked(isBlockedByThem);
      } else {
        await api.users.block(activePartner.id);
        setIsBlockedByMe(true);
        setIsBlocked(true);
      }
      setShowPartnerMenu(false);
      loadConversations();
    } catch (err: any) {
      setChatError(err.message || 'Erreur lors du blocage.');
    }
  };

  // Open in-app Lightbox viewer when clicking any image
  const openImageLightbox = (
    url: string,
    name: string,
    senderName?: string,
    createdAt?: string
  ) => {
    setLightboxZoom(1);
    setLightboxImage({ url, name, senderName, createdAt });
  };

  const sharedImages = messages.filter(
    (m) => !m.deletedForEveryone && m.attachment?.type === 'image'
  );
  const sharedDocsAndAudio = messages.filter(
    (m) =>
      !m.deletedForEveryone &&
      (m.attachment?.type === 'document' || m.attachment?.type === 'audio')
  );
  const isCurrentPartnerTyping = activePartner ? Boolean(typingPartners[activePartner.id]) : false;

  return (
    <div
      className={`h-full w-full max-w-7xl mx-auto flex flex-col sm:p-2.5 overflow-hidden ${
        !activePartner ? 'pb-16 lg:pb-2.5' : 'p-0'
      }`}
    >
      {/* Main Chat Layout Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-[#0b1325] sm:rounded-2xl sm:border border-slate-200/90 dark:border-slate-800/90 shadow-2xs overflow-hidden flex flex-col md:flex-row relative">
        {/* LEFT COLUMN: Conversations List & Quick Contacts Zone */}
        <div
          className={`w-full md:w-84 lg:w-92 flex flex-col h-full min-h-0 border-r border-slate-200/80 dark:border-slate-800/80 shrink-0 bg-white dark:bg-[#0d162c] ${
            activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Left Header */}
          <div className="shrink-0 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  title="Retour"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Messages</span>
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                </h2>
              </div>
            </div>
            <button
              onClick={loadConversations}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Rafraîchir les discussions"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un contact..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Active Contacts Strip */}
          {quickContacts.length > 0 && !searchQuery.trim() && (
            <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/70 flex items-center space-x-3 overflow-x-auto no-scrollbar">
              {quickContacts.map((u) => {
                const isSelected = activePartner?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectPartnerById(u.id)}
                    className="flex flex-col items-center shrink-0 w-13 group cursor-pointer"
                  >
                    <div
                      className={`relative p-0.5 rounded-full transition ${
                        isSelected ? 'ring-2 ring-blue-600' : 'group-hover:scale-105'
                      }`}
                    >
                      <img
                        src={u.avatarUrl}
                        alt={u.prenom}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0d162c]" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center mt-1">
                      {u.prenom}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className="shrink-0 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 max-h-60 overflow-y-auto">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1">
                Membres trouvés ({searchResults.length})
              </div>
              {isSearchingUsers ? (
                <div className="py-3 text-center text-xs text-slate-400">Recherche en cours...</div>
              ) : searchResults.length === 0 ? (
                <div className="py-3 text-center text-xs text-slate-400">Aucun utilisateur trouvé</div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      selectPartnerById(u.id);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={u.avatarUrl}
                        alt={u.prenom}
                        className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {u.prenom} {u.nom}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{u.promo}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUserProfile(u.id);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700 rounded-lg hover:bg-slate-300 transition shrink-0"
                    >
                      Profil
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Scrollable Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5 space-y-1">
            {loadingConversations ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                <span className="text-xs font-medium">Chargement des discussions...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <MessageSquare className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aucune discussion récente
                </p>
                <p className="text-[11px] text-slate-500">
                  Touchez un contact ci-dessus pour démarrer une conversation.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = activePartner?.id === c.partner.id;
                const partnerTyping = Boolean(typingPartners[c.partner.id]);
                const hasUnread = c.unreadCount > 0;

                return (
                  <div
                    key={c.partner.id}
                    onClick={() => selectPartnerById(c.partner.id)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-2xl cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.partner.avatarUrl}
                        alt={c.partner.prenom}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0d162c]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm truncate ${
                            hasUnread
                              ? 'font-extrabold text-slate-950 dark:text-white'
                              : 'font-bold text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {c.partner.prenom} {c.partner.nom}
                        </span>
                        <span
                          className={`text-[11px] font-mono tabular-nums shrink-0 ml-2 ${
                            hasUnread
                              ? 'font-bold text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        {partnerTyping ? (
                          <div className="flex items-center space-x-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <span>En train d'écrire...</span>
                          </div>
                        ) : (
                          <p
                            className={`text-xs truncate pr-2 ${
                              hasUnread
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {c.lastMessage.senderId === currentUser.id ? 'Vous : ' : ''}
                            {c.lastMessage.content ||
                              (c.lastMessage.attachment
                                ? `Pièce jointe : ${c.lastMessage.attachment.name}`
                                : 'Nouveau message')}
                          </p>
                        )}

                        {hasUnread && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-mono tabular-nums font-bold flex items-center justify-center shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Conversation Zone (Strict Flex-Col so Input Stays Above Keyboard) */}
        <div
          className={`w-full flex-1 flex flex-col h-full min-h-0 bg-slate-50/70 dark:bg-[#080e1d] relative ${
            !activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activePartner ? (
            <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
              {/* Main Conversation Stream + Header + Anchored Bottom Composer */}
              <div className="flex-1 min-w-0 flex flex-col h-full min-h-0">
                {/* 1. STICKY TOP CONVERSATION HEADER */}
                <div className="shrink-0 z-20 px-3 sm:px-4 py-2.5 border-b border-slate-200/90 dark:border-slate-800/90 flex items-center justify-between bg-white dark:bg-[#0d162c]">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <button
                      onClick={() => {
                        setActivePartner(null);
                        setShowProfileDrawer(false);
                      }}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition shrink-0 cursor-pointer"
                      title="Retour aux discussions"
                    >
                      <ArrowLeft className="w-5 h-5 shrink-0" />
                    </button>

                    {/* Partner Avatar & Clickable Profile Trigger */}
                    <div
                      onClick={() => onOpenUserProfile(activePartner.id)}
                      className="flex items-center space-x-2.5 min-w-0 cursor-pointer group"
                      title="Voir le profil complet"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={activePartner.avatarUrl}
                          alt={activePartner.prenom}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:ring-2 group-hover:ring-blue-500 transition"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0d162c]" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate flex items-center space-x-1.5 transition">
                          <span className="truncate">
                            {activePartner.prenom} {activePartner.nom}
                          </span>
                          {activePartner.isLocked && (
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                        </div>

                        {isCurrentPartnerTyping ? (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold flex items-center space-x-1">
                            <span>En train d'écrire...</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              En ligne
                            </span>
                            <span>·</span>
                            <span className="truncate">{activePartner.promo || 'Membre MK'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => onOpenUserProfile(activePartner.id)}
                      className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
                      title="Ouvrir le profil"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Profil</span>
                    </button>

                    <button
                      onClick={() => setShowProfileDrawer((prev) => !prev)}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        showProfileDrawer
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      title="Infos contact & médias partagés"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {/* Bubble Color Theme Picker */}
                    <div className="relative">
                      <button
                        onClick={() => setShowThemeMenu((prev) => !prev)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Couleur des bulles"
                      >
                        <Palette className="w-4 h-4" />
                      </button>

                      {showThemeMenu && (
                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30">
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1">
                            Couleur des messages
                          </div>
                          {(Object.keys(BUBBLE_THEMES) as BubbleThemeId[]).map((tKey) => {
                            const th = BUBBLE_THEMES[tKey];
                            return (
                              <button
                                key={tKey}
                                onClick={() => handleSelectBubbleTheme(tKey)}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                                  bubbleTheme === tKey
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className={`w-3.5 h-3.5 rounded-full ${th.swatch}`} />
                                  <span>{th.label}</span>
                                </div>
                                {bubbleTheme === tKey && <Check className="w-3.5 h-3.5" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* More Options Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowPartnerMenu(!showPartnerMenu)}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showPartnerMenu && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-30">
                          <button
                            onClick={() => {
                              setShowPartnerMenu(false);
                              onOpenUserProfile(activePartner.id);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center space-x-2 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>Voir le profil complet</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowPartnerMenu(false);
                              setShowProfileDrawer(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center space-x-2 transition cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                            <span>Photos & Médias partagés</span>
                          </button>
                          <button
                            onClick={handleToggleBlock}
                            className={`w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center space-x-2 transition cursor-pointer ${
                              isBlockedByMe
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            {isBlockedByMe ? (
                              <>
                                <ShieldOff className="w-3.5 h-3.5" />
                                <span>Débloquer ce contact</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Bloquer ce contact</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Blocked banner */}
                {isBlocked && (
                  <div className="shrink-0 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 p-2.5 px-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      {isBlockedByMe
                        ? 'Vous avez bloqué cet utilisateur. Vous ne pouvez plus échanger de messages.'
                        : 'La communication avec cet utilisateur est actuellement bloquée.'}
                    </span>
                  </div>
                )}

                {chatError && (
                  <div className="shrink-0 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 p-2.5 px-4 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{chatError}</span>
                    </div>
                    <button onClick={() => setChatError(null)} className="p-1 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 2. SCROLLABLE MESSAGE STREAM — Clean Modern Conversation Bubbles */}
                <div
                  ref={messageStreamRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 py-4 space-y-1.5"
                >
                  {loadingMessages && messages.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                      <span className="text-xs font-medium">Chargement des messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center">
                      <img
                        src={activePartner.avatarUrl}
                        alt={activePartner.prenom}
                        className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-blue-500/40"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {activePartner.prenom} {activePartner.nom}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {activePartner.promo || 'Membre MK'}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                        Envoyez un premier message ci-dessous pour démarrer la discussion.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUser.id;
                      const hasReactions = msg.reactions && msg.reactions.length > 0;
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                      const isSameAsPrev = prevMsg && prevMsg.senderId === msg.senderId;
                      const isSameAsNext = nextMsg && nextMsg.senderId === msg.senderId;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 group relative ${
                            hasReactions ? 'mb-5' : isSameAsNext ? 'mb-1' : 'mb-2.5'
                          } ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="w-7 shrink-0">
                              {!isSameAsNext && (
                                <img
                                  src={msg.senderAvatar}
                                  alt={msg.senderName}
                                  className="w-7 h-7 rounded-full object-cover cursor-pointer border border-slate-200 dark:border-slate-700 hover:opacity-90 transition"
                                  onClick={() => onOpenUserProfile(msg.senderId)}
                                  title={`Voir le profil de ${msg.senderName}`}
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </div>
                          )}

                          {/* Desktop Hover Quick Actions (Left of my message) */}
                          {isMe && !msg.deletedForEveryone && (
                            <div className="hidden sm:flex opacity-0 group-hover:opacity-100 items-center space-x-0.5 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-2xs transition shrink-0 self-center">
                              <button
                                type="button"
                                onClick={() => handleLikeMessage(msg, true)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="J'aime (❤️)"
                              >
                                <Heart className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartReply(msg)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                title="Répondre"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setContextMenuMessage(msg)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                                title="Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Refined Modern Message Bubble */}
                          <div
                            onDoubleClick={() => {
                              if (Date.now() - lastTouchLikeRef.current < 700) return;
                              handleLikeMessage(msg, true);
                            }}
                            onMouseDown={() => handleMouseDown(msg)}
                            onMouseUp={handleMouseUp}
                            onTouchStart={() => handleTouchStart(msg)}
                            onTouchEnd={() => handleTouchEnd(msg)}
                            onTouchMove={handleTouchMove}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenuMessage(msg);
                            }}
                            className={`relative max-w-[82%] sm:max-w-[68%] px-3.5 py-2.5 select-text transition-all cursor-pointer ${
                              msg.deletedForEveryone
                                ? 'bg-slate-200/70 dark:bg-slate-800/50 text-slate-500 italic border border-slate-300/70 dark:border-slate-800 rounded-2xl'
                                : isMe
                                ? `${activeTheme.sentBubble} rounded-[20px] ${
                                    isSameAsNext ? 'rounded-br-md' : 'rounded-br-[4px]'
                                  } ${isSameAsPrev ? 'rounded-tr-md' : ''}`
                                : `bg-white dark:bg-[#131d33] text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800/90 rounded-[20px] ${
                                    isSameAsNext ? 'rounded-bl-md' : 'rounded-bl-[4px]'
                                  } ${isSameAsPrev ? 'rounded-tl-md' : ''} shadow-2xs`
                            }`}
                          >
                            {/* Heart Burst Animation on Double Click */}
                            {heartBurstId === msg.id && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                <div className="animate-heart-burst flex items-center justify-center">
                                  <Heart className="w-14 h-14 fill-rose-500 text-rose-500 drop-shadow-[0_4px_16px_rgba(244,63,94,0.6)]" />
                                </div>
                              </div>
                            )}

                            {/* Forwarded Header indicator */}
                            {msg.isForwarded && (
                              <div
                                className={`flex items-center space-x-1 text-[10px] font-semibold mb-1 opacity-80 ${
                                  isMe ? activeTheme.sentSubtleText : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <Forward className="w-3 h-3" />
                                <span>Message transféré</span>
                              </div>
                            )}

                            {/* Quoted Reply if present */}
                            {msg.replyTo && (
                              <div
                                className={`p-2 rounded-xl mb-2 text-xs border-l-2 ${
                                  isMe
                                    ? activeTheme.sentQuote
                                    : 'bg-slate-100 dark:bg-slate-800/80 border-blue-500 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                <div className="font-bold text-[10px] opacity-90 flex items-center space-x-1 mb-0.5">
                                  <CornerDownRight className="w-3 h-3" />
                                  <span>{msg.replyTo.senderName}</span>
                                </div>
                                <p className="line-clamp-2 italic text-[11px]">
                                  {msg.replyTo.content}
                                </p>
                              </div>
                            )}

                            {/* Attached Image */}
                            {msg.attachment &&
                              msg.attachment.type === 'image' &&
                              !msg.deletedForEveryone && (
                                <div
                                  className="mb-2 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 relative group/img"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openImageLightbox(
                                      msg.attachment!.url,
                                      msg.attachment!.name,
                                      msg.senderName,
                                      msg.createdAt
                                    );
                                  }}
                                >
                                  <img
                                    src={msg.attachment.url}
                                    alt={msg.attachment.name}
                                    className="max-h-72 w-full object-cover cursor-zoom-in group-hover/img:scale-[1.02] transition-transform duration-200"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                            {/* Attached Audio Voice Note */}
                            {msg.attachment &&
                              msg.attachment.type === 'audio' &&
                              !msg.deletedForEveryone && (
                                <div
                                  className={`p-2.5 rounded-xl mb-1.5 flex items-center space-x-2.5 ${
                                    isMe
                                      ? activeTheme.sentMediaBox
                                      : 'bg-slate-100 dark:bg-slate-800/80'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePlayAudio(msg.id, msg.attachment!.url);
                                    }}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition cursor-pointer ${
                                      isMe
                                        ? 'bg-white text-slate-900 hover:bg-slate-100'
                                        : 'bg-blue-600 text-white hover:bg-blue-500'
                                    }`}
                                  >
                                    {playingAudioId === msg.id ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4 ml-0.5" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold flex items-center space-x-1">
                                      <Volume2 className="w-3.5 h-3.5" />
                                      <span>Message vocal</span>
                                    </div>
                                    <div className="text-[10px] opacity-75">
                                      {msg.attachment.duration
                                        ? `${msg.attachment.duration}s`
                                        : 'Audio'}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Attached Document */}
                            {msg.attachment &&
                              msg.attachment.type === 'document' &&
                              !msg.deletedForEveryone && (
                                <div
                                  className={`p-2.5 rounded-xl mb-1.5 flex items-center space-x-2.5 ${
                                    isMe
                                      ? activeTheme.sentMediaBox
                                      : 'bg-slate-100 dark:bg-slate-800/80'
                                  }`}
                                >
                                  <FileText className="w-5 h-5 shrink-0 opacity-85" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">
                                      {msg.attachment.name}
                                    </div>
                                    <div className="text-[10px] opacity-75 font-mono tabular-nums">
                                      {msg.attachment.size
                                        ? `${(msg.attachment.size / 1024).toFixed(1)} Ko`
                                        : 'Document'}
                                    </div>
                                  </div>
                                  <a
                                    href={msg.attachment.url}
                                    download={msg.attachment.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-white shrink-0 transition"
                                    title="Télécharger"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}

                            {/* Text message content */}
                            {msg.content && (
                              <p className="text-[14px] leading-[1.45] whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}

                            {/* Message Footer: Timestamp + Read status */}
                            <div
                              className={`flex items-center justify-end space-x-1 text-[10px] mt-1 select-none font-mono tabular-nums ${
                                isMe
                                  ? activeTheme.sentSubtleText
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {msg.isEdited && (
                                <span className="italic opacity-80 mr-0.5 font-sans">
                                  (modifié)
                                </span>
                              )}
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isMe && (
                                <span>
                                  {msg.isSending ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline" />
                                  ) : msg.isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-white inline" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 opacity-75 inline" />
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Reaction Badges */}
                            {hasReactions && (
                              <div
                                className={`absolute -bottom-3.5 z-20 flex flex-wrap items-center gap-1 ${
                                  isMe ? 'right-2' : 'left-2'
                                }`}
                              >
                                {Array.from(new Set(msg.reactions!.map((r) => r.emoji))).map(
                                  (emoji: string) => {
                                    const count =
                                      msg.reactions?.filter((r) => r.emoji === emoji).length || 0;
                                    const isMyReact = msg.reactions?.some(
                                      (r) => r.userId === currentUser.id && r.emoji === emoji
                                    );

                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectEmoji(msg, emoji, 'toggle');
                                        }}
                                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold transition shadow-2xs cursor-pointer hover:scale-105 ${
                                          isMyReact
                                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-400 dark:border-blue-600'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                        }`}
                                      >
                                        <span className="text-xs leading-none">{emoji}</span>
                                        {count > 1 && (
                                          <span className="text-[10px] font-mono tabular-nums font-bold">
                                            {count}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </div>

                          {/* Desktop Hover Quick Actions (Right of partner message) */}
                          {!isMe && !msg.deletedForEveryone && (
                            <div className="hidden sm:flex opacity-0 group-hover:opacity-100 items-center space-x-0.5 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-2xs transition shrink-0 self-center">
                              <button
                                type="button"
                                onClick={() => handleLikeMessage(msg, true)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="J'aime (❤️)"
                              >
                                <Heart className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartReply(msg)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                title="Répondre"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setContextMenuMessage(msg)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                                title="Options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* REAL-TIME 3 DOTS TYPING BUBBLE WHEN PARTNER IS TYPING */}
                  {isCurrentPartnerTyping && (
                    <div className="flex items-end space-x-2 justify-start animate-fadeIn">
                      <img
                        src={activePartner.avatarUrl}
                        alt={activePartner.prenom}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="bg-white dark:bg-[#131d33] border border-slate-200/80 dark:border-slate-800 rounded-[20px] rounded-bl-[4px] px-4 py-2.5 shadow-2xs flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {activePartner.prenom} écrit...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* 3. ANCHORED BOTTOM WRITING ZONE (Always stays right above the keyboard) */}
                <div className="shrink-0 sticky bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#0d162c] border-t border-slate-200/90 dark:border-slate-800/90 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                  {/* REPLYING PREVIEW BANNER */}
                  {replyingTo && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs truncate">
                        <Reply className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Réponse à {replyingTo.senderName} :
                          </span>{' '}
                          <span className="text-slate-600 dark:text-slate-300 italic truncate">
                            « {replyingTo.content} »
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* EDITING PREVIEW BANNER */}
                  {editingMessage && (
                    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs">
                        <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          Modification du message
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessage(null);
                          setInputText('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Pending Attachment Preview Banner */}
                  {pendingAttachment && (
                    <div className="p-2.5 px-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {pendingAttachment.type === 'image' ? (
                          <img
                            src={pendingAttachment.url}
                            alt={pendingAttachment.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                          />
                        ) : pendingAttachment.type === 'audio' ? (
                          <Mic className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="truncate">Pièce jointe : {pendingAttachment.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingAttachment(null)}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Voice Recorder Drawer */}
                  {showVoiceRecorder && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      <AudioRecorder
                        onAudioReady={(att) => {
                          setPendingAttachment({
                            type: 'audio',
                            url: att.url,
                            name: att.name || 'Message_vocal.webm',
                            duration: att.duration
                          });
                          setShowVoiceRecorder(false);
                        }}
                        onCancel={() => setShowVoiceRecorder(false)}
                      />
                    </div>
                  )}

                  {/* Quick Emoji Strip */}
                  {showQuickEmojiBar && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-around">
                      {EMOJI_LIST.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setInputText((prev) => prev + em);
                            textInputRef.current?.focus();
                          }}
                          className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* COMPOSER FORM (16px text-base on mobile prevents browser zoom so keyboard stays cleanly below) */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2"
                  >
                    <input
                      type="file"
                      ref={imageInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={docInputRef}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                      onChange={handleDocSelect}
                      className="hidden"
                    />

                    <div className="flex items-center space-x-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isBlocked || sending}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Envoyer une photo"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                        disabled={isBlocked || sending}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Message vocal"
                      >
                        <Mic className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        disabled={isBlocked || sending}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Joindre un fichier"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-3.5 py-1.5 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition">
                      <input
                        ref={textInputRef}
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onFocus={() => {
                          setTimeout(() => scrollToBottom('smooth'), 120);
                        }}
                        placeholder={
                          isBlocked
                            ? 'Communication bloquée'
                            : editingMessage
                            ? 'Modifier votre message...'
                            : replyingTo
                            ? 'Votre réponse...'
                            : `Message à ${activePartner.prenom}...`
                        }
                        disabled={isBlocked || sending}
                        className="w-full py-1 text-base sm:text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowQuickEmojiBar((prev) => !prev)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition shrink-0 cursor-pointer"
                        title="Emojis"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isBlocked || sending || (!inputText.trim() && !pendingAttachment)
                      }
                      className={`w-10 h-10 rounded-full font-bold transition flex items-center justify-center shadow-2xs disabled:opacity-40 shrink-0 cursor-pointer ${activeTheme.sendBtn}`}
                      title={editingMessage ? 'Sauvegarder' : 'Envoyer'}
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editingMessage ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* SLIDE-OVER / RIGHT SIDEBAR: PARTNER PROFILE & SHARED MEDIA */}
              {showProfileDrawer && (
                <div className="absolute inset-0 sm:static sm:w-72 lg:w-80 bg-white dark:bg-[#0d162c] border-l border-slate-200 dark:border-slate-800 z-30 flex flex-col h-full overflow-y-auto animate-fadeIn">
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#0d162c]/95 backdrop-blur-xs z-10">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Profil & Médias partagés
                    </span>
                    <button
                      onClick={() => setShowProfileDrawer(false)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 text-center border-b border-slate-100 dark:border-slate-800/80">
                    <img
                      src={activePartner.avatarUrl}
                      alt={activePartner.prenom}
                      onClick={() => onOpenUserProfile(activePartner.id)}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-blue-500/40 cursor-pointer hover:opacity-90 transition"
                      referrerPolicy="no-referrer"
                    />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activePartner.prenom} {activePartner.nom}
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                      {activePartner.promo || 'Membre MK'}
                    </p>
                    {activePartner.bio && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {activePartner.bio}
                      </p>
                    )}

                    <button
                      onClick={() => onOpenUserProfile(activePartner.id)}
                      className="mt-4 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Ouvrir le profil complet</span>
                    </button>
                  </div>

                  {/* Shared Photos Grid */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Photos échangées ({sharedImages.length})
                      </span>
                    </div>
                    {sharedImages.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        Aucune photo partagée dans cette discussion.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {sharedImages.map((imgMsg) => (
                          <div
                            key={imgMsg.id}
                            onClick={() =>
                              openImageLightbox(
                                imgMsg.attachment!.url,
                                imgMsg.attachment!.name,
                                imgMsg.senderName,
                                imgMsg.createdAt
                              )
                            }
                            className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group relative"
                          >
                            <img
                              src={imgMsg.attachment!.url}
                              alt={imgMsg.attachment!.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Shared Documents & Voice Notes */}
                  <div className="p-4">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2.5">
                      Fichiers & Vocaux ({sharedDocsAndAudio.length})
                    </span>
                    {sharedDocsAndAudio.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        Aucun document ou vocal partagé.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sharedDocsAndAudio.map((docMsg) => (
                          <div
                            key={docMsg.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs"
                          >
                            <div className="flex items-center space-x-2 truncate pr-2">
                              {docMsg.attachment?.type === 'audio' ? (
                                <Volume2 className="w-4 h-4 text-blue-500 shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                              )}
                              <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                                {docMsg.attachment?.name}
                              </span>
                            </div>
                            <a
                              href={docMsg.attachment?.url}
                              download={docMsg.attachment?.name}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
                              title="Télécharger"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 border border-blue-200/60 dark:border-blue-800/60">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
                Vos discussions privées
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Sélectionnez un contact à gauche pour discuter en temps réel, partager des photos, des documents ou des notes vocales.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CONTEXT MENU / BOTTOM ACTION SHEET */}
      {contextMenuMessage && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setContextMenuMessage(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Actions sur le message
              </span>
              <button
                onClick={() => setContextMenuMessage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-around bg-slate-100 dark:bg-slate-800/70 p-2 rounded-2xl">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectEmoji(contextMenuMessage, emoji)}
                  className="text-xl hover:scale-125 active:scale-95 transition-transform p-1 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="space-y-1 text-xs font-semibold">
              <button
                onClick={() => handleStartReply(contextMenuMessage)}
                className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <Reply className="w-4 h-4 text-blue-600" />
                <span>Répondre à ce message</span>
              </button>

              <button
                onClick={() => {
                  setForwardingMessage(contextMenuMessage);
                  setContextMenuMessage(null);
                }}
                className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <Forward className="w-4 h-4 text-blue-500" />
                <span>Transférer le message</span>
              </button>

              {contextMenuMessage.senderId === currentUser.id &&
                !contextMenuMessage.deletedForEveryone && (
                  <button
                    onClick={() => handleStartEdit(contextMenuMessage)}
                    className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-600 transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-amber-500" />
                    <span>Modifier le message</span>
                  </button>
                )}

              <button
                onClick={() => handleDeleteForMe(contextMenuMessage)}
                className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>Supprimer pour moi</span>
              </button>

              {contextMenuMessage.senderId !== currentUser.id && (
                <button
                  onClick={() => {
                    setReportMessageTarget(contextMenuMessage);
                    setContextMenuMessage(null);
                  }}
                  className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition cursor-pointer"
                >
                  <Flag className="w-4 h-4 text-amber-500" />
                  <span>Signaler ce message à l'administration</span>
                </button>
              )}

              {contextMenuMessage.senderId === currentUser.id &&
                !contextMenuMessage.deletedForEveryone && (
                  <button
                    onClick={() => {
                      setConfirmDeleteEveryone(contextMenuMessage);
                      setContextMenuMessage(null);
                    }}
                    className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Supprimer pour tout le monde</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* REPORT MESSAGE MODAL */}
      {reportMessageTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
          onClick={() => setReportMessageTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Signaler ce message
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Expéditeur : {reportMessageTarget.senderName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportMessageTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">
              « {reportMessageTarget.content || 'Pièce jointe multimédia'} »
            </div>

            <form onSubmit={handleReportMessageSubmit} className="space-y-4">
              <div className="space-y-1.5">
                {[
                  'Contenu inapproprié ou offensant',
                  'Harcèlement ou menaces',
                  'Discours haineux',
                  'Spam ou sollicitation indésirable'
                ].map((reasonOption) => (
                  <label
                    key={reasonOption}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      reportReason === reasonOption
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="chatReportReason"
                      value={reasonOption}
                      checked={reportReason === reasonOption}
                      onChange={() => setReportReason(reasonOption)}
                      className="accent-amber-600"
                    />
                    <span>{reasonOption}</span>
                  </label>
                ))}
              </div>

              <textarea
                rows={2}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Détails supplémentaires pour l'administration (facultatif)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReportMessageTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {submittingReport ? 'Envoi...' : "Envoyer à l'administration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportSuccessToast && (
        <div className="fixed top-16 right-4 z-50 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reportSuccessToast}</span>
        </div>
      )}

      {/* CONFIRM IN-APP MODAL FOR DELETE FOR EVERYONE */}
      {confirmDeleteEveryone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setConfirmDeleteEveryone(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Supprimer pour tout le monde ?
                </h3>
                <p className="text-xs text-slate-500">
                  Ce message sera effacé pour tous les participants.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                onClick={() => setConfirmDeleteEveryone(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleExecuteDeleteForEveryone(confirmDeleteEveryone)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-2xs cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IN-APP IMAGE LIGHTBOX VIEWER */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="flex items-center justify-between text-white z-10 max-w-6xl w-full mx-auto bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-3">
              <div className="text-xs sm:text-sm font-bold truncate">
                {lightboxImage.name || 'Image partagée'}
              </div>
              {lightboxImage.senderName && (
                <div className="text-[11px] text-slate-300 truncate">
                  Envoyé par {lightboxImage.senderName}
                  {lightboxImage.createdAt
                    ? ` · ${new Date(lightboxImage.createdAt).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`
                    : ''}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Zoom arrière"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-1.5 tabular-nums">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Zoom avant"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Réinitialiser le zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <a
                href={lightboxImage.url}
                download={lightboxImage.name || 'image.png'}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition flex items-center space-x-1 text-xs font-semibold px-3"
                title="Télécharger l'image"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition cursor-pointer"
                title="Fermer l'image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center overflow-auto my-4"
            onClick={() => setLightboxImage(null)}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxZoom((z) => (z === 1 ? 1.75 : 1));
              }}
              style={{ transform: `scale(${lightboxZoom})` }}
              className="max-h-[78vh] max-w-[92vw] object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Forward Modal */}
      <ForwardMessageModal
        isOpen={forwardingMessage !== null}
        message={forwardingMessage}
        currentUser={currentUser}
        onClose={() => setForwardingMessage(null)}
        onSuccess={() => {
          loadConversations();
        }}
      />
    </div>
  );
};
