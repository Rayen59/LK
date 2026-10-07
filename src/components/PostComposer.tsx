import React, { useState } from 'react';
import { User, Attachment } from '../types';
import { api, fileToDataUrl } from '../lib/api';
import { AudioRecorder } from './AudioRecorder';
import {
  FileText,
  Mic,
  Video,
  Image,
  Send,
  X,
  Tag,
  AlertCircle,
  Volume2,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PostComposerProps {
  currentUser: User;
  onPostCreated: () => void;
  initialAttachment?: Attachment | null;
  onClearInitialAttachment?: () => void;
}

const MEDICAL_TAGS = [
  'Événement',
  'Conférence',
  'Workshop',
  'Anatomie',
  'Physiologie',
  'Sémiologie',
  'Cardiologie',
  'Pédiatrie',
  'Chirurgie',
  'Pharmacologie',
  'Urgences',
  'Stage CHU Sfax',
  'Annales & QCM'
];

export const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  onPostCreated,
  initialAttachment,
  onClearInitialAttachment
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagsPicker, setShowTagsPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialAttachment) {
      setAttachments((prev) => [...prev, initialAttachment]);
      setIsExpanded(true);
      if (!content) {
        setContent('Capture d’écran réalisée par contrôle gestuel IA 📸');
      }
      if (onClearInitialAttachment) {
        onClearInitialAttachment();
      }
    }
  }, [initialAttachment, onClearInitialAttachment, content]);

  // Handle Document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      setError('Le document ne doit pas dépasser 30 Mo.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const newAtt: Attachment = {
        id: 'doc_' + Date.now(),
        name: file.name,
        type: 'document',
        url: dataUrl,
        size: file.size
      };
      setAttachments((prev) => [...prev, newAtt]);
      setIsExpanded(true);
      e.target.value = '';
    } catch {
      setError('Échec de la lecture du document.');
    }
  };

  // Handle Video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 35 * 1024 * 1024) {
      setError('La vidéo ne doit pas dépasser 35 Mo.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const newAtt: Attachment = {
        id: 'vid_' + Date.now(),
        name: file.name,
        type: 'video',
        url: dataUrl,
        size: file.size
      };
      setAttachments((prev) => [...prev, newAtt]);
      setIsExpanded(true);
      e.target.value = '';
    } catch {
      setError('Échec de la lecture de la vidéo.');
    }
  };

  // Handle Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 15 Mo.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const newAtt: Attachment = {
        id: 'img_' + Date.now(),
        name: file.name,
        type: 'image',
        url: dataUrl,
        size: file.size
      };
      setAttachments((prev) => [...prev, newAtt]);
      setIsExpanded(true);
      e.target.value = '';
    } catch {
      setError("Échec de la lecture de l'image.");
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setError(null);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else if (selectedTags.length < 4) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) {
      setError(
        'Veuillez rédiger un message ou joindre une photo, vidéo, vocal ou document avant de publier.'
      );
      return;
    }

    const finalContent =
      trimmed ||
      (attachments.some((a) => a.type === 'audio')
        ? 'Note vocale partagée par ' + currentUser.prenom + ' ' + currentUser.nom
        : 'Fichier partagé');

    setError(null);
    setSubmitting(true);

    try {
      await api.posts.create({
        content: finalContent,
        attachments,
        tags: selectedTags
      });

      setContent('');
      setAttachments([]);
      setSelectedTags([]);
      setShowTagsPicker(false);
      setShowAudioRecorder(false);
      setIsExpanded(false);
      onPostCreated();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la publication.');
    } finally {
      setSubmitting(false);
    }
  };

  const showFullEditor =
    isExpanded ||
    content.trim().length > 0 ||
    attachments.length > 0 ||
    selectedTags.length > 0 ||
    showAudioRecorder;

  return (
    <div className="w-full min-w-0 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden mb-3.5 transition-colors">
      <form onSubmit={handleSubmit} className="p-3 sm:p-4">
        {/* Top Row: Avatar + Clean Prompt / Textarea */}
        <div className="flex items-start space-x-2.5 sm:space-x-3">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.prenom}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
            referrerPolicy="no-referrer"
          />

          <div className="flex-1 min-w-0">
            {!showFullEditor ? (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-full text-left px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium transition cursor-pointer truncate"
              >
                Quoi de neuf, {currentUser.prenom} ?
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      {currentUser.prenom} {currentUser.nom}
                    </span>
                    <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full shrink-0">
                      {currentUser.promo || 'Membre'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!content.trim() && attachments.length === 0) {
                        setIsExpanded(false);
                        setShowTagsPicker(false);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                    title="Réduire"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  id="post-content-input"
                  rows={3}
                  autoFocus
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Quoi de neuf, ${currentUser.prenom} ? Partagez une publication, une photo, une vidéo ou un cours...`}
                  className="w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:border-blue-500 resize-none leading-relaxed transition"
                />
              </div>
            )}
          </div>
        </div>

        {/* Audio Recorder Module */}
        {showAudioRecorder && (
          <div className="mt-3">
            <AudioRecorder
              onAudioReady={(attachment) => {
                setAttachments((prev) => [...prev, attachment]);
                setShowAudioRecorder(false);
                setIsExpanded(true);
              }}
              onCancel={() => setShowAudioRecorder(false)}
            />
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {attachments.map((att) => {
              if (att.type === 'audio') {
                return (
                  <div
                    key={att.id}
                    className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2 col-span-1 sm:col-span-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 truncate">
                        <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-bold text-blue-950 dark:text-blue-200 truncate text-xs">
                          {att.name || 'Note vocale prête'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-white hover:bg-rose-50 dark:bg-slate-900 text-rose-600 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Retirer</span>
                      </button>
                    </div>
                    <audio controls src={att.url} className="w-full h-8 rounded-lg" />
                  </div>
                );
              }

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs min-w-0"
                >
                  <div className="flex items-center space-x-2 truncate pr-2 min-w-0">
                    {att.type === 'document' && (
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                    {att.type === 'video' && (
                      <Video className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                    {att.type === 'image' && (
                      <Image className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                      {att.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer shrink-0"
                    title="Retirer ce fichier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Tags Pills + Collapsible Tag Selector (Only when expanded) */}
        {showFullEditor && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setShowTagsPicker((prev) => !prev)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  {selectedTags.length > 0
                    ? `Sujets (${selectedTags.length}/4)`
                    : 'Ajouter un sujet / module'}
                </span>
                {showTagsPicker ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  <span>#{tag}</span>
                  <X className="w-3 h-3" />
                </span>
              ))}
            </div>

            {showTagsPicker && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-1.5">
                {MEDICAL_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 mt-2.5 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom Actions Bar — Clean, Balanced, Never Overflows */}
        <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/90">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar min-w-0">
            {/* Photo button */}
            <label
              className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition flex items-center space-x-1.5 text-xs font-bold shrink-0"
              title="Joindre une photo"
            >
              <Image className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {/* Video button */}
            <label
              className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition flex items-center space-x-1.5 text-xs font-bold shrink-0"
              title="Joindre une vidéo"
            >
              <Video className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Vidéo</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>

            {/* Vocal note button */}
            <button
              type="button"
              onClick={() => {
                setShowAudioRecorder((prev) => !prev);
                setIsExpanded(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 text-xs font-bold cursor-pointer shrink-0 ${
                showAudioRecorder
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Enregistrer une note vocale"
            >
              <Mic
                className={`w-4 h-4 shrink-0 ${
                  showAudioRecorder ? 'text-white' : 'text-blue-500'
                }`}
              />
              <span>Vocal</span>
            </button>

            {/* Document button */}
            <label
              className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition flex items-center space-x-1.5 text-xs font-bold shrink-0"
              title="Joindre un document (PDF, Word...)"
            >
              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="hidden xs:inline sm:inline">Doc</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleDocumentUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Submit button */}
          <button
            id="publish-btn"
            type="submit"
            disabled={submitting}
            onClick={() => {
              if (!showFullEditor) setIsExpanded(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? '...' : 'Publier'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
