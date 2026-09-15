import React, { useState } from 'react';
import { Post, Attachment } from '../types';
import { api } from '../lib/api';
import { X, Check, AlertCircle, Volume2, FileText, Video, Image, Trash2 } from 'lucide-react';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSaved: (updatedPost: Post) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose, onSaved }) => {
  const [content, setContent] = useState(post.content);
  const [attachments, setAttachments] = useState<Attachment[]>(post.attachments || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) {
      setError("La publication ne peut pas être entièrement vide (ajoutez du texte ou conservez une pièce jointe).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await api.posts.update(post.id, {
        content: content.trim(),
        attachments: attachments,
      });
      onSaved(res.post);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la modification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c142b] rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-[#0a163a]">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Modifier la publication</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-300 p-2.5 rounded-xl border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Texte de la publication
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3.5 bg-blue-50/30 dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#0c142b] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition resize-none"
              placeholder="Éditer votre texte..."
            />
          </div>

          {/* Manage Attachments (especially vocals) */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pièces jointes & Vocaux associés ({attachments.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {attachments.map((att) => {
                  if (att.type === 'audio') {
                    return (
                      <div
                        key={att.id}
                        className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">
                              {att.name || 'Note Vocale'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-900 transition cursor-pointer shrink-0"
                            title="Supprimer cette note vocale de la publication"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer ce vocal</span>
                          </button>
                        </div>
                        <audio controls src={att.url} className="w-full h-8 rounded-lg" />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 bg-blue-50/30 dark:bg-slate-800 border border-blue-100 dark:border-blue-900 rounded-xl text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        {att.type === 'document' && <FileText className="w-4 h-4 text-blue-600 shrink-0" />}
                        {att.type === 'video' && <Video className="w-4 h-4 text-blue-600 shrink-0" />}
                        {att.type === 'image' && <Image className="w-4 h-4 text-blue-600 shrink-0" />}
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{att.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="inline-flex items-center space-x-1 px-2 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg font-semibold transition cursor-pointer"
                        title="Retirer cette pièce jointe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-blue-100 dark:border-blue-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Enregistrement...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
