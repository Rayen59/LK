import React, { useState, useRef } from 'react';
import { User, Attachment } from '../types';
import { api, fileToDataUrl } from '../lib/api';
import { AudioRecorder } from './AudioRecorder';
import { FileText, Mic, Video, Image, Send, X, Tag, Paperclip, AlertCircle, Volume2, Upload, Trash2 } from 'lucide-react';

interface PostComposerProps {
  currentUser: User;
  onPostCreated: () => void;
}

const MEDICAL_TAGS = [
  'Anatomie',
  'Physiologie',
  'Sémiologie',
  'Cardiologie',
  'Pédiatrie',
  'Chirurgie',
  'Pharmacologie',
  'Gynécologie',
  'Urgences',
  'Stage CHU Sfax',
  'Annales & QCM',
];

export const PostComposer: React.FC<PostComposerProps> = ({ currentUser, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      setError("Le document ne doit pas dépasser 30 Mo.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const newAtt: Attachment = {
        id: 'doc_' + Date.now(),
        name: file.name,
        type: 'document',
        url: dataUrl,
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAtt]);
      e.target.value = '';
    } catch {
      setError("Échec de la lecture du document.");
    }
  };

  // Handle Direct Audio File upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("Le fichier vocal ne doit pas dépasser 25 Mo.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const newAtt: Attachment = {
        id: 'aud_' + Date.now(),
        name: file.name,
        type: 'audio',
        url: dataUrl,
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAtt]);
      setShowAudioRecorder(false);
      e.target.value = '';
    } catch {
      setError("Échec de la lecture du fichier vocal.");
    }
  };

  // Handle Video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 35 * 1024 * 1024) {
      setError("La vidéo ne doit pas dépasser 35 Mo.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const newAtt: Attachment = {
        id: 'vid_' + Date.now(),
        name: file.name,
        type: 'video',
        url: dataUrl,
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAtt]);
      e.target.value = '';
    } catch {
      setError("Échec de la lecture de la vidéo.");
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
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAtt]);
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
    } else {
      if (selectedTags.length < 4) {
        setSelectedTags((prev) => [...prev, tag]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-fill content if user shared a vocal or document without text
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) {
      setError("Veuillez rédiger un message ou enregistrer/joindre un vocal ou document avant de publier.");
      return;
    }

    const finalContent = trimmed || (attachments.some((a) => a.type === 'audio') 
      ? 'Note vocale partagée par ' + currentUser.prenom + ' ' + currentUser.nom
      : 'Fichier partagé');

    setError(null);
    setSubmitting(true);

    try {
      await api.posts.create({
        content: finalContent,
        attachments,
        tags: selectedTags,
      });

      setContent('');
      setAttachments([]);
      setSelectedTags([]);
      setShowAudioRecorder(false);
      onPostCreated();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la publication.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0c142b] rounded-2xl border border-blue-100 dark:border-blue-950 shadow-sm overflow-hidden mb-5 transition-colors">
      <form onSubmit={handleSubmit} className="p-4 sm:p-5">
        
        {/* Author Header */}
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.prenom}
            className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/50 shadow-2xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {currentUser.prenom} {currentUser.nom}
              </span>
              <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                {currentUser.promo || 'Membre'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Partager avec la communauté
            </p>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          id="post-content-input"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Quoi de neuf ? Partagez une réflexion, une photo, une vidéo, un vocal ou un cours..."
          className="w-full text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50/50 dark:bg-[#121c38]/50 p-3 rounded-xl border border-blue-50 dark:border-blue-950/80 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950 resize-none leading-relaxed transition"
        />

        {/* Audio Recorder Module */}
        {showAudioRecorder && (
          <div className="mt-3 mb-3">
            <AudioRecorder
              onAudioReady={(attachment) => {
                setAttachments((prev) => [...prev, attachment]);
                setShowAudioRecorder(false);
              }}
              onCancel={() => setShowAudioRecorder(false)}
            />
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 mb-3">
            {attachments.map((att) => {
              if (att.type === 'audio') {
                return (
                  <div
                    key={att.id}
                    className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2 col-span-1 sm:col-span-2"
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
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 transition cursor-pointer shrink-0"
                        title="Supprimer ce vocal"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                    {/* Live preview of recorded/uploaded audio */}
                    <audio controls src={att.url} className="w-full h-8 rounded-lg" />
                  </div>
                );
              }

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 bg-blue-50/40 dark:bg-[#121c38] border border-blue-100 dark:border-blue-900/60 rounded-xl text-xs"
                >
                  <div className="flex items-center space-x-2 truncate pr-2">
                    {att.type === 'document' && <FileText className="w-4 h-4 text-blue-600 shrink-0" />}
                    {att.type === 'video' && <Video className="w-4 h-4 text-indigo-500 shrink-0" />}
                    {att.type === 'image' && <Image className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">{att.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md text-xs font-medium transition cursor-pointer"
                    title="Supprimer ce fichier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Medical / Subject Tags Selector */}
        <div className="mt-3 pt-3 border-t border-blue-50 dark:border-blue-950">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-[11px] text-blue-900 dark:text-blue-300">Sujet / Module :</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MEDICAL_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                      : 'bg-blue-50/60 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900/60'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-blue-50 dark:border-blue-950">
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            
            {/* Vocal note button */}
            <button
              type="button"
              onClick={() => setShowAudioRecorder((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 text-xs font-semibold cursor-pointer ${
                showAudioRecorder
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60'
              }`}
              title="Enregistrer ou importer une note vocale"
            >
              <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Vocal</span>
            </button>

            {/* Document button */}
            <label className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer transition flex items-center space-x-1.5 text-xs font-medium" title="Joindre un document (PDF, Word...)">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Document</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleDocumentUpload}
                className="hidden"
              />
            </label>

            {/* Video button */}
            <label className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer transition flex items-center space-x-1.5 text-xs font-medium" title="Joindre une vidéo">
              <Video className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Vidéo</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>

            {/* Image button */}
            <label className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer transition flex items-center space-x-1.5 text-xs font-medium" title="Joindre une image">
              <Image className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Submit button */}
          <button
            id="publish-btn"
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Publier</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
