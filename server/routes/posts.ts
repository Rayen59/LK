import { Router, Request, Response } from "express";
import { Post, PostComment } from "../../src/types";
import { db, saveDatabase, checkUserBanStatus } from "../db";
import { broadcast, sendNotification } from "../realtime";
import { checkContentToleranceWithAI } from "../ai";

export const postsRouter = Router();

// Get all posts (newest first, respecting locked profile privacy)
postsRouter.get("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const currentUser = token ? db.users.find((u) => u.id === token) : null;

  const visiblePosts = db.posts.filter((post) => {
    const author = db.users.find((u) => u.id === post.authorId);
    if (!author) return true;

    // If author has locked profile, only author themselves, accepted friends, or admins can see their posts
    if (author.isLocked) {
      if (!currentUser) return false;
      if (currentUser.role === "admin") return true;
      if (currentUser.id === author.id) return true;
      if (author.friends && author.friends.includes(currentUser.id)) return true;
      return false;
    }
    return true;
  });

  const sorted = [...visiblePosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ posts: sorted });
});

// Create new post (instant broadcast to all users with strict AI content moderation)
postsRouter.post("/", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Vous devez être connecté pour publier." });
    return;
  }

  const banCheck = checkUserBanStatus(user);
  if (banCheck.isBanned) {
    res.status(403).json({ error: banCheck.message });
    return;
  }

  if (user.isRestricted) {
    res.status(403).json({
      error: "Vos interactions sont limitées en mode lecture seule par l'administration. Vous ne pouvez pas publier."
    });
    return;
  }

  const { content, attachments, tags } = req.body;
  if (!content && (!attachments || attachments.length === 0)) {
    res.status(400).json({ error: "Le contenu de la publication ou une pièce jointe est requis." });
    return;
  }

  // Strict AI Moderation Check on text content
  if (content && typeof content === "string") {
    const moderation = await checkContentToleranceWithAI(content);
    if (!moderation.isTolerant) {
      res.status(400).json({
        error: `Publication supprimée/rejetée par la modération IA : ${moderation.reason || "Contenu intolérant détecté."}`
      });
      return;
    }
  }

  const newPost: Post = {
    id: "post_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    authorId: user.id,
    authorName: `${user.prenom} ${user.nom}`,
    authorAvatar: user.avatarUrl,
    authorPromo: user.promo,
    content: content || "",
    attachments: attachments || [],
    tags: tags || [],
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  db.posts.unshift(newPost);
  saveDatabase();

  // Instant real-time broadcast to all connected users
  broadcast("NEW_POST", newPost);
  res.status(201).json({ post: newPost });
});

// Edit post (author or admin with AI moderation)
postsRouter.put("/:id", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  const postIndex = db.posts.findIndex((p) => p.id === req.params.id);

  if (postIndex === -1) {
    res.status(404).json({ error: "Publication non trouvée." });
    return;
  }

  const post = db.posts[postIndex];
  if (!user || (post.authorId !== user.id && user.role !== "admin")) {
    res.status(403).json({ error: "Seul l'auteur ou un administrateur peut modifier cette publication." });
    return;
  }

  if (user.isRestricted && user.role !== "admin") {
    res.status(403).json({ error: "Vos interactions sont limitées en mode lecture seule." });
    return;
  }

  const { content, attachments, tags } = req.body;
  if (content !== undefined && typeof content === "string") {
    const moderation = await checkContentToleranceWithAI(content);
    if (!moderation.isTolerant) {
      res.status(400).json({
        error: `Modification rejetée par la modération IA : ${moderation.reason || "Contenu intolérant détecté."}`
      });
      return;
    }
    post.content = content;
  }
  if (attachments !== undefined) post.attachments = attachments;
  if (tags !== undefined) post.tags = tags;
  post.updatedAt = new Date().toISOString();

  saveDatabase();
  broadcast("UPDATE_POST", post);
  res.json({ post });
});

// Delete post (author or admin)
postsRouter.delete("/:id", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  const postIndex = db.posts.findIndex((p) => p.id === req.params.id);

  if (postIndex === -1) {
    res.status(404).json({ error: "Publication non trouvée." });
    return;
  }

  const post = db.posts[postIndex];
  if (!user || (post.authorId !== user.id && user.role !== "admin")) {
    res.status(403).json({ error: "Seul l'auteur ou un administrateur peut supprimer cette publication." });
    return;
  }

  const postId = post.id;
  db.posts.splice(postIndex, 1);

  // Also remove from any spaces
  db.spaces.forEach((s) => {
    s.postIds = s.postIds.filter((id) => id !== postId);
  });

  saveDatabase();
  broadcast("DELETE_POST", { id: postId });
  res.json({ success: true, id: postId });
});

// Like / Unlike post
postsRouter.post("/:id/like", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour aimer ce contenu." });
    return;
  }

  if (user.isRestricted) {
    res.status(403).json({ error: "Votre compte est en mode lecture seule." });
    return;
  }

  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) {
    res.status(404).json({ error: "Publication non trouvée." });
    return;
  }

  const index = post.likes.indexOf(user.id);
  if (index > -1) {
    post.likes.splice(index, 1);
  } else {
    post.likes.push(user.id);
    if (post.authorId !== user.id) {
      sendNotification({
        recipientId: post.authorId,
        actor: user,
        type: 'post_like',
        title: 'Nouvelle réaction',
        message: `${user.prenom} ${user.nom} (${user.promo}) a aimé votre publication.`,
        targetId: post.id,
        targetType: 'post'
      });
    }
  }

  saveDatabase();
  broadcast("LIKE_POST", { postId: post.id, likes: post.likes });
  res.json({ likes: post.likes });
});

// Add comment or reply to post (with strict AI content moderation)
postsRouter.post("/:id/comment", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Connectez-vous pour commenter." });
    return;
  }

  if (user.isRestricted) {
    res.status(403).json({
      error: "Vos interactions sont limitées en mode lecture seule par l'administration. Vous ne pouvez pas commenter."
    });
    return;
  }

  const { content, parentId } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: "Le commentaire ne peut pas être vide." });
    return;
  }

  // Strict AI Moderation check
  const moderation = await checkContentToleranceWithAI(content.trim());
  if (!moderation.isTolerant) {
    res.status(400).json({
      error: `Commentaire supprimé/rejeté par la modération IA : ${moderation.reason || "Contenu intolérant détecté."}`
    });
    return;
  }

  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) {
    res.status(404).json({ error: "Publication non trouvée." });
    return;
  }

  let replyToUserName: string | undefined = undefined;
  let parentComment: PostComment | undefined = undefined;

  if (parentId) {
    parentComment = (post.comments || []).find((c) => c.id === parentId);
    if (parentComment) {
      replyToUserName = parentComment.userName;
    }
  }

  const newComment: PostComment = {
    id: "com_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    userName: `${user.prenom} ${user.nom}`,
    userAvatar: user.avatarUrl,
    userPromo: user.promo,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    parentId: parentId || undefined,
    replyToUserName
  };

  if (!post.comments) post.comments = [];
  post.comments.push(newComment);

  if (parentComment) {
    parentComment.replies = parentComment.replies || [];
    parentComment.replies.push(newComment);
  }

  saveDatabase();
  broadcast("COMMENT_POST", { postId: post.id, comment: newComment });

  // Notifications logic
  if (parentComment && parentComment.userId !== user.id) {
    // Notify author of the parent comment
    sendNotification({
      recipientId: parentComment.userId,
      actor: user,
      type: 'comment_reply',
      title: 'Réponse à votre commentaire',
      message: `${user.prenom} ${user.nom} a répondu à votre commentaire : "${content.trim().slice(0, 45)}..."`,
      targetId: post.id,
      targetType: 'post'
    });
  }

  // Also notify post author if they are not the commenter and not the parent comment author
  if (post.authorId !== user.id && (!parentComment || post.authorId !== parentComment.userId)) {
    sendNotification({
      recipientId: post.authorId,
      actor: user,
      type: 'post_comment',
      title: 'Nouveau commentaire',
      message: `${user.prenom} ${user.nom} a commenté votre publication : "${content.trim().slice(0, 45)}..."`,
      targetId: post.id,
      targetType: 'post'
    });
  }

  res.status(201).json({ comment: newComment, comments: post.comments });
});
