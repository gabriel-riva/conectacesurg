import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertCalendarEventSchema } from "@shared/schema";

const router = express.Router();

// Configuração do multer para upload de imagens
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "./uploads";
      // Criar pasta se não existir
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // limite de 5MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar se é uma imagem
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Apenas imagens são permitidas"));
    }
    cb(null, true);
  },
});

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
};

// Middleware para verificar se é administrador
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  
  const user = req.user as any;
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ error: "Sem permissão" });
  }
  
  next();
};

// Buscar todos os eventos
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    
    const events = await storage.getCalendarEvents(includeInactive);
    res.json(events);
  } catch (error) {
    console.error("Erro ao buscar eventos do calendário:", error);
    res.status(500).json({ error: "Erro ao buscar eventos do calendário" });
  }
});

// Buscar próximos eventos (default = 30 dias)
router.get("/upcoming", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    if (isNaN(days) || days < 0 || days > 365) {
      return res.status(400).json({ error: "Parâmetro 'days' inválido. Deve ser um número entre 0 e 365." });
    }
    
    if (limit !== undefined && (isNaN(limit) || limit < 1)) {
      return res.status(400).json({ error: "Parâmetro 'limit' inválido. Deve ser um número positivo." });
    }
    
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    today.setHours(0, 0, 0, 0);
    
    const events = await storage.getUpcomingCalendarEvents(
      today.toISOString().split("T")[0],
      endDate.toISOString().split("T")[0],
      limit
    );
    
    res.json(events);
  } catch (error) {
    console.error("Erro ao buscar próximos eventos:", error);
    res.status(500).json({ error: "Erro ao buscar próximos eventos" });
  }
});

// Buscar evento específico pelo ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    const event = await storage.getCalendarEventById(id);
    
    if (!event) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    
    res.json(event);
  } catch (error) {
    console.error("Erro ao buscar evento:", error);
    res.status(500).json({ error: "Erro ao buscar evento" });
  }
});

// Criar novo evento (apenas admin)
router.post("/", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Parse do corpo da requisição
    const eventData = {
      ...req.body,
      isActive: req.body.isActive === "true",
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      userId: user.id
    };
    
    // Validar dados
    const validData = insertCalendarEventSchema.parse(eventData);
    
    // Criar evento
    const newEvent = await storage.createCalendarEvent(validData);
    
    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    // Remover arquivo de imagem em caso de erro
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Erro ao remover arquivo de imagem:", err);
      }
    }
    
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Erro ao criar evento" });
    }
  }
});

// Atualizar evento existente (apenas admin)
router.put("/:id", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    // Verificar se o evento existe
    const existingEvent = await storage.getCalendarEventById(id);
    
    if (!existingEvent) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    
    // Montar dados para atualização
    const updateData = {
      ...req.body,
      isActive: req.body.isActive === "true",
    };
    
    // Adicionar imageUrl se houver uma nova imagem
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
      
      // Remover imagem antiga se existir
      if (existingEvent.imageUrl && fs.existsSync(`.${existingEvent.imageUrl}`)) {
        try {
          fs.unlinkSync(`.${existingEvent.imageUrl}`);
        } catch (err) {
          console.error("Erro ao remover imagem antiga:", err);
        }
      }
    }
    
    // Atualizar evento
    const updatedEvent = await storage.updateCalendarEvent(id, updateData);
    
    if (!updatedEvent) {
      return res.status(500).json({ error: "Falha ao atualizar o evento" });
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    
    // Remover arquivo de imagem em caso de erro
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Erro ao remover arquivo de imagem:", err);
      }
    }
    
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Erro ao atualizar evento" });
    }
  }
});

// Excluir evento (apenas admin)
router.delete("/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    
    // Verificar se o evento existe
    const event = await storage.getCalendarEventById(id);
    
    if (!event) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }
    
    // Remover imagem associada, se existir
    if (event.imageUrl && fs.existsSync(`.${event.imageUrl}`)) {
      try {
        fs.unlinkSync(`.${event.imageUrl}`);
      } catch (err) {
        console.error("Erro ao remover imagem do evento:", err);
      }
    }
    
    // Excluir evento
    await storage.deleteCalendarEvent(id);
    
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    res.status(500).json({ error: "Erro ao excluir evento" });
  }
});

export default router;