import { Router, Request, Response } from "express";
import { User } from "../../src/types";
import { db, saveDatabase, checkUserBanStatus } from "../db";

export const authRouter = Router();

// In-memory verification codes storage (email -> { code, expiresAt, verified })
interface VerificationEntry {
  code: string;
  expiresAt: number;
  verified: boolean;
  attempts: number;
}
const verificationCodes: Map<string, VerificationEntry> = new Map();

// Generate captcha challenge tokens
interface CaptchaChallenge {
  id: string;
  targetPosition: number; // percentage 10 - 90
  expiresAt: number;
}
const captchaChallenges: Map<string, CaptchaChallenge> = new Map();

// Clean up expired verification codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of verificationCodes.entries()) {
    if (value.expiresAt < now) {
      verificationCodes.delete(key);
    }
  }
  for (const [key, value] of captchaChallenges.entries()) {
    if (value.expiresAt < now) {
      captchaChallenges.delete(key);
    }
  }
}, 60000);

// Endpoint: Send 6-digit email verification code
authRouter.post("/send-code", (req: Request, res: Response) => {
  const { email, purpose } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Veuillez fournir une adresse email valide." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // If registering, check if email is already in use
  if (purpose === "register") {
    const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      res.status(409).json({ error: "Un compte existe déjà avec cette adresse email." });
      return;
    }
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

  verificationCodes.set(normalizedEmail, {
    code,
    expiresAt,
    verified: false,
    attempts: 0
  });

  console.log(`[MK AUTH] Code de vérification envoyé à ${normalizedEmail} : ${code} (Valable 15 min)`);

  // Return previewCode to make it immediately visible/simulated in the UI toast for instant testing
  res.json({
    success: true,
    message: `Code de vérification généré avec succès pour ${normalizedEmail}`,
    previewCode: code,
    expiresInSeconds: 900
  });
});

// Endpoint: Verify 6-digit email code
authRouter.post("/verify-code", (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Email et code requis." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const entry = verificationCodes.get(normalizedEmail);

  if (!entry) {
    res.status(400).json({ error: "Aucun code trouvé pour cet email ou code expiré. Demandez un nouveau code." });
    return;
  }

  if (Date.now() > entry.expiresAt) {
    verificationCodes.delete(normalizedEmail);
    res.status(400).json({ error: "Le code a expiré. Veuillez demander un nouveau code." });
    return;
  }

  entry.attempts = (entry.attempts || 0) + 1;
  if (entry.attempts > 5) {
    verificationCodes.delete(normalizedEmail);
    res.status(429).json({ error: "Trop de tentatives infructueuses. Veuillez générer un nouveau code." });
    return;
  }

  if (entry.code !== String(code).trim()) {
    res.status(400).json({ error: "Code incorrect. Veuillez vérifier les 6 chiffres saisis." });
    return;
  }

  entry.verified = true;
  res.json({
    success: true,
    message: "Adresse email vérifiée avec succès !"
  });
});

// Endpoint: Reset password with verified code
authRouter.post("/reset-password", (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: "Tous les champs sont obligatoires." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const entry = verificationCodes.get(normalizedEmail);

  if (!entry || entry.code !== String(code).trim()) {
    res.status(400).json({ error: "Code de vérification invalide ou expiré." });
    return;
  }

  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    res.status(404).json({ error: "Aucun compte associé à cette adresse email." });
    return;
  }

  user.password = String(newPassword);
  saveDatabase();
  verificationCodes.delete(normalizedEmail);

  res.json({ success: true, message: "Mot de passe réinitialisé avec succès ! Vous pouvez vous connecter." });
});

// Endpoint: Generate human slider / captcha challenge
authRouter.get("/captcha-challenge", (_req: Request, res: Response) => {
  const id = "cap_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
  // Target position in percent (between 25% and 80%)
  const targetPosition = Math.floor(25 + Math.random() * 55);
  captchaChallenges.set(id, {
    id,
    targetPosition,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  res.json({
    challengeId: id,
    targetPosition,
    tolerance: 5 // +/- 5% margin
  });
});

// Endpoint: Validate captcha challenge
authRouter.post("/captcha-verify", (req: Request, res: Response) => {
  const { challengeId, userPosition } = req.body;
  if (!challengeId || typeof userPosition !== "number") {
    res.status(400).json({ success: false, error: "Paramètres de captcha invalides." });
    return;
  }

  const challenge = captchaChallenges.get(challengeId);
  if (!challenge) {
    res.status(400).json({ success: false, error: "Le défi anti-robot a expiré. Veuillez réessayer." });
    return;
  }

  const diff = Math.abs(challenge.targetPosition - userPosition);
  if (diff <= 7) { // 7% precision tolerance
    captchaChallenges.delete(challengeId);
    res.json({ success: true, message: "Vérification humaine réussie !" });
  } else {
    res.status(400).json({ success: false, error: "Position incorrecte. Ajustez le curseur avec précision." });
  }
});

// Inscription (Create account) - strictly unique email
authRouter.post("/register", (req: Request, res: Response) => {
  const { nom, prenom, email, password, avatarUrl, promo, bio, isLocked, verificationCode } = req.body;

  if (!nom || !prenom || !email || !password) {
    res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  // Check unique email requirement
  const existingUser = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    res.status(409).json({ error: "Cet email est déjà utilisé. Veuillez utiliser un autre email ou vous connecter." });
    return;
  }

  // If a verification code was sent, verify it
  if (verificationCode) {
    const entry = verificationCodes.get(normalizedEmail);
    if (entry && entry.code !== String(verificationCode).trim()) {
      res.status(400).json({ error: "Le code de vérification email est incorrect." });
      return;
    }
  }

  const newUser: User = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    nom: String(nom).trim(),
    prenom: String(prenom).trim(),
    email: normalizedEmail,
    password: String(password),
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(prenom + " " + nom)}&backgroundColor=0f766e,0284c7`,
    promo: promo || "Membre MK",
    bio: bio || "",
    isLocked: Boolean(isLocked),
    friends: [],
    friendRequestsSent: [],
    friendRequestsReceived: [],
    blockedUsers: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDatabase();
  verificationCodes.delete(normalizedEmail);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser, token: newUser.id });
});

// Connexion (Login)
authRouter.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Veuillez renseigner votre email et votre mot de passe." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = db.users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === String(password)
  );

  if (!user) {
    res.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }

  // Check ban status
  const banStatus = checkUserBanStatus(user);
  if (banStatus.isBanned) {
    res.status(403).json({ error: banStatus.message });
    return;
  }

  // Reactivate account if it was deleted by the user
  let reactivated = false;
  if (user.isDeletedByUser) {
    user.isDeletedByUser = false;
    user.deletedByUserAt = undefined;
    saveDatabase();
    reactivated = true;
  }

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token: user.id, reactivated });
});

// Current user profile
authRouter.get("/me", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(404).json({ error: "Utilisateur non trouvé" });
    return;
  }

  // If deleted by user, do not auto-login silently
  if (user.isDeletedByUser) {
    res.status(403).json({ error: "Ce compte a été supprimé par l'utilisateur.", isDeletedByUser: true });
    return;
  }

  // Check ban status
  const banStatus = checkUserBanStatus(user);
  if (banStatus.isBanned) {
    res.status(403).json({ error: banStatus.message, isBanned: true });
    return;
  }

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// User self-deletion (compte supprimé par l'utilisateur, réactivable à la reconnexion)
authRouter.post("/delete-account", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }

  user.isDeletedByUser = true;
  user.deletedByUserAt = new Date().toISOString();
  saveDatabase();

  res.json({
    success: true,
    message: "Votre compte a été supprimé. Vous pourrez le réactiver à tout moment en vous reconnectant simplement avec votre email et mot de passe."
  });
});

// Update profile (with 14-day cooldown on profile name change)
authRouter.put("/profile", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { nom, prenom, avatarUrl, promo, bio } = req.body;
  const nextNom = nom !== undefined ? String(nom).trim() : user.nom;
  const nextPrenom = prenom !== undefined ? String(prenom).trim() : user.prenom;

  const isNameChanged =
    (nextNom && nextNom !== user.nom) || (nextPrenom && nextPrenom !== user.prenom);

  if (isNameChanged) {
    if (!nextPrenom || !nextNom) {
      res.status(400).json({ error: "Le prénom et le nom ne peuvent pas être vides." });
      return;
    }

    const COOLDOWN_DAYS = 14;
    const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

    if (user.lastNameChangeAt && user.role !== "admin") {
      const lastChangeMs = new Date(user.lastNameChangeAt).getTime();
      const elapsed = Date.now() - lastChangeMs;
      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed;
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        const nextAllowedDate = new Date(lastChangeMs + COOLDOWN_MS).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
        res.status(400).json({
          error: `Vous ne pouvez modifier votre nom de profil qu'une seule fois tous les 14 jours. Prochaine modification possible dans ${remainingDays} jour(s) (le ${nextAllowedDate}).`
        });
        return;
      }
    }

    user.prenom = nextPrenom;
    user.nom = nextNom;
    user.lastNameChangeAt = new Date().toISOString();

    // Propagate new full name across user's posts, comments, reels, quizzes, and messages
    const fullName = `${user.prenom} ${user.nom}`;
    db.posts.forEach((p) => {
      if (p.authorId === user.id) p.authorName = fullName;
      (p.comments || []).forEach((c) => {
        if (c.userId === user.id) c.userName = fullName;
      });
    });
    db.reels.forEach((r) => {
      if (r.authorId === user.id) r.authorName = fullName;
      (r.comments || []).forEach((c) => {
        if (c.userId === user.id) c.userName = fullName;
      });
    });
    db.directMessages.forEach((m) => {
      if (m.senderId === user.id) m.senderName = fullName;
    });
  }

  if (avatarUrl) {
    user.avatarUrl = avatarUrl;
    db.posts.forEach((p) => {
      if (p.authorId === user.id) p.authorAvatar = avatarUrl;
      (p.comments || []).forEach((c) => {
        if (c.userId === user.id) c.userAvatar = avatarUrl;
      });
    });
  }
  if (promo) user.promo = promo;
  if (bio !== undefined) user.bio = bio;

  saveDatabase();
  const { password: _, ...safeUser } = user;
  res.json({
    user: safeUser,
    message: isNameChanged
      ? "Votre nom de profil a été mis à jour (prochaine modification possible dans 14 jours)."
      : "Vos informations de profil ont été mises à jour."
  });
});

// Change password (authenticated user)
authRouter.post("/change-password", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Veuillez renseigner votre mot de passe actuel et le nouveau mot de passe." });
    return;
  }

  if (user.password !== String(currentPassword)) {
    res.status(400).json({ error: "Votre mot de passe actuel est incorrect." });
    return;
  }

  if (String(newPassword).length < 6) {
    res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
    return;
  }

  if (String(newPassword) === String(currentPassword)) {
    res.status(400).json({ error: "Le nouveau mot de passe doit être différent de l'ancien." });
    return;
  }

  user.password = String(newPassword);
  saveDatabase();

  res.json({
    success: true,
    message: "Votre mot de passe a été modifié avec succès."
  });
});

// Get user activity log (likes, comments, shared posts, reels, quizzes)
authRouter.get("/activity", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const likedPosts = db.posts
    .filter((p) => (p.likes || []).includes(user.id))
    .map((p) => ({
      id: p.id,
      type: "post" as const,
      authorId: p.authorId,
      authorName: p.authorName,
      authorAvatar: p.authorAvatar,
      content: p.content,
      attachmentsCount: (p.attachments || []).length,
      likesCount: (p.likes || []).length,
      commentsCount: (p.comments || []).length,
      createdAt: p.createdAt
    }));

  const likedReels = db.reels
    .filter((r) => (r.likes || []).includes(user.id))
    .map((r) => ({
      id: r.id,
      type: "reel" as const,
      authorId: r.authorId,
      authorName: r.authorName,
      authorAvatar: r.authorAvatar,
      caption: r.caption,
      likesCount: (r.likes || []).length,
      createdAt: r.createdAt
    }));

  const myComments: Array<{
    commentId: string;
    postId: string;
    targetType: "post" | "reel";
    postAuthorName: string;
    postExcerpt: string;
    content: string;
    createdAt: string;
  }> = [];

  db.posts.forEach((p) => {
    (p.comments || []).forEach((c) => {
      if (c.userId === user.id) {
        myComments.push({
          commentId: c.id,
          postId: p.id,
          targetType: "post",
          postAuthorName: p.authorName,
          postExcerpt: (p.content || "Publication multimédia").slice(0, 90),
          content: c.content,
          createdAt: c.createdAt
        });
      }
    });
  });

  db.reels.forEach((r) => {
    (r.comments || []).forEach((c) => {
      if (c.userId === user.id) {
        myComments.push({
          commentId: c.id,
          postId: r.id,
          targetType: "reel",
          postAuthorName: r.authorName,
          postExcerpt: (r.caption || "Reel vidéo").slice(0, 90),
          content: c.content,
          createdAt: c.createdAt
        });
      }
    });
  });

  myComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const myPosts = db.posts
    .filter((p) => p.authorId === user.id)
    .map((p) => ({
      id: p.id,
      content: p.content,
      tags: p.tags || [],
      attachments: p.attachments || [],
      likesCount: (p.likes || []).length,
      commentsCount: (p.comments || []).length,
      createdAt: p.createdAt
    }));

  const myReels = db.reels
    .filter((r) => r.authorId === user.id)
    .map((r) => ({
      id: r.id,
      caption: r.caption,
      duration: r.duration,
      likesCount: (r.likes || []).length,
      commentsCount: (r.comments || []).length,
      createdAt: r.createdAt
    }));

  const myQuizzes = db.quizzes
    .filter((q) => q.authorId === user.id)
    .map((q) => ({
      id: q.id,
      title: q.title,
      subject: q.subject,
      questionsCount: (q.questions || []).length,
      submissionsCount: q.submissionsCount || 0,
      createdAt: q.createdAt
    }));

  res.json({
    likedPosts,
    likedReels,
    myComments,
    myPosts,
    myReels,
    myQuizzes
  });
});

// Basculer la confidentialité du profil (Verrouiller / Déverrouiller le profil)
authRouter.put("/privacy", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  user.isLocked = Boolean(req.body.isLocked);
  saveDatabase();

  const { password: _, ...safeUser } = user;
  res.json({
    user: safeUser,
    isLocked: user.isLocked,
    message: user.isLocked
      ? "Votre profil est désormais verrouillé. Seuls vos amis peuvent voir vos publications et vos reels."
      : "Votre profil est désormais public."
  });
});
