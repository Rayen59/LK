import React, { useState } from 'react';
import { Post, Attachment, AttachmentType } from '../types';
import {
  FileText,
  Search,
  Download,
  FileSpreadsheet,
  Mic,
  Video,
  Image as ImageIcon,
  X,
  ExternalLink,
  Calendar,
  Filter,
  User as UserIcon,
  Play
} from 'lucide-react';

interface DocumentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
}

export const DocumentSearchModal: React.FC<DocumentSearchModalProps> = ({
  isOpen,
  onClose,
  posts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AttachmentType>('all');

  if (!isOpen) return null;

  // Extract all attachments with parent post info
  const allDocuments = posts.flatMap((post) =>
    (post.attachments || []).map((att) => ({
      ...att,
      postAuthor: post.authorName,
      postPromo: post.authorPromo,
      postAuthorAvatar: post.authorAvatar,
      postCreatedAt: post.createdAt,
      postContent: post.content,
      postId: post.id,
    }))
  );

  const filteredDocs = allDocuments.filter((doc) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      doc.name.toLowerCase().includes(query) ||
      doc.postAuthor.toLowerCase().includes(query) ||
      doc.postPromo.toLowerCase().includes(query) ||
      doc.postContent.toLowerCase().includes(query);

    const matchesType = typeFilter === 'all' || doc.type === typeFilter;

    return matchesSearch && matchesType;
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

  const getFormatBadge = (type: AttachmentType) => {
    switch (type) {
      case 'document':
        return 'Document / PDF';
      case 'audio':
        return 'Vocal / Audio';
      case 'video':
        return 'Vidéo';
      case 'image':
        return 'Image';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Recherche de Documents & Fichiers
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fichiers, images, vocaux et documents partagés sur MK ({allDocuments.length} fichier{allDocuments.length > 1 ? 's' : ''})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Type Filter */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Chercher un fichier (ex: nom du document, auteur, mot-clé)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                typeFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tous les fichiers ({allDocuments.length})
            </button>
            <button
              onClick={() => setTypeFilter('document')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
                typeFilter === 'document'
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents & PDF</span>
            </button>
            <button
              onClick={() => setTypeFilter('audio')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
                typeFilter === 'audio'
                  ? 'bg-sky-600 text-white'
                  : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Notes Vocales</span>
            </button>
            <button
              onClick={() => setTypeFilter('video')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
                typeFilter === 'video'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Vidéos</span>
            </button>
            <button
              onClick={() => setTypeFilter('image')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
                typeFilter === 'image'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Images</span>
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Aucun document ne correspond à votre recherche
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Partagez des fichiers, polycopiés ou vocaux dans le fil d'actualité pour les retrouver instantanément ici.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-400 dark:hover:border-teal-600 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getIconForType(doc.type)}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                        {doc.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {getFormatBadge(doc.type)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {doc.postAuthor}
                      </span>
                      <span>({doc.postPromo})</span>
                      <span>•</span>
                      <span>
                        {new Date(doc.postCreatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {doc.postContent && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
                        "{doc.postContent}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Download / Open Action */}
                <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                  <a
                    href={doc.url}
                    download={doc.name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
