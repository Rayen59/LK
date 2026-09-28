import React, { useState, useEffect, useCallback } from 'react';
import { Post, User, Attachment } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import { PostComposer } from './PostComposer';
import { EditPostModal } from './EditPostModal';
import { SaveToSpaceModal } from './SaveToSpaceModal';
import { DocumentSearchModal } from './DocumentSearchModal';
import { MainTabType } from './Header';
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Download,
  Volume2,
  Film,
  Search,
  Send,
  Sparkles,
  AlertTriangle,
  Lock,
  CornerDownRight,
  Reply,
  X,
  CheckCircle2,
  Users,
  Calendar,
  ZoomIn,
  UserPlus,
  UserCheck,
  Clock,
  RefreshCw
} from 'lucide-react';

interface FeedViewProps {
  currentUser: User;
  posts: Post[];
  onRefresh: () => void;
  onOpenUserProfile?: (userId: string) => void;
  onOpenChatWithUser?: (userId: string) => void;
  onNavigateTab?: (tab: MainTabType) => void;
}

type SuggestedUser = User & {
  mutualFriendsCount?: number;
  isPendingSent?: boolean;
};

export const FeedView: React.FC<FeedViewProps> = ({
  currentUser,
  posts,
  onRefresh,
  onOpenUserProfile,
  onOpenChatWithUser,
  onNavigateTab
}) => {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [savingPost, setSavingPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{
    post: Post;
    attachment: Attachment;
  } | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    postId: string;
    commentId: string;
    userName: string;
  } | null>(null);

  // Fullscreen Facebook Search Modal trigger
  const [showFullSearch, setShowFullSearch] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Random Friend Suggestions & Incoming Requests in Home Feed (Facebook "People You May Know")
  const [friendSuggestions, setFriendSuggestions] = useState<SuggestedUser[]>([]);
  const [pendingReceived, setPendingReceived] = useState<User[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [busyFriendUserId, setBusyFriendUserId] = useState<string | null>(null);

  // Lightbox for feed images
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const showErrorToast = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(null), 4000);
  };

  // Load random friend suggestions and pending friend requests
  const loadHomeFriendSuggestions = useCallback(async (shuffleClientSide = false) => {
    try {
      setLoadingSuggestions(true);
      const res = await api.friends.getAll();
      setPendingReceived(res.pendingReceived || []);
      let list = [...(res.suggestions || [])];
      if (shuffleClientSide && list.length > 1) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
      }
      setFriendSuggestions(list);
    } catch (err) {
      console.error('Error loading friend suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    loadHomeFriendSuggestions();
    const unsub = subscribeToLiveUpdates((event) => {
      if (event === 'FRIEND_UPDATE') {
        loadHomeFriendSuggestions();
      }
    });
    return () => unsub();
  }, [loadHomeFriendSuggestions]);

  // Send friend request from Home feed suggestion card
  const handleSendFriendRequest = async (targetUser: SuggestedUser) => {
    setBusyFriendUserId(targetUser.id);
    try {
      const res = await api.friends.sendRequest(targetUser.id);
      if (res.status === 'friends') {
        setToastSuccess(`Vous êtes maintenant ami avec ${targetUser.prenom} !`);
        setTimeout(() => setToastSuccess(null), 3500);
        setFriendSuggestions((prev) => prev.filter((u) => u.id !== targetUser.id));
      } else {
        setFriendSuggestions((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isPendingSent: true } : u))
        );
        setToastSuccess(`Invitation envoyée à ${targetUser.prenom} ${targetUser.nom}`);
        setTimeout(() => setToastSuccess(null), 3000);
      }
    } catch (err: any) {
      showErrorToast(err.message || "Erreur lors de l'envoi de l'invitation");
    } finally {
      setBusyFriendUserId(null);
    }
  };

  // Cancel sent friend request
  const handleCancelFriendRequest = async (targetUser: SuggestedUser) => {
    setBusyFriendUserId(targetUser.id);
    try {
      await api.friends.cancelRequest(targetUser.id);
      setFriendSuggestions((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isPendingSent: false } : u))
      );
    } catch (err: any) {
      showErrorToast(err.message || "Erreur lors de l'annulation");
    } finally {
      setBusyFriendUserId(null);
    }
  };

  // Accept incoming friend request directly in Home feed
  const handleAcceptIncomingRequest = async (requester: User) => {
    setBusyFriendUserId(requester.id);
    try {
      await api.friends.acceptRequest(requester.id);
      setPendingReceived((prev) => prev.filter((u) => u.id !== requester.id));
      setToastSuccess(`Vous êtes désormais ami avec ${requester.prenom} ${requester.nom} !`);
      setTimeout(() => setToastSuccess(null), 3500);
    } catch (err: any) {
      showErrorToast(err.message || "Erreur lors de l'acceptation");
    } finally {
      setBusyFriendUserId(null);
    }
  };

  // Reject incoming friend request
  const handleRejectIncomingRequest = async (requester: User) => {
    setBusyFriendUserId(requester.id);
    try {
      await api.friends.rejectRequest(requester.id);
      setPendingReceived((prev) => prev.filter((u) => u.id !== requester.id));
    } catch (err: any) {
      showErrorToast(err.message || 'Erreur lors du refus');
    } finally {
      setBusyFriendUserId(null);
    }
  };

  // Like toggle
  const handleLike = async (postId: string) => {
    if (currentUser.isRestricted) {
      showErrorToast('Votre compte est en mode lecture seule : interactions désactivées.');
      return;
    }
    try {
      await api.posts.toggleLike(postId);
      onRefresh();
    } catch (err: any) {
      showErrorToast(err.message || "Erreur lors du 'J'aime'");
    }
  };

  // Confirm delete post
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setDeleting(true);
    try {
      await api.posts.delete(postToDelete.id);
      setPostToDelete(null);
      setOpenMenuPostId(null);
      onRefresh();
      setToastSuccess('Publication supprimée avec succès.');
      setTimeout(() => setToastSuccess(null), 3500);
    } catch (err: any) {
      console.error('Delete failed', err);
      showErrorToast(err.message || 'Impossible de supprimer cette publication');
    } finally {
      setDeleting(false);
    }
  };

  // Confirm delete specific attachment
  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    const { post, attachment } = attachmentToDelete;
    setDeletingAttachment(true);
    try {
      const remainingAttachments = (post.attachments || []).filter((a) => a.id !== attachment.id);
      const isContentOnlyVocal =
        !post.content ||
        post.content.trim() === '' ||
        post.content.startsWith('Note vocale partagée') ||
        post.content.startsWith('Note vocale médicale partagée') ||
        post.content === 'Fichier partagé' ||
        post.content === 'Document académique partagé';

      if (remainingAttachments.length === 0 && isContentOnlyVocal) {
        await api.posts.delete(post.id);
      } else {
        await api.posts.update(post.id, {
          attachments: remainingAttachments
        });
      }
      setAttachmentToDelete(null);
      setOpenMenuPostId(null);
      onRefresh();
      setToastSuccess(
        attachment.type === 'audio'
          ? 'Note vocale supprimée avec succès.'
          : 'Pièce jointe supprimée avec succès.'
      );
      setTimeout(() => setToastSuccess(null), 3500);
    } catch (err: any) {
      console.error('Delete attachment failed', err);
      showErrorToast(err.message || 'Impossible de supprimer cette pièce jointe.');
    } finally {
      setDeletingAttachment(false);
    }
  };

  // Submit comment or reply
  const handleCommentSubmit = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.isRestricted) {
      showErrorToast(
        'Votre compte est en mode lecture seule : les commentaires sont désactivés.'
      );
      return;
    }

    const text = commentText[postId]?.trim();
    if (!text) return;

    const parentId = replyingTo?.postId === postId ? replyingTo.commentId : undefined;

    setSubmittingComment(postId);
    try {
      await api.posts.addComment(postId, text, parentId);
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);
      onRefresh();
    } catch (err: any) {
      showErrorToast(err.message || "Erreur lors de l'envoi du commentaire");
    } finally {
      setSubmittingComment(null);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!selectedTagFilter) return true;
    return p.tags?.includes(selectedTagFilter);
  });

  const visibleSuggestions = friendSuggestions.filter((u) => !dismissedIds.has(u.id));

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
      {/* Toast Error Alert */}
      {toastError && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xl flex items-center space-x-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Toast Success Alert */}
      {toastSuccess && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xl flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastSuccess}</span>
        </div>
      )}

      {/* Restriction Alert for Read-Only Users */}
      {currentUser.isRestricted && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start space-x-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Mode Lecture Seule Activé (Décision Administrative)
            </h4>
            <p className="text-xs mt-0.5 leading-relaxed">
              Vos interactions ont été limitées par l'administration de MK. Vous pouvez consulter les publications et explorer les contenus, mais la création de publications et de commentaires est restreinte.
            </p>
          </div>
        </div>
      )}

      {/* FACEBOOK-STYLE SEARCH BAR LAUNCHER (OPENS FULL-SCREEN SEARCH ON TAP) */}
      <div className="mb-4 bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setInitialSearchQuery('');
              setShowFullSearch(true);
            }}
            className="flex-1 flex items-center space-x-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-full text-left transition cursor-pointer"
          >
            <Search className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              Rechercher personnes, événements, vidéos, documents...
            </span>
          </button>

          {selectedTagFilter && (
            <button
              onClick={() => setSelectedTagFilter(null)}
              className="shrink-0 flex items-center space-x-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-800"
            >
              <span>#{selectedTagFilter}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Full-Screen Search Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs no-scrollbar">
          <button
            onClick={() => setShowFullSearch(true)}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-1.5 shrink-0 transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Personnes</span>
          </button>
          <button
            onClick={() => setShowFullSearch(true)}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-1.5 shrink-0 transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Événements</span>
          </button>
          <button
            onClick={() => setShowFullSearch(true)}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-1.5 shrink-0 transition cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-rose-500" />
            <span>Vidéos & Reels</span>
          </button>
          <button
            onClick={() => setShowFullSearch(true)}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-1.5 shrink-0 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-teal-500" />
            <span>Documents</span>
          </button>
        </div>
      </div>

      {/* Main Publication Composer */}
      {!currentUser.isRestricted ? (
        <PostComposer currentUser={currentUser} onPostCreated={onRefresh} />
      ) : (
        <div className="mb-5 p-4 bg-white dark:bg-[#0f1626] border border-dashed border-blue-200 dark:border-blue-900 rounded-2xl text-center text-slate-500 dark:text-slate-400 text-xs">
          🔒 Vous ne pouvez pas publier de nouveau contenu en raison de la limitation administrative en mode lecture seule.
        </div>
      )}

      {/* FACEBOOK-STYLE RANDOM FRIEND REQUESTS & SUGGESTIONS WIDGET IN HOME FEED */}
      {(pendingReceived.length > 0 || visibleSuggestions.length > 0) && (
        <div className="mt-5 mb-5 bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 shadow-2xs space-y-4">
          {/* 1. Pending Friend Requests Received (if any) */}
          {pendingReceived.length > 0 && (
            <div className="space-y-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Invitations d'amis reçues ({pendingReceived.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pendingReceived.map((reqUser) => (
                  <div
                    key={reqUser.id}
                    className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between gap-2.5"
                  >
                    <div
                      onClick={() => onOpenUserProfile?.(reqUser.id)}
                      className="flex items-center space-x-2.5 min-w-0 cursor-pointer"
                    >
                      <img
                        src={reqUser.avatarUrl}
                        alt={reqUser.prenom}
                        className="w-11 h-11 rounded-full object-cover border border-indigo-300 dark:border-indigo-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {reqUser.prenom} {reqUser.nom}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {reqUser.promo || 'Membre MK'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        disabled={busyFriendUserId === reqUser.id}
                        onClick={() => handleAcceptIncomingRequest(reqUser)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Confirmer
                      </button>
                      <button
                        disabled={busyFriendUserId === reqUser.id}
                        onClick={() => handleRejectIncomingRequest(reqUser)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Random Friend Suggestions Carousel ("Vous connaissez peut-être") */}
          {visibleSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Personnes que vous connaissez peut-être
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Suggestions d'amis aléatoires sur MK
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDismissedIds(new Set());
                    loadHomeFriendSuggestions(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  title="Afficher d'autres personnes aléatoirement"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Mélanger</span>
                </button>
              </div>

              {/* Horizontal Scrollable Cards like Facebook Mobile */}
              <div className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
                {visibleSuggestions.slice(0, 10).map((u) => {
                  const isBusy = busyFriendUserId === u.id;
                  return (
                    <div
                      key={u.id}
                      className="w-44 sm:w-48 shrink-0 bg-slate-50/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/85 dark:border-slate-800 overflow-hidden flex flex-col justify-between relative group transition hover:border-indigo-400/70"
                    >
                      {/* Dismiss X button */}
                      <button
                        type="button"
                        onClick={() =>
                          setDismissedIds((prev) => {
                            const next = new Set(prev);
                            next.add(u.id);
                            return next;
                          })
                        }
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer"
                        title="Retirer cette suggestion"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Card Top Image / Avatar */}
                      <div
                        onClick={() => onOpenUserProfile?.(u.id)}
                        className="cursor-pointer"
                      >
                        <div className="h-32 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                          <img
                            src={u.avatarUrl}
                            alt={u.prenom}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="p-3 pb-2">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {u.prenom} {u.nom}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {u.promo || 'Membre MK'}
                          </div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                            {u.mutualFriendsCount && u.mutualFriendsCount > 0
                              ? `${u.mutualFriendsCount} ami(s) en commun`
                              : 'Membre de la communauté'}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-3 pt-1 flex items-center gap-1.5">
                        {u.isPendingSent ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleCancelFriendRequest(u)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-bold flex items-center justify-center space-x-1 transition cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Envoyée</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSendFriendRequest(u)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-2xs transition cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Ajouter</span>
                          </button>
                        )}

                        {onOpenChatWithUser && (
                          <button
                            type="button"
                            onClick={() => onOpenChatWithUser(u.id)}
                            className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shrink-0 cursor-pointer"
                            title="Envoyer un message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts Stream */}
      <div className="space-y-5 mt-5">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-14 px-4 bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Aucune publication trouvée
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              Soyez le premier à partager une réflexion, un événement, une photo, une vidéo ou un vocal avec la communauté !
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isAuthor = post.authorId === currentUser.id;
            const isAdmin = currentUser.role === 'admin';
            const canManage = isAuthor || isAdmin;
            const isMenuOpen = openMenuPostId === post.id;
            const hasLiked = post.likes.includes(currentUser.id);
            const areCommentsOpen = activeCommentsPostId === post.id;

            return (
              <article
                key={post.id}
                className="bg-white dark:bg-[#0f1626] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Post Header */}
                <div className="p-4 sm:p-5 pb-3 flex items-center justify-between">
                  <div
                    className="flex items-center space-x-3 cursor-pointer group"
                    onClick={() => onOpenUserProfile && onOpenUserProfile(post.authorId)}
                    title="Voir le profil de cet utilisateur"
                  >
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:border-indigo-500 transition shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {post.authorName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          · {post.authorPromo}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {formatDate(post.createdAt)}
                        {post.updatedAt && <span className="ml-1 italic">(modifié)</span>}
                      </span>
                    </div>
                  </div>

                  {/* Actions dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuPostId(isMenuOpen ? null : post.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 text-xs">
                        <button
                          onClick={() => {
                            setSavingPost(post);
                            setOpenMenuPostId(null);
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Classer dans un espace</span>
                        </button>

                        {canManage && (
                          <>
                            {post.attachments?.some((a) => a.type === 'audio') && (
                              <button
                                onClick={() => {
                                  const audioAtt = post.attachments?.find(
                                    (a) => a.type === 'audio'
                                  );
                                  if (audioAtt)
                                    setAttachmentToDelete({ post, attachment: audioAtt });
                                  setOpenMenuPostId(null);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-medium transition"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Supprimer le vocal</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingPost(post);
                                setOpenMenuPostId(null);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>
                                {isAuthor ? 'Modifier la publication' : 'Modifier (Admin)'}
                              </span>
                            </button>

                            <button
                              onClick={() => {
                                setPostToDelete(post);
                                setOpenMenuPostId(null);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-medium transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>
                                {isAuthor ? 'Supprimer le post' : 'Supprimer (Modération)'}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Content Text */}
                {post.content && (
                  <div className="px-4 sm:px-5 py-2 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="px-4 sm:px-5 py-1.5 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTagFilter(tag)}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attachments Section */}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="px-4 sm:px-5 py-2.5 space-y-2.5">
                    {post.attachments.map((att) => {
                      if (att.type === 'document') {
                        return (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl transition"
                          >
                            <div className="flex items-center space-x-3 truncate pr-2">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                  {att.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Document joint
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <a
                                href={att.url}
                                download={att.name}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Télécharger</span>
                              </a>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => setAttachmentToDelete({ post, attachment: att })}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Supprimer ce document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (att.type === 'audio') {
                        return (
                          <div
                            key={att.id}
                            className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                                <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span className="truncate">{att.name || 'Note Vocale'}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <a
                                  href={att.url}
                                  download={att.name || 'note_vocale.webm'}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span className="hidden sm:inline">Télécharger</span>
                                </a>
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttachmentToDelete({ post, attachment: att })
                                    }
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Supprimer</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <audio
                              controls
                              preload="metadata"
                              src={att.url}
                              className="w-full h-9 rounded-lg"
                            />
                          </div>
                        );
                      }

                      if (att.type === 'video') {
                        return (
                          <div
                            key={att.id}
                            className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black group"
                          >
                            <video
                              controls
                              src={att.url}
                              className="w-full max-h-96 object-contain"
                            />
                            <div className="p-2 bg-slate-900 text-white text-xs flex items-center justify-between">
                              <div className="flex items-center space-x-2 truncate pr-2">
                                <Film className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate">{att.name}</span>
                              </div>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAttachmentToDelete({ post, attachment: att })
                                  }
                                  className="text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-rose-950 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Supprimer</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (att.type === 'image') {
                        return (
                          <div
                            key={att.id}
                            onClick={() =>
                              setLightboxImage({ url: att.url, name: att.name })
                            }
                            className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 group cursor-zoom-in"
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full max-h-96 object-cover group-hover:scale-[1.01] transition-transform"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition backdrop-blur-xs">
                              <ZoomIn className="w-3 h-3" />
                              <span>Agrandir</span>
                            </div>
                            {canManage && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttachmentToDelete({ post, attachment: att });
                                }}
                                className="absolute top-2.5 right-2.5 px-2 py-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium flex items-center space-x-1 shadow-md transition cursor-pointer backdrop-blur-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Supprimer</span>
                              </button>
                            )}
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}

                {/* Engagement Bar */}
                <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-4 sm:space-x-6">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-1.5 font-bold transition cursor-pointer ${
                        hasLiked ? 'text-rose-600 dark:text-rose-400' : 'hover:text-rose-600'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          hasLiked ? 'fill-current text-rose-600 dark:text-rose-400' : ''
                        }`}
                      />
                      <span>{post.likes.length}</span>
                      <span className="hidden sm:inline">J'aime</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentsPostId(areCommentsOpen ? null : post.id)}
                      className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments?.length || 0}</span>
                      <span className="hidden sm:inline">Commentaires</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSavingPost(post)}
                    className="flex items-center space-x-1.5 font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Classer</span>
                  </button>
                </div>

                {/* Comments Section */}
                {areCommentsOpen && (
                  <div className="bg-slate-50/70 dark:bg-[#070c1e] p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                    {post.comments && post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {(post.comments || [])
                          .filter((c) => !c.parentId)
                          .map((com) => {
                            const replies = (post.comments || []).filter(
                              (r) => r.parentId === com.id
                            );
                            return (
                              <div key={com.id} className="space-y-2">
                                <div className="flex items-start space-x-2.5">
                                  <img
                                    src={com.userAvatar}
                                    alt={com.userName}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 mt-0.5 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex-1 bg-white dark:bg-[#0f1626] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                          {com.userName}
                                        </span>
                                        {com.userPromo && (
                                          <span className="text-[10px] text-slate-500">
                                            · {com.userPromo}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400">
                                        {formatDate(com.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                      {com.content}
                                    </p>

                                    {!currentUser.isRestricted && (
                                      <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setReplyingTo({
                                              postId: post.id,
                                              commentId: com.id,
                                              userName: com.userName
                                            })
                                          }
                                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 transition cursor-pointer"
                                        >
                                          <Reply className="w-3 h-3" />
                                          <span>Répondre</span>
                                        </button>
                                        {replies.length > 0 && (
                                          <span className="text-[10px] text-slate-400">
                                            {replies.length} réponse
                                            {replies.length > 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {replies.length > 0 && (
                                  <div className="ml-5 sm:ml-7 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
                                    {replies.map((reply) => (
                                      <div key={reply.id} className="flex items-start space-x-2">
                                        <img
                                          src={reply.userAvatar}
                                          alt={reply.userName}
                                          className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 mt-0.5 shrink-0"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="flex-1 bg-white/90 dark:bg-[#0f1626]/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center space-x-1.5">
                                              <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                {reply.userName}
                                              </span>
                                              <span className="text-[9px] text-slate-500">
                                                {reply.userPromo}
                                              </span>
                                            </div>
                                            <span className="text-[9px] text-slate-400">
                                              {formatDate(reply.createdAt)}
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {reply.replyToUserName && (
                                              <span className="text-indigo-600 dark:text-indigo-400 font-bold mr-1">
                                                @{reply.replyToUserName}
                                              </span>
                                            )}
                                            {reply.content}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-1">
                        Aucun commentaire. Soyez le premier à réagir !
                      </p>
                    )}

                    {!currentUser.isRestricted ? (
                      <div className="space-y-1.5">
                        {replyingTo?.postId === post.id && (
                          <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                            <div className="flex items-center space-x-1.5">
                              <CornerDownRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span>
                                En réponse à{' '}
                                <strong className="text-indigo-600 dark:text-indigo-300">
                                  @{replyingTo.userName}
                                </strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <form
                          onSubmit={(e) => handleCommentSubmit(post.id, e)}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="text"
                            placeholder={
                              replyingTo?.postId === post.id
                                ? `Répondre à @${replyingTo.userName}...`
                                : 'Écrire un commentaire...'
                            }
                            value={commentText[post.id] || ''}
                            onChange={(e) =>
                              setCommentText((prev) => ({
                                ...prev,
                                [post.id]: e.target.value
                              }))
                            }
                            className="flex-1 px-3.5 py-2 bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          />
                          <button
                            type="submit"
                            disabled={
                              submittingComment === post.id || !commentText[post.id]?.trim()
                            }
                            className="p-2 bg-slate-900 dark:bg-indigo-600 hover:opacity-90 text-white rounded-xl shadow-xs transition disabled:opacity-40 shrink-0 flex items-center justify-center cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic text-center py-1">
                        🔒 Commentaire désactivé (mode lecture seule)
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Lightbox for Feed Images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div className="max-w-5xl w-full flex items-center justify-between text-white mb-3 px-2">
            <span className="text-xs sm:text-sm font-bold truncate">{lightboxImage.name}</span>
            <div className="flex items-center space-x-2">
              <a
                href={lightboxImage.url}
                download={lightboxImage.name}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-[94vw] object-contain rounded-2xl shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* IN-APP DELETE POST CONFIRMATION MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f1626] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Supprimer cette publication ?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Êtes-vous sûr de vouloir supprimer définitivement cette publication et toutes ses pièces jointes ? Cette action est irréversible.
            </p>

            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-200 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE ATTACHMENT CONFIRMATION MODAL */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f1626] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {attachmentToDelete.attachment.type === 'audio'
                ? 'Supprimer cette note vocale ?'
                : 'Supprimer cette pièce jointe ?'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
              {attachmentToDelete.attachment.type === 'audio'
                ? "Voulez-vous retirer définitivement cet enregistrement vocal de la publication ?"
                : 'Voulez-vous retirer définitivement ce fichier de la publication ?'}
            </p>

            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => setAttachmentToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-200 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingAttachment}
                onClick={handleConfirmDeleteAttachment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {deletingAttachment ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={onRefresh}
        />
      )}

      {savingPost && (
        <SaveToSpaceModal
          post={savingPost}
          currentUser={currentUser}
          onClose={() => setSavingPost(null)}
          onSaved={() => {}}
        />
      )}

      <DocumentSearchModal
        isOpen={showFullSearch}
        onClose={() => setShowFullSearch(false)}
        posts={posts}
        currentUser={currentUser}
        initialQuery={initialSearchQuery}
        onOpenUserProfile={onOpenUserProfile}
        onOpenChatWithUser={onOpenChatWithUser}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};
