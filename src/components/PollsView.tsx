import React, { useState, useEffect } from 'react';
import { Poll, User } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import {
  BarChart3,
  PlusCircle,
  CheckCircle2,
  Users,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface PollsViewProps {
  currentUser: User;
  onGoBack?: () => void;
}

export const PollsView: React.FC<PollsViewProps> = ({ currentUser, onGoBack }) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  // Create Poll State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadPolls();

    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'NEW_POLL') {
        setPolls((prev) => [payload, ...prev]);
      } else if (event === 'POLL_VOTED') {
        setPolls((prev) => prev.map((p) => (p.id === payload.id ? payload : p)));
      }
    });

    return () => unsubscribe();
  }, []);

  const loadPolls = async () => {
    try {
      const res = await api.polls.getAll();
      setPolls(res.polls || []);
    } catch (err) {
      console.error('Failed to load polls', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    setVotingId(pollId);
    try {
      const res = await api.polls.vote(pollId, optionId);
      setPolls((prev) => prev.map((p) => (p.id === pollId ? res.poll : p)));
    } catch (err) {
      console.error('Vote failed', err);
    } finally {
      setVotingId(null);
    }
  };

  const addOptionInput = () => {
    if (options.length < 6) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const removeOptionInput = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOptionText = (index: number, text: string) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setCreateError('Veuillez formuler la question du sondage.');
      return;
    }

    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      setCreateError('Le sondage doit comporter au moins 2 propositions de vote.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await api.polls.create({
        question: question.trim(),
        description: description.trim(),
        options: filledOptions,
      });

      setPolls((prev) => [res.poll, ...prev]);
      setShowCreateModal(false);
      setQuestion('');
      setDescription('');
      setOptions(['', '']);
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la création du sondage.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      
      {/* Back button */}
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

      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Consultations & Avis</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Sondages de la Communauté
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Sondez la communauté sur vos sujets préférés, organisez des votes et découvrez les avis en temps réel.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lancer un Sondage</span>
        </button>
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
          <span className="text-xs">Chargement des sondages...</span>
        </div>
      ) : polls.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-2xs">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Aucun sondage en cours</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Soyez le premier à recueillir l'avis des membres sur un sujet d'actualité ou d'intérêt commun !
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            // Calculate total votes
            const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
            const userVotedOption = poll.options.find((opt) => opt.votes?.includes(currentUser.id));

            return (
              <div
                key={poll.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4"
              >
                {/* Poll Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{poll.question}</h3>
                    {poll.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{poll.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50 shrink-0 ml-3">
                    {totalVotes} vote(s)
                  </span>
                </div>

                {/* Options and Live Bars */}
                <div className="space-y-2.5">
                  {poll.options.map((opt) => {
                    const optionVotes = opt.votes?.length || 0;
                    const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                    const hasVotedThis = opt.votes?.includes(currentUser.id);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleVote(poll.id, opt.id)}
                        disabled={votingId === poll.id}
                        className={`w-full relative overflow-hidden text-left p-3.5 rounded-xl border transition-all ${
                          hasVotedThis
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                            : 'border-slate-200 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
                        }`}
                      >
                        {/* Progress Bar Fill */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                            hasVotedThis ? 'bg-indigo-200/60 dark:bg-indigo-900/40' : 'bg-slate-200/60 dark:bg-slate-700/40'
                          }`}
                          style={{ width: `${percent}%` }}
                        />

                        {/* Content */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{opt.text}</span>
                            {hasVotedThis && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>{percent}%</span>
                            <span className="text-[11px] text-slate-400 font-normal">({optionVotes})</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Poll Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <img
                      src={poll.authorAvatar}
                      alt={poll.authorName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-slate-600 dark:text-slate-400">Lancé par {poll.authorName}</span>
                  </div>

                  <span>
                    {new Date(poll.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Créer un Nouveau Sondage</h3>
              <p className="text-xs text-slate-500 mb-4">
                Posez une question à la communauté pour recueillir les avis en temps réel.
              </p>

              <form onSubmit={handleCreatePoll} className="space-y-4">
                {createError && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Question du sondage *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Quel est votre prochain projet ou sujet préféré ?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Détails / Précisions (optionnel)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Précisions sur les choix, contexte..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Options de vote (min. 2)</label>
                    {options.length < 6 && (
                      <button
                        type="button"
                        onClick={addOptionInput}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        + Ajouter une option
                      </button>
                    )}
                  </div>

                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <input
                        type="text"
                        required
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => updateOptionText(i, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionInput(i)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
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
                    {creating ? 'Création...' : 'Lancer le sondage'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
