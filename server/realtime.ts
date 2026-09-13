import { Request, Response } from "express";
import { AppNotification, User } from "../src/types";
import { db, saveDatabase } from "./db";

// Server-Sent Events (SSE) clients for instantaneous real-time broadcasting
export let sseClients: Response[] = [];

export function broadcast(event: string, payload: any): void {
  const data = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  sseClients.forEach((client) => {
    try {
      client.write(`event: update\ndata: ${data}\n\n`);
    } catch {
      // client dropped
    }
  });
}

// SSE Keep-Alive Ping every 15s for unbreakable server rigidity
setInterval(() => {
  sseClients.forEach((client) => {
    try {
      client.write(":ping\n\n");
    } catch {
      // client disconnected
    }
  });
}, 15000);

export function handleSseRoute(req: Request, res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write("\n");
  sseClients.push(res);

  req.on("close", () => {
    sseClients = sseClients.filter((c) => c !== res);
  });
}

// Helper to create and broadcast user-targeted notifications
export function sendNotification(params: {
  recipientId: string;
  actor: User;
  type:
    | 'post_like'
    | 'post_comment'
    | 'comment_reply'
    | 'poll_vote'
    | 'quiz_submission'
    | 'friend_request'
    | 'friend_accept'
    | 'direct_message'
    | 'reel_like'
    | 'reel_comment';
  title: string;
  message: string;
  targetId: string;
  targetType: 'post' | 'poll' | 'quiz' | 'forum' | 'user' | 'reel' | 'message';
}): void {
  if (!params.recipientId || params.recipientId === params.actor.id) return;

  const notif: AppNotification = {
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    recipientId: params.recipientId,
    actorId: params.actor.id,
    actorName: `${params.actor.prenom} ${params.actor.nom}`,
    actorAvatar: params.actor.avatarUrl,
    actorPromo: params.actor.promo,
    type: params.type,
    title: params.title,
    message: params.message,
    targetId: params.targetId,
    targetType: params.targetType,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  db.notifications = db.notifications || [];
  db.notifications.unshift(notif);
  if (db.notifications.length > 300) {
    db.notifications = db.notifications.slice(0, 300);
  }
  saveDatabase();
  broadcast("NEW_NOTIFICATION", notif);
}
