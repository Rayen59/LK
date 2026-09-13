import { Router, Request, Response } from "express";
import { Quiz, QuizSubmission } from "../../src/types";
import { db, saveDatabase } from "../db";
import { broadcast, sendNotification } from "../realtime";

export const quizzesRouter = Router();

// Get quizzes list
quizzesRouter.get("/", (_req: Request, res: Response) => {
  // Hide answers when listing quizzes
  const list = db.quizzes.map((q) => {
    return {
      ...q,
      questions: q.questions.map((qu) => ({
        ...qu,
        options: qu.options.map((o) => ({ id: o.id, text: o.text })),
        explanation: undefined
      }))
    };
  });
  res.json({ quizzes: list });
});

// Create quiz (with designated correct answers and points)
quizzesRouter.post("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour créer un quiz." });
    return;
  }

  const { title, description, subject, questions } = req.body;
  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: "Le quiz doit comporter un titre et au moins une question." });
    return;
  }

  // Calculate total points
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

  const newQuiz: Quiz = {
    id: "qz_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    title: title.trim(),
    description: description ? description.trim() : "",
    subject: subject ? subject.trim() : "Culture Générale",
    authorId: user.id,
    authorName: `${user.prenom} ${user.nom}`,
    authorAvatar: user.avatarUrl,
    questions,
    totalPoints,
    submissionsCount: 0,
    createdAt: new Date().toISOString()
  };

  db.quizzes.unshift(newQuiz);
  saveDatabase();

  broadcast("NEW_QUIZ", { ...newQuiz, questions: newQuiz.questions.length });
  res.status(201).json({ quiz: newQuiz });
});

// Submit quiz answers & calculate score
quizzesRouter.post("/:id/submit", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour passer le quiz." });
    return;
  }

  const quiz = db.quizzes.find((q) => q.id === req.params.id);
  if (!quiz) {
    res.status(404).json({ error: "Quiz introuvable." });
    return;
  }

  const { answers } = req.body; // map: questionId -> array of selected optionIds
  if (!answers) {
    res.status(400).json({ error: "Réponses non fournies." });
    return;
  }

  let totalScore = 0;
  const detailedCorrections = quiz.questions.map((question) => {
    const userSelected = answers[question.id] || [];
    const correctOptions = question.options.filter((o) => o.isCorrect).map((o) => o.id);

    // Exact match for full points
    const isCorrect =
      userSelected.length === correctOptions.length &&
      userSelected.every((optId: string) => correctOptions.includes(optId));

    const earnedPoints = isCorrect ? Number(question.points || 1) : 0;
    totalScore += earnedPoints;

    return {
      questionId: question.id,
      question: question.question,
      options: question.options,
      userSelected,
      correctOptions,
      isCorrect,
      explanation: question.explanation,
      earnedPoints,
      maxPoints: Number(question.points || 1)
    };
  });

  const percentage = quiz.totalPoints > 0 ? Math.round((totalScore / quiz.totalPoints) * 100) : 0;

  // Record submission (update if user already submitted)
  const existingSubIndex = db.quizSubmissions.findIndex(
    (s) => s.quizId === quiz.id && s.userId === user.id
  );

  const submission: QuizSubmission = {
    id: existingSubIndex > -1 ? db.quizSubmissions[existingSubIndex].id : "sub_" + Date.now(),
    quizId: quiz.id,
    userId: user.id,
    userName: `${user.prenom} ${user.nom}`,
    userAvatar: user.avatarUrl,
    userPromo: user.promo,
    score: totalScore,
    totalPoints: quiz.totalPoints,
    percentage,
    submittedAt: new Date().toISOString()
  };

  if (existingSubIndex > -1) {
    db.quizSubmissions[existingSubIndex] = submission;
  } else {
    db.quizSubmissions.push(submission);
    quiz.submissionsCount = (quiz.submissionsCount || 0) + 1;
  }

  saveDatabase();
  broadcast("QUIZ_SUBMITTED", { quizId: quiz.id, submission });

  if (quiz.authorId !== user.id) {
    sendNotification({
      recipientId: quiz.authorId,
      actor: user,
      type: 'quiz_submission',
      title: 'Participation au Quiz MK',
      message: `${user.prenom} ${user.nom} (${user.promo}) a passé votre quiz "${quiz.title}" (Score : ${percentage}%).`,
      targetId: quiz.id,
      targetType: 'quiz'
    });
  }

  res.json({
    score: totalScore,
    totalPoints: quiz.totalPoints,
    percentage,
    corrections: detailedCorrections
  });
});

// Get quiz leaderboard (rankings by score descending)
quizzesRouter.get("/:id/leaderboard", (req: Request, res: Response) => {
  const submissions = db.quizSubmissions
    .filter((s) => s.quizId === req.params.id)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    })
    .map((sub, index) => ({
      ...sub,
      rank: index + 1
    }));

  res.json({ leaderboard: submissions });
});

// Overall leaderboard across all quizzes
export function getGlobalLeaderboard(_req: Request, res: Response): void {
  const studentScores: Record<string, { user: { id: string; name: string; avatar: string; promo: string }; totalScore: number; totalPossible: number; quizzesCount: number }> = {};

  db.quizSubmissions.forEach((sub) => {
    if (!studentScores[sub.userId]) {
      studentScores[sub.userId] = {
        user: { id: sub.userId, name: sub.userName, avatar: sub.userAvatar, promo: sub.userPromo },
        totalScore: 0,
        totalPossible: 0,
        quizzesCount: 0
      };
    }
    studentScores[sub.userId].totalScore += sub.score;
    studentScores[sub.userId].totalPossible += sub.totalPoints;
    studentScores[sub.userId].quizzesCount += 1;
  });

  const ranked = Object.values(studentScores)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
      averagePercentage: item.totalPossible > 0 ? Math.round((item.totalScore / item.totalPossible) * 100) : 0
    }));

  res.json({ leaderboard: ranked });
}
