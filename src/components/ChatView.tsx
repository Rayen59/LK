import React, { useState, useEffect, useRef } from 'react';
import { User, DirectMessage, DirectMessageAttachment } from '../types';
import { api, fileToDataUrl } from '../lib/api';
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
  ArrowLeft
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';

interface ChatViewProps {
  currentUser: User;
  initialPartnerId?: string | null;
  onOpenUserProfile: (userId: string) => void;
  onGoBack?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  initialPartnerId,
  onOpenUserProfile,
  onGoBack
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

  // Audio voice note recording modal / drawer
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Menu options
  const [showPartnerMenu, setShowPartnerMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load conversation list
  const loadConversations = async () => {
    try {
      const data = await api.chat.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Handle initialPartnerId if passed
  useEffect(() => {
    if (initialPartnerId) {
      selectPartnerById(initialPartnerId);
    }
  }, [initialPartnerId]);

  const selectPartnerById = async (partnerId: string) => {
    try {
      setLoadingMessages(true);
      setChatError(null);
      const res = await api.chat.getMessages(partnerId);
      setActivePartner(res.partner);
      setMessages(res.messages || []);
      setIsBlocked(res.isBlocked);
      setIsBlockedByMe(res.isBlockedByMe);
      setIsBlockedByThem(res.isBlockedByThem);
      setTimeout(() => scrollToBottom('auto'), 100);
      loadConversations();
    } catch (err: any) {
      setChatError(err.message || "Erreur d'accès à la conversation.");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Ultra-fast auto refresh when inside an active conversation (every 1.5s)
  useEffect(() => {
    if (!activePartner) return;

    const refreshInterval = setInterval(async () => {
      try {
        const res = await api.chat.getMessages(activePartner.id);
        setMessages((prev) => {
          // Compare length and IDs to avoid unnecessary re-renders
          if (res.messages.length !== prev.length || res.messages[res.messages.length - 1]?.id !== prev[prev.length - 1]?.id) {
            setTimeout(() => scrollToBottom('smooth'), 50);
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
    }, 1500);

    return () => clearInterval(refreshInterval);
  }, [activePartner]);

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
        // Exclude current user
        setSearchResults(data.users.filter((u) => u.id !== currentUser.id));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    if (!inputText.trim() && !pendingAttachment) return;
    if (isBlocked) return;

    try {
      setSending(true);
      setChatError(null);

      const res = await api.chat.sendMessage({
        receiverId: activePartner.id,
        content: inputText.trim(),
        attachment: pendingAttachment || undefined
      });

      setMessages((prev) => [...prev, res.message]);
      setInputText('');
      setPendingAttachment(null);
      setTimeout(() => scrollToBottom('smooth'), 50);
      loadConversations();
    } catch (err: any) {
      setChatError(err.message || "Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
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
      // Pause any currently playing
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
        if (confirm(`Voulez-vous vraiment bloquer ${activePartner.prenom} ${activePartner.nom} ?`)) {
          await api.users.block(activePartner.id);
          setIsBlockedByMe(true);
          setIsBlocked(true);
        }
      }
      setShowPartnerMenu(false);
      loadConversations();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du blocage.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row h-[750px] max-h-[85vh]">
        
        {/* LEFT COLUMN: Conversations List & Search */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/40 ${
            activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/50 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200 dark:border-slate-700 transition mr-1"
                  title="Revenir à la page précédente"
                >
                  <ArrowLeft className="w-4 h-4 text-teal-500" />
                </button>
              )}
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Messages Privés</span>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              </h2>
            </div>
            <button
              onClick={loadConversations}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* User Search Input */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Démarrer une conversation..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-teal-500 shadow-2xs"
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

          {/* Search Results dropdown if searching */}
          {searchQuery.trim().length > 0 && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-teal-50/50 dark:bg-teal-950/20 max-h-48 overflow-y-auto">
              <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase px-2 py-1">
                Résultats de recherche ({searchResults.length})
              </div>
              {isSearchingUsers ? (
                <div className="py-3 text-center text-xs text-slate-400">Recherche...</div>
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
                      className="w-7 h-7 rounded-full object-cover border border-teal-500 shrink-0"
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

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConversations ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500 mb-2" />
                <span className="text-xs font-semibold">Chargement...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <p className="text-xs font-semibold mb-1">Aucune conversation</p>
                <p className="text-[11px] text-slate-500">
                  Recherchez un utilisateur ci-dessus pour envoyer votre premier message instantané.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = activePartner?.id === c.partner.id;
                return (
                  <div
                    key={c.partner.id}
                    onClick={() => selectPartnerById(c.partner.id)}
                    className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                        : 'hover:bg-white dark:hover:bg-slate-800/70 text-slate-900 dark:text-white'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.partner.avatarUrl}
                        alt={c.partner.prenom}
                        className="w-11 h-11 rounded-full object-cover border-2 border-teal-500/50"
                      />
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {c.partner.prenom} {c.partner.nom}
                        </span>
                        <span className={`text-[10px] ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {c.lastMessage.content || (c.lastMessage.attachment ? `[Pièce jointe : ${c.lastMessage.attachment.type}]` : 'Nouveau message')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Conversation */}
        <div
          className={`w-full flex-1 flex flex-col bg-white dark:bg-slate-900 ${
            !activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activePartner ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Back button to conversation list */}
                  <button
                    onClick={() => setActivePartner(null)}
                    className="p-1.5 px-2 rounded-xl bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-600 border border-slate-200 dark:border-slate-700 flex items-center space-x-1 text-xs font-bold transition shrink-0"
                    title="Retour aux conversations"
                  >
                    <ArrowLeft className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className="hidden sm:inline">Conversations</span>
                  </button>

                  <img
                    src={activePartner.avatarUrl}
                    alt={activePartner.prenom}
                    onClick={() => onOpenUserProfile(activePartner.id)}
                    className="w-10 h-10 rounded-full object-cover border-2 border-teal-500 cursor-pointer hover:opacity-90 shrink-0"
                  />

                  <div className="min-w-0">
                    <div
                      onClick={() => onOpenUserProfile(activePartner.id)}
                      className="text-xs sm:text-sm font-black text-slate-900 dark:text-white cursor-pointer hover:text-teal-600 truncate flex items-center space-x-1.5"
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
                    <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium truncate flex items-center space-x-1">
                      <span>{activePartner.promo || 'Étudiant'}</span>
                      <span>•</span>
                      <span className="text-[10px] text-emerald-500 font-bold">Instantané</span>
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
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showPartnerMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-30">
                      <button
                        onClick={() => {
                          setShowPartnerMenu(false);
                          onOpenUserProfile(activePartner.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      >
                        Voir le profil
                      </button>
                      <button
                        onClick={handleToggleBlock}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center space-x-1.5 ${
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
                <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 p-2.5 px-4 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    {isBlockedByMe
                      ? "Vous avez bloqué cet utilisateur. Vous ne pouvez plus échanger de messages."
                      : "La communication avec cet utilisateur est actuellement bloquée."}
                  </span>
                </div>
              )}

              {chatError && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 p-2.5 px-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
                {loadingMessages ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500 mb-2" />
                    <span className="text-xs font-semibold">Chargement des messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-500 flex items-center justify-center mx-auto mb-2 border border-teal-200 dark:border-teal-800">
                      <Send className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Début de la conversation
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Envoyez un message texte, une photo, une note vocale ou un document.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end space-x-2 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isMe && (
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName}
                            className="w-7 h-7 rounded-full object-cover mb-1 shrink-0 cursor-pointer"
                            onClick={() => onOpenUserProfile(msg.senderId)}
                          />
                        )}

                        <div
                          className={`max-w-[78%] sm:max-w-md rounded-2xl p-3 shadow-xs ${
                            isMe
                              ? 'bg-teal-600 text-white rounded-br-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 rounded-bl-xs'
                          }`}
                        >
                          {/* Attached Image */}
                          {msg.attachment && msg.attachment.type === 'image' && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-black/10">
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.name}
                                className="max-h-60 w-full object-cover cursor-pointer hover:scale-102 transition"
                                onClick={() => window.open(msg.attachment?.url, '_blank')}
                              />
                            </div>
                          )}

                          {/* Attached Audio Voice Note */}
                          {msg.attachment && msg.attachment.type === 'audio' && (
                            <div
                              className={`p-2 rounded-xl mb-2 flex items-center space-x-2.5 ${
                                isMe ? 'bg-teal-700/60' : 'bg-slate-100 dark:bg-slate-700/60'
                              }`}
                            >
                              <button
                                onClick={() => togglePlayAudio(msg.id, msg.attachment!.url)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${
                                  isMe ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'
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
                          {msg.attachment && msg.attachment.type === 'document' && (
                            <div
                              className={`p-2.5 rounded-xl mb-2 flex items-center space-x-2.5 ${
                                isMe ? 'bg-teal-700/60' : 'bg-slate-100 dark:bg-slate-700/60'
                              }`}
                            >
                              <FileText className="w-6 h-6 text-teal-300 shrink-0" />
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
                                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white shrink-0"
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

                          {/* Message Footer: Timestamp + Read ticks */}
                          <div
                            className={`flex items-center justify-end space-x-1 text-[10px] mt-1 ${
                              isMe ? 'text-teal-200' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isMe && (
                              <span>
                                {msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-teal-200 inline" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 opacity-70 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending Attachment Preview Banner */}
              {pendingAttachment && (
                <div className="p-2.5 px-4 bg-teal-50 dark:bg-teal-950/50 border-t border-teal-200 dark:border-teal-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-teal-800 dark:text-teal-300 truncate">
                    {pendingAttachment.type === 'image' && <ImageIcon className="w-4 h-4" />}
                    {pendingAttachment.type === 'audio' && <Mic className="w-4 h-4" />}
                    {pendingAttachment.type === 'document' && <Paperclip className="w-4 h-4" />}
                    <span className="truncate">Pièce jointe prête : {pendingAttachment.name}</span>
                  </div>
                  <button
                    onClick={() => setPendingAttachment(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Voice Recorder Drawer / Modal if toggled */}
              {showVoiceRecorder && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
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

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2 bg-white dark:bg-slate-900"
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
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isBlocked || sending}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    title="Envoyer une photo"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                    disabled={isBlocked || sending}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    title="Enregistrer un message vocal"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    disabled={isBlocked || sending}
                    className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    title="Envoyer un document"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                {/* Text input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isBlocked
                      ? 'Communication bloquée'
                      : 'Écrire un message instantané...'
                  }
                  disabled={isBlocked || sending}
                  className="flex-1 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-teal-500 disabled:opacity-50"
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={
                    isBlocked ||
                    sending ||
                    (!inputText.trim() && !pendingAttachment)
                  }
                  className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold transition flex items-center justify-center shadow-sm"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mb-3 border border-teal-200 dark:border-teal-800">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Sélectionnez une conversation
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Échangez en direct des messages, photos, mémos vocaux et documents en temps réel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
