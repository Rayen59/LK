import React, { useState, useEffect } from 'react';
import { Quiz, QuizQuestion, QuizSubmission, User } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import {
  BookOpen,
  Award,
  PlusCircle,
  CheckCircle,
  XCircle,
  Trophy,
  Medal,
  Clock,
  Sparkles,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Check,
  RotateCcw,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface QuizViewProps {
  currentUser: User;
  onGoBack?: () => void;
}

const GENERAL_SUBJECTS = [
  'Tous les thèmes',
  'Culture Générale',
  'Cinéma & Séries',
  'Musique & Art',
  'Sciences & Innovations',
  'Histoire & Géographie',
  'Sport & Loisirs',
  'Technologie & Web',
  'Voyages & Monde',
];

export const QuizView: React.FC<QuizViewProps> = ({ currentUser, onGoBack }) => {
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'create' | 'leaderboard'>('browse');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Active quiz being taken
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Leaderboard state
  const [leaderboardQuizId, setLeaderboardQuizId] = useState<string>('global');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Create Quiz form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(GENERAL_SUBJECTS[1]);
  const [questions, setQuestions] = useState<
    Array<{
      question: string;
      points: number;
      explanation: string;
      options: Array<{ id: string; text: string; isCorrect: boolean }>;
    }>
  >([
    {
      question: '',
      points: 2,
      explanation: '',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
        { id: 'opt_4', text: '', isCorrect: false },
      ],
    },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadQuizzes();

    const unsubscribe = subscribeToLiveUpdates((event) => {
      if (event === 'NEW_QUIZ' || event === 'QUIZ_SUBMITTED') {
        loadQuizzes();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [activeSubTab, leaderboardQuizId]);

  const loadQuizzes = async () => {
    try {
      const res = await api.quizzes.getAll();
      setQuizzes(res.quizzes || []);
    } catch (err) {
      console.error('Failed to load quizzes', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      if (leaderboardQuizId === 'global') {
        const res = await api.quizzes.getGlobalLeaderboard();
        setLeaderboardData(res.leaderboard || []);
      } else {
        const res = await api.quizzes.getLeaderboard(leaderboardQuizId);
        setLeaderboardData(res.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const toggleOptionSelection = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => {
      const current = prev[questionId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
      } else {
        return { ...prev, [questionId]: [...current, optionId] };
      }
    });
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmittingQuiz(true);
    setSubmitError(null);

    try {
      const res = await api.quizzes.submit(activeQuiz.id, userAnswers);
      setQuizResult(res);
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de la soumission du quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Quiz Builder functions
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question: '',
        points: 2,
        explanation: '',
        options: [
          { id: `opt_${Date.now()}_1`, text: '', isCorrect: true },
          { id: `opt_${Date.now()}_2`, text: '', isCorrect: false },
          { id: `opt_${Date.now()}_3`, text: '', isCorrect: false },
          { id: `opt_${Date.now()}_4`, text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index].question = text;
      return updated;
    });
  };

  const updateQuestionPoints = (index: number, points: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index].points = points;
      return updated;
    });
  };

  const updateQuestionExplanation = (index: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index].explanation = text;
      return updated;
    });
  };

  const updateOptionText = (qIndex: number, optIdx: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex].options[optIdx].text = text;
      return updated;
    });
  };

  const toggleOptionCorrectness = (qIndex: number, optIdx: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex].options[optIdx].isCorrect = !updated[qIndex].options[optIdx].isCorrect;
      return updated;
    });
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setCreateError('Le titre du quiz est obligatoire.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setCreateError(`La question #${i + 1} est vide.`);
        return;
      }
      const hasCorrect = q.options.some((o) => o.isCorrect && o.text.trim());
      if (!hasCorrect) {
        setCreateError(`La question #${i + 1} doit comporter au moins une réponse exacte avec du texte.`);
        return;
      }
    }

    setCreating(true);
    setCreateError(null);

    try {
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      const res = await api.quizzes.create({
        title: title.trim(),
        description: description.trim(),
        subject,
        totalPoints,
        questions: questions.map((q, idx) => ({
          id: `q_${Date.now()}_${idx}`,
          question: q.question.trim(),
          points: q.points || 1,
          explanation: q.explanation.trim(),
          options: q.options.filter((o) => o.text.trim()).map((o) => ({
            id: o.id,
            text: o.text.trim(),
            isCorrect: o.isCorrect,
          })),
        })),
      });

      setQuizzes((prev) => [res.quiz, ...prev]);
      setActiveSubTab('browse');
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la publication du quiz.');
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

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Défis & Connaissances</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Quiz & Classement
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Créez des quiz avec barème et réponses exactes, testez vos connaissances et visualisez le tableau d'honneur des meilleurs scores.
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60">
          <button
            onClick={() => { setActiveSubTab('browse'); setActiveQuiz(null); setQuizResult(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'browse' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Les Quiz
          </button>
          <button
            onClick={() => { setActiveSubTab('create'); setActiveQuiz(null); setQuizResult(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'create' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Créer un Quiz
          </button>
          <button
            onClick={() => { setActiveSubTab('leaderboard'); setActiveQuiz(null); setQuizResult(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeSubTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Classement</span>
          </button>
        </div>
      </div>

      {/* SubTab 1: BROWSE & TAKE QUIZ */}
      {activeSubTab === 'browse' && (
        <div>
          {/* Active Quiz Test Session */}
          {activeQuiz ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8">
              
              {/* Quiz Result View */}
              {quizResult ? (
                <div className="text-center py-6 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border-4 border-indigo-500 text-indigo-600 flex items-center justify-center mx-auto shadow-md">
                    <Trophy className="w-10 h-10 text-amber-500" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Évaluation Terminée !</h3>
                    <p className="text-xs text-slate-500 mt-1">{activeQuiz.title}</p>
                    <div className="inline-flex items-center space-x-3 px-6 py-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-200 dark:border-indigo-800 mt-4">
                      <div>
                        <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                          {quizResult.score} / {quizResult.totalPoints} pts
                        </div>
                        <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                          Score obtenu ({quizResult.percentage}%)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corrections detail */}
                  <div className="text-left mt-8 space-y-4 max-w-2xl mx-auto">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
                      Correction détaillée & Explications :
                    </h4>

                    {quizResult.corrections?.map((c: any, i: number) => (
                      <div
                        key={c.questionId}
                        className={`p-4 rounded-2xl border ${
                          c.isCorrect
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Q{i + 1}.</span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-white">{c.question}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              c.isCorrect ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                            }`}
                          >
                            {c.earnedPoints} / {c.maxPoints} pts
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-xs">
                          {c.options.map((opt: any) => {
                            const isSelected = c.userSelected?.includes(opt.id);
                            const isCorrect = c.correctOptions?.includes(opt.id);

                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center space-x-2 p-2 rounded-xl ${
                                  isCorrect
                                    ? 'bg-emerald-100/80 dark:bg-emerald-900/40 font-bold text-emerald-900 dark:text-emerald-200'
                                    : isSelected
                                    ? 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 font-medium'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {isCorrect ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : isSelected ? (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 inline-block" />
                                )}
                                <span>{opt.text}</span>
                                {isCorrect && <span className="text-[10px] text-emerald-700 dark:text-emerald-300">(Bonne réponse)</span>}
                                {isSelected && !isCorrect && (
                                  <span className="text-[10px] text-rose-700 dark:text-rose-300">(Votre choix)</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {c.explanation && (
                          <div className="mt-3 p-2.5 bg-white/80 dark:bg-slate-800/80 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">Explication : </span>
                            {c.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setUserAnswers({});
                        setQuizResult(null);
                      }}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Recommencer ce quiz</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveQuiz(null);
                        setQuizResult(null);
                        setActiveSubTab('leaderboard');
                        setLeaderboardQuizId(activeQuiz.id);
                      }}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Voir mon rang au classement</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Ongoing Quiz Session */
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                        {activeQuiz.subject}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{activeQuiz.title}</h3>
                      {activeQuiz.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{activeQuiz.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs font-bold transition group"
                      title="Quitter et revenir à la liste des quiz"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Quitter</span>
                    </button>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {activeQuiz.questions.map((q, idx) => {
                      const selectedForThisQ = userAnswers[q.id] || [];

                      return (
                        <div key={q.id} className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 rounded-2xl space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{q.question}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              {q.points} pt(s)
                            </span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {q.options.map((opt) => {
                              const isChecked = selectedForThisQ.includes(opt.id);

                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => toggleOptionSelection(q.id, opt.id)}
                                  className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-medium'
                                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                                      isChecked
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="text-xs">{opt.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {submitError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
                      {submitError}
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50"
                    >
                      {submittingQuiz ? 'Évaluation des réponses...' : 'Soumettre et calculer mon score'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Quizzes Grid */
            <div>
              {loading ? (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                  <span className="text-xs">Chargement des quiz...</span>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-2xs">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Aucun Quiz pour le moment</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Créez votre première série de questions pour défier la communauté !
                  </p>
                  <button
                    onClick={() => setActiveSubTab('create')}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    Créer le premier Quiz
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md hover:border-indigo-500/50 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 px-2.5 py-0.5 rounded-full">
                            {quiz.subject}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {quiz.totalPoints} pts au total
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{quiz.title}</h4>
                        {quiz.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{quiz.questions.length}</span> question(s) •{' '}
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{quiz.submissionsCount || 0} participants</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setActiveSubTab('leaderboard');
                              setLeaderboardQuizId(quiz.id);
                            }}
                            className="p-2 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Voir le classement de ce quiz"
                          >
                            <Trophy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveQuiz(quiz);
                              setUserAnswers({});
                              setQuizResult(null);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
                          >
                            Passer le quiz
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: CREATE QUIZ */}
      {activeSubTab === 'create' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <div className="pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Créateur de Quiz</h3>
            <p className="text-xs text-slate-500 mt-1">
              Définissez la question, saisissez les propositions et cochez la ou les réponses exactes pour évaluer automatiquement les participants.
            </p>
          </div>

          <form onSubmit={handleCreateQuiz} className="space-y-6">
            {createError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* General Quiz Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Titre de l'épreuve *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Quiz Culture & Sciences"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Thématique *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {GENERAL_SUBJECTS.filter((s) => s !== 'Tous les thèmes').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Instructions</label>
              <input
                type="text"
                placeholder="Ex: Quiz de culture générale, réponses multiples possibles..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Questions Builder */}
            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Questions & Réponses exactes ({questions.length})
                </span>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition border border-indigo-200 dark:border-indigo-900"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Ajouter une question</span>
                </button>
              </div>

              {questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-700 dark:text-indigo-400">Question #{qIndex + 1}</span>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1.5">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Points :</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={q.points}
                          onChange={(e) => updateQuestionPoints(qIndex, parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-bold text-slate-800 dark:text-white"
                        />
                      </div>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Énoncé de la question..."
                      value={q.question}
                      onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Propositions (Cochez les réponses exactes) :
                    </span>
                    {q.options.map((opt, optIdx) => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleOptionCorrectness(qIndex, optIdx)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                            opt.isCorrect
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-400'
                          }`}
                          title={opt.isCorrect ? 'Réponse exacte (Comptée juste)' : 'Cliquer pour marquer comme réponse exacte'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          value={opt.text}
                          onChange={(e) => updateOptionText(qIndex, optIdx, e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                        />
                        {opt.isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            Correcte
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Explanation rationale */}
                  <div>
                    <input
                      type="text"
                      placeholder="Justification / Explication de la réponse..."
                      value={q.explanation}
                      onChange={(e) => updateQuestionExplanation(qIndex, e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50"
              >
                {creating ? 'Publication de l’épreuve...' : 'Publier le Quiz'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SubTab 3: LEADERBOARD & RANKS */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Tableau d’Honneur & Rangs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Classement calculé selon les scores obtenus aux différents quiz.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={leaderboardQuizId}
                onChange={(e) => setLeaderboardQuizId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="global">Classement Général</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
              <span className="text-xs">Calcul des rangs en cours...</span>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Aucun participant classé pour le moment</h4>
              <p className="text-xs text-slate-400 mt-1">
                Passez un QCM dans l'onglet "Les Quiz" pour enregistrer votre rang !
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((item, idx) => {
                const rank = item.rank || idx + 1;
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;

                const name = item.userName || item.user?.name;
                const avatar = item.userAvatar || item.user?.avatar;
                const promo = item.userPromo || item.user?.promo;
                const score = item.score !== undefined ? `${item.score} / ${item.totalPoints} pts` : `${item.totalScore} pts (${item.averagePercentage}%)`;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isFirst
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                        : isSecond
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                        : isThird
                        ? 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Rank Indicator */}
                      <div className="w-8 h-8 flex items-center justify-center font-black text-sm">
                        {isFirst && <Medal className="w-6 h-6 text-amber-500" />}
                        {isSecond && <Medal className="w-6 h-6 text-slate-400" />}
                        {isThird && <Medal className="w-6 h-6 text-amber-700" />}
                        {!isFirst && !isSecond && !isThird && (
                          <span className="text-slate-500">{rank}e</span>
                        )}
                      </div>

                      {/* Student Info */}
                      <img
                        src={avatar}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{name}</span>
                          {promo && (
                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                              {promo}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {item.submittedAt ? `Évalué le ${new Date(item.submittedAt).toLocaleDateString('fr-FR')}` : `${item.quizzesCount || 1} épreuve(s) complétée(s)`}
                        </span>
                      </div>
                    </div>

                    {/* Score badge */}
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">{score}</div>
                      {item.percentage !== undefined && (
                        <div className="text-[10px] font-bold text-slate-500">{item.percentage}% de réussite</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
