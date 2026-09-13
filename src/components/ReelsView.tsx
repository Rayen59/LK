import React, { useState, useEffect, useRef } from 'react';
import { User, Reel, ReelComment } from '../types';
import { api, fileToDataUrl } from '../lib/api';
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Edit2,
  X,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Film,
  UserCheck,
  Shield,
  Loader2,
  ArrowLeft
} from 'lucide-react';

interface ReelsViewProps {
  currentUser: User;
  onOpenUserProfile: (userId: string) => void;
  onOpenChatWithUser?: (userId: string) => void;
  onGoBack?: () => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  currentUser,
  onOpenUserProfile,
  onOpenChatWithUser,
  onGoBack
}) => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Comment Drawer
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Create Reel Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [caption, setCaption] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submittingReel, setSubmittingReel] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Reel Modal
  const [editingReel, setEditingReel] = useState<Reel | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editTags, setEditTags] = useState('');
  const [updatingReel, setUpdatingReel] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Load Reels
  const loadReels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.reels.getAll();
      setReels(data.reels || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des Reels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels();
  }, []);

  const currentReel = reels[activeReelIndex] || null;

  // Handle video element play/pause
  useEffect(() => {
    const video = currentReel ? videoRefs.current[currentReel.id] : null;
    if (video) {
      if (isPlaying) {
        video.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        video.pause();
      }
    }
  }, [activeReelIndex, isPlaying, currentReel]);

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    const video = currentReel ? videoRefs.current[currentReel.id] : null;
    if (video) {
      video.muted = !isMuted;
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  const handleLike = async (reelId: string) => {
    try {
      const res = await api.reels.like(reelId);
      setReels((prev) =>
        prev.map((r) => (r.id === reelId ? { ...r, likes: res.likes } : r))
      );
    } catch (err: any) {
      console.error('Error liking reel:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentReel) return;

    try {
      setSubmittingComment(true);
      setCommentError(null);
      const res = await api.reels.comment(currentReel.id, commentText.trim());
      setReels((prev) =>
        prev.map((r) => (r.id === currentReel.id ? { ...r, comments: res.comments } : r))
      );
      setCommentText('');
    } catch (err: any) {
      setCommentError(err.message || 'Erreur lors de l’envoi du commentaire.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce Reel ?')) return;
    try {
      await api.reels.delete(reelId);
      setReels((prev) => prev.filter((r) => r.id !== reelId));
      if (activeReelIndex >= reels.length - 1 && activeReelIndex > 0) {
        setActiveReelIndex((idx) => idx - 1);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
    }
  };

  // Video file picker and duration checking (< 60s)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreateError(null);

    // Create temp URL to check duration
    const tempUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = tempUrl;

    tempVideo.onloadedmetadata = () => {
      window.URL.revokeObjectURL(tempUrl);
      const duration = tempVideo.duration;
      setVideoDuration(Math.round(duration));

      if (duration > 60) {
        setCreateError(
          `Ce fichier dure ${Math.round(duration)} secondes. La durée maximale autorisée pour un Reel est de 60 secondes.`
        );
        setVideoFile(null);
        setVideoPreviewUrl(null);
        return;
      }

      setVideoFile(file);
      fileToDataUrl(file).then((dataUrl) => {
        setVideoPreviewUrl(dataUrl);
      });
    };

    tempVideo.onerror = () => {
      setCreateError('Format vidéo non supporté ou fichier illisible.');
    };
  };

  const handleCreateReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPreviewUrl) {
      setCreateError('Veuillez sélectionner une vidéo.');
      return;
    }

    if (videoDuration > 60) {
      setCreateError('La durée maximale autorisée pour un Reel est de 60 secondes.');
      return;
    }

    try {
      setSubmittingReel(true);
      setCreateError(null);

      const tags = tagsInput
        .split(/[\s,#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const res = await api.reels.create({
        videoUrl: videoPreviewUrl,
        caption: caption.trim(),
        duration: videoDuration,
        tags
      });

      setReels((prev) => [res.reel, ...prev]);
      setActiveReelIndex(0);
      setIsCreateModalOpen(false);
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setCaption('');
      setTagsInput('');
      setVideoDuration(0);
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la publication du Reel.');
    } finally {
      setSubmittingReel(false);
    }
  };

  const handleEditReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReel) return;

    try {
      setUpdatingReel(true);
      setEditError(null);

      const tags = editTags
        .split(/[\s,#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const res = await api.reels.update(editingReel.id, {
        caption: editCaption.trim(),
        tags
      });

      setReels((prev) => prev.map((r) => (r.id === editingReel.id ? res.reel : r)));
      setEditingReel(null);
    } catch (err: any) {
      setEditError(err.message || 'Erreur lors de la modification.');
    } finally {
      setUpdatingReel(false);
    }
  };

  // Preset sample videos if no reels exist yet
  const handleCreateSampleReel = async () => {
    try {
      setLoading(true);
      const sampleReel = await api.reels.create({
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        caption: 'Bienvenue sur les Reels Pulse Social ! Partagez vos moments courts, astuces et découvertes en moins de 60s 🚀',
        duration: 15,
        tags: ['bienvenue', 'reels', 'pulsesocial']
      });
      setReels([sampleReel.reel]);
      setActiveReelIndex(0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-2 sm:px-4">
      {/* Top Bar with Action Button */}
      <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-2">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-pink-50 dark:bg-slate-800 dark:hover:bg-pink-950/40 text-slate-700 dark:text-slate-300 hover:text-pink-600 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 text-xs font-bold transition shrink-0 group"
              title="Revenir à la page précédente"
            >
              <ArrowLeft className="w-4 h-4 text-pink-500 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Retour</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20 shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="truncate">Reels Vidéo</span>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 shrink-0">
                &lt; 60 sec
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              Vidéos courtes, format immersif et modération par IA
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-pink-600/30 transition transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Reel</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-3" />
          <p className="text-sm font-semibold">Chargement des Reels...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto my-8 shadow-sm">
          <div className="w-16 h-16 bg-pink-50 dark:bg-pink-950/40 text-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-200 dark:border-pink-800">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Aucun Reel publié pour l'instant
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Soyez le premier à partager une vidéo de moins de 60 secondes avec vos amis et la communauté !
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm shadow-md transition"
            >
              Publier un Reel
            </button>
            <button
              onClick={handleCreateSampleReel}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Ajouter un Reel d'exemple
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Main Vertical Video Container */}
          <div className="relative w-full max-w-[400px] mx-auto h-[620px] sm:h-[680px] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center select-none">
            {currentReel && (
              <>
                {/* Video Element */}
                <video
                  ref={(el) => (videoRefs.current[currentReel.id] = el)}
                  src={currentReel.videoUrl}
                  className="w-full h-full object-cover cursor-pointer"
                  loop
                  playsInline
                  autoPlay
                  muted={isMuted}
                  onClick={togglePlayPause}
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Top Progress bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/20 z-20">
                  <div
                    className="h-full bg-pink-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Top info badge */}
                <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-pink-400" />
                  <span>{currentReel.duration}s max</span>
                </div>

                {/* Sound toggle button */}
                <button
                  onClick={toggleMute}
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition border border-white/10"
                  title={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Play/Pause overlay icon when paused */}
                {!isPlaying && (
                  <div
                    onClick={togglePlayPause}
                    className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg animate-pulse">
                      <Play className="w-8 h-8 ml-1" />
                    </div>
                  </div>
                )}

                {/* Right Side Interaction Bar (Likes, Comments, Share, Author Actions) */}
                <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center space-y-4">
                  {/* Like Button */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => handleLike(currentReel.id)}
                      className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition transform active:scale-75 shadow-lg ${
                        currentReel.likes.includes(currentUser.id)
                          ? 'bg-rose-500 text-white shadow-rose-500/50'
                          : 'bg-black/50 text-white hover:bg-black/70 border border-white/20'
                      }`}
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          currentReel.likes.includes(currentUser.id) ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-white mt-1 drop-shadow-md">
                      {currentReel.likes.length}
                    </span>
                  </div>

                  {/* Comments Button */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setIsCommentsOpen(true)}
                      className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition border border-white/20 shadow-lg"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    <span className="text-xs font-bold text-white mt-1 drop-shadow-md">
                      {currentReel.comments?.length || 0}
                    </span>
                  </div>

                  {/* Author Edit/Delete actions if owner or admin */}
                  {(currentReel.authorId === currentUser.id || currentUser.role === 'admin') && (
                    <div className="flex flex-col items-center space-y-2 pt-2 border-t border-white/20">
                      <button
                        onClick={() => {
                          setEditingReel(currentReel);
                          setEditCaption(currentReel.caption);
                          setEditTags(currentReel.tags ? currentReel.tags.join(', ') : '');
                        }}
                        className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-amber-300 hover:bg-black/80 transition"
                        title="Modifier la légende"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteReel(currentReel.id)}
                        className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-rose-400 hover:bg-black/80 transition"
                        title="Supprimer ce Reel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Overlay Info (Author, Caption, Tags) */}
                <div className="absolute left-0 right-16 bottom-0 p-4 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <div
                    onClick={() => onOpenUserProfile(currentReel.authorId)}
                    className="flex items-center space-x-2.5 cursor-pointer group mb-2"
                  >
                    <img
                      src={currentReel.authorAvatar}
                      alt={currentReel.authorName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-pink-500 group-hover:scale-105 transition shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white group-hover:text-pink-400 transition truncate">
                        {currentReel.authorName}
                      </h4>
                      <p className="text-[11px] text-pink-300 font-medium truncate">
                        {currentReel.authorPromo || 'Membre Pulse'}
                      </p>
                    </div>
                  </div>

                  {currentReel.caption && (
                    <p className="text-xs sm:text-sm text-white/95 leading-snug line-clamp-3 mb-2 font-medium drop-shadow-sm">
                      {currentReel.caption}
                    </p>
                  )}

                  {currentReel.tags && currentReel.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {currentReel.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Carousel Navigation Arrows */}
                {activeReelIndex > 0 && (
                  <button
                    onClick={() => {
                      setActiveReelIndex((prev) => prev - 1);
                      setProgress(0);
                    }}
                    className="absolute top-1/2 left-2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition border border-white/20"
                    title="Reel précédent"
                  >
                    ▲
                  </button>
                )}

                {activeReelIndex < reels.length - 1 && (
                  <button
                    onClick={() => {
                      setActiveReelIndex((prev) => prev + 1);
                      setProgress(0);
                    }}
                    className="absolute bottom-24 left-2 z-30 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition border border-white/20"
                    title="Reel suivant"
                  >
                    ▼
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right Playlist / Thumbnails list on desktop */}
          <div className="hidden lg:flex flex-col w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm h-[680px]">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Tous les Reels ({reels.length})</span>
              <span className="text-[10px] font-bold text-pink-600 bg-pink-50 dark:bg-pink-950/50 px-2 py-0.5 rounded-full">
                Flux actif
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {reels.map((reel, idx) => (
                <div
                  key={reel.id}
                  onClick={() => {
                    setActiveReelIndex(idx);
                    setProgress(0);
                    setIsPlaying(true);
                  }}
                  className={`flex items-center space-x-3 p-2.5 rounded-2xl cursor-pointer transition ${
                    activeReelIndex === idx
                      ? 'bg-pink-50 dark:bg-pink-950/40 border border-pink-300 dark:border-pink-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="relative w-12 h-16 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-700">
                    <video
                      src={reel.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {reel.authorName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {reel.caption || 'Sans légende'}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-pink-600 dark:text-pink-400 font-semibold mt-1">
                      <span>{reel.duration}s</span>
                      <span>•</span>
                      <span>{reel.likes.length} likes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Comments Drawer */}
      {isCommentsOpen && currentReel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            onClick={() => setIsCommentsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-pink-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Commentaires ({currentReel.comments?.length || 0})
                </h3>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Moderation Badge */}
            <div className="flex items-center space-x-1.5 my-2.5 px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-[11px] text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900/50">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <span>
                Protection active : l'IA supprime immédiatement tout commentaire intolérant ou agressif.
              </span>
            </div>

            {commentError && (
              <div className="mb-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{commentError}</span>
              </div>
            )}

            {/* Comments Stream */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {(!currentReel.comments || currentReel.comments.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Aucun commentaire. Soyez le premier à réagir !
                </div>
              ) : (
                currentReel.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <img
                      src={comment.userAvatar}
                      alt={comment.userName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
                      onClick={() => {
                        setIsCommentsOpen(false);
                        onOpenUserProfile(comment.userId);
                      }}
                    />
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          onClick={() => {
                            setIsCommentsOpen(false);
                            onOpenUserProfile(comment.userId);
                          }}
                          className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:text-pink-500"
                        >
                          {comment.userName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ajouter un commentaire..."
                disabled={submittingComment}
                className="flex-1 py-2.5 px-3.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-pink-500"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="p-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white transition flex items-center justify-center"
              >
                {submittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Créer un Reel */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            onClick={() => setIsCreateModalOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Film className="w-5 h-5 text-pink-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Publier un nouveau Reel (&lt; 60s)
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Control Notice */}
            <div className="my-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start space-x-2.5">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold">Modération IA stricte :</span> Les propos intolérants, discriminatoires ou agressifs dans la légende sont immédiatement bloqués. Durée vidéo max : 60 secondes.
              </div>
            </div>

            {createError && (
              <div className="mb-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateReelSubmit} className="space-y-4">
              {/* Video upload input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fichier Vidéo (MP4, WebM - Max 60 secondes) *
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 dark:file:bg-pink-950/50 dark:file:text-pink-300 cursor-pointer"
                />
              </div>

              {/* Video preview if selected */}
              {videoPreviewUrl && (
                <div className="relative w-44 h-64 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-pink-500 shadow-md">
                  <video
                    src={videoPreviewUrl}
                    className="w-full h-full object-cover"
                    controls
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white">
                    {videoDuration}s / 60s
                  </div>
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Légende du Reel
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Décrivez votre Reel..."
                  rows={3}
                  className="w-full p-3 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-pink-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tags (séparés par des virgules ou espaces)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="ex: cours, astuce, motivation, projet"
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingReel || !videoPreviewUrl}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center space-x-1.5"
                >
                  {submittingReel ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse IA & Publication...</span>
                    </>
                  ) : (
                    <span>Publier le Reel</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modifier son Reel */}
      {editingReel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            onClick={() => setEditingReel(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Modifier mon Reel
              </h3>
              <button
                onClick={() => setEditingReel(null)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="my-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditReelSubmit} className="space-y-4 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nouvelle légende
                </label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingReel(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={updatingReel}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md flex items-center space-x-1.5"
                >
                  {updatingReel ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Enregistrer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
