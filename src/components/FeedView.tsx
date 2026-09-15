import React, { useState } from 'react';
import { Post, User, Attachment } from '../types';
import { api } from '../lib/api';
import { PostComposer } from './PostComposer';
import { EditPostModal } from './EditPostModal';
import { SaveToSpaceModal } from './SaveToSpaceModal';
import { DocumentSearchModal } from './DocumentSearchModal';
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
  ShieldCheck,
  AlertTriangle,
  Lock,
  ExternalLink,
  Files,
  CornerDownRight,
  Reply,
  X,
  CheckCircle2
} from 'lucide-react';

interface FeedViewProps {
  currentUser: User;
  posts: Post[];
  onRefresh: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({ currentUser, posts, onRefresh, onOpenUserProfile }) => {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [savingPost, setSavingPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ post: Post; attachment: Attachment } | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string; userName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showDocSearch, setShowDocSearch] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const showErrorToast = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(null), 4000);
  };

  // Like toggle
  const handleLike = async (postId: string) => {
    if (currentUser.isRestricted) {
      showErrorToast("Votre compte est en mode lecture seule : interactions désactivées.");
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

  // Confirm delete specific attachment (e.g. vocal or document)
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
        // If the post only consisted of this vocal and default auto-fill text, delete the entire post
        await api.posts.delete(post.id);
      } else {
        // Update post with the attachment removed
        await api.posts.update(post.id, {
          attachments: remainingAttachments,
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
      showErrorToast("Votre compte est en mode lecture seule : les commentaires sont désactivés.");
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
      showErrorToast(err.message || 'Erreur lors de l\'envoi du commentaire');
    } finally {
      setSubmittingComment(null);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTagFilter || p.tags?.includes(selectedTagFilter);

    return matchesSearch && matchesTag;
  });

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      
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
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start space-x-3 shadow-xs">
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

      {/* Search & Document Explorer Toolbar */}
      <div className="mb-5 flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par mot-clé, cours ou auteur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0c142b] border border-blue-100 dark:border-blue-950 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Global Document Search Button */}
        <button
          onClick={() => setShowDocSearch(true)}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800 text-xs font-bold rounded-xl shadow-xs transition flex-shrink-0 cursor-pointer"
        >
          <Files className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Fichiers & Documents</span>
        </button>

        {selectedTagFilter && (
          <button
            onClick={() => setSelectedTagFilter(null)}
            className="flex-shrink-0 flex items-center space-x-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
          >
            <span>Filtre: #{selectedTagFilter}</span>
            <span className="ml-1 text-blue-600 font-bold">×</span>
          </button>
        )}
      </div>

      {/* Main Publication Composer (disabled or warned if restricted) */}
      {!currentUser.isRestricted ? (
        <PostComposer currentUser={currentUser} onPostCreated={onRefresh} />
      ) : (
        <div className="mb-5 p-4 bg-white dark:bg-[#0c142b] border border-dashed border-blue-200 dark:border-blue-900 rounded-2xl text-center text-slate-500 dark:text-slate-400 text-xs">
          🔒 Vous ne pouvez pas publier de nouveau contenu en raison de la limitation administrative en mode lecture seule.
        </div>
      )}

      {/* Posts Stream */}
      <div className="space-y-5 mt-5">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-14 px-4 bg-white dark:bg-[#0c142b] rounded-2xl border border-blue-100 dark:border-blue-950 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Aucune publication trouvée</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Aucune publication ne correspond à vos critères de recherche."
                : "Soyez le premier à partager une réflexion, une photo, une vidéo ou un vocal avec la communauté !"}
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
                className="bg-white dark:bg-[#0c142b] rounded-2xl border border-blue-100/90 dark:border-blue-950 shadow-sm overflow-hidden transition-all hover:border-blue-300 dark:hover:border-blue-800"
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
                      className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/40 group-hover:border-blue-600 transition shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {post.authorName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {post.authorPromo}
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
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-48 bg-white dark:bg-[#0c142b] rounded-xl shadow-xl border border-blue-100 dark:border-blue-900 py-1 text-xs">
                        <button
                          onClick={() => {
                            setSavingPost(post);
                            setOpenMenuPostId(null);
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                          <span>Classer dans un espace</span>
                        </button>

                        {canManage && (
                          <>
                            {post.attachments?.some((a) => a.type === 'audio') && (
                              <button
                                onClick={() => {
                                  const audioAtt = post.attachments?.find((a) => a.type === 'audio');
                                  if (audioAtt) setAttachmentToDelete({ post, attachment: audioAtt });
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
                              className="w-full flex items-center space-x-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                              <span>
                                {isAuthor ? "Modifier la publication" : "Modifier (Admin)"}
                              </span>
                            </button>
                            
                            {/* Delete button (opens custom in-app confirmation modal) */}
                            <button
                              onClick={() => {
                                setPostToDelete(post);
                                setOpenMenuPostId(null);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-medium transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>
                                {isAuthor ? "Supprimer le post" : "Supprimer (Modération)"}
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
                        className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800 px-2.5 py-0.5 rounded-lg transition cursor-pointer"
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
                            className="flex items-center justify-between p-3 bg-blue-50/40 dark:bg-[#121c38]/60 border border-blue-100 dark:border-blue-900 rounded-xl hover:bg-blue-50/70 dark:hover:bg-[#121c38] transition"
                          >
                            <div className="flex items-center space-x-3 truncate pr-2">
                              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-800">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{att.name}</p>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Document joint</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <a
                                href={att.url}
                                download={att.name}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-[#0c142b] border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer"
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
                            className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex flex-col space-y-2 shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 text-xs font-bold text-blue-950 dark:text-blue-200 truncate pr-2">
                                <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="truncate">{att.name || 'Note Vocale'}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <a
                                  href={att.url}
                                  download={att.name || 'note_vocale.webm'}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-[#0c142b] border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer"
                                  title="Télécharger l'enregistrement vocal"
                                >
                                  <Download className="w-3 h-3" />
                                  <span className="hidden sm:inline">Télécharger</span>
                                </a>
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => setAttachmentToDelete({ post, attachment: att })}
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                    title="Supprimer la note vocale"
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
                          <div key={att.id} className="relative rounded-xl overflow-hidden border border-blue-100 dark:border-blue-950 bg-black group">
                            <video controls src={att.url} className="w-full max-h-96 object-contain" />
                            <div className="p-2 bg-slate-900 text-white text-xs flex items-center justify-between">
                              <div className="flex items-center space-x-2 truncate pr-2">
                                <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="truncate">{att.name}</span>
                              </div>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => setAttachmentToDelete({ post, attachment: att })}
                                  className="text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-rose-950 transition cursor-pointer"
                                  title="Supprimer cette vidéo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Supprimer</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (att.type === 'image') {
                        return (
                          <div key={att.id} className="relative rounded-xl overflow-hidden border border-blue-100 dark:border-blue-950 bg-slate-100 dark:bg-[#0c142b] group">
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full max-h-96 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => setAttachmentToDelete({ post, attachment: att })}
                                className="absolute top-2.5 right-2.5 px-2 py-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium flex items-center space-x-1 shadow-md transition cursor-pointer backdrop-blur-xs"
                                title="Supprimer cette image"
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
                <div className="px-4 sm:px-5 py-2.5 border-t border-blue-50 dark:border-blue-950 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-4 sm:space-x-6">
                    {/* Like button */}
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-1.5 font-bold transition cursor-pointer ${
                        hasLiked ? 'text-rose-600 dark:text-rose-400' : 'hover:text-rose-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-rose-600 dark:text-rose-400' : ''}`} />
                      <span>{post.likes.length}</span>
                      <span className="hidden sm:inline">J'aime</span>
                    </button>

                    {/* Comments toggle */}
                    <button
                      onClick={() => setActiveCommentsPostId(areCommentsOpen ? null : post.id)}
                      className="flex items-center space-x-1.5 font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments?.length || 0}</span>
                      <span className="hidden sm:inline">Commentaires</span>
                    </button>
                  </div>

                  {/* Bookmark / Classify in space */}
                  <button
                    onClick={() => setSavingPost(post)}
                    className="flex items-center space-x-1.5 font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                    title="Enregistrer et classer dans un espace"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                    <span>Classer</span>
                  </button>
                </div>

                {/* Comments Section */}
                {areCommentsOpen && (
                  <div className="bg-blue-50/30 dark:bg-[#070c1e] p-4 sm:p-5 border-t border-blue-100 dark:border-blue-950 space-y-3.5">
                    {post.comments && post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {/* Render Root Comments */}
                        {(post.comments || [])
                          .filter((c) => !c.parentId)
                          .map((com) => {
                            const replies = (post.comments || []).filter((r) => r.parentId === com.id);
                            return (
                              <div key={com.id} className="space-y-2">
                                {/* Root Comment Card */}
                                <div className="flex items-start space-x-2.5">
                                  <img
                                    src={com.userAvatar}
                                    alt={com.userName}
                                    className="w-7 h-7 rounded-full object-cover border border-blue-200 dark:border-blue-800 mt-0.5 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex-1 bg-white dark:bg-[#0c142b] p-3.5 rounded-xl border border-blue-100 dark:border-blue-900 shadow-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                          {com.userName}
                                        </span>
                                        {com.userPromo && (
                                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded">
                                            {com.userPromo}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400">{formatDate(com.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                      {com.content}
                                    </p>

                                    {/* Action button to reply to this comment */}
                                    {!currentUser.isRestricted && (
                                      <div className="mt-2 pt-1 border-t border-blue-50 dark:border-blue-950 flex items-center justify-between">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setReplyingTo({
                                              postId: post.id,
                                              commentId: com.id,
                                              userName: com.userName,
                                            })
                                          }
                                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1 transition cursor-pointer"
                                        >
                                          <Reply className="w-3 h-3" />
                                          <span>Répondre</span>
                                        </button>
                                        {replies.length > 0 && (
                                          <span className="text-[10px] text-slate-400">
                                            {replies.length} réponse{replies.length > 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Nested Replies Branch */}
                                {replies.length > 0 && (
                                  <div className="ml-5 sm:ml-7 pl-3 border-l-2 border-blue-200 dark:border-blue-900 space-y-2">
                                    {replies.map((reply) => (
                                      <div key={reply.id} className="flex items-start space-x-2">
                                        <img
                                          src={reply.userAvatar}
                                          alt={reply.userName}
                                          className="w-5 h-5 rounded-full object-cover border border-blue-200 dark:border-blue-800 mt-0.5 shrink-0"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="flex-1 bg-white/90 dark:bg-[#0c142b]/90 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900 shadow-2xs">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center space-x-1.5">
                                              <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                {reply.userName}
                                              </span>
                                              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold">
                                                {reply.userPromo}
                                              </span>
                                            </div>
                                            <span className="text-[9px] text-slate-400">
                                              {formatDate(reply.createdAt)}
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {reply.replyToUserName && (
                                              <span className="text-blue-600 dark:text-blue-400 font-bold mr-1">
                                                @{reply.replyToUserName}
                                              </span>
                                            )}
                                            {reply.content}
                                          </div>

                                          {/* Quick reply trigger on nested reply */}
                                          {!currentUser.isRestricted && (
                                            <div className="mt-1 flex justify-end">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setReplyingTo({
                                                    postId: post.id,
                                                    commentId: com.id,
                                                    userName: reply.userName,
                                                  })
                                                }
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1 transition cursor-pointer"
                                              >
                                                <Reply className="w-2.5 h-2.5" />
                                                <span>Répondre</span>
                                              </button>
                                            </div>
                                          )}
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

                    {/* New Comment / Reply Form */}
                    {!currentUser.isRestricted ? (
                      <div className="space-y-1.5">
                        {/* Replying banner indicator */}
                        {replyingTo?.postId === post.id && (
                          <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 font-medium">
                            <div className="flex items-center space-x-1.5">
                              <CornerDownRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>
                                En réponse à <strong className="text-blue-600 dark:text-blue-300">@{replyingTo.userName}</strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Annuler la réponse"
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
                                : "Écrire un commentaire..."
                            }
                            value={commentText[post.id] || ''}
                            onChange={(e) =>
                              setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            className="flex-1 px-3.5 py-2 bg-white dark:bg-[#0c142b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          />
                          <button
                            type="submit"
                            disabled={submittingComment === post.id || !commentText[post.id]?.trim()}
                            className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-sm transition disabled:opacity-40 shrink-0 flex items-center justify-center cursor-pointer"
                            title={replyingTo?.postId === post.id ? "Envoyer la réponse" : "Envoyer le commentaire"}
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

      {/* IN-APP DELETE POST CONFIRMATION MODAL (No window.confirm!) */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c142b] rounded-3xl p-6 border border-blue-100 dark:border-blue-950 shadow-2xl text-center">
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

      {/* IN-APP DELETE ATTACHMENT / VOCAL CONFIRMATION MODAL */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c142b] rounded-3xl p-6 border border-blue-100 dark:border-blue-950 shadow-2xl text-center">
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
                ? "Voulez-vous retirer définitivement cet enregistrement vocal de la publication ? L'audio sera effacé et la publication mise à jour."
                : "Voulez-vous retirer définitivement ce fichier de la publication ?"}
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
                {deletingAttachment ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={() => {
            setEditingPost(null);
            onRefresh();
          }}
        />
      )}

      {/* Save / Classify Post Modal */}
      {savingPost && (
        <SaveToSpaceModal
          post={savingPost}
          onClose={() => setSavingPost(null)}
          onSaved={() => {
            setSavingPost(null);
            onRefresh();
          }}
        />
      )}

      {/* Global Document Search Modal */}
      <DocumentSearchModal
        isOpen={showDocSearch}
        onClose={() => setShowDocSearch(false)}
        posts={posts}
      />

    </div>
  );
};
