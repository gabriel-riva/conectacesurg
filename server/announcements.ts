import { Request, Response, Router } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { insertAnnouncementSchema } from "@shared/schema";
import multer from "multer";
import path from "path";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: "public/uploads/announcements/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."));
    }
  },
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
};

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && (req.user as any).role === "admin" || (req.user as any).role === "superadmin") {
    return next();
  }
  res.status(403).json({ error: "Admin access required" });
};

// GET /api/announcements - Get all announcements (admin only can include inactive)
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const includeInactive = user.role === "admin" || user.role === "superadmin" ? req.query.includeInactive === "true" : false;
    
    const announcements = await storage.getAllAnnouncements(includeInactive);
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// GET /api/announcements/active - Get active announcements for public display
router.get("/active", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const announcements = await storage.getActiveAnnouncements(limit);
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching active announcements:", error);
    res.status(500).json({ error: "Failed to fetch active announcements" });
  }
});

// GET /api/announcements/:id - Get announcement by ID
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid announcement ID" });
    }

    const announcement = await storage.getAnnouncementById(id);
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(announcement);
  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json({ error: "Failed to fetch announcement" });
  }
});

// POST /api/announcements - Create new announcement (admin only)
router.post("/", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Validate request body
    const announcementData = {
      ...req.body,
      creatorId: user.id,
      priority: req.body.priority ? parseInt(req.body.priority) : 1,
      isActive: req.body.isActive === "true",
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
    };

    // Handle image upload
    if (req.file) {
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
      const imagePath = `/uploads/announcements/${fileName}`;
      
      // Move file to correct location with proper name
      const fs = require("fs");
      const oldPath = req.file.path;
      const newPath = path.join("public", imagePath);
      fs.renameSync(oldPath, newPath);
      
      announcementData.imageUrl = imagePath;
    }

    const validatedData = insertAnnouncementSchema.parse(announcementData);
    const announcement = await storage.createAnnouncement(validatedData);
    
    res.status(201).json(announcement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid announcement data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// PUT /api/announcements/:id - Update announcement (admin only)
router.put("/:id", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid announcement ID" });
    }

    const updateData: any = {
      ...req.body,
      priority: req.body.priority ? parseInt(req.body.priority) : undefined,
      isActive: req.body.isActive !== undefined ? req.body.isActive === "true" : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    };

    // Handle image upload
    if (req.file) {
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
      const imagePath = `/uploads/announcements/${fileName}`;
      
      // Move file to correct location with proper name
      const fs = require("fs");
      const oldPath = req.file.path;
      const newPath = path.join("public", imagePath);
      fs.renameSync(oldPath, newPath);
      
      updateData.imageUrl = imagePath;
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const announcement = await storage.updateAnnouncement(id, updateData);
    
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(announcement);
  } catch (error) {
    console.error("Error updating announcement:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid announcement data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

// DELETE /api/announcements/:id - Delete announcement (admin only)
router.delete("/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid announcement ID" });
    }

    const success = await storage.deleteAnnouncement(id);
    
    if (!success) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;