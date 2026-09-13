import { Router, Request, Response } from "express";
import { SpaceFolder } from "../../src/types";
import { db, saveDatabase } from "../db";

export const spacesRouter = Router();

// Get user spaces
spacesRouter.get("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const userSpaces = db.spaces.filter((s) => s.userId === token);
  res.json({ spaces: userSpaces });
});

// Create space / dossier
spacesRouter.post("/", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = db.users.find((u) => u.id === token);
  if (!user) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const { name, category, description, color } = req.body;
  if (!name) {
    res.status(400).json({ error: "Le nom de l'espace est requis." });
    return;
  }

  const newSpace: SpaceFolder = {
    id: "spc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    name: name.trim(),
    category: category ? category.trim() : "Général",
    description: description || "",
    color: color || "#0d9488",
    postIds: [],
    createdAt: new Date().toISOString()
  };

  db.spaces.push(newSpace);
  saveDatabase();
  res.status(201).json({ space: newSpace });
});

// Edit space
spacesRouter.put("/:id", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const space = db.spaces.find((s) => s.id === req.params.id && s.userId === token);
  if (!space) {
    res.status(404).json({ error: "Espace non trouvé." });
    return;
  }

  const { name, category, description, color } = req.body;
  if (name) space.name = name.trim();
  if (category) space.category = category.trim();
  if (description !== undefined) space.description = description;
  if (color) space.color = color;

  saveDatabase();
  res.json({ space });
});

// Delete space
spacesRouter.delete("/:id", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const index = db.spaces.findIndex((s) => s.id === req.params.id && s.userId === token);
  if (index === -1) {
    res.status(404).json({ error: "Espace non trouvé." });
    return;
  }

  db.spaces.splice(index, 1);
  saveDatabase();
  res.json({ success: true });
});

// Add post to space
spacesRouter.post("/:id/add-post", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const space = db.spaces.find((s) => s.id === req.params.id && s.userId === token);
  if (!space) {
    res.status(404).json({ error: "Espace non trouvé." });
    return;
  }

  const { postId } = req.body;
  if (!postId) {
    res.status(400).json({ error: "ID de la publication requis." });
    return;
  }

  if (!space.postIds.includes(postId)) {
    space.postIds.push(postId);
    saveDatabase();
  }

  res.json({ space });
});

// Remove post from space
spacesRouter.delete("/:id/remove-post/:postId", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const space = db.spaces.find((s) => s.id === req.params.id && s.userId === token);
  if (!space) {
    res.status(404).json({ error: "Espace non trouvé." });
    return;
  }

  space.postIds = space.postIds.filter((id) => id !== req.params.postId);
  saveDatabase();
  res.json({ space });
});
