import { Router, Request, Response } from "express";
import { db, saveDatabase, checkUserBanStatus } from "../db";
import { broadcast } from "../realtime";

export const adminRouter = Router();

// Get all users with stats (Admin only)
adminRouter.get("/users", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé. Espace réservé à l'administration MK." });
    return;
  }

  // Refresh expired bans
  db.users.forEach((u) => checkUserBanStatus(u));

  const usersWithMeta = db.users.map((u) => {
    const { password: _, ...safeUser } = u;
    const postsCount = db.posts.filter((p) => p.authorId === u.id).length;
    return {
      ...safeUser,
      postsCount
    };
  });

  res.json({ users: usersWithMeta });
});

// Ban user (1 day, 3 days, 14 days, permanent)
adminRouter.post("/users/:id/ban", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const admin = db.users.find((u) => u.id === token);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: "Utilisateur non trouvé." });
    return;
  }

  if (targetUser.role === "admin") {
    res.status(400).json({ error: "Impossible de bannir un compte administrateur." });
    return;
  }

  const { duration, reason } = req.body;
  targetUser.isBanned = true;
  targetUser.banDuration = duration;
  targetUser.banReason = reason || "Infraction aux règles de la communauté MK";

  const now = Date.now();
  if (duration === "1d") {
    targetUser.banUntil = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  } else if (duration === "3d") {
    targetUser.banUntil = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
  } else if (duration === "14d") {
    targetUser.banUntil = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    targetUser.banUntil = "permanent";
  }

  saveDatabase();
  broadcast("USER_STATUS_CHANGED", {
    userId: targetUser.id,
    isBanned: true,
    banUntil: targetUser.banUntil,
    banDuration: targetUser.banDuration
  });

  const { password: _, ...safe } = targetUser;
  res.json({ user: safe, message: `Utilisateur banni avec succès (${duration}).` });
});

// Unban user
adminRouter.post("/users/:id/unban", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const admin = db.users.find((u) => u.id === token);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: "Utilisateur non trouvé." });
    return;
  }

  targetUser.isBanned = false;
  targetUser.banUntil = null;
  targetUser.banDuration = null;
  targetUser.banReason = undefined;

  saveDatabase();
  broadcast("USER_STATUS_CHANGED", { userId: targetUser.id, isBanned: false });

  const { password: _, ...safe } = targetUser;
  res.json({ user: safe, message: "Utilisateur réactivé / débanni avec succès." });
});

// Restrict user interactions (can only view, cannot post or comment)
adminRouter.post("/users/:id/restrict", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const admin = db.users.find((u) => u.id === token);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) {
    res.status(404).json({ error: "Utilisateur non trouvé." });
    return;
  }

  if (targetUser.role === "admin") {
    res.status(400).json({ error: "Impossible de restreindre un administrateur." });
    return;
  }

  const { isRestricted, reason } = req.body;
  targetUser.isRestricted = Boolean(isRestricted);
  targetUser.restrictionReason = reason || (isRestricted ? "Interactions limitées par l'administration (lecture seule)" : undefined);

  saveDatabase();
  broadcast("USER_STATUS_CHANGED", { userId: targetUser.id, isRestricted: targetUser.isRestricted });

  const { password: _, ...safe } = targetUser;
  res.json({
    user: safe,
    message: isRestricted
      ? "Interactions de l'utilisateur limitées : mode lecture seule activé."
      : "Restrictions levées : l'utilisateur peut à nouveau publier et commenter."
  });
});

// Delete user by admin
adminRouter.delete("/users/:id", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const admin = db.users.find((u) => u.id === token);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  const userIndex = db.users.findIndex((u) => u.id === req.params.id);
  if (userIndex === -1) {
    res.status(404).json({ error: "Utilisateur non trouvé." });
    return;
  }

  const target = db.users[userIndex];
  if (target.role === "admin") {
    res.status(400).json({ error: "Impossible de supprimer le compte administrateur principal." });
    return;
  }

  const deletedId = target.id;
  db.users.splice(userIndex, 1);
  saveDatabase();
  broadcast("USER_DELETED", { userId: deletedId });
  res.json({ success: true, id: deletedId });
});
