import React, { useState, useEffect } from 'react';
import { User, DirectMessage } from '../types';
import { api } from '../lib/api';
import {
  X,
  Search,
  Send,
  Check,
  Forward,
  Image as ImageIcon,
  FileText,
  Volume2,
  Users,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface ForwardMessageModalProps {
  isOpen: boolean;
  message: DirectMessage | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: (targetUserIds: string[], count: number) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  message,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [recipients, setRecipients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUserIds([]);
      setSearchQuery('');
      setError(null);
      return;
    }

    const loadRecipients = async () => {
      setLoading(true);
      try {
        // Load conversations and friends to create a list of potential recipients
        const [convData, friendsData] = await Promise.allSettled([
          api.chat.getConversations(),
          api.friends.getAll()
        ]);

        const usersMap = new Map<string, User>();

        if (convData.status === 'fulfilled' && convData.value.conversations) {
          convData.value.conversations.forEach((c) => {
            if (c.partner && c.partner.id !== currentUser.id) {
              usersMap.set(c.partner.id, c.partner);
            }
          });
        }

        if (friendsData.status === 'fulfilled' && friendsData.value.friends) {
          friendsData.value.friends.forEach((f) => {
            if (f && f.id !== currentUser.id) {
              usersMap.set(f.id, f);
            }
          });
        }

        setRecipients(Array.from(usersMap.values()));
      } catch (err) {
        console.error('Failed to load recipients for forward', err);
      } finally {
        setLoading(false);
      }
    };

    loadRecipients();
  }, [isOpen, currentUser.id]);

  if (!isOpen || !message) return null;

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = recipients.filter((u) => {
    const fullName = `${u.prenom} ${u.nom} ${u.promo || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase().trim());
  });

  const handleForward = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      setForwarding(true);
      setError(null);
      const res = await api.chat.forwardMessage(message.id, selectedUserIds);
      onSuccess(selectedUserIds, res.forwardedCount || selectedUserIds.length);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du transfert du message.');
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-xs">
              <Forward className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Transférer le message
              </h3>
              <p className="text-[11px] text-slate-500">
                Sélectionnez un ou plusieurs contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="p-3.5 mx-4 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs shrink-0">
          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Forward className="w-3 h-3" />
            <span>Message à transférer</span>
          </div>

          {message.attachment && (
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {message.attachment.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />}
              {message.attachment.type === 'audio' && <Volume2 className="w-3.5 h-3.5 text-indigo-500" />}
              {message.attachment.type === 'document' && <FileText className="w-3.5 h-3.5 text-indigo-500" />}
              <span className="truncate">{message.attachment.name}</span>
            </div>
          )}

          {message.content && (
            <p className="text-slate-800 dark:text-slate-200 line-clamp-2 italic">
              « {message.content} »
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou promo..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {/* Recipients List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {loading ? (
            <div className="py-8 text-center text-slate-400 flex flex-col items-center">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mb-1.5" />
              <span className="text-xs">Chargement de vos contacts...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-semibold">Aucun contact trouvé</p>
              <p className="text-[11px] text-slate-500">
                {searchQuery ? 'Aucun résultat pour cette recherche' : 'Ajoutez des amis pour échanger facilement'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleSelectUser(user.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={user.avatarUrl}
                      alt={user.prenom}
                      className="w-9 h-9 rounded-full object-cover border border-indigo-500/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.prenom} {user.nom}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {user.promo || 'Membre LK'}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/50">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {selectedUserIds.length} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Annuler
            </button>
            <button
              onClick={handleForward}
              disabled={selectedUserIds.length === 0 || forwarding}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl flex items-center space-x-1.5 shadow-sm transition"
            >
              {forwarding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Transférer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
