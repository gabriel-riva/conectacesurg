import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { insertUtilityLinkSchema } from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Session } from "express-session";

// Extensão da interface Session para incluir user
declare module "express-session" {
  interface Session {
    user?: {
      id: number;
      role: string;
      name: string;
      email: string;
    };
  }
}

const router = Router();

// Configuração para upload de arquivos
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads", "logos");
      // Garantir que o diretório existe
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);
      const fileName = `${randomUUID()}${fileExt}`;
      cb(null, fileName);
    },
  }),
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // limite de 5MB
  },
});

// Middleware para verificar se o usuário é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  
  const user = req.user as any;
  if (user.role === "admin" || user.role === "superadmin") {
    return next();
  }
  
  return res.status(403).json({ error: "Acesso negado. Permissão de administrador necessária." });
};

// Obter todos os links úteis (disponível para todos os usuários)
router.get("/", async (req: Request, res: Response) => {
  try {
    const links = await storage.getAllUtilityLinks();
    // Filtrar apenas links ativos para usuários regulares
    if (req.isAuthenticated()) {
      const user = req.user as any;
      if (user.role === "admin" || user.role === "superadmin") {
        return res.json(links);
      }
    }
    return res.json(links.filter(link => link.isActive));
  } catch (error) {
    console.error("Erro ao buscar links úteis:", error);
    return res.status(500).json({ error: "Erro ao buscar links úteis" });
  }
});

// Obter um link útil específico pelo ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const link = await storage.getUtilityLink(id);
    if (!link) {
      return res.status(404).json({ error: "Link não encontrado" });
    }

    // Verificar se o link está ativo ou se o usuário é admin
    if (!link.isActive && !(req.session.user && (req.session.user.role === "admin" || req.session.user.role === "superadmin"))) {
      return res.status(404).json({ error: "Link não encontrado" });
    }

    return res.json(link);
  } catch (error) {
    console.error("Erro ao buscar link útil:", error);
    return res.status(500).json({ error: "Erro ao buscar link útil" });
  }
});

// Criar um novo link útil (apenas admin)
router.post("/", isAdmin, upload.single("logo"), async (req: Request, res: Response) => {
  try {
    const { title, url, order } = req.body;
    
    // Validar os dados
    const result = insertUtilityLinkSchema.safeParse({
      title,
      url,
      order: order ? parseInt(order) : 0,
      logoUrl: req.file ? `/uploads/logos/${req.file.filename}` : undefined,
      isActive: true,
    });

    if (!result.success) {
      return res.status(400).json({ error: "Dados inválidos", details: result.error.errors });
    }

    // Criar o link
    const newLink = await storage.createUtilityLink(result.data);
    return res.status(201).json(newLink);
  } catch (error) {
    console.error("Erro ao criar link útil:", error);
    return res.status(500).json({ error: "Erro ao criar link útil" });
  }
});

// Atualizar um link útil existente (apenas admin)
router.put("/:id", isAdmin, upload.single("logo"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Verificar se o link existe
    const existingLink = await storage.getUtilityLink(id);
    if (!existingLink) {
      return res.status(404).json({ error: "Link não encontrado" });
    }

    // Preparar dados de atualização
    const updateData: any = {};
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.url) updateData.url = req.body.url;
    if (req.body.order !== undefined) updateData.order = parseInt(req.body.order);
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === "true";
    if (req.file) updateData.logoUrl = `/uploads/logos/${req.file.filename}`;

    // Atualizar o link
    const updatedLink = await storage.updateUtilityLink(id, updateData);
    return res.json(updatedLink);
  } catch (error) {
    console.error("Erro ao atualizar link útil:", error);
    return res.status(500).json({ error: "Erro ao atualizar link útil" });
  }
});

// Excluir um link útil (apenas admin)
router.delete("/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Verificar se o link existe
    const existingLink = await storage.getUtilityLink(id);
    if (!existingLink) {
      return res.status(404).json({ error: "Link não encontrado" });
    }

    // Excluir o link
    const deleted = await storage.deleteUtilityLink(id);
    if (!deleted) {
      return res.status(500).json({ error: "Erro ao excluir link útil" });
    }

    // Se tiver logo, excluir o arquivo
    if (existingLink.logoUrl) {
      try {
        const logoPath = path.join(process.cwd(), existingLink.logoUrl.replace("/", ""));
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      } catch (err) {
        console.error("Erro ao excluir arquivo de logo:", err);
        // Continuar mesmo se falhar ao excluir o arquivo
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir link útil:", error);
    return res.status(500).json({ error: "Erro ao excluir link útil" });
  }
});

export default router;