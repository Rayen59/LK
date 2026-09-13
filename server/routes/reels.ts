import { Router, Request, Response } from "express";
import { Reel, ReelComment } from "../../src/types";
import { db, saveDatabase, checkUserBanStatus } from "../db";
import { broadcast, sendNotification } from "../realtime";
import { checkContentToleranceWithAI } from "../ai";

export const reelsRouter = Router();

// Récupérer tous les reels
reelsRouter.get("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const currentUser = token ? db.users.find((u) => u.id === token) : null;

  const visibleReels = (db.reels || []).filter((reel) => {
    const author = db.users.find((u) => u.id === reel.authorId);
    if (!author) return true;

    // Respect du profil verrouillé
    if (author.isLocked) {
      if (!currentUser) return false;
      if (currentUser.role === "admin") return true;
      if (currentUser.id === author.id) return true;
      if (author.friends?.includes(currentUser.id)) return true;
      return false;
    }
    return true;
  });

  const sorted = [...visibleReels].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ reels: sorted });
});

// Publier un nouveau Reel (Vérification < 60 secondes + Modération IA)
reelsRouter.post("/", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour publier un Reel." });
    return;
  }

  const banCheck = checkUserBanStatus(user);
  if (banCheck.isBanned) {
    res.status(403).json({ error: banCheck.message });
    return;
  }

  if (user.isRestricted) {
    res.status(403).json({ error: "Vos interactions sont limitées en mode lecture seule." });
    return;
  }

  const { videoUrl, caption, duration, tags } = req.body;
  if (!videoUrl) {
    res.status(400).json({ error: "La vidéo du Reel est requise." });
    return;
  }

  // Règle stricte demandée : durée <= 60 secondes
  const reelDuration = Number(duration) || 15;
  if (reelDuration > 60) {
    res.status(400).json({
      error: `La durée du Reel est de ${reelDuration}s. Les Reels ne peuvent pas dépasser 60 secondes maximum.`
    });
    return;
  }

  // Modération IA sur la légende
  if (caption && typeof caption === "string") {
    const moderation = await checkContentToleranceWithAI(caption);
    if (!moderation.isTolerant) {
      res.status(400).json({
        error: `Reel rejeté par la modération IA : ${moderation.reason || "Contenu intolérant détecté."}`
      });
      return;
    }
  }

  const newReel: Reel = {
    id: "reel_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    authorId: user.id,
    authorName: `${user.prenom} ${user.nom}`,
    authorAvatar: user.avatarUrl,
    authorPromo: user.promo,
    videoUrl,
    caption: caption ? caption.trim() : "",
    tags: tags || [],
    duration: Math.min(Math.round(reelDuration), 60),
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  db.reels = db.reels || [];
  db.reels.unshift(newReel);
  saveDatabase();

  broadcast("NEW_REEL", newReel);
  res.status(201).json({ reel: newReel });
});

// Modifier son reel (Légende & Tags - auteur ou admin)
reelsRouter.put("/:id", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  const reelIndex = (db.reels || []).findIndex((r) => r.id === req.params.id);

  if (reelIndex === -1) {
    res.status(404).json({ error: "Reel introuvable." });
    return;
  }

  const reel = db.reels[reelIndex];
  if (!user || (reel.authorId !== user.id && user.role !== "admin")) {
    res.status(403).json({ error: "Seul l'auteur ou un administrateur peut modifier ce Reel." });
    return;
  }

  const { caption, tags } = req.body;
  if (caption !== undefined && typeof caption === "string") {
    const moderation = await checkContentToleranceWithAI(caption);
    if (!moderation.isTolerant) {
      res.status(400).json({
        error: `Modification rejetée par la modération IA : ${moderation.reason || "Contenu intolérant détecté."}`
      });
      return;
    }
    reel.caption = caption.trim();
  }
  if (tags !== undefined) reel.tags = tags;
  reel.updatedAt = new Date().toISOString();

  saveDatabase();
  broadcast("UPDATE_REEL", reel);
  res.json({ reel });
});

// Supprimer son reel (auteur ou admin)
reelsRouter.delete("/:id", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  const reelIndex = (db.reels || []).findIndex((r) => r.id === req.params.id);

  if (reelIndex === -1) {
    res.status(404).json({ error: "Reel introuvable." });
    return;
  }

  const reel = db.reels[reelIndex];
  if (!user || (reel.authorId !== user.id && user.role !== "admin")) {
    res.status(403).json({ error: "Seul l'auteur ou un administrateur peut supprimer ce Reel." });
    return;
  }

  const reelId = reel.id;
  db.reels.splice(reelIndex, 1);
  saveDatabase();

  broadcast("DELETE_REEL", { id: reelId });
  res.json({ success: true, id: reelId });
});

// Aimer / Retirer un like sur un Reel
reelsRouter.post("/:id/like", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour aimer ce Reel." });
    return;
  }

  const reel = (db.reels || []).find((r) => r.id === req.params.id);
  if (!reel) {
    res.status(404).json({ error: "Reel introuvable." });
    return;
  }

  reel.likes = reel.likes || [];
  const index = reel.likes.indexOf(user.id);

  if (index > -1) {
    reel.likes.splice(index, 1);
  } else {
    reel.likes.push(user.id);
    if (reel.authorId !== user.id) {
      sendNotification({
        recipientId: reel.authorId,
        actor: user,
        type: "reel_like",
        title: "Nouveau j'aime sur votre Reel",
        message: `${user.prenom} ${user.nom} a aimé votre Reel : "${reel.caption.slice(0, 30)}..."`,
        targetId: reel.id,
        targetType: "reel"
      });
    }
  }

  saveDatabase();
  broadcast("LIKE_REEL", { reelId: reel.id, likes: reel.likes });
  res.json({ likes: reel.likes });
});

// Commenter un Reel (avec Modération IA stricte)
reelsRouter.post("/:id/comments", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour commenter." });
    return;
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: "Le commentaire ne peut pas être vide." });
    return;
  }

  // Modération IA
  const moderation = await checkContentToleranceWithAI(content.trim());
  if (!moderation.isTolerant) {
    res.status(400).json({
      error: `Commentaire rejeté par la modération IA : ${moderation.reason || "Contenu intolérant détecté."}`
    });
    return;
  }

  const reel = (db.reels || []).find((r) => r.id === req.params.id);
  if (!reel) {
    res.status(404).json({ error: "Reel introuvable." });
    return;
  }

  const newComment: ReelComment = {
    id: "rcom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    userName: `${user.prenom} ${user.nom}`,
    userAvatar: user.avatarUrl,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  reel.comments = reel.comments || [];
  reel.comments.push(newComment);
  saveDatabase();

  if (reel.authorId !== user.id) {
    sendNotification({
      recipientId: reel.authorId,
      actor: user,
      type: "reel_comment",
      title: "Nouveau commentaire sur votre Reel",
      message: `${user.prenom} ${user.nom} a commenté : "${content.slice(0, 35)}..."`,
      targetId: reel.id,
      targetType: "reel"
    });
  }

  broadcast("COMMENT_REEL", { reelId: reel.id, comment: newComment });
  res.status(201).json({ comment: newComment, comments: reel.comments });
});
