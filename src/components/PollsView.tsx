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
  ArrowLeft
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top back navigation button */}
      {onGoBack && (
        <div className="mb-4">
          <button
            onClick={onGoBack}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 font-bold text-xs shadow-xs transition group"
            title="Revenir à la page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-teal-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Revenir à la page précédente</span>
          </button>
        </div>
      )}

      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Consultations & Avis</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Sondages de la Communauté MK
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Sondez la communauté sur vos sujets préférés, organisez des votes et découvrez les avis en temps réel.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Lancer un Sondage</span>
        </button>
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Chargement des sondages...</div>
      ) : polls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Aucun sondage en cours</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Soyez le premier à recueillir l'avis des membres sur un sujet d'actualité ou d'intérêt commun !
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {polls.map((poll) => {
            // Calculate total votes
            const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
            const userVotedOption = poll.options.find((opt) => opt.votes?.includes(currentUser.id));

            return (
              <div
                key={poll.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4"
              >
                {/* Poll Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{poll.question}</h3>
                    {poll.description && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{poll.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 flex-shrink-0 ml-3">
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
                            ? 'border-teal-500 bg-teal-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        {/* Progress Bar Fill */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                            hasVotedThis ? 'bg-teal-200/50' : 'bg-slate-200/60'
                          }`}
                          style={{ width: `${percent}%` }}
                        />

                        {/* Content */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-slate-800">{opt.text}</span>
                            {hasVotedThis && (
                              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                            <span>{percent}%</span>
                            <span className="text-[11px] text-slate-400 font-normal">({optionVotes})</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Poll Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <img
                      src={poll.authorAvatar}
                      alt={poll.authorName}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span>Lancé par {poll.authorName}</span>
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900 mb-1">Créer un Nouveau Sondage</h3>
              <p className="text-xs text-slate-500 mb-4">
                Posez une question à la communauté pour recueillir les avis en temps réel.
              </p>

              <form onSubmit={handleCreatePoll} className="space-y-4">
                {createError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Question du sondage *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Quel est votre prochain projet ou sujet préféré ?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Détails / Précisions (optionnel)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Précisions sur les choix, contexte..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Options de vote (min. 2)</label>
                    {options.length < 6 && (
                      <button
                        type="button"
                        onClick={addOptionInput}
                        className="text-xs text-teal-600 font-bold hover:underline"
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
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionInput(i)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
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
