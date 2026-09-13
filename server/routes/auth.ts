import { Router, Request, Response } from "express";
import { User } from "../../src/types";
import { db, saveDatabase, checkUserBanStatus, ADMIN_EMAIL, ADMIN_PASSWORD, ensureAdminUser } from "../db";

export const authRouter = Router();

// Inscription (Create account) - strictly unique email
authRouter.post("/register", (req: Request, res: Response) => {
  const { nom, prenom, email, password, avatarUrl, promo, bio } = req.body;

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

  const newUser: User = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    nom: String(nom).trim(),
    prenom: String(prenom).trim(),
    email: normalizedEmail,
    password: String(password),
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(prenom + " " + nom)}&backgroundColor=0f766e,0284c7`,
    promo: promo || "Membre MK",
    bio: bio || "",
    isLocked: false,
    friends: [],
    friendRequestsSent: [],
    friendRequestsReceived: [],
    blockedUsers: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDatabase();

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

  // If secret admin credentials used, ensure admin exists
  if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    ensureAdminUser();
  }

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

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token: user.id });
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

  // Check ban status
  const banStatus = checkUserBanStatus(user);
  if (banStatus.isBanned) {
    res.status(403).json({ error: banStatus.message, isBanned: true });
    return;
  }

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Update profile
authRouter.put("/profile", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { nom, prenom, avatarUrl, promo, bio } = req.body;
  if (nom) user.nom = nom;
  if (prenom) user.prenom = prenom;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (promo) user.promo = promo;
  if (bio !== undefined) user.bio = bio;

  saveDatabase();
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
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
