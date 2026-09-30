import { Router, Request, Response } from "express";
import { ContentReport, ReportTargetType } from "../../src/types";
import { db, saveDatabase, checkUserBanStatus } from "../db";
import { broadcast } from "../realtime";

export const adminRouter = Router();

// Submit a report (Any authenticated user can report a post, comment, message, or reel)
adminRouter.post("/reports", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const reporter = db.users.find((u) => u.id === token);
  if (!reporter) {
    res.status(401).json({ error: "Vous devez être connecté pour envoyer un signalement." });
    return;
  }

  const { targetType, targetId, parentPostId, reason, details } = req.body as {
    targetType: ReportTargetType;
    targetId: string;
    parentPostId?: string;
    reason: string;
    details?: string;
  };

  if (!targetType || !targetId || !reason) {
    res.status(400).json({ error: "Paramètres de signalement incomplets." });
    return;
  }

  let offenderId = "";
  let offenderName = "Utilisateur";
  let offenderAvatar = "";
  let offenderEmail = "";
  let contentSnapshot = "";
  let attachmentSnapshot: { type: string; url: string; name?: string } | undefined = undefined;

  if (targetType === "post") {
    const post = db.posts.find((p) => p.id === targetId);
    if (!post) {
      res.status(404).json({ error: "Publication signalée introuvable." });
      return;
    }
    offenderId = post.authorId;
    offenderName = post.authorName;
    offenderAvatar = post.authorAvatar;
    contentSnapshot = post.content || "(Publication avec pièce jointe)";
    if (post.attachments && post.attachments.length > 0) {
      attachmentSnapshot = {
        type: post.attachments[0].type,
        url: post.attachments[0].url,
        name: post.attachments[0].name
      };
    }
  } else if (targetType === "comment") {
    const post = db.posts.find(
      (p) =>
        (parentPostId && p.id === parentPostId) ||
        (p.comments || []).some((c) => c.id === targetId)
    );
    const comment = post ? (post.comments || []).find((c) => c.id === targetId) : undefined;
    if (!post || !comment) {
      res.status(404).json({ error: "Commentaire signalé introuvable." });
      return;
    }
    offenderId = comment.userId;
    offenderName = comment.userName;
    offenderAvatar = comment.userAvatar;
    contentSnapshot = comment.content;
  } else if (targetType === "message") {
    const msg = db.directMessages.find((m) => m.id === targetId);
    if (!msg) {
      res.status(404).json({ error: "Message signalé introuvable." });
      return;
    }
    offenderId = msg.senderId;
    offenderName = msg.senderName;
    offenderAvatar = msg.senderAvatar;
    contentSnapshot =
      msg.content ||
      (msg.attachment ? `[Pièce jointe : ${msg.attachment.name || msg.attachment.type}]` : "(Message multimédia)");
    if (msg.attachment) {
      attachmentSnapshot = {
        type: msg.attachment.type,
        url: msg.attachment.url,
        name: msg.attachment.name
      };
    }
  } else if (targetType === "reel") {
    const reel = db.reels.find((r) => r.id === targetId);
    if (!reel) {
      res.status(404).json({ error: "Reel signalé introuvable." });
      return;
    }
    offenderId = reel.authorId;
    offenderName = reel.authorName;
    offenderAvatar = reel.authorAvatar;
    contentSnapshot = reel.caption || "(Vidéo Reel)";
  }

  const offenderUser = db.users.find((u) => u.id === offenderId);
  if (offenderUser) {
    offenderEmail = offenderUser.email;
    offenderAvatar = offenderUser.avatarUrl || offenderAvatar;
    offenderName = `${offenderUser.prenom} ${offenderUser.nom}`;
  }

  if (!db.reports) db.reports = [];

  const newReport: ContentReport = {
    id: "rep_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    reporterId: reporter.id,
    reporterName: `${reporter.prenom} ${reporter.nom}`,
    reporterAvatar: reporter.avatarUrl,
    targetType,
    targetId,
    parentPostId,
    offenderId,
    offenderName,
    offenderAvatar,
    offenderEmail,
    reason: String(reason).trim(),
    details: details ? String(details).trim() : undefined,
    contentSnapshot,
    attachmentSnapshot,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  db.reports.unshift(newReport);
  saveDatabase();

  broadcast("NEW_REPORT", newReport);

  res.status(201).json({
    report: newReport,
    message: "Signalement transmis à l'administration avec succès. Merci de contribuer à la sécurité de MK."
  });
});

// Get all reports (Admin only)
adminRouter.get("/reports", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const admin = db.users.find((u) => u.id === token);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  if (!db.reports) db.reports = [];

  // Enrich reports with current offender ban/restriction status
  const enrichedReports = db.reports.map((r) => {
    const offender = db.users.find((u) => u.id === r.offenderId);
    return {
      ...r,
      offenderStatus: offender
        ? {
            isBanned: Boolean(offender.isBanned),
            banUntil: offender.banUntil,
            isRestricted: Boolean(offender.isRestricted),
            email: offender.email
          }
        : null
    };
  });

  res.json({ reports: enrichedReports });
});

// Update / Resolve / Delete reported content (Admin only)
adminRouter.put("/reports/:id", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const admin = db.users.find((u) => u.id === token);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  if (!db.reports) db.reports = [];
  const report = db.reports.find((r) => r.id === req.params.id);
  if (!report) {
    res.status(404).json({ error: "Signalement introuvable." });
    return;
  }

  const { status, deleteContent, adminAction } = req.body;

  if (deleteContent) {
    if (report.targetType === "post") {
      const idx = db.posts.findIndex((p) => p.id === report.targetId);
      if (idx !== -1) {
        const deletedId = db.posts[idx].id;
        db.posts.splice(idx, 1);
        broadcast("DELETE_POST", { id: deletedId });
      }
    } else if (report.targetType === "comment") {
      db.posts.forEach((p) => {
        const beforeLen = (p.comments || []).length;
        p.comments = (p.comments || []).filter(
          (c) => c.id !== report.targetId && c.parentId !== report.targetId
        );
        if (p.comments.length !== beforeLen) {
          broadcast("UPDATE_POST", p);
        }
      });
    } else if (report.targetType === "message") {
      const msg = db.directMessages.find((m) => m.id === report.targetId);
      if (msg) {
        msg.deletedForEveryone = true;
        msg.content = "";
        msg.attachment = undefined;
        broadcast("DELETE_DIRECT_MESSAGE", { messageId: msg.id, deletedForEveryone: true });
      }
    } else if (report.targetType === "reel") {
      const idx = db.reels.findIndex((r) => r.id === report.targetId);
      if (idx !== -1) {
        db.reels.splice(idx, 1);
      }
    }
  }

  if (status) {
    report.status = status;
    report.resolvedAt = new Date().toISOString();
    report.resolvedByAdminId = admin.id;
  }
  if (adminAction) {
    report.adminAction = adminAction;
  }

  saveDatabase();
  broadcast("REPORT_UPDATED", report);

  res.json({
    report,
    message: deleteContent
      ? "Contenu signalé supprimé et signalement marqué comme résolu."
      : "Statut du signalement mis à jour."
  });
});

// Delete report entry (Admin only)
adminRouter.delete("/reports/:id", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const admin = db.users.find((u) => u.id === token);
  if (!admin || admin.role !== "admin") {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }

  if (!db.reports) db.reports = [];
  db.reports = db.reports.filter((r) => r.id !== req.params.id);
  saveDatabase();
  res.json({ success: true });
});

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
    const reportsAgainstCount = (db.reports || []).filter((r) => r.offenderId === u.id).length;
    return {
      ...safeUser,
      postsCount,
      reportsAgainstCount
    };
  });

  res.json({ users: usersWithMeta });
});

// Ban user for any chosen duration (1h, 6h, 12h, 1d, 3d, 7d, 14d, 30d, custom days/hours, or permanent)
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

  const { duration, customValue, customUnit, reason } = req.body;
  targetUser.isBanned = true;
  targetUser.banReason = reason || "Infraction aux règles de la communauté MK";

  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  let durationLabel = String(duration || "1d");

  if (duration === "custom" && Number(customValue) > 0) {
    const val = Math.max(1, Math.min(3650, Number(customValue)));
    if (customUnit === "hours") {
      targetUser.banUntil = new Date(now + val * HOUR_MS).toISOString();
      durationLabel = `${val} heure(s)`;
    } else {
      targetUser.banUntil = new Date(now + val * DAY_MS).toISOString();
      durationLabel = `${val} jour(s)`;
    }
  } else if (duration === "1h") {
    targetUser.banUntil = new Date(now + 1 * HOUR_MS).toISOString();
    durationLabel = "1 heure";
  } else if (duration === "6h") {
    targetUser.banUntil = new Date(now + 6 * HOUR_MS).toISOString();
    durationLabel = "6 heures";
  } else if (duration === "12h") {
    targetUser.banUntil = new Date(now + 12 * HOUR_MS).toISOString();
    durationLabel = "12 heures";
  } else if (duration === "1d" || duration === "24h") {
    targetUser.banUntil = new Date(now + 1 * DAY_MS).toISOString();
    durationLabel = "24 heures (1 jour)";
  } else if (duration === "3d") {
    targetUser.banUntil = new Date(now + 3 * DAY_MS).toISOString();
    durationLabel = "3 jours";
  } else if (duration === "7d") {
    targetUser.banUntil = new Date(now + 7 * DAY_MS).toISOString();
    durationLabel = "7 jours";
  } else if (duration === "14d") {
    targetUser.banUntil = new Date(now + 14 * DAY_MS).toISOString();
    durationLabel = "14 jours";
  } else if (duration === "30d") {
    targetUser.banUntil = new Date(now + 30 * DAY_MS).toISOString();
    durationLabel = "30 jours";
  } else {
    targetUser.banUntil = "permanent";
    durationLabel = "Définitif";
  }

  targetUser.banDuration = durationLabel;

  saveDatabase();
  broadcast("USER_STATUS_CHANGED", {
    userId: targetUser.id,
    isBanned: true,
    banUntil: targetUser.banUntil,
    banDuration: targetUser.banDuration
  });

  const { password: _, ...safe } = targetUser;
  res.json({
    user: safe,
    message: `Compte de ${targetUser.prenom} ${targetUser.nom} suspendu (${durationLabel}).`
  });
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
  targetUser.restrictionReason =
    reason ||
    (isRestricted ? "Interactions limitées par l'administration (lecture seule)" : undefined);

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
