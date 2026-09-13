import React, { useState, useEffect } from 'react';
import { SpaceFolder, Post } from '../types';
import { api } from '../lib/api';
import { X, FolderPlus, Bookmark, Check, Folder, Sparkles } from 'lucide-react';

interface SaveToSpaceModalProps {
  post: Post;
  onClose: () => void;
  onSaved: () => void;
}

const SPACE_CATEGORIES = [
  'Favoris & Coups de cœur',
  'Photos & Médias',
  'Idées & Projets',
  'Culture & Découvertes',
  'Voyages & Sorties',
  'Musique & Vidéos',
  'Discussions importantes',
  'Général & Divers',
];

export const SaveToSpaceModal: React.FC<SaveToSpaceModalProps> = ({ post, onClose, onSaved }) => {
  const [spaces, setSpaces] = useState<SpaceFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // New Space creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(SPACE_CATEGORIES[0]);
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const res = await api.spaces.getAll();
      setSpaces(res.spaces || []);
    } catch (err) {
      console.error('Failed to load spaces', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveInSpace = async (space: SpaceFolder) => {
    const isAlreadySaved = space.postIds.includes(post.id);
    setSavingId(space.id);
    try {
      if (isAlreadySaved) {
        await api.spaces.removePost(space.id, post.id);
        setSpaces((prev) =>
          prev.map((s) =>
            s.id === space.id ? { ...s, postIds: s.postIds.filter((id) => id !== post.id) } : s
          )
        );
      } else {
        await api.spaces.addPost(space.id, post.id);
        setSpaces((prev) =>
          prev.map((s) =>
            s.id === space.id ? { ...s, postIds: [...s.postIds, post.id] } : s
          )
        );
      }
      onSaved();
    } catch (err) {
      console.error('Failed to update space', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await api.spaces.create({
        name: newName.trim(),
        category: newCategory,
        description: newDescription.trim(),
      });

      // Automatically add this post to the newly created space
      await api.spaces.addPost(res.space.id, post.id);
      res.space.postIds = [post.id];

      setSpaces((prev) => [...prev, res.space]);
      setShowCreateForm(false);
      setNewName('');
      setNewDescription('');
      onSaved();
    } catch (err) {
      console.error('Failed to create space', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">Enregistrer dans un Espace</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4">
            Classez cette publication dans vos dossiers personnels pour réviser avant les examens ou les tours de salle de stage.
          </p>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400">Chargement de vos espaces...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {spaces.length === 0 && !showCreateForm && (
                <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Folder className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Aucun espace de révision créé</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Créez votre premier dossier classé (ex: Sémiologie, Cardiologie...)
                  </p>
                </div>
              )}

              {spaces.map((space) => {
                const isSaved = space.postIds.includes(post.id);
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => toggleSaveInSpace(space)}
                    disabled={savingId === space.id}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSaved
                        ? 'bg-teal-50 border-teal-300 text-teal-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSaved ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">{space.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Catégorie: <span className="text-teal-700 font-semibold">{space.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {isSaved ? (
                        <span className="flex items-center space-x-1 text-xs font-bold text-teal-600 bg-teal-100/70 px-2 py-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                          <span>Enregistré</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium hover:text-slate-600">
                          Ajouter
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* New Space Form */}
          {showCreateForm ? (
            <form onSubmit={handleCreateSpace} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                  <FolderPlus className="w-4 h-4 text-teal-600" />
                  <span>Nouveau Dossier / Espace</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Fermer
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom du dossier *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mes coups de cœur"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Thématique / Dossier</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"
                >
                  {SPACE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Publications et médias sauvegardés..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1 text-slate-500 hover:bg-slate-200 rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer et Enregistrer'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-4 w-full flex items-center justify-center space-x-2 py-2.5 border border-dashed border-teal-500/60 hover:border-teal-600 text-teal-700 hover:bg-teal-50/50 rounded-xl text-xs font-bold transition"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Créer un nouvel espace de classement</span>
            </button>
          )}

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
            >
              Terminé
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
