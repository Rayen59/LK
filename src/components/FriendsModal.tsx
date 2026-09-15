import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  MessageCircle,
  X,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onOpenUserProfile: (userId: string) => void;
  onOpenChatWithUser: (userId: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenUserProfile,
  onOpenChatWithUser
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent' | 'search'>('friends');
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingReceived, setPendingReceived] = useState<User[]>([]);
  const [pendingSent, setPendingSent] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      const data = await api.friends.getAll();
      setFriends(data.friends || []);
      setPendingReceived(data.pendingReceived || []);
      setPendingSent(data.pendingSent || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFriendsData();
    }
  }, [isOpen]);

  // Handle Search Users
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        setSearching(true);
        const res = await api.users.search(searchQuery.trim());
        setSearchResults(res.users.filter((u) => u.id !== currentUser.id));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  const handleAccept = async (requesterId: string) => {
    try {
      const res = await api.friends.acceptRequest(requesterId);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3000);
      loadFriendsData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’acceptation');
    }
  };

  const handleReject = async (requesterId: string) => {
    try {
      const res = await api.friends.rejectRequest(requesterId);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3000);
      loadFriendsData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du refus');
    }
  };

  const handleRemove = async (friendId: string) => {
    if (!confirm('Voulez-vous vraiment retirer cet ami ?')) return;
    try {
      const res = await api.friends.removeFriend(friendId);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3000);
      loadFriendsData();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  const handleSendRequest = async (targetId: string) => {
    try {
      const res = await api.friends.sendRequest(targetId);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3000);
      loadFriendsData();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs" />

      <div className="relative w-full max-w-xl bg-white dark:bg-[#0c142b] rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900 z-10 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-blue-100 dark:border-blue-900 flex items-center justify-between bg-blue-50/30 dark:bg-[#0a163a]">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Réseau & Amis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gérez vos connexions, vos invitations et découvrez des membres
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 p-2 bg-blue-50/40 dark:bg-[#070d20] border-b border-blue-100 dark:border-blue-900 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-blue-100/60 dark:hover:bg-blue-950'
            }`}
          >
            <span>Mes Amis</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('received')}
            className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'received'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-blue-100/60 dark:hover:bg-blue-950'
            }`}
          >
            <span>Demandes reçues</span>
            {pendingReceived.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
                {pendingReceived.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-blue-100/60 dark:hover:bg-blue-950'
            }`}
          >
            <span>Envoyées</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-300 dark:bg-slate-700">
              {pendingSent.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-2 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-blue-100/60 dark:hover:bg-blue-950'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Trouver des amis</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#0c142b]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <span className="text-xs font-semibold">Chargement...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: FRIENDS */}
              {activeTab === 'friends' && (
                <div className="space-y-2.5">
                  {friends.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Aucun ami pour le moment
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Utilisez l'onglet « Trouver des amis » pour rechercher des membres !
                      </p>
                    </div>
                  ) : (
                    friends.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/30 dark:bg-slate-800/60 border border-blue-100 dark:border-blue-900/60"
                      >
                        <div
                          onClick={() => {
                            onClose();
                            onOpenUserProfile(f.id);
                          }}
                          className="flex items-center space-x-3 cursor-pointer group min-w-0"
                        >
                          <img
                            src={f.avatarUrl}
                            alt={f.prenom}
                            className="w-10 h-10 rounded-full object-cover border border-blue-500 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 truncate">
                              {f.prenom} {f.nom}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{f.promo}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => {
                              onClose();
                              onOpenChatWithUser(f.id);
                            }}
                            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer"
                            title="Message direct"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemove(f.id)}
                            className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Retirer des amis"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: DEMANDES REÇUES */}
              {activeTab === 'received' && (
                <div className="space-y-2.5">
                  {pendingReceived.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <p className="text-xs font-semibold">Aucune demande reçue en attente</p>
                    </div>
                  ) : (
                    pendingReceived.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                      >
                        <div
                          onClick={() => {
                            onClose();
                            onOpenUserProfile(u.id);
                          }}
                          className="flex items-center space-x-3 cursor-pointer group min-w-0"
                        >
                          <img
                            src={u.avatarUrl}
                            alt={u.prenom}
                            className="w-10 h-10 rounded-full object-cover border border-blue-500 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 truncate">
                              {u.prenom} {u.nom}
                            </div>
                            <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium truncate">
                              {u.promo} souhaite se connecter
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleAccept(u.id)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Accepter</span>
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                            title="Refuser"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: DEMANDES ENVOYÉES */}
              {activeTab === 'sent' && (
                <div className="space-y-2.5">
                  {pendingSent.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <p className="text-xs font-semibold">Aucune demande envoyée en cours</p>
                    </div>
                  ) : (
                    pendingSent.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/30 dark:bg-slate-800/60 border border-blue-100 dark:border-blue-900/60"
                      >
                        <div
                          onClick={() => {
                            onClose();
                            onOpenUserProfile(u.id);
                          }}
                          className="flex items-center space-x-3 cursor-pointer min-w-0"
                        >
                          <img
                            src={u.avatarUrl}
                            alt={u.prenom}
                            className="w-10 h-10 rounded-full object-cover border border-slate-400 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {u.prenom} {u.nom}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{u.promo}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl">
                          <Clock className="w-3.5 h-3.5" />
                          <span>En attente</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: RECHERCHE D'AMIS */}
              {activeTab === 'search' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nom, prénom, catégorie..."
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-blue-50/30 dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {searching ? (
                    <div className="py-8 text-center text-xs text-slate-400">Recherche...</div>
                  ) : searchQuery && searchResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Aucun utilisateur trouvé pour « {searchQuery} »
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((u) => {
                        const isAlreadyFriend = friends.some((f) => f.id === u.id);
                        const isSent = pendingSent.some((s) => s.id === u.id);
                        const isReceived = pendingReceived.some((r) => r.id === u.id);

                        return (
                          <div
                            key={u.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/30 dark:bg-slate-800/60 border border-blue-100 dark:border-blue-900/60"
                          >
                            <div
                              onClick={() => {
                                onClose();
                                onOpenUserProfile(u.id);
                              }}
                              className="flex items-center space-x-3 cursor-pointer min-w-0"
                            >
                              <img
                                src={u.avatarUrl}
                                alt={u.prenom}
                                className="w-10 h-10 rounded-full object-cover border border-blue-500 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {u.prenom} {u.nom}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">{u.promo}</div>
                              </div>
                            </div>

                            <div>
                              {isAlreadyFriend ? (
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-200">
                                  Amis ✓
                                </span>
                              ) : isSent ? (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl">
                                  Envoyée
                                </span>
                              ) : isReceived ? (
                                <button
                                  onClick={() => handleAccept(u.id)}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                                >
                                  Accepter
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSendRequest(u.id)}
                                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Ajouter</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
