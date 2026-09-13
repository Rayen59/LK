import path from "path";
import fs from "fs";
import { AppDatabase, User } from "../src/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Ensure clean database without any mock/dummy data
function initDatabase(): AppDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const blankDb: AppDatabase = {
    users: [],
    posts: [],
    reels: [],
    directMessages: [],
    spaces: [],
    forums: [],
    forumMessages: [],
    quizzes: [],
    quizSubmissions: [],
    polls: [],
    notifications: []
  };

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(blankDb, null, 2), "utf-8");
    return blankDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    const users: User[] = (parsed.users || []).map((u: any) => ({
      ...u,
      friends: u.friends || [],
      friendRequestsSent: u.friendRequestsSent || [],
      friendRequestsReceived: u.friendRequestsReceived || [],
      blockedUsers: u.blockedUsers || [],
      isLocked: Boolean(u.isLocked)
    }));

    return {
      users,
      posts: parsed.posts || [],
      reels: parsed.reels || [],
      directMessages: parsed.directMessages || [],
      spaces: parsed.spaces || [],
      forums: parsed.forums || [],
      forumMessages: parsed.forumMessages || [],
      quizzes: parsed.quizzes || [],
      quizSubmissions: parsed.quizSubmissions || [],
      polls: parsed.polls || [],
      notifications: parsed.notifications || []
    };
  } catch (err) {
    console.error("Error reading db.json, reinitializing blank db", err);
    fs.writeFileSync(DB_FILE, JSON.stringify(blankDb, null, 2), "utf-8");
    return blankDb;
  }
}

export const db: AppDatabase = initDatabase();

// Atomic and safe disk persistence
export function saveDatabase(): void {
  try {
    const tempFile = DB_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save database to disk:", e);
    }
  }
}

// Administration credentials
export const ADMIN_EMAIL = "admin189@gmail.com";
export const ADMIN_PASSWORD = "sfaxmed981";

export function ensureAdminUser(): void {
  const existingAdmin = db.users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL);
  if (!existingAdmin) {
    const adminUser: User = {
      id: "usr_admin_official",
      nom: "Équipe",
      prenom: "MK Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=admin189&backgroundColor=0f766e",
      promo: "MK Team",
      bio: "Compte d'administration officiel et de modération MK",
      role: "admin",
      isLocked: false,
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      blockedUsers: [],
      createdAt: new Date().toISOString()
    };
    db.users.unshift(adminUser);
    saveDatabase();
  } else {
    existingAdmin.role = "admin";
    existingAdmin.password = ADMIN_PASSWORD;
  }
}

ensureAdminUser();

// Helper to check and expire user ban status
export function checkUserBanStatus(user: User): { isBanned: boolean; message?: string } {
  if (!user.isBanned) return { isBanned: false };
  if (user.banUntil === "permanent") {
    return {
      isBanned: true,
      message: "Votre compte a été banni définitivement par l'administration de MK."
    };
  }
  if (user.banUntil) {
    const banTime = new Date(user.banUntil).getTime();
    if (banTime > Date.now()) {
      return {
        isBanned: true,
        message: `Votre compte est temporairement suspendu par l'administration jusqu'au ${new Date(user.banUntil).toLocaleString("fr-FR")}.`
      };
    } else {
      // Ban has expired!
      user.isBanned = false;
      user.banUntil = null;
      user.banDuration = null;
      user.banReason = undefined;
      saveDatabase();
      return { isBanned: false };
    }
  }
  return { isBanned: true, message: "Votre compte est suspendu par l'administration." };
}
