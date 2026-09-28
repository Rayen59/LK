import { Router, Request, Response } from "express";
import { Post, Reel } from "../../src/types";
import { db, saveDatabase } from "../db";
import { broadcast, sendNotification } from "../realtime";

export const socialRouter = Router();

// Rechercher des utilisateurs
socialRouter.get("/search", (req: Request, res: Response) => {
  const query = String(req.query.q || "").toLowerCase().trim();

  const matches = db.users
    .filter((u) => {
      if (u.isDeletedByUser) return false;
      if (!query) return true;
      const full = `${u.prenom} ${u.nom} ${u.email} ${u.promo} ${u.bio || ""}`.toLowerCase();
      return full.includes(query);
    })
    .slice(0, 30)
    .map((u) => {
      const { password: _, ...safeUser } = u;
      return safeUser;
    });

  res.json({ users: matches });
});

// Recherche globale style Facebook (Personnes, Événements, Vidéos & Reels, Documents, Publications)
socialRouter.get("/global-search", (req: Request, res: Response) => {
  const query = String(req.query.q || "").toLowerCase().trim();

  // 1. Personnes (Utilisateurs)
  const users = db.users
    .filter((u) => {
      if (u.isDeletedByUser) return false;
      if (!query) return true;
      const full = `${u.prenom} ${u.nom} ${u.email} ${u.promo} ${u.bio || ""}`.toLowerCase();
      return full.includes(query);
    })
    .slice(0, 24)
    .map((u) => {
      const { password: _, ...safeUser } = u;
      return safeUser;
    });

  // 2. Publications
  const allPosts = db.posts || [];
  const posts = allPosts.filter((p) => {
    if (!query) return true;
    const text = `${p.content || ""} ${p.authorName || ""} ${p.authorPromo || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
    return text.includes(query);
  });

  // 3. Événements & Activités publiés sur le site (Posts tagués événement/conférence/workshop + Forums + Sondages + Quiz)
  const eventKeywords = [
    "événement",
    "evenement",
    "event",
    "conférence",
    "conference",
    "journée",
    "journee",
    "workshop",
    "séminaire",
    "seminaire",
    "congrès",
    "congres",
    "soirée",
    "soiree",
    "formation",
    "stage",
    "hackathon",
    "club",
    "rencontre",
    "annonce",
  ];

  const eventPosts = allPosts
    .filter((p) => {
      const textAndTags = `${p.content || ""} ${(p.tags || []).join(" ")}`.toLowerCase();
      const isEventPost = eventKeywords.some((kw) => textAndTags.includes(kw));
      if (!isEventPost) return false;
      if (!query) return true;
      return `${textAndTags} ${p.authorName}`.toLowerCase().includes(query);
    })
    .map((p) => ({
      id: p.id,
      kind: "post_event" as const,
      title: p.tags?.find((t) => eventKeywords.some((k) => t.toLowerCase().includes(k))) || "Événement Communautaire",
      description: p.content,
      authorName: p.authorName,
      authorAvatar: p.authorAvatar,
      authorId: p.authorId,
      authorPromo: p.authorPromo,
      createdAt: p.createdAt,
      likesCount: (p.likes || []).length,
      commentsCount: (p.comments || []).length,
      tags: p.tags || [],
      attachments: p.attachments || [],
    }));

  const forumEvents = (db.forums || [])
    .filter((f) => {
      if (!query) return true;
      return `${f.title} ${f.description} ${f.category} ${f.creatorName}`.toLowerCase().includes(query);
    })
    .map((f) => ({
      id: f.id,
      kind: "forum" as const,
      title: f.title,
      description: f.description,
      authorName: f.creatorName,
      authorAvatar: f.creatorAvatar,
      authorId: f.creatorId,
      authorPromo: f.category,
      createdAt: f.createdAt,
      likesCount: f.membersCount || 1,
      commentsCount: f.messagesCount || 0,
      tags: [f.category, f.isPrivate ? "Salon Privé" : "Salon Public"],
      attachments: [],
    }));

  const pollEvents = (db.polls || [])
    .filter((pl) => {
      if (!query) return true;
      return `${pl.question} ${pl.description || ""} ${pl.authorName}`.toLowerCase().includes(query);
    })
    .map((pl) => ({
      id: pl.id,
      kind: "poll" as const,
      title: `Sondage : ${pl.question}`,
      description: pl.description || `${pl.options.length} options de vote disponibles`,
      authorName: pl.authorName,
      authorAvatar: pl.authorAvatar,
      authorId: pl.authorId,
      authorPromo: "Sondage Officiel",
      createdAt: pl.createdAt,
      likesCount: pl.options.reduce((acc, o) => acc + (o.votes?.length || 0), 0),
      commentsCount: pl.options.length,
      tags: ["Sondage", "Vote"],
      attachments: [],
    }));

  const quizEvents = (db.quizzes || [])
    .filter((qz) => {
      if (!query) return true;
      return `${qz.title} ${qz.description || ""} ${qz.subject} ${qz.authorName}`.toLowerCase().includes(query);
    })
    .map((qz) => ({
      id: qz.id,
      kind: "quiz" as const,
      title: `Quiz & Défi : ${qz.title}`,
      description: qz.description || `Sujet : ${qz.subject} (${qz.questions.length} questions)`,
      authorName: qz.authorName,
      authorAvatar: qz.authorAvatar,
      authorId: qz.authorId,
      authorPromo: qz.subject,
      createdAt: qz.createdAt,
      likesCount: qz.submissionsCount || 0,
      commentsCount: qz.questions.length,
      tags: ["Quiz", qz.subject],
      attachments: [],
    }));

  const events = [...eventPosts, ...forumEvents, ...pollEvents, ...quizEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 4. Vidéos & Reels
  const reels = (db.reels || []).filter((r) => {
    if (!query) return true;
    return `${r.caption || ""} ${r.authorName || ""} ${(r.tags || []).join(" ")}`.toLowerCase().includes(query);
  });

  // 5. Documents, Images, Audio & Vidéos attachés aux publications
  const documents = allPosts
    .flatMap((post) =>
      (post.attachments || []).map((att) => ({
        ...att,
        postAuthor: post.authorName,
        postAuthorId: post.authorId,
        postPromo: post.authorPromo,
        postAuthorAvatar: post.authorAvatar,
        postCreatedAt: post.createdAt,
        postContent: post.content,
        postId: post.id,
      }))
    )
    .filter((doc) => {
      if (!query) return true;
      return `${doc.name} ${doc.postAuthor} ${doc.postPromo} ${doc.postContent || ""}`.toLowerCase().includes(query);
    });

  res.json({
    users,
    posts,
    events,
    reels,
    documents,
  });
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
