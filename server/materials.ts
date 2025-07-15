import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertMaterialFolderSchema, insertMaterialFileSchema } from "@shared/schema";
import { z } from "zod";

const router = express.Router();

// Configurar multer para upload de arquivos
const uploadDir = path.join(process.cwd(), "public", "uploads", "materials");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Permitir todos os tipos de arquivo
    cb(null, true);
  },
});

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
};

// Middleware para verificar se é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
};

// Função para verificar se o usuário tem acesso a uma pasta
const hasAccessToFolder = async (folderId: number, userId: number, userRole: string) => {
  if (userRole === "admin" || userRole === "superadmin") {
    return true;
  }

  const folder = await storage.getMaterialFolder(folderId);
  if (!folder) return false;

  // Se a pasta é pública, todos têm acesso
  if (folder.isPublic) return true;

  // Se não é pública, verificar se o usuário está nos grupos permitidos
  const userGroups = await storage.getUserGroups(userId);
  const userGroupIds = userGroups.map(g => g.id);
  
  return folder.groupIds.some(groupId => userGroupIds.includes(groupId));
};

// ROTAS PARA PASTAS

// Listar todas as pastas (com controle de acesso)
router.get("/folders", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const folders = await storage.getAllMaterialFolders(userId);
    
    // Filtrar pastas com base no acesso do usuário
    const accessibleFolders = [];
    
    for (const folder of folders) {
      if (userRole === "admin" || userRole === "superadmin") {
        accessibleFolders.push(folder);
      } else if (folder.isPublic) {
        accessibleFolders.push(folder);
      } else {
        // Verificar se o usuário está nos grupos permitidos
        const userGroups = await storage.getUserGroups(userId);
        const userGroupIds = userGroups.map(g => g.id);
        
        if (folder.groupIds.some(groupId => userGroupIds.includes(groupId))) {
          accessibleFolders.push(folder);
        }
      }
    }
    
    res.json(accessibleFolders);
  } catch (error) {
    console.error("Erro ao buscar pastas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar pasta específica
router.get("/folders/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const folderId = parseInt(req.params.id);
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const folder = await storage.getMaterialFolder(folderId);
    
    if (!folder) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }
    
    // Verificar acesso
    const hasAccess = await hasAccessToFolder(folderId, userId, userRole);
    
    if (!hasAccess) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    
    res.json(folder);
  } catch (error) {
    console.error("Erro ao buscar pasta:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Criar nova pasta (admin apenas)
router.post("/folders", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    let groupIds: number[] = [];
    if (req.body.groupIds) {
      if (typeof req.body.groupIds === 'string') {
        if (req.body.groupIds.trim() !== '') {
          try {
            groupIds = JSON.parse(req.body.groupIds);
          } catch (e) {
            console.error("Erro ao fazer parse dos groupIds:", e);
            groupIds = [];
          }
        }
      } else if (Array.isArray(req.body.groupIds)) {
        groupIds = req.body.groupIds;
      }
    }
    
    const folderData = {
      name: req.body.name,
      description: req.body.description,
      parentId: req.body.parentId ? parseInt(req.body.parentId) : null,
      creatorId: req.user?.id,
      isPublic: req.body.isPublic === "true",
      groupIds: groupIds,
      imageUrl: req.file ? `/uploads/materials/${req.file.filename}` : null,
    };
    
    // Validar dados
    const validatedData = insertMaterialFolderSchema.parse(folderData);
    
    const folder = await storage.createMaterialFolder(validatedData);
    
    res.status(201).json(folder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Erro ao criar pasta:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Atualizar pasta (admin apenas)
router.put("/folders/:id", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const folderId = parseInt(req.params.id);
    
    let groupIds: number[] = [];
    if (req.body.groupIds) {
      if (typeof req.body.groupIds === 'string') {
        if (req.body.groupIds.trim() !== '') {
          try {
            groupIds = JSON.parse(req.body.groupIds);
          } catch (e) {
            console.error("Erro ao fazer parse dos groupIds:", e);
            groupIds = [];
          }
        }
      } else if (Array.isArray(req.body.groupIds)) {
        groupIds = req.body.groupIds;
      }
    }
    
    const folderData: any = {
      name: req.body.name,
      description: req.body.description,
      parentId: req.body.parentId ? parseInt(req.body.parentId) : null,
      isPublic: req.body.isPublic === "true",
      groupIds: groupIds,
    };
    
    if (req.file) {
      folderData.imageUrl = `/uploads/materials/${req.file.filename}`;
    }
    
    const folder = await storage.updateMaterialFolder(folderId, folderData);
    
    if (!folder) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }
    
    res.json(folder);
  } catch (error) {
    console.error("Erro ao atualizar pasta:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Deletar pasta (admin apenas)
router.delete("/folders/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const folderId = parseInt(req.params.id);
    
    const success = await storage.deleteMaterialFolder(folderId);
    
    if (!success) {
      return res.status(404).json({ error: "Pasta não encontrada" });
    }
    
    res.json({ message: "Pasta deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar pasta:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ROTAS PARA ARQUIVOS

// Listar arquivos (com controle de acesso)
router.get("/files", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const files = await storage.getAllMaterialFiles(folderId);
    
    // Filtrar arquivos com base no acesso do usuário
    const accessibleFiles = [];
    
    for (const file of files) {
      if (file.folderId) {
        const hasAccess = await hasAccessToFolder(file.folderId, userId, userRole);
        if (hasAccess) {
          accessibleFiles.push(file);
        }
      } else {
        // Arquivos sem pasta são públicos
        accessibleFiles.push(file);
      }
    }
    
    res.json(accessibleFiles);
  } catch (error) {
    console.error("Erro ao buscar arquivos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar arquivo específico
router.get("/files/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const file = await storage.getMaterialFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Verificar acesso
    if (file.folderId) {
      const hasAccess = await hasAccessToFolder(file.folderId, userId, userRole);
      if (!hasAccess) {
        return res.status(403).json({ error: "Acesso negado" });
      }
    }
    
    res.json(file);
  } catch (error) {
    console.error("Erro ao buscar arquivo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Upload de arquivo (admin apenas)
router.post("/files", isAdmin, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }
    
    const fileData = {
      name: req.body.name || req.file.originalname,
      description: req.body.description,
      folderId: req.body.folderId ? parseInt(req.body.folderId) : null,
      uploaderId: req.user?.id,
      fileUrl: `/uploads/materials/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    };
    
    // Validar dados
    const validatedData = insertMaterialFileSchema.parse(fileData);
    
    const file = await storage.createMaterialFile(validatedData);
    
    res.status(201).json(file);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Erro ao fazer upload:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Download de arquivo
router.get("/files/:id/download", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const file = await storage.getMaterialFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Verificar acesso
    if (file.folderId) {
      const hasAccess = await hasAccessToFolder(file.folderId, userId, userRole);
      if (!hasAccess) {
        return res.status(403).json({ error: "Acesso negado" });
      }
    }
    
    // Incrementar contador de downloads
    await storage.incrementDownloadCount(fileId);
    
    // Servir arquivo
    const filePath = path.join(process.cwd(), "public", file.fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado no servidor" });
    }
    
    res.download(filePath, file.fileName);
  } catch (error) {
    console.error("Erro ao fazer download:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Atualizar arquivo (admin apenas)
router.put("/files/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    
    const fileData = {
      name: req.body.name,
      description: req.body.description,
      folderId: req.body.folderId ? parseInt(req.body.folderId) : null,
    };
    
    const file = await storage.updateMaterialFile(fileId, fileData);
    
    if (!file) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    res.json(file);
  } catch (error) {
    console.error("Erro ao atualizar arquivo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Deletar arquivo (admin apenas)
router.delete("/files/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    
    const file = await storage.getMaterialFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Deletar arquivo físico
    const filePath = path.join(process.cwd(), "public", file.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    const success = await storage.deleteMaterialFile(fileId);
    
    if (!success) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    res.json({ message: "Arquivo deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar arquivo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;