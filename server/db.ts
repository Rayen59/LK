import path from "path";
import fs from "fs";
import { AppDatabase, User } from "../src/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureAdminAccount(users: User[]): boolean {
  const adminEmail = "admin189@gmail.com";
  const adminPass = "admin189";
  const existingAdmin = users.find((u) => u.email.toLowerCase() === adminEmail);

  if (!existingAdmin) {
    users.push({
      id: "usr_admin_mk_master",
      nom: "Administration",
      prenom: "MK",
      email: adminEmail,
      password: adminPass,
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=MK%20Admin&backgroundColor=1e3a8a",
      promo: "Direction & Modération",
      bio: "Compte officiel de supervision et de modération de la plateforme MK.",
      role: "admin",
      isLocked: false,
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      blockedUsers: [],
      createdAt: new Date().toISOString()
    });
    return true;
  } else {
    let modified = false;
    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      modified = true;
    }
    if (existingAdmin.password !== adminPass) {
      existingAdmin.password = adminPass;
      modified = true;
    }
    if (existingAdmin.isBanned) {
      existingAdmin.isBanned = false;
      existingAdmin.banUntil = null;
      modified = true;
    }
    return modified;
  }
}

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
    notifications: [],
    reports: []
  };

  if (!fs.existsSync(DB_FILE)) {
    ensureAdminAccount(blankDb.users);
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

    const adminUpdated = ensureAdminAccount(users);

    const loadedDb: AppDatabase = {
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
      notifications: parsed.notifications || [],
      reports: parsed.reports || []
    };

    if (adminUpdated || !parsed.reports) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(loadedDb, null, 2), "utf-8");
      } catch {
        // Ignore write error on init
      }
    }

    return loadedDb;
  } catch (err) {
    console.error("Error reading db.json, reinitializing blank db", err);
    ensureAdminAccount(blankDb.users);
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

// Helper to check and expire user ban status
export function checkUserBanStatus(user: User): { isBanned: boolean; message?: string } {
  if (!user.isBanned) return { isBanned: false };
  if (user.banUntil === "permanent") {
    return {
      isBanned: true,
      message: `Votre compte a été banni définitivement par l'administration de MK.${user.banReason ? ` Motif : ${user.banReason}` : ""}`
    };
  }
  if (user.banUntil) {
    const banTime = new Date(user.banUntil).getTime();
    if (banTime > Date.now()) {
      return {
        isBanned: true,
        message: `Votre compte est temporairement suspendu par l'administration jusqu'au ${new Date(user.banUntil).toLocaleString("fr-FR")}.${user.banReason ? ` Motif : ${user.banReason}` : ""}`
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
