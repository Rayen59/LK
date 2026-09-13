import { Router, Request, Response } from "express";
import { db, saveDatabase } from "../db";
import { broadcast, sendNotification } from "../realtime";

export const friendsRouter = Router();

// Obtenir la liste d'amis et les demandes en attente
friendsRouter.get("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const friends = (user.friends || [])
    .map((fid) => db.users.find((u) => u.id === fid))
    .filter(Boolean)
    .map((u) => {
      const { password: _, ...safe } = u!;
      return safe;
    });

  const pendingReceived = (user.friendRequestsReceived || [])
    .map((fid) => db.users.find((u) => u.id === fid))
    .filter(Boolean)
    .map((u) => {
      const { password: _, ...safe } = u!;
      return safe;
    });

  const pendingSent = (user.friendRequestsSent || [])
    .map((fid) => db.users.find((u) => u.id === fid))
    .filter(Boolean)
    .map((u) => {
      const { password: _, ...safe } = u!;
      return safe;
    });

  res.json({ friends, pendingReceived, pendingSent });
});

// Envoyer une invitation d'ami
friendsRouter.post("/request/:targetId", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour ajouter des amis." });
    return;
  }

  const targetId = req.params.targetId;
  if (targetId === user.id) {
    res.status(400).json({ error: "Vous ne pouvez pas vous ajouter vous-même en ami." });
    return;
  }

  const target = db.users.find((u) => u.id === targetId);
  if (!target) {
    res.status(404).json({ error: "Utilisateur introuvable." });
    return;
  }

  if (user.blockedUsers?.includes(targetId) || target.blockedUsers?.includes(user.id)) {
    res.status(403).json({ error: "Action impossible avec un compte bloqué." });
    return;
  }

  if (user.friends?.includes(targetId)) {
    res.status(400).json({ error: "Vous êtes déjà amis avec cet utilisateur." });
    return;
  }

  if (user.friendRequestsSent?.includes(targetId)) {
    res.status(400).json({ error: "Une invitation a déjà été envoyée." });
    return;
  }

  // If the target already sent us a request, automatically accept!
  if (user.friendRequestsReceived?.includes(targetId)) {
    user.friendRequestsReceived = user.friendRequestsReceived.filter((id) => id !== targetId);
    target.friendRequestsSent = (target.friendRequestsSent || []).filter((id) => id !== user.id);
    user.friends = user.friends || [];
    target.friends = target.friends || [];
    if (!user.friends.includes(targetId)) user.friends.push(targetId);
    if (!target.friends.includes(user.id)) target.friends.push(user.id);
    saveDatabase();

    sendNotification({
      recipientId: target.id,
      actor: user,
      type: "friend_accept",
      title: "Invitation acceptée",
      message: `${user.prenom} ${user.nom} a accepté votre demande d'ami. Vous êtes désormais connectés !`,
      targetId: user.id,
      targetType: "user"
    });

    broadcast("FRIEND_UPDATE", { userId: user.id, targetId });
    res.json({ status: "friends", message: "Vous êtes maintenant amis !" });
    return;
  }

  user.friendRequestsSent = user.friendRequestsSent || [];
  target.friendRequestsReceived = target.friendRequestsReceived || [];

  user.friendRequestsSent.push(targetId);
  target.friendRequestsReceived.push(user.id);
  saveDatabase();

  sendNotification({
    recipientId: target.id,
    actor: user,
    type: "friend_request",
    title: "Demande d'ami",
    message: `${user.prenom} ${user.nom} (${user.promo}) souhaite devenir votre ami.`,
    targetId: user.id,
    targetType: "user"
  });

  broadcast("FRIEND_UPDATE", { requesterId: user.id, targetId });
  res.json({ status: "pending_sent", message: "Invitation envoyée avec succès !" });
});

// Accepter une invitation d'ami
friendsRouter.post("/accept/:requesterId", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const requesterId = req.params.requesterId;
  const requester = db.users.find((u) => u.id === requesterId);
  if (!requester) {
    res.status(404).json({ error: "Utilisateur introuvable." });
    return;
  }

  user.friendRequestsReceived = (user.friendRequestsReceived || []).filter((id) => id !== requesterId);
  requester.friendRequestsSent = (requester.friendRequestsSent || []).filter((id) => id !== user.id);

  user.friends = user.friends || [];
  requester.friends = requester.friends || [];

  if (!user.friends.includes(requesterId)) user.friends.push(requesterId);
  if (!requester.friends.includes(user.id)) requester.friends.push(user.id);
  saveDatabase();

  sendNotification({
    recipientId: requester.id,
    actor: user,
    type: "friend_accept",
    title: "Demande d'ami acceptée",
    message: `${user.prenom} ${user.nom} a accepté votre demande d'ami. Vous êtes désormais amis !`,
    targetId: user.id,
    targetType: "user"
  });

  broadcast("FRIEND_UPDATE", { userId: user.id, requesterId });
  res.json({ success: true, message: "Invitation acceptée." });
});

// Refuser une invitation d'ami
friendsRouter.post("/reject/:requesterId", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const requesterId = req.params.requesterId;
  const requester = db.users.find((u) => u.id === requesterId);

  user.friendRequestsReceived = (user.friendRequestsReceived || []).filter((id) => id !== requesterId);
  if (requester) {
    requester.friendRequestsSent = (requester.friendRequestsSent || []).filter((id) => id !== user.id);
  }
  saveDatabase();

  broadcast("FRIEND_UPDATE", { userId: user.id, requesterId });
  res.json({ success: true, message: "Invitation refusée." });
});

// Retirer un ami
friendsRouter.post("/remove/:friendId", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const friendId = req.params.friendId;
  const friend = db.users.find((u) => u.id === friendId);

  user.friends = (user.friends || []).filter((id) => id !== friendId);
  if (friend) {
    friend.friends = (friend.friends || []).filter((id) => id !== user.id);
  }
  saveDatabase();

  broadcast("FRIEND_UPDATE", { userId: user.id, friendId });
  res.json({ success: true, message: "Ami retiré." });
});
