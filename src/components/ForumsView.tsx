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
  Sparkles,
  Search,
  CheckCircle2
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
    if (forum.isPrivate && !unlockedForums[forum.id]) {
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* If inside a selected forum thread */}
      {selectedForum ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
          
          {/* Thread Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedForum(null)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 text-xs font-bold transition group"
                title="Retour aux salons"
              >
                <ArrowLeft className="w-4 h-4 text-teal-400 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Salons</span>
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-teal-400 font-semibold bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                    {selectedForum.category}
                  </span>
                  {selectedForum.isPrivate && (
                    <span className="flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                      <Lock className="w-3 h-3" />
                      <span>Privé avec code</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white mt-1">{selectedForum.title}</h3>
                {selectedForum.description && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{selectedForum.description}</p>
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
              <Users className="w-4 h-4 text-teal-400" />
              <span>Créé par {selectedForum.creatorName}</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 space-y-4">
            {messagesLoading ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Chargement des discussions...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Aucun message dans ce forum</h4>
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
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <div
                      className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-teal-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 space-x-4">
                        <span className={`font-bold text-[11px] ${isMe ? 'text-teal-100' : 'text-slate-900'}`}>
                          {msg.userName} ({msg.userPromo})
                        </span>
                        <span className={`text-[10px] ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
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
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Écrire un message, partager une idée ou répondre..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessageText.trim()}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
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
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 font-bold text-xs shadow-xs transition group"
                title="Revenir à la page précédente"
              >
                <ArrowLeft className="w-4 h-4 text-teal-500 group-hover:-translate-x-0.5 transition-transform" />
                <span>Revenir à la page précédente</span>
              </button>
            </div>
          )}

          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>Espace Discussions & Salons Communautaires</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Forums Publics & Sécurisés avec Code
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Créez un salon de discussion ouvert à tous, ou un salon privé protégé par un mot de passe secret pour votre groupe restreint.
              </p>
            </div>

            <button
              id="create-forum-btn"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Créer un Forum</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher un forum..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
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
            <div className="text-center py-16 text-xs text-slate-400">Chargement des forums...</div>
          ) : filteredForums.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Aucun salon disponible</h3>
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
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-teal-300 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-full">
                          {forum.category}
                        </span>

                        {forum.isPrivate ? (
                          <span className={`flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isUnlocked
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isUnlocked ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
                            <span>{isUnlocked ? 'Déverrouillé' : 'Privé (Code requis)'}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Public
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                        {forum.title}
                      </h4>

                      {forum.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {forum.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        <img
                          src={forum.creatorAvatar}
                          alt={forum.creatorName}
                          className="w-5 h-5 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-slate-600 font-medium truncate max-w-[120px]">
                          {forum.creatorName}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 font-semibold text-teal-700">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Forum Sécurisé</h3>
              <p className="text-xs text-slate-500 text-center mt-1 mb-4">
                Ce forum privé nécessite le code d’accès défini par son créateur ({unlockForum.creatorName}).
              </p>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                {codeError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code d’accès secret</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Entrez le code..."
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUnlockForum(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900 mb-1">Créer un Salon de Discussion</h3>
              <p className="text-xs text-slate-500 mb-4">
                Ouvrez un espace d’échange pour votre groupe d'amis, une thématique ou un projet.
              </p>

              <form onSubmit={handleCreateForum} className="space-y-4">
                {createError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Titre du salon *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Passion Photographie, Groupe de discussion..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discipline / Module</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {FORUM_CATEGORIES.filter((c) => c !== 'Tous les forums').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description (optionnel)</label>
                  <textarea
                    rows={2}
                    placeholder="Objectif de ce forum, organisation des fiches de synthèse..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
                  />
                </div>

                {/* Privacy setting: Public vs Private with code */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="block text-xs font-bold text-slate-700">Type d'accès</span>
                  
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="forumPrivacy"
                        checked={!isPrivate}
                        onChange={() => setIsPrivate(false)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>Public (Accessible à tous)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="forumPrivacy"
                        checked={isPrivate}
                        onChange={() => setIsPrivate(true)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>Privé avec code</span>
                    </label>
                  </div>

                  {isPrivate && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-amber-700 mb-1">
                        Code d'accès secret pour les membres *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: motdepasse123, secret..."
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
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
