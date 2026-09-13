import { Router, Request, Response } from "express";
import { AppNotification } from "../../src/types";
import { db, saveDatabase } from "../db";
import { broadcast } from "../realtime";

export const notificationsRouter = Router();

// Get notifications for current user
notificationsRouter.get("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  const userNotifs = (db.notifications || [])
    .filter((n) => n.recipientId === token)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ notifications: userNotifs });
});

// Mark single notification as read
notificationsRouter.post("/:id/read", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  const notif = (db.notifications || []).find((n) => n.id === req.params.id && n.recipientId === token);
  if (notif) {
    notif.isRead = true;
    saveDatabase();
  }
  res.json({ success: true });
});

// Mark all notifications as read
notificationsRouter.post("/read-all", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  (db.notifications || []).forEach((n) => {
    if (n.recipientId === token) {
      n.isRead = true;
    }
  });
  saveDatabase();
  res.json({ success: true });
});

// Clear all notifications for user
notificationsRouter.delete("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  db.notifications = (db.notifications || []).filter((n) => n.recipientId !== token);
  saveDatabase();
  res.json({ success: true });
});

// Trigger a test notification for the user to verify the notification center and push toast
notificationsRouter.post("/test", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const testNotif: AppNotification = {
    id: "notif_test_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
    recipientId: user.id,
    actorId: "usr_mk_notif_bot",
    actorName: "Équipe MK",
    actorAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=MK&backgroundColor=0f766e",
    actorPromo: "Communauté MK",
    type: "post_comment",
    title: "Nouveau commentaire sur votre publication",
    message: "Bienvenue sur MK ! Partagez vos pensées, reels et photos.",
    targetId: "",
    targetType: "post",
    isRead: false,
    createdAt: new Date().toISOString()
  };

  db.notifications = db.notifications || [];
  db.notifications.unshift(testNotif);
  saveDatabase();
  broadcast("NEW_NOTIFICATION", testNotif);
  res.json({ notification: testNotif });
});
