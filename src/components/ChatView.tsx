import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, DirectMessage, DirectMessageAttachment, DirectMessageReaction, DirectMessageReplyQuote } from '../types';
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
  Shield,
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
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { ForwardMessageModal } from './ForwardMessageModal';

interface ChatViewProps {
  currentUser: User;
  initialPartnerId?: string | null;
  onOpenUserProfile: (userId: string) => void;
  onGoBack?: () => void;
  onConversationStateChange?: (isOpen: boolean) => void;
}

const EMOJI_LIST = ['❤️', '😂', '😮', '😢', '🔥', '👍', '👏', '🎉'];

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  initialPartnerId,
  onOpenUserProfile,
  onGoBack,
  onConversationStateChange
}) => {
  // Conversation list state
  const [conversations, setConversations] = useState<
    { partner: User; lastMessage: DirectMessage; unreadCount: number }[]
  >([]);
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

  // Audio voice note recording modal
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Menu options
  const [showPartnerMenu, setShowPartnerMenu] = useState(false);

  // Cache in-memory messages per partner to prevent empty screens on re-entry or refresh
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

  // Notify parent of active conversation state for responsive mobile navigation
  useEffect(() => {
    onConversationStateChange?.(activePartner !== null);
  }, [activePartner, onConversationStateChange]);

  // Auto scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const data = await api.chat.getConversations();
      setConversations(data.conversations || []);
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
  const selectPartnerById = useCallback(async (partnerId: string) => {
    try {
      setChatError(null);
      setReplyingTo(null);
      setEditingMessage(null);
      setContextMenuMessage(null);
      setConfirmDeleteEveryone(null);

      // Check if we have cached messages for instant display (NO empty blank screen!)
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

      setTimeout(() => scrollToBottom('auto'), 50);
      loadConversations();
    } catch (err: any) {
      setChatError(err.message || "Erreur d'accès à la conversation.");
    } finally {
      setLoadingMessages(false);
    }
  }, [loadConversations, scrollToBottom]);

  // Handle initialPartnerId if passed
  useEffect(() => {
    if (initialPartnerId) {
      selectPartnerById(initialPartnerId);
    }
  }, [initialPartnerId, selectPartnerById]);

  // Real-time SSE Live Updates Subscription for instant updates
  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'NEW_DIRECT_MESSAGE') {
        const newMsg: DirectMessage = payload.message;
        if (!newMsg) return;

        // If inside conversation with the other user, append or replace optimistic
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

        // Always update conversation list snippet and unread badge
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
                ? { ...m, deletedForEveryone: true, content: 'Ce message a été supprimé', attachment: undefined }
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
            const updated = prev.map((m) => (m.senderId === currentUser.id ? { ...m, isRead: true } : m));
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

  // Fast background polling (2s) that NEVER flashes or wipes the message list
  useEffect(() => {
    if (!activePartner) return;

    const partnerId = activePartner.id;
    const refreshInterval = setInterval(async () => {
      try {
        const res = await api.chat.getMessages(partnerId);
        if (!res || !res.messages) return;

        setMessages((prev) => {
          // Compare message count and latest message timestamp/reactions count
          const prevLast = prev[prev.length - 1];
          const newLast = res.messages[res.messages.length - 1];

          const hasNewMsg = res.messages.length !== prev.length || prevLast?.id !== newLast?.id;
          const hasEditsOrReactions = JSON.stringify(prev.map(m => ({ id: m.id, r: m.reactions?.length, c: m.content }))) !==
            JSON.stringify(res.messages.map((m: DirectMessage) => ({ id: m.id, r: m.reactions?.length, c: m.content })));

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
      } catch (e) {
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

  // Send or Edit message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    if (!inputText.trim() && !pendingAttachment) return;
    if (isBlocked) return;

    // Handle Editing existing message
    if (editingMessage) {
      const newText = inputText.trim();
      const targetId = editingMessage.id;
      setEditingMessage(null);
      setInputText('');

      // Optimistic update
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

    // Instant optimistic render!
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

      // Replace optimistic message with actual persisted message
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

  // Double Click / Double Tap to LIKE (❤️) - Always guarantees like is preserved
  const handleLikeMessage = async (msg: DirectMessage, forceAdd: boolean = true) => {
    if (msg.deletedForEveryone) return;

    // Trigger Heart burst visual pop
    setHeartBurstId(msg.id);
    setTimeout(() => setHeartBurstId(null), 950);

    const currentReactions = msg.reactions || [];
    const hasHeart = currentReactions.some(
      (r) => r.userId === currentUser.id && r.emoji === '❤️'
    );

    let updatedReactions: DirectMessageReaction[];
    if (forceAdd) {
      // Force add: always ensure ❤️ is attached, never toggle off to empty
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
      const updated = prev.map((m) => (m.id === msg.id ? { ...m, reactions: updatedReactions } : m));
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

  // Backwards compatible alias
  const handleToggleLike = (msg: DirectMessage) => handleLikeMessage(msg, true);

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

    // Check for double tap
    const now = Date.now();
    const lastTap = lastTapRef.current[msg.id] || 0;
    if (now - lastTap < 350) {
      // Double tap detected!
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

    // Optimistic reaction update
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
      // toggle
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
      const updated = prev.map((m) => (m.id === msg.id ? { ...m, reactions: updatedReactions } : m));
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
    // Optimistic removal
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

    // Optimistic update
    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === msg.id
          ? { ...m, deletedForEveryone: true, content: 'Ce message a été supprimé', attachment: undefined }
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
    } catch (err) {
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
    } catch (err) {
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

  return (
    <div className="h-full w-full max-w-7xl mx-auto flex flex-col p-1 sm:p-3 overflow-hidden">
      {/* Main Chat Layout Container with Fixed Bounds */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT COLUMN: Conversations List & Search (Fixed Header & Scrollable List) */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col h-full min-h-0 border-r border-blue-100 dark:border-blue-950/80 shrink-0 bg-slate-50/60 dark:bg-[#090f20] ${
            activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Fixed Left Header */}
          <div className="shrink-0 p-3.5 sm:p-4 border-b border-blue-100 dark:border-blue-950 flex items-center justify-between bg-white dark:bg-[#0c142b]">
            <div className="flex items-center space-x-2">
              {onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition mr-0.5"
                  title="Revenir au fil social"
                >
                  <ArrowLeft className="w-4 h-4 text-blue-600" />
                </button>
              )}
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Conversations</span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              </h2>
            </div>
            <button
              onClick={loadConversations}
              className="p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-500 hover:text-blue-600 transition"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Fixed Search Input */}
          <div className="shrink-0 p-3 border-b border-blue-100 dark:border-blue-950 bg-white/60 dark:bg-[#0c142b]/60">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Démarrer une conversation..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-[#121c38] border border-blue-100 dark:border-blue-900/60 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950 shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className="shrink-0 p-2 border-b border-blue-100 dark:border-blue-950 bg-blue-50/80 dark:bg-blue-950/40 max-h-48 overflow-y-auto">
              <div className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase px-2 py-1">
                Résultats de recherche ({searchResults.length})
              </div>
              {isSearchingUsers ? (
                <div className="py-3 text-center text-xs text-slate-400">Recherche en direct...</div>
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
                    className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition"
                  >
                    <img
                      src={u.avatarUrl}
                      alt={u.prenom}
                      className="w-7 h-7 rounded-full object-cover border border-blue-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {u.prenom} {u.nom}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{u.promo}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Scrollable Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {loadingConversations ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                <span className="text-xs font-medium">Chargement des conversations...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto text-blue-300 dark:text-blue-800 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Aucune conversation</p>
                <p className="text-[11px] text-slate-500">
                  Recherchez un contact ci-dessus pour échanger instantanément.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = activePartner?.id === c.partner.id;
                return (
                  <div
                    key={c.partner.id}
                    onClick={() => selectPartnerById(c.partner.id)}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25'
                        : 'hover:bg-white dark:hover:bg-[#121c38] text-slate-900 dark:text-white'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.partner.avatarUrl}
                        alt={c.partner.prenom}
                        className="w-11 h-11 rounded-full object-cover border-2 border-blue-400/50"
                      />
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs animate-pulse">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {c.partner.prenom} {c.partner.nom}
                        </span>
                        <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {c.lastMessage.content || (c.lastMessage.attachment ? `[Pièce jointe : ${c.lastMessage.attachment.type}]` : 'Nouveau message')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Conversation (Fixed Header + Scrollable Messages + Fixed Input) */}
        <div
          className={`w-full flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-[#070d1d] relative ${
            !activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activePartner ? (
            <>
              {/* FIXED TOP CHAT HEADER */}
              <div className="shrink-0 z-20 px-3 sm:px-4 py-3 border-b border-blue-100 dark:border-blue-950 flex items-center justify-between bg-white/95 dark:bg-[#0c142b]/95 backdrop-blur-md shadow-xs">
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                  {/* Immediate Back Button to Return to Conversations List */}
                  <button
                    onClick={() => setActivePartner(null)}
                    className="p-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center space-x-1.5 text-xs font-bold transition shrink-0"
                    title="Retour aux conversations"
                  >
                    <ArrowLeft className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Retour</span>
                  </button>

                  <img
                    src={activePartner.avatarUrl}
                    alt={activePartner.prenom}
                    onClick={() => onOpenUserProfile(activePartner.id)}
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 cursor-pointer hover:opacity-90 shrink-0"
                  />

                  <div className="min-w-0">
                    <div
                      onClick={() => onOpenUserProfile(activePartner.id)}
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 truncate flex items-center space-x-1.5"
                    >
                      <span>
                        {activePartner.prenom} {activePartner.nom}
                      </span>
                      {activePartner.isLocked && (
                        <span className="text-[10px] text-amber-500" title="Profil verrouillé">
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate flex items-center space-x-1">
                      <span>{activePartner.promo || 'Étudiant'}</span>
                      <span>•</span>
                      <span className="text-[10px] text-emerald-500 font-medium flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        <span>En ligne</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="relative flex items-center space-x-1">
                  <button
                    onClick={() => onOpenUserProfile(activePartner.id)}
                    className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Profil</span>
                  </button>

                  <button
                    onClick={() => setShowPartnerMenu(!showPartnerMenu)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showPartnerMenu && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-30">
                      <button
                        onClick={() => {
                          setShowPartnerMenu(false);
                          onOpenUserProfile(activePartner.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                      >
                        Voir le profil complet
                      </button>
                      <button
                        onClick={handleToggleBlock}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition ${
                          isBlockedByMe
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        }`}
                      >
                        {isBlockedByMe ? (
                          <>
                            <ShieldOff className="w-3.5 h-3.5" />
                            <span>Débloquer cet utilisateur</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Bloquer cet utilisateur</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Blocked banner if applicable */}
              {isBlocked && (
                <div className="shrink-0 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 p-2.5 px-4 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    {isBlockedByMe
                      ? "Vous avez bloqué cet utilisateur. Vous ne pouvez plus échanger de messages."
                      : "La communication avec cet utilisateur est actuellement bloquée."}
                  </span>
                </div>
              )}

              {chatError && (
                <div className="shrink-0 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 p-2.5 px-4 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{chatError}</span>
                  </div>
                  <button onClick={() => setChatError(null)} className="p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* SCROLLABLE MESSAGE STREAM (Fixed bounds, smooth scroll) */}
              <div
                ref={messageStreamRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/30"
              >
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    <span className="text-xs font-medium">Chargement des messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto mb-2 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                      <Send className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Début de la conversation
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Double-cliquez pour aimer ❤️, ou maintenez enfoncé pour réagir, répondre ou transférer.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end space-x-2 group relative mb-3.5 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isMe && (
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName}
                            className="w-8 h-8 rounded-full object-cover mb-1 shrink-0 cursor-pointer border border-blue-200 dark:border-blue-900"
                            onClick={() => onOpenUserProfile(msg.senderId)}
                          />
                        )}

                        {/* Quick hover action bar on desktop (Left of sender message) */}
                        {isMe && !msg.deletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 p-1 bg-white/95 dark:bg-slate-900/95 border border-blue-100 dark:border-blue-900/60 rounded-full shadow-md transition shrink-0 self-center backdrop-blur-xs">
                            <button
                              onClick={() => handleLikeMessage(msg, true)}
                              className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="J'aime (❤️)"
                            >
                              <Heart className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStartReply(msg)}
                              className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                              title="Répondre"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setContextMenuMessage(msg)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                              title="Plus d'options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Message Bubble with Fast Double-Click & Long-Click handlers */}
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
                          className={`relative max-w-[84%] sm:max-w-md rounded-2xl p-3.5 select-text transition-all cursor-pointer ${
                            msg.deletedForEveryone
                              ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 italic border border-slate-200 dark:border-slate-800'
                              : isMe
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-xs shadow-md shadow-blue-600/20'
                              : 'bg-white dark:bg-[#121c38] text-slate-900 dark:text-white border border-blue-100 dark:border-blue-900/60 rounded-bl-xs shadow-xs'
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
                            <div className={`flex items-center space-x-1 text-[10px] font-bold mb-1.5 opacity-80 ${
                              isMe ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                            }`}>
                              <Forward className="w-3 h-3" />
                              <span>Message transféré</span>
                            </div>
                          )}

                          {/* Quoted Reply if present */}
                          {msg.replyTo && (
                            <div
                              className={`p-2 rounded-xl mb-2 text-xs border-l-2 ${
                                isMe
                                  ? 'bg-blue-800/60 border-blue-300 text-blue-50'
                                  : 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-slate-700 dark:text-slate-200'
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
                          {msg.attachment && msg.attachment.type === 'image' && !msg.deletedForEveryone && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.name}
                                className="max-h-64 w-full object-cover cursor-pointer hover:opacity-95 transition"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(msg.attachment?.url, '_blank');
                                }}
                              />
                            </div>
                          )}

                          {/* Attached Audio Voice Note */}
                          {msg.attachment && msg.attachment.type === 'audio' && !msg.deletedForEveryone && (
                            <div
                              className={`p-2 rounded-xl mb-2 flex items-center space-x-2.5 ${
                                isMe ? 'bg-blue-800/50' : 'bg-blue-50 dark:bg-blue-950/50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlayAudio(msg.id, msg.attachment!.url);
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs ${
                                  isMe ? 'bg-blue-500 hover:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                              >
                                {playingAudioId === msg.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold flex items-center space-x-1">
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Message vocal</span>
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {msg.attachment.duration ? `${msg.attachment.duration}s` : 'Audio'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Attached Document */}
                          {msg.attachment && msg.attachment.type === 'document' && !msg.deletedForEveryone && (
                            <div
                              className={`p-2.5 rounded-xl mb-2 flex items-center space-x-2.5 ${
                                isMe ? 'bg-blue-800/50' : 'bg-blue-50 dark:bg-blue-950/50'
                              }`}
                            >
                              <FileText className="w-6 h-6 text-blue-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate">
                                  {msg.attachment.name}
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {msg.attachment.size
                                    ? `${(msg.attachment.size / 1024).toFixed(1)} KB`
                                    : 'Fichier'}
                                </div>
                              </div>
                              <a
                                href={msg.attachment.url}
                                download={msg.attachment.name}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white shrink-0 transition"
                                title="Télécharger"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}

                          {/* Text message content */}
                          {msg.content && (
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}

                          {/* Message Footer: Timestamp + Read status */}
                          <div
                            className={`flex items-center justify-end space-x-1 text-[10px] mt-1 select-none ${
                              isMe ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {msg.isEdited && (
                              <span className="italic opacity-80 mr-0.5">(modifié)</span>
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
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-200 inline" />
                                ) : msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-200 inline" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 opacity-70 inline" />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Floating Modern Reaction Badges (elevated & always visible) */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div
                              className={`absolute -bottom-3 z-20 flex flex-wrap items-center gap-1 ${
                                isMe ? 'right-2' : 'left-2'
                              }`}
                            >
                              {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji: string) => {
                                const count = msg.reactions?.filter((r) => r.emoji === emoji).length || 0;
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
                                    title={isMyReact ? "Vous avez réagi. Cliquez pour retirer la réaction." : "Cliquer pour réagir"}
                                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
                                      isMyReact
                                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-2 border-blue-500 ring-2 ring-blue-500/20'
                                        : 'bg-white dark:bg-[#152244] text-slate-700 dark:text-slate-200 border border-blue-200 dark:border-blue-800/80 hover:border-blue-400'
                                    }`}
                                  >
                                    <span className="text-sm leading-none">{emoji}</span>
                                    <span className={`text-[10px] font-black ${isMyReact ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                      {count}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Quick hover action bar on desktop (Right of partner message) */}
                        {!isMe && !msg.deletedForEveryone && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 p-1 bg-white/95 dark:bg-slate-900/95 border border-blue-100 dark:border-blue-900/60 rounded-full shadow-md transition shrink-0 self-center backdrop-blur-xs">
                            <button
                              onClick={() => handleLikeMessage(msg, true)}
                              className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="J'aime (❤️)"
                            >
                              <Heart className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStartReply(msg)}
                              className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                              title="Répondre"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setContextMenuMessage(msg)}
                              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                              title="Plus d'options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* CONTEXT MENU / BOTTOM ACTION SHEET (Triggered on Long Press or Double-Click / Right-Click) */}
              {contextMenuMessage && (
                <div 
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs"
                  onClick={() => setContextMenuMessage(null)}
                >
                  <div
                    className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header with dismiss */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Actions sur le message
                      </span>
                      <button
                        onClick={() => setContextMenuMessage(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Emojis Bar */}
                    <div className="flex items-center justify-around bg-slate-100 dark:bg-slate-800/70 p-2 rounded-2xl">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleSelectEmoji(contextMenuMessage, emoji)}
                          className="text-xl hover:scale-125 active:scale-95 transition-transform p-1"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Action Buttons List */}
                    <div className="space-y-1 text-xs font-semibold">
                      {/* Reply button */}
                      <button
                        onClick={() => handleStartReply(contextMenuMessage)}
                        className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition"
                      >
                        <Reply className="w-4 h-4 text-blue-600" />
                        <span>Répondre à ce message</span>
                      </button>

                      {/* Forward button */}
                      <button
                        onClick={() => {
                          setForwardingMessage(contextMenuMessage);
                          setContextMenuMessage(null);
                        }}
                        className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition"
                      >
                        <Forward className="w-4 h-4 text-blue-500" />
                        <span>Transférer le message</span>
                      </button>

                      {/* Edit button (Only if sender is currentUser and not deleted) */}
                      {contextMenuMessage.senderId === currentUser.id &&
                        !contextMenuMessage.deletedForEveryone && (
                          <button
                            onClick={() => handleStartEdit(contextMenuMessage)}
                            className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-600 transition"
                          >
                            <Edit2 className="w-4 h-4 text-amber-500" />
                            <span>Modifier le message</span>
                          </button>
                        )}

                      {/* Delete for me */}
                      <button
                        onClick={() => handleDeleteForMe(contextMenuMessage)}
                        className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400" />
                        <span>Supprimer pour moi</span>
                      </button>

                      {/* Delete for everyone (Author only) */}
                      {contextMenuMessage.senderId === currentUser.id &&
                        !contextMenuMessage.deletedForEveryone && (
                          <button
                            onClick={() => {
                              setConfirmDeleteEveryone(contextMenuMessage);
                              setContextMenuMessage(null);
                            }}
                            className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                            <span>Supprimer pour tout le monde</span>
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* CONFIRM IN-APP MODAL FOR DELETE FOR EVERYONE (Replaces window.confirm) */}
              {confirmDeleteEveryone && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
                  onClick={() => setConfirmDeleteEveryone(null)}
                >
                  <div
                    className="w-full max-w-sm bg-white dark:bg-[#0c142b] border border-blue-100 dark:border-blue-950 rounded-2xl p-5 shadow-xl space-y-4"
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
                        className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleExecuteDeleteForEveryone(confirmDeleteEveryone)}
                        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-xs"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* REPLYING PREVIEW BANNER */}
              {replyingTo && (
                <div className="shrink-0 px-4 py-2 bg-blue-50 dark:bg-blue-950/80 border-t border-blue-200 dark:border-blue-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs truncate">
                    <Reply className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-blue-900 dark:text-blue-200">
                        Réponse à {replyingTo.senderName} :
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-300 italic truncate">
                        « {replyingTo.content} »
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* EDITING PREVIEW BANNER */}
              {editingMessage && (
                <div className="shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs">
                    <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      Modification du message en cours
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMessage(null);
                      setInputText('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pending Attachment Preview Banner */}
              {pendingAttachment && (
                <div className="shrink-0 p-2.5 px-4 bg-blue-50 dark:bg-blue-950/70 border-t border-blue-200 dark:border-blue-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-blue-800 dark:text-blue-300 truncate">
                    {pendingAttachment.type === 'image' && <ImageIcon className="w-4 h-4" />}
                    {pendingAttachment.type === 'audio' && <Mic className="w-4 h-4" />}
                    {pendingAttachment.type === 'document' && <Paperclip className="w-4 h-4" />}
                    <span className="truncate">Pièce jointe prête : {pendingAttachment.name}</span>
                  </div>
                  <button
                    onClick={() => setPendingAttachment(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Voice Recorder Drawer */}
              {showVoiceRecorder && (
                <div className="shrink-0 p-3 bg-blue-50/70 dark:bg-[#0c142b] border-t border-blue-100 dark:border-blue-900">
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

              {/* FIXED BOTTOM CHAT INPUT BAR */}
              <form
                onSubmit={handleSendMessage}
                className="shrink-0 p-2.5 sm:p-3 border-t border-blue-100 dark:border-blue-950 flex items-center space-x-2 bg-white dark:bg-[#0c142b] shadow-xs"
              >
                {/* Hidden file inputs */}
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

                {/* Attachment buttons */}
                <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isBlocked || sending}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition"
                    title="Envoyer une photo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                    disabled={isBlocked || sending}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition"
                    title="Enregistrer un message vocal"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    disabled={isBlocked || sending}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition"
                    title="Envoyer un document"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                {/* Text input */}
                <input
                  ref={textInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isBlocked
                      ? 'Communication bloquée'
                      : editingMessage
                      ? 'Modifier votre message...'
                      : replyingTo
                      ? 'Votre réponse...'
                      : 'Écrire un message instantané...'
                  }
                  disabled={isBlocked || sending}
                  className="flex-1 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#121c38] border border-blue-100 dark:border-blue-900/60 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950 disabled:opacity-50 transition shadow-2xs"
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={
                    isBlocked ||
                    sending ||
                    (!inputText.trim() && !pendingAttachment)
                  }
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white font-bold transition flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0"
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-3 border border-blue-200 dark:border-blue-900 shadow-xs">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Sélectionnez une conversation
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Échangez des messages instantanés, photos, mémos vocaux et documents en temps réel.
              </p>
            </div>
          )}
        </div>
      </div>

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
