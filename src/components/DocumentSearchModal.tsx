import React, { useState, useEffect, useCallback } from 'react';
import { Post, User, Reel, AttachmentType } from '../types';
import { api } from '../lib/api';
import {
  FileText,
  Search,
  Download,
  Mic,
  Video,
  Image as ImageIcon,
  X,
  Calendar,
  User as UserIcon,
  MessageCircle,
  Film,
  Sparkles,
  Users,
  MessageSquare,
  Heart,
  Loader2,
  ExternalLink,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Clock
} from 'lucide-react';
import { MainTabType } from './Header';

interface DocumentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  currentUser?: User;
  initialQuery?: string;
  onOpenUserProfile?: (userId: string) => void;
  onOpenChatWithUser?: (userId: string) => void;
  onNavigateTab?: (tab: MainTabType) => void;
}

type SearchCategoryTab = 'all' | 'people' | 'events' | 'videos' | 'documents' | 'posts';

export const DocumentSearchModal: React.FC<DocumentSearchModalProps> = ({
  isOpen,
  onClose,
  posts,
  currentUser,
  initialQuery = '',
  onOpenUserProfile,
  onOpenChatWithUser,
  onNavigateTab
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<SearchCategoryTab>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | AttachmentType>('all');
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<
    {
      id: string;
      kind: 'post_event' | 'forum' | 'poll' | 'quiz';
      title: string;
      description: string;
      authorName: string;
      authorAvatar: string;
      authorId: string;
      authorPromo: string;
      createdAt: string;
      likesCount: number;
      commentsCount: number;
      tags: string[];
    }[]
  >([]);
  const [reels, setReels] = useState<Reel[]>([]);

  // Friendship statuses for people in search results
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());
  const [pendingReceivedIds, setPendingReceivedIds] = useState<Set<string>>(new Set());
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  const loadFriendsState = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.friends.getAll();
      setFriendIds(new Set((res.friends || []).map((u) => u.id)));
      setPendingSentIds(new Set((res.pendingSent || []).map((u) => u.id)));
      setPendingReceivedIds(new Set((res.pendingReceived || []).map((u) => u.id)));
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    loadFriendsState();

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.users.globalSearch(searchQuery.trim());
        if (!cancelled) {
          setUsers(res.users || []);
          setEvents(res.events || []);
          setReels(res.reels || []);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery, loadFriendsState]);

  if (!isOpen) return null;

  const handleSendFriendRequest = async (targetId: string) => {
    setBusyUserId(targetId);
    try {
      const res = await api.friends.sendRequest(targetId);
      if (res.status === 'friends') {
        setFriendIds((prev) => new Set(prev).add(targetId));
        setPendingReceivedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        setPendingSentIds((prev) => new Set(prev).add(targetId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleCancelFriendRequest = async (targetId: string) => {
    setBusyUserId(targetId);
    try {
      await api.friends.cancelRequest(targetId);
      setPendingSentIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleAcceptFriendRequest = async (requesterId: string) => {
    setBusyUserId(requesterId);
    try {
      await api.friends.acceptRequest(requesterId);
      setFriendIds((prev) => new Set(prev).add(requesterId));
      setPendingReceivedIds((prev) => {
        const next = new Set(prev);
        next.delete(requesterId);
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setBusyUserId(null);
    }
  };

  const query = searchQuery.toLowerCase().trim();

  // Extract all attachments with parent post info
  const allDocuments = posts.flatMap((post) =>
    (post.attachments || []).map((att) => ({
      ...att,
      postAuthor: post.authorName,
      postAuthorId: post.authorId,
      postPromo: post.authorPromo,
      postAuthorAvatar: post.authorAvatar,
      postCreatedAt: post.createdAt,
      postContent: post.content,
      postId: post.id
    }))
  );

  const filteredDocs = allDocuments.filter((doc) => {
    const matchesSearch =
      !query ||
      doc.name.toLowerCase().includes(query) ||
      doc.postAuthor.toLowerCase().includes(query) ||
      doc.postPromo.toLowerCase().includes(query) ||
      (doc.postContent || '').toLowerCase().includes(query);

    const matchesType = docTypeFilter === 'all' || doc.type === docTypeFilter;
    return matchesSearch && matchesType;
  });

  const videoAttachments = allDocuments.filter(
    (d) =>
      d.type === 'video' &&
      (!query ||
        d.name.toLowerCase().includes(query) ||
        d.postAuthor.toLowerCase().includes(query) ||
        (d.postContent || '').toLowerCase().includes(query))
  );

  const filteredPosts = posts.filter((p) => {
    if (!query) return true;
    return `${p.content || ''} ${p.authorName || ''} ${p.authorPromo || ''} ${(p.tags || []).join(' ')}`
      .toLowerCase()
      .includes(query);
  });

  const getIconForType = (type: AttachmentType) => {
    switch (type) {
      case 'document':
        return <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'audio':
        return <Mic className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const totalVideosCount = reels.length + videoAttachments.length;

  const categories: {
    id: SearchCategoryTab;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'all',
      label: 'Tout',
      count:
        users.length +
        events.length +
        totalVideosCount +
        filteredDocs.length +
        filteredPosts.length,
      icon: Sparkles
    },
    { id: 'people', label: 'Personnes', count: users.length, icon: Users },
    { id: 'events', label: 'Événements', count: events.length, icon: Calendar },
    { id: 'videos', label: 'Vidéos & Reels', count: totalVideosCount, icon: Film },
    { id: 'documents', label: 'Documents', count: filteredDocs.length, icon: FileText },
    { id: 'posts', label: 'Publications', count: filteredPosts.length, icon: MessageSquare }
  ];

  return (
    <div className="fixed inset-0 z-[100] w-screen h-[100dvh] bg-slate-50 dark:bg-[#090d16] flex flex-col overflow-hidden animate-fadeIn">
      {/* FACEBOOK-STYLE STICKY TOP FULLSCREEN SEARCH BAR */}
      <div className="shrink-0 bg-white dark:bg-[#0f1626] border-b border-slate-200 dark:border-slate-800/90 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-2 flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shrink-0 cursor-pointer"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher sur MK (personnes, événements, vidéos, documents...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800/90 border border-transparent focus:border-indigo-500 dark:focus:border-indigo-500 rounded-full text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* FACEBOOK-STYLE HORIZONTAL TABS BAR */}
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-3.5 py-2.5 text-xs sm:text-sm font-bold transition flex items-center space-x-1.5 whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Document Sub-Filter when in Documents tab */}
        {activeCategory === 'documents' && (
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 border-t border-slate-100 dark:border-slate-800/70 flex items-center space-x-1.5 overflow-x-auto text-xs">
            {(['all', 'document', 'audio', 'video', 'image'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDocTypeFilter(t)}
                className={`px-3 py-1 rounded-full font-semibold transition whitespace-nowrap ${
                  docTypeFilter === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t === 'all'
                  ? 'Tous les fichiers'
                  : t === 'document'
                  ? 'PDF & Cours'
                  : t === 'audio'
                  ? 'Notes Vocales'
                  : t === 'video'
                  ? 'Vidéos'
                  : 'Images'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FULLSCREEN SCROLLABLE RESULTS AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 pb-20">
          {loading && (
            <div className="flex items-center justify-center py-4 text-slate-400 space-x-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Actualisation des résultats...</span>
            </div>
          )}

          {/* 1. SECTION PERSONNES */}
          {(activeCategory === 'all' || activeCategory === 'people') && users.length > 0 && (
            <section className="bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Personnes ({users.length})</span>
                </h4>
                {activeCategory === 'all' && users.length > 6 && (
                  <button
                    onClick={() => setActiveCategory('people')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Voir tout ({users.length})
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {(activeCategory === 'all' ? users.slice(0, 6) : users).map((u) => {
                  const isMe = currentUser?.id === u.id;
                  const isFriend = friendIds.has(u.id);
                  const isSent = pendingSentIds.has(u.id);
                  const isReceived = pendingReceivedIds.has(u.id);
                  const isBusy = busyUserId === u.id;

                  return (
                    <div
                      key={u.id}
                      className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => {
                          onOpenUserProfile?.(u.id);
                          onClose();
                        }}
                        className="flex items-center space-x-3 min-w-0 cursor-pointer group"
                      >
                        <img
                          src={u.avatarUrl}
                          alt={u.prenom}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 group-hover:ring-2 group-hover:ring-indigo-500 transition"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1.5">
                            <span className="truncate">
                              {u.prenom} {u.nom}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {u.promo || 'Membre MK'}
                            {u.bio ? ` · ${u.bio}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                        {!isMe && currentUser && (
                          <>
                            {isFriend ? (
                              <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800/60">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Amis</span>
                              </span>
                            ) : isReceived ? (
                              <button
                                disabled={isBusy}
                                onClick={() => handleAcceptFriendRequest(u.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Confirmer</span>
                              </button>
                            ) : isSent ? (
                              <button
                                disabled={isBusy}
                                onClick={() => handleCancelFriendRequest(u.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                                title="Cliquer pour annuler l'invitation"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Envoyée</span>
                              </button>
                            ) : (
                              <button
                                disabled={isBusy}
                                onClick={() => handleSendFriendRequest(u.id)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1 shadow-2xs cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Ajouter</span>
                              </button>
                            )}
                          </>
                        )}

                        {onOpenChatWithUser && !isMe && (
                          <button
                            onClick={() => {
                              onOpenChatWithUser(u.id);
                              onClose();
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                            title="Envoyer un message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}

                        {onOpenUserProfile && (
                          <button
                            onClick={() => {
                              onOpenUserProfile(u.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                          >
                            Profil
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. SECTION ÉVÉNEMENTS & ACTIVITÉS DU SITE */}
          {(activeCategory === 'all' || activeCategory === 'events') && events.length > 0 && (
            <section className="bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>Événements & Activités publiés ({events.length})</span>
                </h4>
                {activeCategory === 'all' && events.length > 4 && (
                  <button
                    onClick={() => setActiveCategory('events')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Voir tout
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(activeCategory === 'all' ? events.slice(0, 4) : events).map((ev) => (
                  <div
                    key={`${ev.kind}_${ev.id}`}
                    className="bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between gap-2.5 hover:border-amber-400/70 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {ev.kind === 'post_event'
                            ? '📅 Événement'
                            : ev.kind === 'forum'
                            ? '💬 Salon Communautaire'
                            : ev.kind === 'poll'
                            ? '📊 Sondage en direct'
                            : '🏆 Quiz & Défi'}
                        </span>
                        <span>
                          {new Date(ev.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {ev.title}
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {ev.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                      <span>Par {ev.authorName}</span>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            if (ev.kind === 'forum') onNavigateTab('forums');
                            else if (ev.kind === 'poll') onNavigateTab('polls');
                            else if (ev.kind === 'quiz') onNavigateTab('quizzes');
                            else onNavigateTab('feed');
                            onClose();
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center space-x-1"
                        >
                          <span>Ouvrir</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. SECTION VIDÉOS & REELS */}
          {(activeCategory === 'all' || activeCategory === 'videos') && totalVideosCount > 0 && (
            <section className="bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Film className="w-4 h-4 text-rose-500" />
                  <span>Vidéos & Reels ({totalVideosCount})</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {reels.map((reel) => (
                  <div
                    key={reel.id}
                    className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
                  >
                    <video
                      src={reel.videoUrl}
                      controls
                      preload="metadata"
                      className="w-full h-48 object-cover bg-black"
                    />
                    <div className="p-3 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {reel.caption || 'Reel Vidéo'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Par {reel.authorName} · Reel
                        </div>
                      </div>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab('reels');
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition"
                        >
                          Plein écran
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {videoAttachments.map((vid) => (
                  <div
                    key={vid.id}
                    className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
                  >
                    <video
                      src={vid.url}
                      controls
                      preload="metadata"
                      className="w-full h-48 object-cover bg-black"
                    />
                    <div className="p-3 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {vid.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Publié par {vid.postAuthor}
                        </div>
                      </div>
                      <a
                        href={vid.url}
                        download={vid.name}
                        className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. SECTION DOCUMENTS, IMAGES & VOCAUX */}
          {(activeCategory === 'all' || activeCategory === 'documents') &&
            filteredDocs.length > 0 && (
              <section className="bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-teal-500" />
                  <span>Documents, Images & Vocaux ({filteredDocs.length})</span>
                </h4>

                <div className="space-y-2.5">
                  {(activeCategory === 'all' ? filteredDocs.slice(0, 6) : filteredDocs).map(
                    (doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 hover:border-teal-400 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
                            {getIconForType(doc.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {doc.name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {doc.postAuthor} · {doc.postPromo} ·{' '}
                              {new Date(doc.postCreatedAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                          </div>
                        </div>

                        <a
                          href={doc.url}
                          download={doc.name}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition self-end sm:self-center shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger</span>
                        </a>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

          {/* 5. SECTION PUBLICATIONS */}
          {(activeCategory === 'all' || activeCategory === 'posts') &&
            filteredPosts.length > 0 && (
              <section className="bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span>Publications ({filteredPosts.length})</span>
                </h4>

                <div className="space-y-3">
                  {(activeCategory === 'all' ? filteredPosts.slice(0, 5) : filteredPosts).map(
                    (post) => (
                      <div
                        key={post.id}
                        className="bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            onClick={() => {
                              onOpenUserProfile?.(post.authorId);
                              onClose();
                            }}
                            className="flex items-center space-x-2.5 cursor-pointer"
                          >
                            <img
                              src={post.authorAvatar}
                              alt={post.authorName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600">
                                {post.authorName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {post.authorPromo} ·{' '}
                                {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Heart className="w-3.5 h-3.5" />
                              <span>{post.likes.length}</span>
                            </span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                          {post.content}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

          {/* Empty State if nothing matches */}
          {!loading &&
            users.length === 0 &&
            events.length === 0 &&
            totalVideosCount === 0 &&
            filteredDocs.length === 0 &&
            filteredPosts.length === 0 && (
              <div className="text-center py-20 px-4">
                <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                  Aucun résultat trouvé
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Essayez un autre nom de personne, événement, vidéo ou document.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
