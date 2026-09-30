import React, { useState, useEffect, useRef } from 'react';
import { Quiz, User } from '../types';
import { api, fileToDataUrl, subscribeToLiveUpdates } from '../lib/api';
import {
  BookOpen,
  PlusCircle,
  CheckCircle,
  XCircle,
  Trophy,
  Medal,
  Sparkles,
  AlertCircle,
  Check,
  RotateCcw,
  ArrowLeft,
  Loader2,
  FileText,
  Upload,
  Wand2,
  X,
  Eye,
  Layers,
  CheckCheck
} from 'lucide-react';

interface QuizViewProps {
  currentUser: User;
  onGoBack?: () => void;
}

const GENERAL_SUBJECTS = [
  'Tous les thèmes',
  'Culture Générale',
  'Sciences & Innovations',
  'Technologie & Web',
  'Histoire & Géographie',
  'Cinéma & Séries',
  'Musique & Art',
  'Sport & Loisirs',
  'Voyages & Monde'
];

interface DraftQuestion {
  question: string;
  points: number;
  explanation: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
}

interface DraftQuiz {
  title: string;
  description: string;
  subject: string;
  questions: DraftQuestion[];
  verifiedByUser?: boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({ currentUser, onGoBack }) => {
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'create' | 'leaderboard'>('browse');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('Tous les thèmes');

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

  // AI & PDF Generator state
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
  const [aiTopic, setAiTopic] = useState('');
  const [aiPdfFile, setAiPdfFile] = useState<{ name: string; size: number; dataUrl: string } | null>(
    null
  );
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(5);
  const [aiQuizCount, setAiQuizCount] = useState<number>(2);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGeneratedQuizzes, setAiGeneratedQuizzes] = useState<DraftQuiz[]>([]);
  const [activeDraftIndex, setActiveDraftIndex] = useState<number>(0);
  const [aiSuccessBanner, setAiSuccessBanner] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // Active Create/Verify Quiz form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(GENERAL_SUBJECTS[1]);
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    {
      question: '',
      points: 2,
      explanation: '',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
        { id: 'opt_4', text: '', isCorrect: false }
      ]
    }
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

  // Sync current draft editor changes back to aiGeneratedQuizzes when in multi-quiz AI review mode
  const syncActiveDraftToList = (
    nextTitle: string,
    nextDesc: string,
    nextSubj: string,
    nextQuestions: DraftQuestion[]
  ) => {
    if (aiGeneratedQuizzes.length > 0) {
      setAiGeneratedQuizzes((prev) =>
        prev.map((item, idx) =>
          idx === activeDraftIndex
            ? {
                ...item,
                title: nextTitle,
                description: nextDesc,
                subject: nextSubj,
                questions: nextQuestions
              }
            : item
        )
      );
    }
  };

  const selectDraftByIndex = (index: number, draftsList = aiGeneratedQuizzes) => {
    const target = draftsList[index];
    if (!target) return;
    setActiveDraftIndex(index);
    setTitle(target.title);
    setDescription(target.description);
    setSubject(target.subject || GENERAL_SUBJECTS[1]);
    setQuestions(target.questions);
  };

  // Handle PDF Upload for AI Quiz Generation
  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCreateError(null);
      const dataUrl = await fileToDataUrl(file);
      setAiPdfFile({
        name: file.name,
        size: file.size,
        dataUrl
      });
    } catch {
      setCreateError('Impossible de lire le fichier sélectionné.');
    }
    e.target.value = '';
  };

  // Trigger AI Quiz Generation from PDF or Topic
  const handleGenerateWithAI = async () => {
    if (!aiPdfFile && !aiTopic.trim()) {
      setCreateError(
        'Veuillez choisir un fichier PDF (ou document) ou écrire un sujet pour que l’IA génère les quiz.'
      );
      return;
    }

    setGeneratingAI(true);
    setCreateError(null);
    setAiSuccessBanner(null);

    try {
      const res = await api.quizzes.generateWithAI({
        topic: aiTopic.trim(),
        subject,
        pdfDataUrl: aiPdfFile?.dataUrl,
        pdfName: aiPdfFile?.name,
        questionCount: aiQuestionCount,
        quizCount: aiQuizCount
      });

      if (res.quizzes && res.quizzes.length > 0) {
        const drafts: DraftQuiz[] = res.quizzes.map((qz) => ({
          title: qz.title,
          description: qz.description,
          subject: qz.subject || subject,
          questions: qz.questions,
          verifiedByUser: true
        }));
        setAiGeneratedQuizzes(drafts);
        selectDraftByIndex(0, drafts);
        setAiSuccessBanner(
          drafts.length > 1
            ? `${drafts.length} Quiz (${drafts.map((_, i) => `Quiz ${i + 1}`).join(', ')}) ont été générés avec leurs réponses exactes ! Vérifiez-les ci-dessous avant de les publier.`
            : `Le Quiz a été généré par l'IA avec les réponses exactes pré-cochées ! Vérifiez les questions ci-dessous puis publiez.`
        );
      }
    } catch (err: any) {
      setCreateError(err.message || "Erreur lors de la génération IA du quiz.");
    } finally {
      setGeneratingAI(false);
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
    const next: DraftQuestion[] = [
      ...questions,
      {
        question: '',
        points: 2,
        explanation: '',
        options: [
          { id: `opt_${Date.now()}_1`, text: '', isCorrect: true },
          { id: `opt_${Date.now()}_2`, text: '', isCorrect: false },
          { id: `opt_${Date.now()}_3`, text: '', isCorrect: false },
          { id: `opt_${Date.now()}_4`, text: '', isCorrect: false }
        ]
      }
    ];
    setQuestions(next);
    syncActiveDraftToList(title, description, subject, next);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const next = questions.filter((_, i) => i !== index);
    setQuestions(next);
    syncActiveDraftToList(title, description, subject, next);
  };

  const updateQuestionText = (index: number, text: string) => {
    const next = questions.map((q, i) => (i === index ? { ...q, question: text } : q));
    setQuestions(next);
    syncActiveDraftToList(title, description, subject, next);
  };

  const updateQuestionPoints = (index: number, points: number) => {
    const next = questions.map((q, i) => (i === index ? { ...q, points } : q));
    setQuestions(next);
    syncActiveDraftToList(title, description, subject, next);
  };

  const updateQuestionExplanation = (index: number, text: string) => {
    const next = questions.map((q, i) => (i === index ? { ...q, explanation: text } : q));
    setQuestions(next);
    syncActiveDraftToList(title, description, subject, next);
  };

  const updateOptionText = (qIndex: number, optIdx: number, text: string) => {
    const next = questions.map((q, i) =>
      i === qIndex
        ? {
            ...q,
            options: q.options.map((o, j) => (j === optIdx ? { ...o, text } : o))
          }
        : q
    );
    setQuestions(next);
    syncActiveDraftToList(title, description, subject, next);
  };

  const toggleOptionCorrectness = (qIndex: number, optIdx: number) => {
    const next = questions.map((q, i) =>
      i === qIndex
        ? {
            ...q,
            options: q.options.map((o, j) =>
              j === optIdx ? { ...o, isCorrect: !o.isCorrect } : o
            )
          }
        : q
    );
    setQuestions(next);
    syncActiveDraftToList(title, description, subject, next);
  };

  const validateSingleQuiz = (qzTitle: string, qzQuestions: DraftQuestion[], labelPrefix = '') => {
    if (!qzTitle.trim()) {
      return `${labelPrefix}Le titre du quiz est obligatoire.`;
    }
    for (let i = 0; i < qzQuestions.length; i++) {
      const q = qzQuestions[i];
      if (!q.question.trim()) {
        return `${labelPrefix}La question #${i + 1} est vide.`;
      }
      const hasCorrect = q.options.some((o) => o.isCorrect && o.text.trim());
      if (!hasCorrect) {
        return `${labelPrefix}La question #${i + 1} doit comporter au moins une réponse exacte cochée.`;
      }
    }
    return null;
  };

  // Publish single current quiz
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateSingleQuiz(title, questions);
    if (validationErr) {
      setCreateError(validationErr);
      return;
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
          options: q.options
            .filter((o) => o.text.trim())
            .map((o) => ({
              id: o.id,
              text: o.text.trim(),
              isCorrect: o.isCorrect
            }))
        }))
      });

      setQuizzes((prev) => [res.quiz, ...prev]);

      // If there are remaining AI generated quizzes in the batch, remove the published one and switch to next
      if (aiGeneratedQuizzes.length > 1) {
        const remaining = aiGeneratedQuizzes.filter((_, idx) => idx !== activeDraftIndex);
        setAiGeneratedQuizzes(remaining);
        selectDraftByIndex(0, remaining);
        setAiSuccessBanner(
          `Quiz publié avec succès ! Il vous reste ${remaining.length} quiz généré(s) à vérifier et publier.`
        );
      } else {
        setAiGeneratedQuizzes([]);
        setAiSuccessBanner(null);
        setActiveSubTab('browse');
        setTitle('');
        setDescription('');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la publication du quiz.');
    } finally {
      setCreating(false);
    }
  };

  // Publish ALL generated quizzes (Quiz 1, Quiz 2...) at once after user verification
  const handlePublishAllGeneratedQuizzes = async () => {
    if (aiGeneratedQuizzes.length === 0) return;

    for (let i = 0; i < aiGeneratedQuizzes.length; i++) {
      const draft = aiGeneratedQuizzes[i];
      const err = validateSingleQuiz(draft.title, draft.questions, `[Quiz ${i + 1}] `);
      if (err) {
        setCreateError(err);
        return;
      }
    }

    setCreating(true);
    setCreateError(null);

    try {
      const createdList: Quiz[] = [];
      for (let i = 0; i < aiGeneratedQuizzes.length; i++) {
        const draft = aiGeneratedQuizzes[i];
        const totalPoints = draft.questions.reduce((sum, q) => sum + (q.points || 1), 0);
        const res = await api.quizzes.create({
          title: draft.title.trim(),
          description: draft.description.trim(),
          subject: draft.subject || subject,
          totalPoints,
          questions: draft.questions.map((q, idx) => ({
            id: `q_${Date.now()}_${i}_${idx}`,
            question: q.question.trim(),
            points: q.points || 1,
            explanation: q.explanation.trim(),
            options: q.options
              .filter((o) => o.text.trim())
              .map((o) => ({
                id: o.id,
                text: o.text.trim(),
                isCorrect: o.isCorrect
              }))
          }))
        });
        createdList.push(res.quiz);
      }

      setQuizzes((prev) => [...createdList, ...prev]);
      setAiGeneratedQuizzes([]);
      setAiSuccessBanner(null);
      setAiPdfFile(null);
      setAiTopic('');
      setActiveSubTab('browse');
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la publication des quiz.');
    } finally {
      setCreating(false);
    }
  };

  const filteredQuizzes =
    selectedSubjectFilter === 'Tous les thèmes'
      ? quizzes
      : quizzes.filter((q) => q.subject === selectedSubjectFilter);

  return (
    <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-5 sm:py-7">
      {/* Back button */}
      {onGoBack && (
        <div className="mb-4">
          <button
            onClick={onGoBack}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0c142b] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs shadow-2xs transition group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Retour</span>
          </button>
        </div>
      )}

      {/* Clean Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Évaluations Interactives & IA</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Quiz, Analyse PDF par IA & Classement
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Importez un cours PDF pour que l'IA lise tout le contenu et le partage en Quiz 1, Quiz 2... avec réponses exactes pré-sélectionnées à vérifier.
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('browse');
              setActiveQuiz(null);
              setQuizResult(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'browse'
                ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Les Quiz ({quizzes.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('create');
              setCreationMode('ai');
              setActiveQuiz(null);
              setQuizResult(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'create'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Créer / Quiz IA (PDF)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('leaderboard');
              setActiveQuiz(null);
              setQuizResult(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'leaderboard'
                ? 'bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Classement</span>
          </button>
        </div>
      </div>

      {/* SubTab 1: BROWSE & TAKE QUIZ */}
      {activeSubTab === 'browse' && (
        <div>
          {activeQuiz ? (
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 sm:p-7">
              {quizResult ? (
                <div className="text-center py-6 space-y-6">
                  <div className="w-18 h-18 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-500 flex items-center justify-center mx-auto">
                    <Trophy className="w-9 h-9" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      Résultat de l'évaluation
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{activeQuiz.title}</p>
                    <div className="inline-flex items-center space-x-3 px-6 py-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl border border-blue-200 dark:border-blue-800 mt-4">
                      <div>
                        <div className="text-2xl font-extrabold font-mono tabular-nums text-blue-700 dark:text-blue-300">
                          {quizResult.score} / {quizResult.totalPoints} pts
                        </div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          Score : {quizResult.percentage}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corrections detail */}
                  <div className="text-left mt-8 space-y-4 max-w-2xl mx-auto">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
                      Correction détaillée & Explications :
                    </h4>

                    {quizResult.corrections?.map((c: any, i: number) => (
                      <div
                        key={c.questionId}
                        className={`p-4 rounded-2xl border ${
                          c.isCorrect
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              Q{i + 1}.
                            </span>
                            <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {c.question}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums font-bold shrink-0">
                            {c.earnedPoints} / {c.maxPoints} pts
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs">
                          {c.options.map((opt: any) => {
                            const isSelected = c.userSelected?.includes(opt.id);
                            const isCorrect = c.correctOptions?.includes(opt.id);

                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center space-x-2 p-2.5 rounded-xl ${
                                  isCorrect
                                    ? 'bg-emerald-100/80 dark:bg-emerald-900/40 font-bold text-emerald-900 dark:text-emerald-200'
                                    : isSelected
                                    ? 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 font-medium'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {isCorrect ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : isSelected ? (
                                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                ) : (
                                  <span className="w-4 h-4 inline-block shrink-0" />
                                )}
                                <span>{opt.text}</span>
                                {isCorrect && (
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 ml-1">
                                    · Réponse exacte
                                  </span>
                                )}
                                {isSelected && !isCorrect && (
                                  <span className="text-[11px] text-rose-700 dark:text-rose-300 ml-1">
                                    · Votre choix
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {c.explanation && (
                          <div className="mt-3 p-3 bg-white/90 dark:bg-[#0f172a]/90 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              Explication :{' '}
                            </span>
                            {c.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 pt-4">
                    <button
                      onClick={() => {
                        setUserAnswers({});
                        setQuizResult(null);
                      }}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
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
                      className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Voir le classement</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Ongoing Quiz Session */
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {activeQuiz.subject} · {activeQuiz.totalPoints} points
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {activeQuiz.title}
                      </h3>
                      {activeQuiz.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {activeQuiz.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quitter</span>
                    </button>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {activeQuiz.questions.map((q, idx) => {
                      const selectedForThisQ = userAnswers[q.id] || [];

                      return (
                        <div
                          key={q.id}
                          className="p-5 bg-slate-50/70 dark:bg-[#090f1f] border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2.5">
                              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {q.question}
                              </span>
                            </div>
                            <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
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
                                  className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                                    isChecked
                                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                                      : 'bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  <div
                                    className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition shrink-0 ${
                                      isChecked
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="text-xs sm:text-sm">{opt.text}</span>
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

                  <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {submittingQuiz
                        ? 'Correction en cours...'
                        : 'Valider mes réponses et voir mon score'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Quizzes Grid + Subject Filter + Quick AI CTA */
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {GENERAL_SUBJECTS.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubjectFilter(subj)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        selectedSubjectFilter === subj
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('create');
                    setCreationMode('ai');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Générer un Quiz par IA ou PDF</span>
                </button>
              </div>

              {loading ? (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                  <span className="text-xs">Chargement des quiz...</span>
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-2xs">
                  <Wand2 className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Aucun Quiz dans cette catégorie
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Plus besoin d'écrire chaque question à la main : importez un PDF ou indiquez un sujet et laissez l'IA créer les Quiz 1, Quiz 2... avec les réponses exactes !
                  </p>
                  <button
                    onClick={() => {
                      setActiveSubTab('create');
                      setCreationMode('ai');
                    }}
                    className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer inline-flex items-center space-x-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Créer un Quiz avec l'IA (PDF / Sujet)</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs hover:border-blue-400 dark:hover:border-blue-700 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {quiz.subject}
                          </span>
                          <span className="font-mono tabular-nums font-bold">
                            {quiz.totalPoints} pts
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {quiz.title}
                        </h4>
                        {quiz.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                            {quiz.questions.length}
                          </span>{' '}
                          questions ·{' '}
                          <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                            {quiz.submissionsCount || 0} participant(s)
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setActiveSubTab('leaderboard');
                              setLeaderboardQuizId(quiz.id);
                            }}
                            className="p-2 text-slate-400 hover:text-amber-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Classement de ce quiz"
                          >
                            <Trophy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveQuiz(quiz);
                              setUserAnswers({});
                              setQuizResult(null);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
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

      {/* SubTab 2: CREATE QUIZ (AI PDF READER & GENERATOR + USER VERIFICATION) */}
      {activeSubTab === 'create' && (
        <div className="space-y-6">
          {/* Mode Switcher: AI / PDF vs Manual */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Wand2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Studio de Création de Quiz (IA & Lecture PDF)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ne rédigez plus tout à la main : importez un PDF ou donnez un thème, l'IA lit tout le contenu, le découpe en Quiz 1, Quiz 2... et coche la réponse exacte pour que vous puissiez simplement vérifier.
                </p>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setCreationMode('ai')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    creationMode === 'ai'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Génération IA / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    creationMode === 'manual'
                      ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>Édition Manuelle</span>
                </button>
              </div>
            </div>

            {/* AI & PDF UPLOAD BOX */}
            {creationMode === 'ai' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-900/70 space-y-4">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
                  onChange={handlePdfSelect}
                  className="hidden"
                />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                  {/* PDF Upload Card */}
                  <div className="md:col-span-6 flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-[#0f172a] border border-dashed border-blue-300 dark:border-blue-800">
                    <div>
                      <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 dark:text-white mb-1">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>1. Choisir un fichier PDF ou Cours (Optionnel)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        L'IA lit toutes les pages et écritures de votre PDF et les transforme en questions structurées (Quiz 1, Quiz 2...) avec les réponses exactes.
                      </p>
                    </div>

                    <div className="mt-3">
                      {aiPdfFile ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {aiPdfFile.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                                {(aiPdfFile.size / 1024).toFixed(1)} Ko · Prêt pour lecture IA
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAiPdfFile(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Retirer le fichier"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => pdfInputRef.current?.click()}
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer shadow-2xs"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Importer un PDF ou Document</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Topic / Instructions & Split Configuration */}
                  <div className="md:col-span-6 flex flex-col justify-between p-4 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-900 dark:text-white mb-1">
                        2. Sujet, chapitre ou instructions pour l'IA
                      </label>
                      <textarea
                        rows={2}
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="Ex: Système cardiovasculaire, Révolution française, Programmation React... (ou consignes sur le PDF)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Thématique
                        </label>
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                        >
                          {GENERAL_SUBJECTS.filter((s) => s !== 'Tous les thèmes').map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Découper en
                        </label>
                        <select
                          value={aiQuizCount}
                          onChange={(e) => setAiQuizCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400"
                        >
                          <option value={1}>1 Quiz</option>
                          <option value={2}>Quiz 1 & Quiz 2</option>
                          <option value={3}>Quiz 1, 2 & 3</option>
                          <option value={4}>Quiz 1 à 4</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Questions / Quiz
                        </label>
                        <select
                          value={aiQuestionCount}
                          onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          <option value={3}>3 questions</option>
                          <option value={5}>5 questions</option>
                          <option value={8}>8 questions</option>
                          <option value={10}>10 questions</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      L'IA choisit automatiquement la réponse exacte de chaque question et vous laisse tout vérifier avant publication.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={generatingAI}
                    onClick={handleGenerateWithAI}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center justify-center space-x-2 shadow-xs transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Lecture & Génération des Quiz par l'IA...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>
                          {aiPdfFile
                            ? `Lire le PDF & Générer ${aiQuizCount > 1 ? `Quiz 1 à ${aiQuizCount}` : 'le Quiz'}`
                            : `Générer ${aiQuizCount > 1 ? `Quiz 1 à ${aiQuizCount}` : 'le Quiz'} avec l'IA`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* AI VERIFICATION BANNER & MULTI-QUIZ SWITCHER (Quiz 1, Quiz 2...) */}
            {aiSuccessBanner && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start space-x-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                    <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block">
                        Vérification Utilisateur — Réponses exactes pré-cochées par l'IA
                      </span>
                      <span className="text-[11px] opacity-90">{aiSuccessBanner}</span>
                    </div>
                  </div>

                  {aiGeneratedQuizzes.length > 1 && (
                    <button
                      type="button"
                      disabled={creating}
                      onClick={handlePublishAllGeneratedQuizzes}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer shrink-0"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>
                        Tout valider & Publier les {aiGeneratedQuizzes.length} Quiz
                      </span>
                    </button>
                  )}
                </div>

                {aiGeneratedQuizzes.length > 1 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-800/70 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                      Parties générées :
                    </span>
                    {aiGeneratedQuizzes.map((draft, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectDraftByIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                          activeDraftIndex === idx
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-[#0f172a] text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        Quiz {idx + 1} ({draft.questions.length} Q)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUIZ VERIFICATION & EDITOR FORM */}
            <form onSubmit={handleCreateQuiz} className="space-y-6 pt-2">
              {createError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* General Quiz Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Titre du Quiz *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Quiz 1 — Concepts fondamentaux"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      syncActiveDraftToList(e.target.value, description, subject, questions);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thématique *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      syncActiveDraftToList(title, description, e.target.value, questions);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Synthèse
                </label>
                <input
                  type="text"
                  placeholder="Ex: Questions extraites du cours avec réponses exactes vérifiées..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    syncActiveDraftToList(title, e.target.value, subject, questions);
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Questions Builder & Verification List */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Questions & Vérification des Réponses Exactes ({questions.length})
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Vérifiez ou modifiez la réponse exacte cochée en vert pour chaque question.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ajouter une question</span>
                  </button>
                </div>

                {questions.map((q, qIndex) => (
                  <div
                    key={qIndex}
                    className="p-4 sm:p-5 bg-slate-50/70 dark:bg-[#090f1f] rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400">
                        Question #{qIndex + 1}
                      </span>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1.5">
                          <label className="text-[11px] font-bold text-slate-500">Points :</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={q.points}
                            onChange={(e) =>
                              updateQuestionPoints(qIndex, parseInt(e.target.value) || 1)
                            }
                            className="w-14 px-2 py-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-center font-mono tabular-nums font-bold text-slate-800 dark:text-white"
                          />
                        </div>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
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
                        className="w-full px-3.5 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Options List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        Propositions (Cliquez sur le bouton vert pour confirmer ou changer la réponse exacte) :
                      </span>
                      {q.options.map((opt, optIdx) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleOptionCorrectness(qIndex, optIdx)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer shrink-0 ${
                              opt.isCorrect
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-400'
                            }`}
                            title={
                              opt.isCorrect
                                ? 'Réponse exacte sélectionnée'
                                : 'Marquer comme réponse exacte'
                            }
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            value={opt.text}
                            onChange={(e) => updateOptionText(qIndex, optIdx, e.target.value)}
                            className={`flex-1 px-3 py-1.5 rounded-xl text-xs border focus:outline-none transition ${
                              opt.isCorrect
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 font-bold text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-blue-500'
                            }`}
                          />
                          {opt.isCorrect && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:inline">
                              Réponse exacte
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Explanation rationale */}
                    <div>
                      <input
                        type="text"
                        placeholder="Justification / Explication de la réponse exacte..."
                        value={q.explanation}
                        onChange={(e) => updateQuestionExplanation(qIndex, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {aiGeneratedQuizzes.length > 1 && (
                  <button
                    type="button"
                    disabled={creating}
                    onClick={handlePublishAllGeneratedQuizzes}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition disabled:opacity-50 cursor-pointer flex items-center space-x-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>
                      Vérifié · Publier tous les Quiz ({aiGeneratedQuizzes.length})
                    </span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  {creating
                    ? 'Publication en cours...'
                    : aiGeneratedQuizzes.length > 0
                    ? `Vérifié · Publier ce Quiz`
                    : 'Publier le Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SubTab 3: LEADERBOARD & RANKS */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Tableau d’Honneur & Classement</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Classement calculé selon les scores obtenus aux différents quiz.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={leaderboardQuizId}
                onChange={(e) => setLeaderboardQuizId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090f1f] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
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
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <span className="text-xs">Calcul des rangs en cours...</span>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Aucun participant classé pour le moment
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Passez un QCM dans l'onglet "Les Quiz" pour enregistrer votre score !
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leaderboardData.map((item, idx) => {
                const rank = item.rank || idx + 1;
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;

                const name = item.userName || item.user?.name;
                const avatar = item.userAvatar || item.user?.avatar;
                const promo = item.userPromo || item.user?.promo;
                const score =
                  item.score !== undefined
                    ? `${item.score} / ${item.totalPoints} pts`
                    : `${item.totalScore} pts (${item.averagePercentage}%)`;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                      isFirst
                        ? 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800'
                        : isSecond
                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        : isThird
                        ? 'bg-orange-50/50 dark:bg-orange-950/25 border-orange-200 dark:border-orange-800'
                        : 'bg-white dark:bg-[#0f172a] border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-8 h-8 flex items-center justify-center font-mono tabular-nums font-bold text-sm shrink-0">
                        {isFirst && <Medal className="w-6 h-6 text-amber-500" />}
                        {isSecond && <Medal className="w-6 h-6 text-slate-400" />}
                        {isThird && <Medal className="w-6 h-6 text-amber-700" />}
                        {!isFirst && !isSecond && !isThird && (
                          <span className="text-slate-500">#{rank}</span>
                        )}
                      </div>

                      <img
                        src={avatar}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {name}
                          </span>
                          {promo && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                              · {promo}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {item.submittedAt
                            ? `Évalué le ${new Date(item.submittedAt).toLocaleDateString('fr-FR')}`
                            : `${item.quizzesCount || 1} quiz complété(s)`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-extrabold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                        {score}
                      </div>
                      {item.percentage !== undefined && (
                        <div className="text-[11px] font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.percentage}% de réussite
                        </div>
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
