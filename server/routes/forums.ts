import { Router, Request, Response } from "express";
import { Forum, ForumMessage } from "../../src/types";
import { db, saveDatabase } from "../db";
import { broadcast } from "../realtime";

export const forumsRouter = Router();

// Get forums list (hiding access codes)
forumsRouter.get("/", (_req: Request, res: Response) => {
  const sanitized = db.forums.map((f) => {
    const { accessCode: _, ...safe } = f;
    return { ...safe, hasCode: f.isPrivate };
  });
  res.json({ forums: sanitized });
});

// Create forum
forumsRouter.post("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour créer un forum." });
    return;
  }

  const { title, description, category, isPrivate, accessCode } = req.body;
  if (!title) {
    res.status(400).json({ error: "Le titre du forum est obligatoire." });
    return;
  }

  if (isPrivate && (!accessCode || !accessCode.trim())) {
    res.status(400).json({ error: "Un code d'accès est requis pour un forum privé." });
    return;
  }

  const newForum: Forum = {
    id: "frm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    title: title.trim(),
    description: description ? description.trim() : "",
    category: category ? category.trim() : "Général",
    isPrivate: Boolean(isPrivate),
    accessCode: isPrivate ? accessCode.trim() : undefined,
    creatorId: user.id,
    creatorName: `${user.prenom} ${user.nom}`,
    creatorAvatar: user.avatarUrl,
    membersCount: 1,
    messagesCount: 0,
    createdAt: new Date().toISOString()
  };

  db.forums.unshift(newForum);
  saveDatabase();

  broadcast("NEW_FORUM", { ...newForum, accessCode: undefined, hasCode: newForum.isPrivate });
  res.status(201).json({ forum: newForum });
});

// Verify access code for private forum
forumsRouter.post("/:id/verify", (req: Request, res: Response) => {
  const forum = db.forums.find((f) => f.id === req.params.id);
  if (!forum) {
    res.status(404).json({ error: "Forum introuvable." });
    return;
  }

  if (!forum.isPrivate) {
    res.json({ authorized: true });
    return;
  }

  const { code } = req.body;
  if (code && code.trim() === forum.accessCode) {
    res.json({ authorized: true });
  } else {
    res.status(403).json({ authorized: false, error: "Code d'accès incorrect." });
  }
});

// Get forum messages
forumsRouter.get("/:id/messages", (req: Request, res: Response) => {
  const messages = db.forumMessages
    .filter((m) => m.forumId === req.params.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ messages });
});

// Send message to forum
forumsRouter.post("/:id/messages", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour participer au forum." });
    return;
  }

  const forum = db.forums.find((f) => f.id === req.params.id);
  if (!forum) {
    res.status(404).json({ error: "Forum non trouvé." });
    return;
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: "Le message ne peut pas être vide." });
    return;
  }

  const newMessage: ForumMessage = {
    id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    forumId: forum.id,
    userId: user.id,
    userName: `${user.prenom} ${user.nom}`,
    userAvatar: user.avatarUrl,
    userPromo: user.promo,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  db.forumMessages.push(newMessage);
  forum.messagesCount = (forum.messagesCount || 0) + 1;
  saveDatabase();

  broadcast("FORUM_MESSAGE", newMessage);
  res.status(201).json({ message: newMessage });
});
