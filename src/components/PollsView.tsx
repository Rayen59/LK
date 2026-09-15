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
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0c142b] border border-blue-100 dark:border-blue-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs shadow-2xs transition group cursor-pointer"
            title="Revenir à la page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-blue-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Revenir à la page précédente</span>
          </button>
        </div>
      )}

      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-[#0a163a] via-[#0d2358] to-[#0a163a] border border-blue-900/60 p-6 sm:p-7 rounded-3xl text-white shadow-lg shadow-blue-950/30">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-blue-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Consultations & Avis</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Sondages de la Communauté
          </h2>
          <p className="text-blue-200/80 text-xs sm:text-sm mt-1 max-w-xl">
            Sondez la communauté sur vos sujets préférés, organisez des votes et découvrez les avis en temps réel.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-500/30 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lancer un Sondage</span>
        </button>
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
          <span className="text-xs">Chargement des sondages...</span>
        </div>
      ) : polls.length === 0 ? (
        <div className="bg-white dark:bg-[#0c142b] rounded-3xl border border-blue-100 dark:border-blue-900 p-12 text-center shadow-xs">
          <BarChart3 className="w-12 h-12 text-blue-200 dark:text-blue-900 mx-auto mb-3" />
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
                className="bg-white dark:bg-[#0c142b] rounded-2xl border border-blue-100 dark:border-blue-900/80 p-5 sm:p-6 shadow-xs space-y-4"
              >
                {/* Poll Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{poll.question}</h3>
                    {poll.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{poll.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 shrink-0 ml-3">
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
                        className={`w-full relative overflow-hidden text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                          hasVotedThis
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                            : 'border-blue-100 dark:border-blue-950 hover:border-blue-300 dark:hover:border-blue-800 bg-blue-50/20 dark:bg-[#070d20]'
                        }`}
                      >
                        {/* Progress Bar Fill */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                            hasVotedThis ? 'bg-blue-200/70 dark:bg-blue-800/40' : 'bg-blue-100/60 dark:bg-blue-950/50'
                          }`}
                          style={{ width: `${percent}%` }}
                        />

                        {/* Content */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-bold ${hasVotedThis ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-100'}`}>
                              {opt.text}
                            </span>
                            {hasVotedThis && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs font-black text-blue-700 dark:text-blue-300">
                            <span>{percent}%</span>
                            <span className="text-[11px] text-slate-400 font-normal">({optionVotes})</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Poll Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-blue-50 dark:border-blue-950">
                  <div className="flex items-center space-x-2">
                    <img
                      src={poll.authorAvatar}
                      alt={poll.authorName}
                      className="w-5 h-5 rounded-full object-cover border border-blue-200 dark:border-blue-800"
                    />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Lancé par {poll.authorName}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0c142b] rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900 overflow-hidden">
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
                    className="w-full px-3.5 py-2 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Détails / Précisions (optionnel)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Précisions sur les choix, contexte..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Options de vote (min. 2)</label>
                    {options.length < 6 && (
                      <button
                        type="button"
                        onClick={addOptionInput}
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
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
                        className="flex-1 px-3 py-1.5 bg-blue-50/40 dark:bg-[#060b1b] border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionInput(i)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-blue-50 dark:border-blue-950">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
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
