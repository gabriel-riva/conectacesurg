import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { InsertCalendarEvent, insertCalendarEventSchema } from "@shared/schema";
import multer from "multer";
import { ZodError } from "zod";
import path from "path";
import fs from "fs";

const router = Router();

// Configuração do multer para upload de imagens
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads/calendar");
    
    // Criar pasta se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome de arquivo único
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `event-${uniqueSuffix}${ext}`);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage_multer,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
};

// Middleware para verificar se o usuário é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.session && req.session.user && (req.session.user.role === "admin" || req.session.user.role === "superadmin")) {
    return next();
  }
  return res.status(403).json({ error: "Acesso negado. Apenas administradores podem executar esta ação." });
};

// Obter todos os eventos do calendário
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    // Se o usuário for admin, pode ver eventos inativos também
    const isAdminUser = req.session?.user?.role === "admin" || req.session?.user?.role === "superadmin";
    
    const events = await storage.getAllCalendarEvents(isAdminUser ? includeInactive : false);
    res.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: "Erro ao buscar eventos do calendário" });
  }
});

// Obter eventos do calendário futuros
router.get("/upcoming", async (req: Request, res: Response) => {
  try {
    const events = await storage.getUpcomingCalendarEvents();
    res.json(events);
  } catch (error) {
    console.error("Error fetching upcoming calendar events:", error);
    res.status(500).json({ error: "Erro ao buscar eventos futuros do calendário" });
  }
});

// Obter um evento específico do calendário
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: "ID do evento inválido" });
    }
    
    const event = await storage.getCalendarEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    
    res.json(event);
  } catch (error) {
    console.error("Error fetching calendar event:", error);
    res.status(500).json({ error: "Erro ao buscar evento do calendário" });
  }
});

// Criar um novo evento no calendário (admin)
router.post("/", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    // Extrair dados do formulário
    const eventData: Partial<InsertCalendarEvent> = {
      title: req.body.title,
      description: req.body.description,
      eventDate: req.body.eventDate,
      eventTime: req.body.eventTime,
      location: req.body.location,
      creatorId: req.session!.user!.id,
      isActive: req.body.isActive === "true" || req.body.isActive === true,
    };
    
    // Adicionar URL da imagem se foi enviada
    if (req.file) {
      eventData.imageUrl = `/uploads/calendar/${req.file.filename}`;
    }
    
    // Validar dados
    try {
      insertCalendarEventSchema.parse(eventData);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors 
        });
      }
      throw error;
    }
    
    // Criar evento
    const newEvent = await storage.createCalendarEvent(eventData as InsertCalendarEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({ error: "Erro ao criar evento do calendário" });
  }
});

// Atualizar um evento do calendário (admin)
router.put("/:id", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: "ID do evento inválido" });
    }
    
    // Verificar se o evento existe
    const existingEvent = await storage.getCalendarEvent(eventId);
    if (!existingEvent) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    
    // Extrair dados do formulário
    const eventData: Partial<InsertCalendarEvent> = {};
    
    if (req.body.title) eventData.title = req.body.title;
    if (req.body.description) eventData.description = req.body.description;
    if (req.body.eventDate) eventData.eventDate = req.body.eventDate;
    if (req.body.eventTime) eventData.eventTime = req.body.eventTime;
    if (req.body.location) eventData.location = req.body.location;
    if (req.body.isActive !== undefined) {
      eventData.isActive = req.body.isActive === "true" || req.body.isActive === true;
    }
    
    // Adicionar URL da imagem se foi enviada
    if (req.file) {
      eventData.imageUrl = `/uploads/calendar/${req.file.filename}`;
      
      // Remover imagem antiga
      if (existingEvent.imageUrl) {
        const oldImagePath = path.join(process.cwd(), existingEvent.imageUrl.replace(/^\//, ""));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    // Atualizar evento
    const updatedEvent = await storage.updateCalendarEvent(eventId, eventData);
    if (!updatedEvent) {
      return res.status(500).json({ error: "Erro ao atualizar evento do calendário" });
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating calendar event:", error);
    res.status(500).json({ error: "Erro ao atualizar evento do calendário" });
  }
});

// Excluir um evento do calendário (admin)
router.delete("/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: "ID do evento inválido" });
    }
    
    // Verificar se o evento existe
    const existingEvent = await storage.getCalendarEvent(eventId);
    if (!existingEvent) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    
    // Remover imagem associada
    if (existingEvent.imageUrl) {
      const imagePath = path.join(process.cwd(), existingEvent.imageUrl.replace(/^\//, ""));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Excluir evento
    const deleted = await storage.deleteCalendarEvent(eventId);
    if (!deleted) {
      return res.status(500).json({ error: "Erro ao excluir evento do calendário" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    res.status(500).json({ error: "Erro ao excluir evento do calendário" });
  }
});

export default router;