import React, { useState, useEffect } from 'react';
import { Forum, ForumMessage, User } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import {
  MessageSquare,
  Lock,
  Unlock,
  PlusCircle,
  KeyRound,
  Send,
  Users,
  ShieldAlert,
  ArrowLeft,
  Search,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ForumsViewProps {
  currentUser: User;
  onGoBack?: () => void;
}

const FORUM_CATEGORIES = [
  'Tous les forums',
  'Discussions Générales',
  'Technologie & Digital',
  'Créateurs & Photographie',
  'Musique & Culture',
  'Voyages & Lifestyle',
  'Projets & Collaboration',
  'Entraide Communautaire',
];

export const ForumsView: React.FC<ForumsViewProps> = ({ currentUser, onGoBack }) => {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Private Forum Code Unlock modal state
  const [unlockForum, setUnlockForum] = useState<Forum | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [unlockedForums, setUnlockedForums] = useState<Record<string, boolean>>({});

  // Create Forum Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(FORUM_CATEGORIES[1]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Filter
  const [categoryFilter, setCategoryFilter] = useState('Tous les forums');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadForums();

    // Listen to real-time new forum or messages
    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'NEW_FORUM') {
        setForums((prev) => [payload, ...prev]);
      } else if (event === 'FORUM_MESSAGE') {
        if (selectedForum && selectedForum.id === payload.forumId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      }
    });

    return () => unsubscribe();
  }, [selectedForum]);

  const loadForums = async () => {
    try {
      const res = await api.forums.getAll();
      setForums(res.forums || []);
    } catch (err) {
      console.error('Failed to load forums', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForumClick = async (forum: Forum) => {
    if (forum.isPrivate && !unlockedForums[forum.id] && forum.creatorId !== currentUser.id) {
      setUnlockForum(forum);
      setEnteredCode('');
      setCodeError(null);
      return;
    }

    openForum(forum);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockForum) return;

    try {
      const res = await api.forums.verifyCode(unlockForum.id, enteredCode);
      if (res.authorized) {
        setUnlockedForums((prev) => ({ ...prev, [unlockForum.id]: true }));
        const forumToOpen = unlockForum;
        setUnlockForum(null);
        openForum(forumToOpen);
      }
    } catch (err: any) {
      setCodeError(err.message || 'Code d’accès invalide');
    }
  };

  const openForum = async (forum: Forum) => {
    setSelectedForum(forum);
    setMessagesLoading(true);
    try {
      const res = await api.forums.getMessages(forum.id);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to get forum messages', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForum || !newMessageText.trim()) return;

    setSendingMessage(true);
    try {
      const res = await api.forums.sendMessage(selectedForum.id, newMessageText.trim());
      setMessages((prev) => [...prev, res.message]);
      setNewMessageText('');
    } catch (err) {
      console.error('Send message error', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setCreateError('Le titre du forum est obligatoire.');
      return;
    }

    if (isPrivate && !accessCode.trim()) {
      setCreateError('Veuillez définir un code d’accès pour ce forum privé.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await api.forums.create({
        title: title.trim(),
        description: description.trim(),
        category,
        isPrivate,
        accessCode: isPrivate ? accessCode.trim() : undefined,
      });

      // Automatically authorize the creator for their own private forum
      if (isPrivate) {
        setUnlockedForums((prev) => ({ ...prev, [res.forum.id]: true }));
      }

      setForums((prev) => [res.forum, ...prev]);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setIsPrivate(false);
      setAccessCode('');
      openForum(res.forum);
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la création du forum.');
    } finally {
      setCreating(false);
    }
  };

  const filteredForums = forums.filter((f) => {
    const matchesCategory =
      categoryFilter === 'Tous les forums' || f.category === categoryFilter;
    const matchesSearch =
      !searchFilter.trim() ||
      f.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      f.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      
      {/* If inside a selected forum thread */}
      {selectedForum ? (
        <div className="bg-white dark:bg-[#0c142b] rounded-3xl border border-blue-100 dark:border-blue-900 shadow-md overflow-hidden flex flex-col h-[750px] max-h-[85vh]">
          
          {/* Thread Header */}
          <div className="p-4 bg-gradient-to-r from-[#091536] via-[#0e2154] to-[#091536] border-b border-blue-900/60 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedForum(null)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-900/50 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/40 text-xs font-bold transition group cursor-pointer"
                title="Retour aux salons"
              >
                <ArrowLeft className="w-4 h-4 text-blue-300 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Salons</span>
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-blue-300 font-bold bg-blue-950/80 px-2.5 py-0.5 rounded-md border border-blue-800">
                    {selectedForum.category}
                  </span>
                  {selectedForum.isPrivate && (
                    <span className="flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800">
                      <Lock className="w-3 h-3" />
                      <span>Privé avec code</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-white mt-1">{selectedForum.title}</h3>
                {selectedForum.description && (
                  <p className="text-xs text-blue-200/80 mt-0.5 line-clamp-1">{selectedForum.description}</p>
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center space-x-2 text-xs text-blue-200">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Créé par {selectedForum.creatorName}</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto bg-blue-50/20 dark:bg-[#060b1b] space-y-3">
            {messagesLoading ? (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <span className="text-xs">Chargement des discussions...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare className="w-10 h-10 text-blue-200 dark:text-blue-900 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Aucun message dans ce forum</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Soyez le premier à lancer la discussion dans ce salon !
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-3 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    <img
                      src={msg.userAvatar}
                      alt={msg.userName}
                      className="w-8 h-8 rounded-full object-cover border border-blue-200 dark:border-blue-800 mt-0.5"
                    />
                    <div
                      className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-tr-none shadow-blue-500/20'
                          : 'bg-white dark:bg-[#0c142b] text-slate-850 dark:text-slate-100 border border-blue-100 dark:border-blue-900 rounded-tl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 space-x-4">
                        <span className={`font-bold text-[11px] ${isMe ? 'text-blue-100' : 'text-blue-900 dark:text-blue-300'}`}>
                          {msg.userName} ({msg.userPromo})
                        </span>
                        <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send Message Form */}
          <form onSubmit={handleSendMessage} className="p-3.5 sm:p-4 bg-white dark:bg-[#0c142b] border-t border-blue-100 dark:border-blue-900 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Écrire un message, partager une idée ou répondre..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessageText.trim()}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
            >
              <span>Envoyer</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      ) : (
        /* Forums List View */
        <div>
          {/* Back button */}
          {onGoBack && (
            <div className="mb-4">
              <button
                onClick={onGoBack}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0c142b] border border-blue-100 dark:border-blue-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs shadow-2xs transition group cursor-pointer"
                title="Revenir à la page précédente"
              >
                <ArrowLeft className="w-4 h-4 text-blue-500 group-hover:-translate-x-0.5 transition-transform" />
                <span>Revenir à la page précédente</span>
              </button>
            </div>
          )}

          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-[#0a163a] via-[#0d2358] to-[#0a163a] border border-blue-900/60 p-6 sm:p-7 rounded-3xl text-white shadow-lg shadow-blue-950/30">
            <div>
              <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-blue-400 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>Salons Thématiques & Collaboratifs</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Forums Ouverts & Sécurisés
              </h2>
              <p className="text-blue-200/80 text-xs sm:text-sm mt-1 max-w-xl">
                Créez un salon de discussion ouvert à tous, ou un salon privé protégé par un mot de passe secret pour votre groupe restreint.
              </p>
            </div>

            <button
              id="create-forum-btn"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/30 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Créer un Forum</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un forum..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0c142b] border border-blue-100 dark:border-blue-900 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-[#0c142b] border border-blue-100 dark:border-blue-900 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition"
            >
              {FORUM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Forums Grid */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <span className="text-xs">Chargement des forums...</span>
            </div>
          ) : filteredForums.length === 0 ? (
            <div className="bg-white dark:bg-[#0c142b] rounded-3xl border border-blue-100 dark:border-blue-900 p-12 text-center shadow-xs">
              <MessageSquare className="w-12 h-12 text-blue-200 dark:text-blue-900 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Aucun salon disponible</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Soyez le premier à ouvrir un salon de discussion, public ou protégé par mot de passe !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredForums.map((forum) => {
                const isUnlocked = !forum.isPrivate || unlockedForums[forum.id] || forum.creatorId === currentUser.id;

                return (
                  <div
                    key={forum.id}
                    onClick={() => handleForumClick(forum)}
                    className="bg-white dark:bg-[#0c142b] rounded-2xl border border-blue-100 dark:border-blue-900/80 p-5 shadow-xs hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full">
                          {forum.category}
                        </span>

                        {forum.isPrivate ? (
                          <span className={`flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isUnlocked
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}>
                            {isUnlocked ? <Unlock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                            <span>{isUnlocked ? 'Déverrouillé' : 'Privé (Code requis)'}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                            Public
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {forum.title}
                      </h4>

                      {forum.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {forum.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-blue-50 dark:border-blue-950 text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        <img
                          src={forum.creatorAvatar}
                          alt={forum.creatorName}
                          className="w-5 h-5 rounded-full object-cover border border-blue-200 dark:border-blue-800"
                        />
                        <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">
                          {forum.creatorName}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 font-bold text-blue-600 dark:text-blue-400">
                        <span>{forum.messagesCount || 0} messages</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Unlock Private Forum Modal */}
      {unlockForum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c142b] rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-200 dark:border-amber-900">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">Forum Sécurisé</h3>
              <p className="text-xs text-slate-500 text-center mt-1 mb-4">
                Ce forum privé nécessite le code d’accès défini par son créateur ({unlockForum.creatorName}).
              </p>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                {codeError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Code d’accès secret</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Entrez le code..."
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUnlockForum(null)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    Déverrouiller
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Forum Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0c142b] rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900 overflow-hidden">
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Créer un Salon de Discussion</h3>
              <p className="text-xs text-slate-500 mb-4">
                Ouvrez un espace d’échange pour votre groupe d'amis, une thématique ou un projet.
              </p>

              <form onSubmit={handleCreateForum} className="space-y-4">
                {createError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Titre du salon *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Passion Photographie, Groupe de discussion..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Discipline / Module</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {FORUM_CATEGORIES.filter((c) => c !== 'Tous les forums').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description (optionnel)</label>
                  <textarea
                    rows={2}
                    placeholder="Objectif de ce forum, organisation des idées..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Privacy setting: Public vs Private with code */}
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900 space-y-3">
                  <span className="block text-xs font-bold text-blue-950 dark:text-blue-200">Type d'accès</span>
                  
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="forumPrivacy"
                        checked={!isPrivate}
                        onChange={() => setIsPrivate(false)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Public (Accessible à tous)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="forumPrivacy"
                        checked={isPrivate}
                        onChange={() => setIsPrivate(true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Privé avec code</span>
                    </label>
                  </div>

                  {isPrivate && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                        Code d'accès secret pour les membres *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: motdepasse123, secret..."
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#0c142b] border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? 'Création...' : 'Ouvrir le forum'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
