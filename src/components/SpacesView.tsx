import React, { useState, useEffect } from 'react';
import { SpaceFolder, Post, User } from '../types';
import { api } from '../lib/api';
import {
  Folder,
  FolderPlus,
  Bookmark,
  Trash2,
  FileText,
  Volume2,
  Film,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Search,
  Tag,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface SpacesViewProps {
  currentUser: User;
  allPosts: Post[];
  onRefresh: () => void;
  onGoBack?: () => void;
}

const CATEGORIES = [
  'Toutes les catégories',
  'Favoris & Coups de cœur',
  'Photos & Médias',
  'Idées & Projets',
  'Culture & Découvertes',
  'Voyages & Sorties',
  'Musique & Vidéos',
  'Discussions importantes',
  'Général & Divers',
];

export const SpacesView: React.FC<SpacesViewProps> = ({ currentUser, allPosts, onRefresh, onGoBack }) => {
  const [spaces, setSpaces] = useState<SpaceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<SpaceFolder | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('Toutes les catégories');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [spaceToDelete, setSpaceToDelete] = useState<SpaceFolder | null>(null);
  const [deletingSpace, setDeletingSpace] = useState(false);

  // New Space Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const res = await api.spaces.getAll();
      setSpaces(res.spaces || []);
      if (res.spaces && res.spaces.length > 0 && !selectedSpace) {
        setSelectedSpace(res.spaces[0]);
      }
    } catch (err) {
      console.error('Failed to fetch spaces', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await api.spaces.create({
        name: name.trim(),
        category,
        description: description.trim(),
      });
      setSpaces((prev) => [...prev, res.space]);
      setSelectedSpace(res.space);
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err) {
      console.error('Create space error', err);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDeleteSpace = async () => {
    if (!spaceToDelete) return;
    const spaceId = spaceToDelete.id;
    setDeletingSpace(true);
    try {
      await api.spaces.delete(spaceId);
      setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
      if (selectedSpace?.id === spaceId) {
        setSelectedSpace(null);
      }
      setSpaceToDelete(null);
    } catch (err) {
      console.error('Delete space error', err);
    } finally {
      setDeletingSpace(false);
    }
  };

  const handleRemovePostFromSpace = async (spaceId: string, postId: string) => {
    try {
      await api.spaces.removePost(spaceId, postId);
      setSpaces((prev) =>
        prev.map((s) => (s.id === spaceId ? { ...s, postIds: s.postIds.filter((id) => id !== postId) } : s))
      );
      if (selectedSpace?.id === spaceId) {
        setSelectedSpace((prev) => (prev ? { ...prev, postIds: prev.postIds.filter((id) => id !== postId) } : null));
      }
    } catch (err) {
      console.error('Remove post error', err);
    }
  };

  const filteredSpaces = spaces.filter((s) => {
    if (categoryFilter === 'Toutes les catégories') return true;
    return s.category === categoryFilter;
  });

  // Get posts inside selected space
  const currentSpacePosts = selectedSpace
    ? allPosts.filter((p) => selectedSpace.postIds.includes(p.id))
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Top back navigation button */}
      {onGoBack && (
        <div className="mb-4">
          <button
            onClick={onGoBack}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs shadow-2xs transition group"
            title="Revenir à la page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Revenir à la page précédente</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            <Bookmark className="w-4 h-4" />
            <span>Organisation Personnelle</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Mes Espaces & Dossiers
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Enregistrez et classez les publications, photos, vocaux et fichiers par thématique ou projet personnel.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Nouvel Espace</span>
        </button>
      </div>

      {/* Main Layout: Left Sidebar for Spaces + Right Panel for Saved Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Folders List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Catégorie :
              </span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Dossiers créés ({filteredSpaces.length})</span>
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-1" />
                <span className="text-xs">Chargement...</span>
              </div>
            ) : filteredSpaces.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Folder className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aucun espace dans cette catégorie</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Cliquez sur "Nouvel Espace" pour commencer à classer.
                </p>
              </div>
            ) : (
              filteredSpaces.map((space) => {
                const isSelected = selectedSpace?.id === space.id;
                return (
                  <div
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'}`}>
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{space.name}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          {space.category} • {space.postIds.length} fichier(s)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpaceToDelete(space);
                        }}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${
                          isSelected ? 'text-indigo-200 hover:text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Supprimer cet espace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Display Posts in Selected Space */}
        <div className="lg:col-span-2">
          {selectedSpace ? (
            <div className="space-y-4">
              {/* Space Header Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedSpace(null)}
                      className="inline-flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold mr-1 group"
                      title="Revenir à tous les espaces"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Tous les espaces</span>
                    </button>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
                      {selectedSpace.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedSpace.postIds.length} publication(s)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedSpace.name}</h3>
                  {selectedSpace.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedSpace.description}</p>
                  )}
                </div>
              </div>

              {/* Saved Posts List */}
              {currentSpacePosts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
                  <Bookmark className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Cet espace est encore vide</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Depuis le fil d'actualité, cliquez sur "Classer dans un espace" sur n'importe quel contenu pour l'ajouter ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentSpacePosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={post.authorAvatar}
                            alt={post.authorName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{post.authorName}</span>
                            {post.authorPromo && (
                              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full ml-2 border border-indigo-100 dark:border-indigo-900/40">
                                {post.authorPromo}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemovePostFromSpace(selectedSpace.id, post.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 flex items-center space-x-1 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition"
                          title="Retirer de cet espace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Retirer</span>
                        </button>
                      </div>

                      {post.content && (
                        <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {post.content}
                        </p>
                      )}

                      {/* Attachments inside saved post */}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {post.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                {att.type === 'document' && <FileText className="w-4 h-4 text-blue-500" />}
                                {att.type === 'audio' && <Volume2 className="w-4 h-4 text-indigo-500" />}
                                {att.type === 'video' && <Film className="w-4 h-4 text-purple-500" />}
                                <span className="truncate font-medium text-slate-700 dark:text-slate-300">{att.name}</span>
                              </div>
                              <a
                                href={att.url}
                                download={att.name}
                                className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Ouvrir</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Folder className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Sélectionnez un espace</h4>
              <p className="text-xs text-slate-500 mt-1">
                Choisissez un dossier dans la liste de gauche ou créez-en un nouveau.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal to create a new space */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Créer un nouvel Espace</h3>
              <p className="text-xs text-slate-500 mb-4">
                Structurez vos sauvegardes par catégorie ou projet.
              </p>

              <form onSubmit={handleCreateSpace} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nom du dossier *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Idées Design & Code"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Classification</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'Toutes les catégories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description (optionnel)</label>
                  <textarea
                    rows={2}
                    placeholder="Objectif de cet espace, projet, thématique..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {creating ? 'Création...' : 'Créer l’espace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Space Modal */}
      {spaceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Supprimer cet espace ?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Voulez-vous vraiment supprimer "{spaceToDelete.name}" ? Les publications d'origine ne seront pas supprimées.
            </p>

            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={() => setSpaceToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingSpace}
                onClick={handleConfirmDeleteSpace}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                {deletingSpace ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
