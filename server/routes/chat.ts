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
    (m) =>
      (m.senderId === user.id || m.receiverId === user.id) &&
      !m.deletedFor?.includes(user.id)
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
      ((m.senderId === user.id && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === user.id)) &&
      !m.deletedFor?.includes(user.id)
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
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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

// Envoyer un message direct (Texte, Photos, Vocaux, Documents, Réponse, Transfert)
chatRouter.post("/messages", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour envoyer des messages." });
    return;
  }

  const { receiverId, content, attachment, replyTo, isForwarded } = req.body;
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
    isRead: false,
    reactions: [],
    replyTo: replyTo || undefined,
    isForwarded: Boolean(isForwarded)
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

// Réagir à un message (Double-clic rapide ❤️ ou choix d'émoji)
chatRouter.post("/messages/:messageId/react", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { emoji } = req.body;
  if (!emoji) {
    res.status(400).json({ error: "Émoji requis." });
    return;
  }

  const msg = (db.directMessages || []).find((m) => m.id === req.params.messageId);
  if (!msg) {
    res.status(404).json({ error: "Message introuvable." });
    return;
  }

  // Vérifier que l'utilisateur fait partie de la conversation
  if (msg.senderId !== user.id && msg.receiverId !== user.id) {
    res.status(403).json({ error: "Action non autorisée sur ce message." });
    return;
  }

  msg.reactions = msg.reactions || [];
  const existingIdx = msg.reactions.findIndex((r) => r.userId === user.id);

  if (existingIdx >= 0) {
    if (msg.reactions[existingIdx].emoji === emoji) {
      // Toggle off
      msg.reactions.splice(existingIdx, 1);
    } else {
      // Change emoji
      msg.reactions[existingIdx].emoji = emoji;
    }
  } else {
    // Add reaction
    msg.reactions.push({
      userId: user.id,
      userName: `${user.prenom} ${user.nom}`,
      emoji
    });
  }

  saveDatabase();

  broadcast("MESSAGE_REACTION", {
    messageId: msg.id,
    reactions: msg.reactions,
    senderId: msg.senderId,
    receiverId: msg.receiverId
  });

  res.json({ success: true, reactions: msg.reactions });
});

// Modifier un message (seulement l'auteur)
chatRouter.put("/messages/:messageId", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: "Le contenu ne peut pas être vide." });
    return;
  }

  const msg = (db.directMessages || []).find((m) => m.id === req.params.messageId);
  if (!msg) {
    res.status(404).json({ error: "Message introuvable." });
    return;
  }

  if (msg.senderId !== user.id) {
    res.status(403).json({ error: "Vous ne pouvez modifier que vos propres messages." });
    return;
  }

  if (msg.deletedForEveryone) {
    res.status(400).json({ error: "Ce message a été supprimé." });
    return;
  }

  // Modération IA
  const moderation = await checkContentToleranceWithAI(content);
  if (!moderation.isTolerant) {
    res.status(400).json({
      error: `Modification rejetée : ${moderation.reason || "Contenu intolérant détecté."}`
    });
    return;
  }

  msg.content = content.trim();
  msg.isEdited = true;
  msg.editedAt = new Date().toISOString();

  saveDatabase();

  broadcast("MESSAGE_EDITED", {
    messageId: msg.id,
    content: msg.content,
    isEdited: true,
    editedAt: msg.editedAt,
    senderId: msg.senderId,
    receiverId: msg.receiverId
  });

  res.json({ success: true, message: msg });
});

// Supprimer un message (pour moi OU pour tout le monde)
chatRouter.delete("/messages/:messageId", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const mode = (req.query.mode as string) || (req.body?.mode as string) || "for_me";
  const msg = (db.directMessages || []).find((m) => m.id === req.params.messageId);
  if (!msg) {
    res.status(404).json({ error: "Message introuvable." });
    return;
  }

  if (msg.senderId !== user.id && msg.receiverId !== user.id) {
    res.status(403).json({ error: "Non autorisé sur ce message." });
    return;
  }

  if (mode === "for_everyone") {
    if (msg.senderId !== user.id) {
      res.status(403).json({
        error: "Seul l'expéditeur peut supprimer ce message pour tout le monde."
      });
      return;
    }
    msg.deletedForEveryone = true;
    msg.content = "Ce message a été supprimé";
    msg.attachment = undefined;
    saveDatabase();

    broadcast("MESSAGE_DELETED", {
      messageId: msg.id,
      mode: "for_everyone",
      senderId: msg.senderId,
      receiverId: msg.receiverId
    });

    res.json({ success: true, mode: "for_everyone", message: msg });
  } else {
    // Supprimer pour moi uniquement
    msg.deletedFor = msg.deletedFor || [];
    if (!msg.deletedFor.includes(user.id)) {
      msg.deletedFor.push(user.id);
    }
    saveDatabase();

    res.json({ success: true, mode: "for_me", messageId: msg.id });
  }
});

// Transférer un message vers un ou plusieurs destinataires
chatRouter.post("/messages/:messageId/forward", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { targetUserIds } = req.body;
  if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
    res.status(400).json({ error: "Sélectionnez au moins un destinataire." });
    return;
  }

  const originalMsg = (db.directMessages || []).find((m) => m.id === req.params.messageId);
  if (!originalMsg) {
    res.status(404).json({ error: "Message original introuvable." });
    return;
  }

  const createdMessages: DirectMessage[] = [];

  targetUserIds.forEach((targetId: string) => {
    const receiver = db.users.find((u) => u.id === targetId);
    if (!receiver) return;

    // Check blockage
    if (user.blockedUsers?.includes(targetId) || receiver.blockedUsers?.includes(user.id)) {
      return;
    }

    const forwardedMsg: DirectMessage = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      senderId: user.id,
      senderName: `${user.prenom} ${user.nom}`,
      senderAvatar: user.avatarUrl,
      receiverId: targetId,
      content: originalMsg.content || "",
      attachment: originalMsg.attachment,
      createdAt: new Date().toISOString(),
      isRead: false,
      isForwarded: true,
      reactions: []
    };

    db.directMessages = db.directMessages || [];
    db.directMessages.push(forwardedMsg);
    createdMessages.push(forwardedMsg);

    sendNotification({
      recipientId: receiver.id,
      actor: user,
      type: "direct_message",
      title: "Message transféré",
      message: `${user.prenom} ${user.nom} vous a transféré un message : "${forwardedMsg.content?.slice(0, 30) || 'Pièce jointe'}"`,
      targetId: user.id,
      targetType: "message"
    });

    broadcast("NEW_DIRECT_MESSAGE", { message: forwardedMsg });
  });

  saveDatabase();

  res.json({ success: true, forwardedCount: createdMessages.length, messages: createdMessages });
});
