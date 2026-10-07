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
  Clock,
  RefreshCw,
  MessageSquare,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Flag
} from 'lucide-react';

interface FeedViewProps {
  currentUser: User;
  posts: Post[];
  onRefresh: () => void;
  onOpenUserProfile?: (userId: string) => void;
  onOpenChatWithUser?: (userId: string) => void;
  onNavigateTab?: (tab: MainTabType) => void;
  onOpenFriendsModal?: () => void;
  initialSharedImage?: string | null;
  onClearInitialSharedImage?: () => void;
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
  onNavigateTab,
  onOpenFriendsModal,
  initialSharedImage,
  onClearInitialSharedImage
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
  const [contentFilter, setContentFilter] = useState<'all' | 'documents' | 'media' | 'audio'>('all');

  // Random Friend Suggestions & Incoming Requests in Home Feed
  const [friendSuggestions, setFriendSuggestions] = useState<SuggestedUser[]>([]);
  const [pendingReceived, setPendingReceived] = useState<User[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [busyFriendUserId, setBusyFriendUserId] = useState<string | null>(null);

  // Lightbox for feed images
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // Content Reporting state (post or comment)
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'comment';
    targetId: string;
    parentPostId?: string;
    authorName: string;
    excerpt: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('Contenu inapproprié ou offensant');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const showErrorToast = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(null), 4000);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    setSubmittingReport(true);
    try {
      const res = await api.admin.submitReport({
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        parentPostId: reportTarget.parentPostId,
        reason: reportReason,
        details: reportDetails.trim() || undefined
      });
      setReportTarget(null);
      setReportDetails('');
      setToastSuccess(res.message || "Signalement envoyé à l'administration.");
      setTimeout(() => setToastSuccess(null), 4000);
    } catch (err: any) {
      showErrorToast(err.message || "Erreur lors de l'envoi du signalement.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await api.posts.deleteComment(postId, commentId);
      onRefresh();
      setToastSuccess('Commentaire supprimé.');
      setTimeout(() => setToastSuccess(null), 3000);
    } catch (err: any) {
      showErrorToast(err.message || 'Impossible de supprimer ce commentaire.');
    }
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
    if (selectedTagFilter && !p.tags?.includes(selectedTagFilter)) {
      return false;
    }
    if (contentFilter === 'documents') {
      return p.attachments?.some((a) => a.type === 'document');
    }
    if (contentFilter === 'media') {
      return p.attachments?.some((a) => a.type === 'image' || a.type === 'video');
    }
    if (contentFilter === 'audio') {
      return p.attachments?.some((a) => a.type === 'audio');
    }
    return true;
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
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-5">
        {/* Toast Error Alert */}
        {toastError && (
          <div className="fixed top-18 right-3 z-50 px-4 py-3 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xl flex items-center space-x-2 animate-fadeIn max-w-[90vw]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">{toastError}</span>
          </div>
        )}

        {/* Toast Success Alert */}
        {toastSuccess && (
          <div className="fixed top-18 right-3 z-50 px-4 py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xl flex items-center space-x-2 animate-fadeIn max-w-[90vw]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{toastSuccess}</span>
          </div>
        )}

        {/* Clean 2-Column Workspace Layout (Main Feed + Network & Quick Modules Sidebar) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full min-w-0">
          
          {/* MAIN FEED COLUMN */}
          <div className="col-span-1 xl:col-span-8 min-w-0 w-full max-w-full overflow-hidden">
            
            {/* Restriction Alert for Read-Only Users */}
            {currentUser.isRestricted && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start space-x-3 shadow-2xs">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Mode Lecture Seule Activé
                  </h4>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    Vos interactions ont été limitées par l'administration.
                  </p>
                </div>
              </div>
            )}

            {/* 1. FEED ORGANIZATION BAR: Content Filter Tabs + Search Trigger */}
            <div className="mb-4 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-2xs w-full min-w-0 overflow-hidden space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Segmented Content Type Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setContentFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      contentFilter === 'all'
                        ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tout le fil ({posts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentFilter('documents')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      contentFilter === 'documents'
                        ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Documents & Cours
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentFilter('media')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      contentFilter === 'media'
                        ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Photos & Vidéos
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentFilter('audio')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      contentFilter === 'audio'
                        ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Notes Vocales
                  </button>
                </div>

                {/* Search & Tag Reset */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedTagFilter && (
                    <button
                      type="button"
                      onClick={() => setSelectedTagFilter(null)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer"
                    >
                      <span>#{selectedTagFilter}</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setInitialSearchQuery('');
                      setShowFullSearch(true);
                    }}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition cursor-pointer whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Recherche avancée</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. COMPACT POST COMPOSER ("Quoi de neuf ?") */}
            {!currentUser.isRestricted ? (
              <PostComposer
                currentUser={currentUser}
                onPostCreated={onRefresh}
                initialAttachment={
                  initialSharedImage
                    ? {
                        type: 'image',
                        url: initialSharedImage,
                        name: `Capture_Opposition_${Date.now()}.png`
                      }
                    : null
                }
                onClearInitialAttachment={onClearInitialSharedImage}
              />
            ) : (
              <div className="mb-3.5 p-3.5 bg-white dark:bg-[#0f172a] border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl text-center text-slate-500 dark:text-slate-400 text-xs">
                🔒 Publication désactivée en mode lecture seule.
              </div>
            )}

            {/* 3. MOBILE/TABLET FRIEND INVITATIONS & SUGGESTIONS (Compact & Strictly Contained) */}
            {(pendingReceived.length > 0 || visibleSuggestions.length > 0) && (
              <div className="lg:hidden mb-3.5 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-2xs space-y-3 w-full min-w-0 overflow-hidden">
                {pendingReceived.length > 0 && (
                  <div className="space-y-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>Invitations reçues ({pendingReceived.length})</span>
                    </div>
                    {pendingReceived.map((reqUser) => (
                      <div
                        key={reqUser.id}
                        className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-between gap-2 min-w-0"
                      >
                        <div
                          onClick={() => onOpenUserProfile?.(reqUser.id)}
                          className="flex items-center space-x-2 min-w-0 cursor-pointer"
                        >
                          <img
                            src={reqUser.avatarUrl}
                            alt={reqUser.prenom}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {reqUser.prenom} {reqUser.nom}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {reqUser.promo || 'Membre'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            disabled={busyFriendUserId === reqUser.id}
                            onClick={() => handleAcceptIncomingRequest(reqUser)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Confirmer
                          </button>
                          <button
                            disabled={busyFriendUserId === reqUser.id}
                            onClick={() => handleRejectIncomingRequest(reqUser)}
                            className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                          >
                            Suppr.
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {visibleSuggestions.length > 0 && (
                  <div className="space-y-2 w-full min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Suggestions d'amis</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDismissedIds(new Set());
                          loadHomeFriendSuggestions(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${loadingSuggestions ? 'animate-spin' : ''}`}
                        />
                        <span>Mélanger</span>
                      </button>
                    </div>

                    <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar pb-1 w-full">
                      {visibleSuggestions.slice(0, 8).map((u) => {
                        const isBusy = busyFriendUserId === u.id;
                        return (
                          <div
                            key={u.id}
                            className="w-34 shrink-0 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex flex-col justify-between relative"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setDismissedIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(u.id);
                                  return next;
                                })
                              }
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center"
                              title="Retirer"
                            >
                              <X className="w-3 h-3" />
                            </button>

                            <div
                              onClick={() => onOpenUserProfile?.(u.id)}
                              className="flex flex-col items-center text-center cursor-pointer pt-1"
                            >
                              <img
                                src={u.avatarUrl}
                                alt={u.prenom}
                                className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 mb-1.5"
                                referrerPolicy="no-referrer"
                              />
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate w-full">
                                {u.prenom} {u.nom}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">
                                {u.promo || 'Membre'}
                              </div>
                            </div>

                            <div className="mt-2 pt-1">
                              {u.isPendingSent ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleCancelFriendRequest(u)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>Envoyée</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleSendFriendRequest(u)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1 cursor-pointer"
                                >
                                  <UserPlus className="w-3 h-3 shrink-0" />
                                  <span>Ajouter</span>
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

            {/* 4. POSTS STREAM */}
            <div className="space-y-3.5 w-full min-w-0">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Aucune publication trouvée
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                    Soyez le premier à partager une publication avec la communauté !
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
                      className="w-full min-w-0 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Post Header */}
                      <div className="p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
                        <div
                          className="flex items-center space-x-2.5 cursor-pointer group min-w-0"
                          onClick={() => onOpenUserProfile && onOpenUserProfile(post.authorId)}
                          title="Voir le profil de cet utilisateur"
                        >
                          <img
                            src={post.authorAvatar}
                            alt={post.authorName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:border-blue-500 transition shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                                {post.authorName}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                                · {post.authorPromo}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                              {formatDate(post.createdAt)}
                              {post.updatedAt && <span className="ml-1 italic">(modifié)</span>}
                            </span>
                          </div>
                        </div>

                        {/* Actions dropdown */}
                        <div className="relative shrink-0">
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
                                <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                                <span>Classer dans un espace</span>
                              </button>

                              {!isAuthor && (
                                <button
                                  onClick={() => {
                                    setReportTarget({
                                      targetType: 'post',
                                      targetId: post.id,
                                      authorName: post.authorName,
                                      excerpt: (post.content || 'Publication multimédia').slice(0, 80)
                                    });
                                    setOpenMenuPostId(null);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold transition cursor-pointer"
                                >
                                  <Flag className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Signaler la publication</span>
                                </button>
                              )}

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
                                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
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
                        <div className="px-3.5 sm:px-4 py-1.5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {post.content}
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="px-3.5 sm:px-4 py-1 flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setSelectedTagFilter(tag)}
                              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Attachments Section */}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="px-3.5 sm:px-4 py-2 space-y-2">
                          {post.attachments.map((att) => {
                            if (att.type === 'document') {
                              return (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl transition min-w-0"
                                >
                                  <div className="flex items-center space-x-2.5 truncate pr-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="truncate min-w-0">
                                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                        {att.name}
                                      </p>
                                      <p className="text-[10px] text-slate-500 font-medium">
                                        Document joint
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <a
                                      href={att.url}
                                      download={att.name}
                                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Télécharger</span>
                                    </a>
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAttachmentToDelete({ post, attachment: att })
                                        }
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
                                  className="p-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                                      <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                      <span className="truncate">{att.name || 'Note Vocale'}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 shrink-0">
                                      <a
                                        href={att.url}
                                        download={att.name || 'note_vocale.webm'}
                                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                      >
                                        <Download className="w-3 h-3" />
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
                                      <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                      <span className="truncate">{att.name}</span>
                                    </div>
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAttachmentToDelete({ post, attachment: att })
                                        }
                                        className="text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-rose-950 transition cursor-pointer shrink-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Suppr.</span>
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
                      <div className="px-3.5 sm:px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
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
                            <span>J'aime</span>
                          </button>

                          <button
                            onClick={() =>
                              setActiveCommentsPostId(areCommentsOpen ? null : post.id)
                            }
                            className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments?.length || 0}</span>
                            <span>Commentaires</span>
                          </button>
                        </div>

                        <button
                          onClick={() => setSavingPost(post)}
                          className="flex items-center space-x-1 font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Classer</span>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {areCommentsOpen && (
                        <div className="bg-slate-50/70 dark:bg-[#090f1f] p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          {post.comments && post.comments.length > 0 ? (
                            <div className="space-y-2.5">
                              {(post.comments || [])
                                .filter((c) => !c.parentId)
                                .map((com) => {
                                  const replies = (post.comments || []).filter(
                                    (r) => r.parentId === com.id
                                  );
                                  return (
                                    <div key={com.id} className="space-y-2">
                                      <div className="flex items-start space-x-2">
                                        <img
                                          src={com.userAvatar}
                                          alt={com.userName}
                                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 mt-0.5 shrink-0"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="flex-1 min-w-0 bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                          <div className="flex items-center justify-between mb-1 gap-2">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                              {com.userName}
                                            </span>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                              {formatDate(com.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                            {com.content}
                                          </p>

                                          {!currentUser.isRestricted && (
                                            <div className="mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                              <div className="flex items-center space-x-3">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setReplyingTo({
                                                      postId: post.id,
                                                      commentId: com.id,
                                                      userName: com.userName
                                                    })
                                                  }
                                                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 transition cursor-pointer"
                                                >
                                                  <Reply className="w-3 h-3" />
                                                  <span>Répondre</span>
                                                </button>

                                                {com.userId !== currentUser.id && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setReportTarget({
                                                        targetType: 'comment',
                                                        targetId: com.id,
                                                        parentPostId: post.id,
                                                        authorName: com.userName,
                                                        excerpt: com.content.slice(0, 80)
                                                      })
                                                    }
                                                    className="text-[11px] font-semibold text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center space-x-1 transition cursor-pointer"
                                                    title="Signaler ce commentaire à l'administration"
                                                  >
                                                    <Flag className="w-3 h-3" />
                                                    <span>Signaler</span>
                                                  </button>
                                                )}

                                                {(com.userId === currentUser.id ||
                                                  post.authorId === currentUser.id ||
                                                  currentUser.role === 'admin') && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteComment(post.id, com.id)}
                                                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 flex items-center space-x-1 transition cursor-pointer"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                    <span>Supprimer</span>
                                                  </button>
                                                )}
                                              </div>

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
                                        <div className="ml-5 pl-2.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
                                          {replies.map((reply) => (
                                            <div
                                              key={reply.id}
                                              className="flex items-start space-x-2"
                                            >
                                              <img
                                                src={reply.userAvatar}
                                                alt={reply.userName}
                                                className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 mt-0.5 shrink-0"
                                                referrerPolicy="no-referrer"
                                              />
                                              <div className="flex-1 min-w-0 bg-white/90 dark:bg-[#0f172a]/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                                <div className="flex items-center justify-between mb-0.5">
                                                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                                    {reply.userName}
                                                  </span>
                                                  <span className="text-[9px] text-slate-400 shrink-0">
                                                    {formatDate(reply.createdAt)}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                                  {reply.replyToUserName && (
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold mr-1">
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
                                <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 font-medium">
                                  <div className="flex items-center space-x-1.5 truncate">
                                    <CornerDownRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span className="truncate">
                                      En réponse à <strong>@{replyingTo.userName}</strong>
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
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
                                  className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
                                />
                                <button
                                  type="submit"
                                  disabled={
                                    submittingComment === post.id || !commentText[post.id]?.trim()
                                  }
                                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-2xs transition disabled:opacity-40 shrink-0 flex items-center justify-center cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic text-center py-1">
                              🔒 Commentaire désactivé
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR (Desktop xl+): Quick Modules, Invitations & Friend Suggestions */}
          <aside className="hidden xl:block xl:col-span-4 sticky top-4 space-y-4 min-w-0">
            {/* Quick Direct Access to Collaborative Pages */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Espaces & Outils Collaboratifs
                </span>
                <span className="text-[11px] text-slate-400">Accès direct</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab?.('forums')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-left transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400 mb-1" />
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Communautés</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Salons & débats
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('quizzes')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-left transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1" />
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Quiz & QCM</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Défis & scores
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('polls')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-left transition cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400 mb-1" />
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Sondages</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Votes en direct
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('spaces')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-left transition cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-sky-600 dark:text-sky-400 mb-1" />
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Mes Espaces</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Favoris classés
                  </div>
                </button>
              </div>
            </div>
            {/* Pending Received Requests */}
            {pendingReceived.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Invitations reçues ({pendingReceived.length})</span>
                  </span>
                </div>

                <div className="space-y-2">
                  {pendingReceived.map((reqUser) => (
                    <div
                      key={reqUser.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 space-y-2"
                    >
                      <div
                        onClick={() => onOpenUserProfile?.(reqUser.id)}
                        className="flex items-center space-x-2.5 cursor-pointer"
                      >
                        <img
                          src={reqUser.avatarUrl}
                          alt={reqUser.prenom}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {reqUser.prenom} {reqUser.nom}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {reqUser.promo || 'Membre MK'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={busyFriendUserId === reqUser.id}
                          onClick={() => handleAcceptIncomingRequest(reqUser)}
                          className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          Confirmer
                        </button>
                        <button
                          disabled={busyFriendUserId === reqUser.id}
                          onClick={() => handleRejectIncomingRequest(reqUser)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions d'amis */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Suggestions d'amis</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedIds(new Set());
                    loadHomeFriendSuggestions(true);
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Mélanger les suggestions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {visibleSuggestions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Aucune nouvelle suggestion pour le moment.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {visibleSuggestions.slice(0, 5).map((u) => {
                    const isBusy = busyFriendUserId === u.id;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                      >
                        <div
                          onClick={() => onOpenUserProfile?.(u.id)}
                          className="flex items-center space-x-2.5 min-w-0 cursor-pointer"
                        >
                          <img
                            src={u.avatarUrl}
                            alt={u.prenom}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-blue-600">
                              {u.prenom} {u.nom}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {u.promo || 'Membre MK'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {u.isPendingSent ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleCancelFriendRequest(u)}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                            >
                              Envoyée
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSendFriendRequest(u)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Ajouter
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Supprimer cette publication ?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Êtes-vous sûr de vouloir supprimer définitivement cette publication ? Cette action est irréversible.
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
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELETE ATTACHMENT CONFIRMATION MODAL */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Supprimer cette pièce jointe ?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
              Voulez-vous retirer définitivement ce fichier de la publication ?
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
                {deletingAttachment ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT MODAL (Post or Comment) */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Signaler {reportTarget.targetType === 'post' ? 'cette publication' : 'ce commentaire'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Auteur : {reportTarget.authorName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">
              « {reportTarget.excerpt} »
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Motif du signalement :
                </label>
                <div className="space-y-1.5">
                  {[
                    'Contenu inapproprié ou offensant',
                    'Harcèlement ou intimidation',
                    'Discours haineux ou intolérance',
                    'Spam ou publicité indésirable',
                    'Fausses informations'
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
                        name="reportReason"
                        value={reasonOption}
                        checked={reportReason === reasonOption}
                        onChange={() => setReportReason(reasonOption)}
                        className="accent-amber-600"
                      />
                      <span>{reasonOption}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Précisions supplémentaires (facultatif) :
                </label>
                <textarea
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Expliquez brièvement le problème à l'administration..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
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
