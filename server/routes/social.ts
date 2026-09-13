import { Router, Request, Response } from "express";
import { Post, Reel } from "../../src/types";
import { db, saveDatabase } from "../db";
import { broadcast, sendNotification } from "../realtime";

export const socialRouter = Router();

// Rechercher des utilisateurs
socialRouter.get("/search", (req: Request, res: Response) => {
  const query = String(req.query.q || "").toLowerCase().trim();
  if (!query) {
    res.json({ users: [] });
    return;
  }

  const matches = db.users
    .filter((u) => {
      const full = `${u.prenom} ${u.nom} ${u.email} ${u.promo}`.toLowerCase();
      return full.includes(query);
    })
    .slice(0, 20)
    .map((u) => {
      const { password: _, ...safeUser } = u;
      return safeUser;
    });

  res.json({ users: matches });
});

// Consulter le profil d'un utilisateur (avec gestion stricte du verrouillage et des publications)
socialRouter.get("/:id/profile", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const currentUser = token ? db.users.find((u) => u.id === token) : null;

  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: "Utilisateur non trouvé." });
    return;
  }

  const { password: _, ...safeTarget } = targetUser;
  const isSelf = currentUser ? currentUser.id === targetUser.id : false;
  const isAdmin = currentUser ? currentUser.role === "admin" : false;
  const isFriend = currentUser && targetUser.friends
    ? targetUser.friends.includes(currentUser.id)
    : false;

  let relationship: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none' = 'none';
  if (isSelf) {
    relationship = 'self';
  } else if (isFriend) {
    relationship = 'friends';
  } else if (currentUser && currentUser.friendRequestsSent?.includes(targetUser.id)) {
    relationship = 'pending_sent';
  } else if (currentUser && currentUser.friendRequestsReceived?.includes(targetUser.id)) {
    relationship = 'pending_received';
  }

  const isBlockedByMe = currentUser ? Boolean(currentUser.blockedUsers?.includes(targetUser.id)) : false;
  const isBlockedByThem = currentUser ? Boolean(targetUser.blockedUsers?.includes(currentUser.id)) : false;

  // Déterminer si les publications et reels peuvent être visualisés
  const isRestrictedView = Boolean(targetUser.isLocked && !isSelf && !isFriend && !isAdmin);

  let userPosts: Post[] = [];
  let userReels: Reel[] = [];

  if (!isRestrictedView) {
    userPosts = db.posts
      .filter((p) => p.authorId === targetUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    userReels = (db.reels || [])
      .filter((r) => r.authorId === targetUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({
    user: safeTarget,
    relationship,
    isFriend,
    isSelf,
    isBlockedByMe,
    isBlockedByThem,
    isRestrictedView,
    posts: userPosts,
    reels: userReels,
    friendsCount: (targetUser.friends || []).length,
    postsCount: db.posts.filter((p) => p.authorId === targetUser.id).length,
    reelsCount: (db.reels || []).filter((r) => r.authorId === targetUser.id).length
  });
});

// Bloquer un utilisateur
socialRouter.post("/:id/block", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const targetId = req.params.id;
  if (targetId === user.id) {
    res.status(400).json({ error: "Impossible de vous bloquer vous-même." });
    return;
  }

  user.blockedUsers = user.blockedUsers || [];
  if (!user.blockedUsers.includes(targetId)) {
    user.blockedUsers.push(targetId);
  }

  // Retirer automatiquement des amis si bloqué
  user.friends = (user.friends || []).filter((id) => id !== targetId);
  const target = db.users.find((u) => u.id === targetId);
  if (target) {
    target.friends = (target.friends || []).filter((id) => id !== user.id);
  }

  saveDatabase();
  broadcast("BLOCK_UPDATE", { blockerId: user.id, targetId });
  res.json({ success: true, message: "Utilisateur bloqué." });
});

// Débloquer un utilisateur
socialRouter.post("/:id/unblock", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const targetId = req.params.id;
  user.blockedUsers = (user.blockedUsers || []).filter((id) => id !== targetId);
  saveDatabase();

  broadcast("BLOCK_UPDATE", { blockerId: user.id, targetId });
  res.json({ success: true, message: "Utilisateur débloqué." });
});
