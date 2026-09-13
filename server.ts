import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { handleSseRoute } from "./server/realtime";
import { authRouter } from "./server/routes/auth";
import { postsRouter } from "./server/routes/posts";
import { socialRouter } from "./server/routes/social";
import { friendsRouter } from "./server/routes/friends";
import { chatRouter } from "./server/routes/chat";
import { reelsRouter } from "./server/routes/reels";
import { spacesRouter } from "./server/routes/spaces";
import { forumsRouter } from "./server/routes/forums";
import { quizzesRouter, getGlobalLeaderboard } from "./server/routes/quizzes";
import { pollsRouter } from "./server/routes/polls";
import { notificationsRouter } from "./server/routes/notifications";
import { adminRouter } from "./server/routes/admin";

const app = express();
const PORT = 3000;

// High body limits for media uploads (audio, video, documents, images)
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ limit: "60mb", extended: true }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "MK Social" });
});

// SSE live stream endpoint for real-time broadcasts
app.get("/api/live", handleSseRoute);

// Dedicated API Routers
app.use("/api/auth", authRouter);
app.use("/api/posts", postsRouter);
app.use("/api/users", socialRouter);
app.use("/api/friends", friendsRouter);
app.use("/api", chatRouter);
app.use("/api/reels", reelsRouter);
app.use("/api/spaces", spacesRouter);
app.use("/api/forums", forumsRouter);
app.use("/api/quizzes", quizzesRouter);
app.get("/api/leaderboard/global", getGlobalLeaderboard);
app.use("/api/polls", pollsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);

// Vite middleware & Production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur MK opérationnel sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
