import React, { useState, useEffect } from 'react';
import { User, Post, Reel } from '../types';
import { api } from '../lib/api';
import {
  Lock,
  Unlock,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Shield,
  ShieldAlert,
  ShieldOff,
  Film,
  FileText,
  Heart,
  Share2,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  ThumbsUp,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';

interface ProfileViewProps {
  targetUserId: string;
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  onOpenChatWithUser: (userId: string) => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenReelsView?: () => void;
  onEditPost?: (post: Post) => void;
  onGoBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  targetUserId,
  currentUser,
  onUpdateCurrentUser,
  onOpenChatWithUser,
  onOpenUserProfile,
  onOpenReelsView,
  onEditPost,
  onGoBack
}) => {
  const [profileData, setProfileData] = useState<{
    user: User;
    relationship: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none';
    isFriend: boolean;
    isSelf: boolean;
    isBlockedByMe: boolean;
    isBlockedByThem: boolean;
    isRestrictedView: boolean;
    posts: Post[];
    reels: Reel[];
    friendsCount: number;
    postsCount: number;
    reelsCount: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'posts' | 'reels'>('posts');
  const [togglingLock, setTogglingLock] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const isSelf = currentUser.id === targetUserId;

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.users.getProfile(targetUserId);
      setProfileData(res);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [targetUserId]);

  // Privacy Toggle: Lock / Unlock Profile
  const handleToggleLock = async () => {
    if (!profileData?.user) return;
    const newLockState = !profileData.user.isLocked;

    try {
      setTogglingLock(true);
      const res = await api.privacy.toggleLock(newLockState);
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, isLocked: res.isLocked }
            }
          : null
      );
      onUpdateCurrentUser(res.user);
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour de la confidentialité.');
    } finally {
      setTogglingLock(false);
    }
  };

  // Send Friend Request
  const handleSendFriendRequest = async () => {
    try {
      setFriendActionLoading(true);
      const res = await api.friends.sendRequest(targetUserId);
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadProfile();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Accept Friend Request
  const handleAcceptFriendRequest = async () => {
    try {
      setFriendActionLoading(true);
      const res = await api.friends.acceptRequest(targetUserId);
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadProfile();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'acceptation.");
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Reject Friend Request
  const handleRejectFriendRequest = async () => {
    try {
      setFriendActionLoading(true);
      const res = await api.friends.rejectRequest(targetUserId);
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadProfile();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du refus.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Remove Friend
  const handleRemoveFriend = async () => {
    if (!confirm('Voulez-vous vraiment retirer cet utilisateur de vos amis ?')) return;
    try {
      setFriendActionLoading(true);
      const res = await api.friends.removeFriend(targetUserId);
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadProfile();
    } catch (err: any) {
      alert(err.message || "Erreur lors du retrait de l'ami.");
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Block / Unblock User
  const handleToggleBlock = async () => {
    if (!profileData) return;
    try {
      if (profileData.isBlockedByMe) {
        const res = await api.users.unblock(targetUserId);
        setActionSuccessMsg(res.message);
      } else {
        if (confirm(`Voulez-vous vraiment bloquer ${profileData.user.prenom} ${profileData.user.nom} ?`)) {
          const res = await api.users.block(targetUserId);
          setActionSuccessMsg(res.message);
        }
      }
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadProfile();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du changement de blocage.');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-3" />
        <p className="text-sm font-semibold">Chargement du profil...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-4 text-center">
        {onGoBack && (
          <div className="mb-4 text-left">
            <button
              onClick={onGoBack}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 font-bold text-xs shadow-xs transition"
            >
              <ArrowLeft className="w-4 h-4 text-teal-500" />
              <span>Revenir à la page précédente</span>
            </button>
          </div>
        )}
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <h3 className="text-base font-bold mb-1">Profil inaccessible</h3>
          <p className="text-xs">{error || 'Utilisateur introuvable.'}</p>
        </div>
      </div>
    );
  }

  const { user, relationship, isRestrictedView, posts, reels, isBlockedByMe } = profileData;

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4">
      {/* Top back navigation button */}
      {onGoBack && (
        <div className="mb-3">
          <button
            onClick={onGoBack}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/40 font-bold text-xs shadow-xs transition group"
            title="Revenir à la page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-teal-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Revenir à la page précédente</span>
          </button>
        </div>
      )}

      {/* Success alert message */}
      {actionSuccessMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-36 sm:h-44 bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 relative">
          {user.isLocked && (
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 flex items-center space-x-1.5 border border-amber-400/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Profil Verrouillé</span>
            </div>
          )}
        </div>

        {/* Profile Info Container */}
        <div className="p-4 sm:p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt={user.prenom}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-slate-800"
              />
              {user.role === 'admin' && (
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase border-2 border-white dark:border-slate-900">
                  Admin
                </span>
              )}
            </div>

            {/* Actions (Friend, Message, Lock toggle) */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
              {isSelf ? (
                // SELF CONTROLS: Toggle Profile Lock
                <button
                  onClick={handleToggleLock}
                  disabled={togglingLock}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-xs ${
                    user.isLocked
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
                  }`}
                  title="Modifier la visibilité de votre profil"
                >
                  {togglingLock ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : user.isLocked ? (
                    <>
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span>Profil Verrouillé (Amis seuls)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 text-slate-500" />
                      <span>Profil Public (Cliquer pour verrouiller)</span>
                    </>
                  )}
                </button>
              ) : (
                // OTHER USER CONTROLS: Add friend, Chat, Block
                <>
                  {relationship === 'none' && (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={friendActionLoading || isBlockedByMe}
                      className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Ajouter en ami</span>
                    </button>
                  )}

                  {relationship === 'pending_sent' && (
                    <button
                      disabled
                      className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed border border-slate-200 dark:border-slate-700"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Invitation envoyée</span>
                    </button>
                  )}

                  {relationship === 'pending_received' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleAcceptFriendRequest}
                        disabled={friendActionLoading}
                        className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Accepter l'invitation</span>
                      </button>
                      <button
                        onClick={handleRejectFriendRequest}
                        disabled={friendActionLoading}
                        className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 text-xs font-bold border border-slate-200 dark:border-slate-700"
                        title="Refuser"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {relationship === 'friends' && (
                    <button
                      onClick={handleRemoveFriend}
                      disabled={friendActionLoading}
                      className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                      title="Cliquer pour retirer des amis"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Amis ✓</span>
                    </button>
                  )}

                  {/* Message Button */}
                  <button
                    onClick={() => onOpenChatWithUser(targetUserId)}
                    disabled={isBlockedByMe}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-xs transition"
                  >
                    <MessageCircle className="w-4 h-4 text-teal-500" />
                    <span>Message direct</span>
                  </button>

                  {/* Block / Unblock */}
                  <button
                    onClick={handleToggleBlock}
                    className={`p-2.5 rounded-2xl border transition ${
                      isBlockedByMe
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                    title={isBlockedByMe ? "Débloquer l'utilisateur" : "Bloquer l'utilisateur"}
                  >
                    {isBlockedByMe ? <ShieldOff className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User Bio & Meta */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <span>
                {user.prenom} {user.nom}
              </span>
              {user.isLocked && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Profil Verrouillé
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
              {user.promo || 'Étudiant'}
            </p>
            {user.bio && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-2xl leading-relaxed">
                {user.bio}
              </p>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="text-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
              <span className="block text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {profileData.postsCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Publications</span>
            </div>
            <div className="text-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
              <span className="block text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {profileData.reelsCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Reels</span>
            </div>
            <div className="text-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
              <span className="block text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {profileData.friendsCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Amis</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA: Check for Profile Lock Restriction */}
      {isRestrictedView ? (
        // LOCKED PROFILE SHIELD
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
            Ce profil est verrouillé
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            {user.prenom} a choisi de protéger ses contenus. Seuls ses amis acceptés peuvent consulter ses publications et ses reels.
          </p>

          {relationship === 'none' && (
            <button
              onClick={handleSendFriendRequest}
              disabled={friendActionLoading}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Envoyer une invitation d'ami</span>
            </button>
          )}

          {relationship === 'pending_sent' && (
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 py-2 px-4 rounded-xl inline-flex items-center space-x-1.5">
              <Clock className="w-4 h-4" />
              <span>Votre demande d'ami est en attente de validation</span>
            </div>
          )}
        </div>
      ) : (
        // UNRESTRICTED VIEW: Publications & Reels Tabs
        <div>
          {/* Tabs Selector */}
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 mb-6 pb-2">
            <button
              onClick={() => setActiveContentTab('posts')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition ${
                activeContentTab === 'posts'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Publications ({posts.length})</span>
            </button>

            <button
              onClick={() => setActiveContentTab('reels')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition ${
                activeContentTab === 'reels'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Reels ({reels.length})</span>
            </button>
          </div>

          {/* Posts Tab Content */}
          {activeContentTab === 'posts' && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
                  <p className="text-sm font-semibold">Aucune publication pour l'instant.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={post.authorAvatar}
                          alt={post.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-teal-500"
                        />
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {post.authorName}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {post.category && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {post.category}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-2">
                      {post.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Post Attachments */}
                    {post.attachments && post.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-teal-500" />
                            <span className="font-semibold">{att.name}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Post Footer Stats */}
                    <div className="flex items-center space-x-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{post.likes?.length || 0} mentions j'aime</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post.comments?.length || 0} commentaires</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Reels Tab Content */}
          {activeContentTab === 'reels' && (
            <div>
              {reels.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
                  <p className="text-sm font-semibold">Aucun Reel publié pour l'instant.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {reels.map((reel) => (
                    <div
                      key={reel.id}
                      onClick={() => onOpenReelsView && onOpenReelsView()}
                      className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] cursor-pointer group shadow-sm hover:shadow-lg transition transform hover:-translate-y-1"
                    >
                      <video
                        src={reel.videoUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition flex flex-col justify-between p-2.5">
                        <div className="self-end bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                          {reel.duration}s
                        </div>
                        <div>
                          <p className="text-[11px] text-white font-bold line-clamp-2 mb-1">
                            {reel.caption || 'Reel'}
                          </p>
                          <div className="flex items-center space-x-2 text-[10px] text-pink-300 font-semibold">
                            <span className="flex items-center space-x-0.5">
                              <Heart className="w-3 h-3 fill-current" />
                              <span>{reel.likes.length}</span>
                            </span>
                            <span className="flex items-center space-x-0.5">
                              <MessageCircle className="w-3 h-3" />
                              <span>{reel.comments?.length || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
