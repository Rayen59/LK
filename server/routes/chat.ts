import { Router, Request, Response } from "express";
import { DirectMessage } from "../../src/types";
import { db, saveDatabase } from "../db";
import { broadcast, sendNotification } from "../realtime";
import { checkContentToleranceWithAI } from "../ai";

export const chatRouter = Router();

// Récupérer les conversations récentes de l'utilisateur
chatRouter.get("/conversations", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const messages = db.directMessages || [];
  const userMessages = messages.filter(
    (m) => m.senderId === user.id || m.receiverId === user.id
  );

  const partnersMap = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();

  userMessages.forEach((msg) => {
    const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
    const existing = partnersMap.get(partnerId);

    const isUnread = msg.receiverId === user.id && !msg.isRead;

    if (!existing) {
      partnersMap.set(partnerId, {
        lastMessage: msg,
        unreadCount: isUnread ? 1 : 0
      });
    } else {
      if (new Date(msg.createdAt).getTime() > new Date(existing.lastMessage.createdAt).getTime()) {
        existing.lastMessage = msg;
      }
      if (isUnread) {
        existing.unreadCount += 1;
      }
    }
  });

  const conversations = Array.from(partnersMap.entries())
    .map(([partnerId, data]) => {
      const partner = db.users.find((u) => u.id === partnerId);
      if (!partner) return null;
      const { password: _, ...safePartner } = partner;
      return {
        partner: safePartner,
        lastMessage: data.lastMessage,
        unreadCount: data.unreadCount
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b!.lastMessage.createdAt).getTime() -
        new Date(a!.lastMessage.createdAt).getTime()
    );

  res.json({ conversations });
});

// Obtenir l'historique des messages avec un utilisateur spécifique
chatRouter.get("/messages/:otherUserId", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const otherUserId = req.params.otherUserId;
  const otherUser = db.users.find((u) => u.id === otherUserId);
  if (!otherUser) {
    res.status(404).json({ error: "Interlocuteur introuvable." });
    return;
  }

  const messages = (db.directMessages || []).filter(
    (m) =>
      (m.senderId === user.id && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === user.id)
  );

  // Marquer les messages reçus comme lus
  let markedAny = false;
  messages.forEach((m) => {
    if (m.receiverId === user.id && !m.isRead) {
      m.isRead = true;
      markedAny = true;
    }
  });

  if (markedAny) {
    saveDatabase();
    broadcast("MESSAGES_READ", { readerId: user.id, partnerId: otherUserId });
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const { password: _, ...safeOther } = otherUser;
  const isBlockedByMe = Boolean(user.blockedUsers?.includes(otherUserId));
  const isBlockedByThem = Boolean(otherUser.blockedUsers?.includes(user.id));

  res.json({
    messages: sorted,
    partner: safeOther,
    isBlocked: isBlockedByMe || isBlockedByThem,
    isBlockedByMe,
    isBlockedByThem
  });
});

// Envoyer un message direct (Texte, Photos, Vocaux, Documents)
chatRouter.post("/messages", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour envoyer des messages." });
    return;
  }

  const { receiverId, content, attachment } = req.body;
  if (!receiverId) {
    res.status(400).json({ error: "Destinataire obligatoire." });
    return;
  }

  const receiver = db.users.find((u) => u.id === receiverId);
  if (!receiver) {
    res.status(404).json({ error: "Destinataire introuvable." });
    return;
  }

  // Vérification de blocage
  if (user.blockedUsers?.includes(receiverId) || receiver.blockedUsers?.includes(user.id)) {
    res.status(403).json({
      error: "Impossible d'envoyer un message : la communication est bloquée entre vos deux comptes."
    });
    return;
  }

  if (!content?.trim() && !attachment) {
    res.status(400).json({ error: "Le message ne peut pas être vide." });
    return;
  }

  // Modération IA sur le texte du message si présent
  if (content && typeof content === "string") {
    const moderation = await checkContentToleranceWithAI(content);
    if (!moderation.isTolerant) {
      res.status(400).json({
        error: `Message rejeté par la modération IA : ${moderation.reason || "Contenu intolérant détecté."}`
      });
      return;
    }
  }

  const newMsg: DirectMessage = {
    id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    senderId: user.id,
    senderName: `${user.prenom} ${user.nom}`,
    senderAvatar: user.avatarUrl,
    receiverId,
    content: content ? content.trim() : "",
    attachment: attachment || undefined,
    createdAt: new Date().toISOString(),
    isRead: false
  };

  db.directMessages = db.directMessages || [];
  db.directMessages.push(newMsg);
  saveDatabase();

  // Notification temps réel au destinataire
  sendNotification({
    recipientId: receiver.id,
    actor: user,
    type: "direct_message",
    title: "Nouveau message",
    message: `${user.prenom} ${user.nom} vous a envoyé un message : "${content ? content.slice(0, 40) : (attachment ? 'Pièce jointe ' + attachment.type : '')}"`,
    targetId: user.id,
    targetType: "message"
  });

  // Diffusion SSE instantanée
  broadcast("NEW_DIRECT_MESSAGE", { message: newMsg });

  res.status(201).json({ message: newMsg });
});
