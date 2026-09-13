import { Router, Request, Response } from "express";
import { Poll } from "../../src/types";
import { db, saveDatabase } from "../db";
import { broadcast, sendNotification } from "../realtime";

export const pollsRouter = Router();

// Get all polls
pollsRouter.get("/", (_req: Request, res: Response) => {
  const sorted = [...db.polls].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ polls: sorted });
});

// Create poll
pollsRouter.post("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour créer un sondage." });
    return;
  }

  const { question, description, options } = req.body;
  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: "Le sondage doit comporter une question et au moins 2 options." });
    return;
  }

  const newPoll: Poll = {
    id: "pll_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    question: question.trim(),
    description: description ? description.trim() : "",
    authorId: user.id,
    authorName: `${user.prenom} ${user.nom}`,
    authorAvatar: user.avatarUrl,
    options: options.map((optText: string, i: number) => ({
      id: "opt_" + i + "_" + Math.random().toString(36).substring(2, 5),
      text: String(optText).trim(),
      votes: []
    })),
    createdAt: new Date().toISOString()
  };

  db.polls.unshift(newPoll);
  saveDatabase();

  broadcast("NEW_POLL", newPoll);
  res.status(201).json({ poll: newPoll });
});

// Vote in poll
pollsRouter.post("/:id/vote", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour voter." });
    return;
  }

  const poll = db.polls.find((p) => p.id === req.params.id);
  if (!poll) {
    res.status(404).json({ error: "Sondage introuvable." });
    return;
  }

  const { optionId } = req.body;
  if (!optionId) {
    res.status(400).json({ error: "Option de vote manquante." });
    return;
  }

  // Remove existing vote of this user from any other option in this poll
  poll.options.forEach((opt) => {
    opt.votes = opt.votes.filter((uid) => uid !== user.id);
  });

  // Add vote to chosen option
  const targetOption = poll.options.find((opt) => opt.id === optionId);
  if (targetOption) {
    targetOption.votes.push(user.id);
  }

  saveDatabase();
  broadcast("POLL_VOTED", poll);

  if (poll.authorId !== user.id) {
    sendNotification({
      recipientId: poll.authorId,
      actor: user,
      type: 'poll_vote',
      title: 'Vote au sondage',
      message: `${user.prenom} ${user.nom} (${user.promo}) a voté à votre sondage : "${poll.question.slice(0, 45)}..."`,
      targetId: poll.id,
      targetType: 'poll'
    });
  }

  res.json({ poll });
});
