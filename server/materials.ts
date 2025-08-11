import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storage as dbStorage } from "./storage";
import { insertMaterialFolderSchema, insertMaterialFileSchema } from "@shared/schema";
import { z } from "zod";

const router = express.Router();

// Configurar multer para upload de arquivos
const uploadDir = path.join(process.cwd(), "public", "uploads", "materials");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Gerar nome único baseado em hash para evitar conflitos
    const hash = crypto.createHash('md5').update(file.originalname + Date.now() + Math.random()).digest('hex');
    console.log(`📁 Upload de arquivo iniciado - Hash: ${hash}, Original: ${file.originalname}, User: ${(req.user as any)?.name} (${(req.user as any)?.role})`);
    cb(null, hash);
  }
});

const upload = multer({
  storage: multerStorage,
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
  if (!req.user || ((req.user as any).role !== "admin" && (req.user as any).role !== "superadmin")) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
};

// Função para verificar se o usuário tem acesso a uma pasta
const hasAccessToFolder = async (folderId: number, userId: number | undefined, userRole: string) => {
  if (userRole === "admin" || userRole === "superadmin") {
    return true;
  }

  const folder = await dbStorage.getMaterialFolder(folderId);
  if (!folder) return false;

  // Se a pasta é pública, todos têm acesso
  if (folder.isPublic) return true;

  // Se não é pública, verificar se o usuário está nos grupos permitidos
  const userGroups = await dbStorage.getUserGroups(userId);
  const userGroupIds = userGroups.map(g => g.id);
  
  return folder.groupIds.some((groupId: any) => userGroupIds.includes(groupId));
};

// ROTAS PARA PASTAS

// Listar todas as pastas (com controle de acesso)
router.get("/folders", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const folders = await dbStorage.getAllMaterialFolders(userId);
    
    // Filtrar pastas com base no acesso do usuário
    const accessibleFolders = [];
    
    for (const folder of folders) {
      if (userRole === "admin" || userRole === "superadmin") {
        accessibleFolders.push(folder);
      } else if (folder.isPublic) {
        accessibleFolders.push(folder);
      } else {
        // Verificar se o usuário está nos grupos permitidos
        const userGroups = await dbStorage.getUserGroups(userId);
        const userGroupIds = userGroups.map(g => g.id);
        
        if (folder.groupIds.some((groupId: any) => userGroupIds.includes(groupId))) {
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
    
    const folder = await dbStorage.getMaterialFolder(folderId);
    
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
      isPublic: req.body.isPublic === "true" || req.body.isPublic === true,
      groupIds: groupIds,
      imageUrl: req.file ? `/uploads/materials/${req.file.filename}` : null,
    };
    
    // Validar dados
    const validatedData = insertMaterialFolderSchema.parse(folderData);
    
    const folder = await dbStorage.createMaterialFolder(validatedData);
    
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
      isPublic: req.body.isPublic === "true" || req.body.isPublic === true,
      groupIds: groupIds,
    };
    
    if (req.file) {
      folderData.imageUrl = `/uploads/materials/${req.file.filename}`;
    }
    
    const folder = await dbStorage.updateMaterialFolder(folderId, folderData);
    
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
    
    const success = await dbStorage.deleteMaterialFolder(folderId);
    
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
    
    const files = await dbStorage.getAllMaterialFiles(folderId);
    
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
    
    const file = await dbStorage.getMaterialFile(fileId);
    
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

// Upload de arquivo ou link do YouTube (admin apenas)
router.post("/files", isAdmin, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const contentType = req.body.contentType || "file";
    
    if (contentType === "youtube") {
      // Processar link do YouTube
      if (!req.body.youtubeUrl) {
        return res.status(400).json({ error: "URL do YouTube é obrigatória" });
      }
      
      // Validar URL do YouTube
      if (!req.body.youtubeUrl.includes('youtube.com') && !req.body.youtubeUrl.includes('youtu.be')) {
        return res.status(400).json({ error: "URL deve ser do YouTube" });
      }
      
      const fileData = {
        name: req.body.name,
        description: req.body.description,
        folderId: req.body.folderId ? parseInt(req.body.folderId) : null,
        uploaderId: req.user?.id,
        fileUrl: null,
        fileName: null,
        fileType: "video/youtube",
        fileSize: 0,
        contentType: "youtube",
        youtubeUrl: req.body.youtubeUrl,
      };
      
      // Validar dados
      const validatedData = insertMaterialFileSchema.parse(fileData);
      
      const file = await dbStorage.createMaterialFile(validatedData);
      
      res.status(201).json(file);
    } else {
      // Processar arquivo normal
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      
      console.log(`📤 Processando upload de arquivo - Original: ${req.file.originalname}, Hash: ${req.file.filename}, Size: ${req.file.size}, User: ${(req.user as any)?.name} (${(req.user as any)?.role})`);
      
      // PASSO 1: Verificar IMEDIATAMENTE se arquivo foi salvo pelo Multer
      const filePath = path.join(process.cwd(), "public", "uploads", "materials", req.file.filename);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ FALHA CRÍTICA: Multer não salvou o arquivo - Path: ${filePath}`);
        return res.status(500).json({ 
          error: "Falha no upload: arquivo não foi salvo pelo sistema. Verifique configurações." 
        });
      }
      
      // PASSO 2: Verificar integridade do arquivo salvo
      const savedFileSize = fs.statSync(filePath).size;
      if (savedFileSize !== req.file.size) {
        console.error(`❌ FALHA DE INTEGRIDADE: Tamanho divergente - Esperado: ${req.file.size}, Salvo: ${savedFileSize}`);
        // Remover arquivo corrompido
        fs.unlinkSync(filePath);
        return res.status(500).json({ 
          error: "Falha no upload: arquivo corrompido durante salvamento." 
        });
      }
      
      console.log(`✅ Arquivo físico verificado - Path: ${filePath}, Size: ${savedFileSize} bytes`);
      
      // PASSO 3: Só AGORA salvar no banco de dados
      const fileData = {
        name: req.body.name || req.file.originalname,
        description: req.body.description,
        folderId: req.body.folderId ? parseInt(req.body.folderId) : null,
        uploaderId: req.user?.id,
        fileUrl: `/uploads/materials/${req.file.filename}`,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        contentType: "file",
        youtubeUrl: null,
      };
      
      // Validar dados
      const validatedData = insertMaterialFileSchema.parse(fileData);
      
      const file = await dbStorage.createMaterialFile(validatedData);
      
      // Log para auditoria de sucesso completo
      console.log(`🎯 UPLOAD COMPLETO - ID: ${file.id}, Nome: ${file.name}, Hash: ${req.file.filename}, User: ${(req.user as any)?.name} (${(req.user as any)?.role})`);
      
      // PASSO 4: Verificação dupla pós-transação
      if (!fs.existsSync(filePath)) {
        console.error(`❌ ERRO PÓS-TRANSAÇÃO: Arquivo desapareceu após salvar no banco!`);
        
        // ROLLBACK: Remover registro do banco se arquivo físico não existe
        try {
          await dbStorage.deleteMaterialFile(file.id);
          console.log(`🔄 ROLLBACK: Registro removido do banco - ID: ${file.id}`);
          return res.status(500).json({ 
            error: "Falha crítica: arquivo desapareceu após salvamento. Contate o administrador." 
          });
        } catch (rollbackError) {
          console.error("Erro no rollback:", rollbackError);
          return res.status(500).json({ 
            error: "Erro crítico no upload. Contate o administrador." 
          });
        }
      }
      
      res.status(201).json(file);
    }
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
    
    console.log(`📥 Tentativa de download - Arquivo ID: ${fileId}, User: ${(req.user as any)?.name} (${(req.user as any)?.role})`);
    
    const file = await dbStorage.getMaterialFile(fileId);
    
    if (!file) {
      console.log(`❌ Arquivo não encontrado no banco - ID: ${fileId}`);
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Verificar acesso
    if (file.folderId) {
      const hasAccess = await hasAccessToFolder(file.folderId, userId, userRole);
      if (!hasAccess) {
        console.log(`❌ Acesso negado - User: ${(req.user as any)?.name}, Arquivo: ${file.name}, Pasta: ${file.folderId}`);
        return res.status(403).json({ error: "Acesso negado" });
      }
    }
    
    // Construir caminho do arquivo
    const filePath = path.join(process.cwd(), "public", file.fileUrl!);
    console.log(`📂 Verificando arquivo físico - Path: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo físico não encontrado - Path: ${filePath}`);
      
      // Remove o registro órfão do banco de dados
      try {
        await dbStorage.deleteMaterialFile(fileId);
        console.log(`🗑️ Registro órfão removido do banco - ID: ${fileId}`);
      } catch (deleteError) {
        console.error("Erro ao remover registro órfão:", deleteError);
      }
      
      return res.status(404).json({ error: "Arquivo não encontrado no servidor" });
    }
    
    // Incrementar contador de downloads
    await dbStorage.incrementDownloadCount(fileId);
    
    // Log de sucesso
    console.log(`✅ Download autorizado - Arquivo: ${file.name}, User: ${(req.user as any)?.name}`);
    
    // Fix character encoding for download filename
    const encodedFileName = encodeURIComponent(file.fileName!);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}; filename="${file.fileName!}"`);
    res.setHeader('Content-Type', file.fileType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    res.download(filePath, file.fileName!);
  } catch (error) {
    console.error("Erro ao fazer download:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Visualizar arquivo (servir arquivo diretamente)
router.get("/files/:id/view", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const file = await dbStorage.getMaterialFile(fileId);
    
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
    
    // Servir arquivo para visualização
    const filePath = path.join(process.cwd(), "public", file.fileUrl!);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado no servidor" });
    }
    
    // Definir headers apropriados para diferentes tipos de arquivo
    const mimeType = file.fileType || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName!}"`);
    
    // Headers adicionais para PDFs
    if (file.fileType === 'application/pdf') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    }
    
    // Enviar arquivo
    res.sendFile(filePath);
  } catch (error) {
    console.error("Erro ao visualizar arquivo:", error);
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
    
    const file = await dbStorage.updateMaterialFile(fileId, fileData);
    
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
    console.log("🗑️ Tentando deletar arquivo:", req.params.id);
    console.log("👤 Usuário:", req.user);
    
    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      console.error("❌ ID do arquivo inválido:", req.params.id);
      return res.status(400).json({ error: "ID do arquivo inválido" });
    }
    
    const file = await dbStorage.getMaterialFile(fileId);
    console.log("📄 Arquivo encontrado:", file);
    
    if (!file) {
      console.error("❌ Arquivo não encontrado no banco:", fileId);
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Deletar arquivo físico se existir
    if (file.fileUrl && typeof file.fileUrl === 'string') {
      const filePath = path.join(process.cwd(), "public", file.fileUrl!);
      console.log("📁 Tentando deletar arquivo físico:", filePath);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log("✅ Arquivo físico deletado");
        } catch (fsError) {
          console.error("❌ Erro ao deletar arquivo físico:", fsError);
          // Continuar mesmo se não conseguir deletar o arquivo físico
        }
      } else {
        console.log("⚠️ Arquivo físico não encontrado:", filePath);
      }
    } else {
      console.log("⚠️ Arquivo não tem URL física (provavelmente é um link do YouTube)");
    }
    
    const success = await dbStorage.deleteMaterialFile(fileId);
    console.log("🗃️ Resultado da exclusão no banco:", success);
    
    if (!success) {
      console.error("❌ Falha ao deletar arquivo do banco:", fileId);
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    console.log("✅ Arquivo deletado com sucesso");
    res.json({ message: "Arquivo deletado com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao deletar arquivo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Utilitário para verificar integridade dos arquivos (admin apenas)
router.get("/files/integrity-check", isAdmin, async (req: Request, res: Response) => {
  try {
    console.log("🔍 Iniciando verificação de integridade dos arquivos");
    
    const files = await dbStorage.getAllMaterialFiles();
    const results = {
      total: files.length,
      existing: 0,
      missing: 0,
      missingFiles: []
    };
    
    for (const file of files) {
      if (file.fileUrl && file.contentType === "file") {
        const filePath = path.join(process.cwd(), "public", file.fileUrl!);
        
        if (fs.existsSync(filePath)) {
          results.existing++;
          console.log(`✅ Arquivo OK - ID: ${file.id}, Nome: ${file.name}`);
        } else {
          results.missing++;
          results.missingFiles.push({
            id: file.id,
            name: file.name,
            fileUrl: file.fileUrl,
            uploader: file.uploader?.name,
            uploaderRole: file.uploader?.role,
            createdAt: file.createdAt
          });
          console.log(`❌ Arquivo AUSENTE - ID: ${file.id}, Nome: ${file.name}, Path: ${filePath}`);
        }
      }
    }
    
    console.log(`🔍 Verificação concluída - Total: ${results.total}, Existentes: ${results.existing}, Ausentes: ${results.missing}`);
    res.json(results);
  } catch (error) {
    console.error("Erro na verificação de integridade:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Utilitário para limpar entradas órfãs (admin apenas)
router.delete("/files/cleanup-orphaned", isAdmin, async (req: Request, res: Response) => {
  try {
    console.log("🧹 Iniciando limpeza de entradas órfãs");
    
    const files = await dbStorage.getAllMaterialFiles();
    const deletedFiles = [];
    
    for (const file of files) {
      if (file.fileUrl && file.contentType === "file") {
        const filePath = path.join(process.cwd(), "public", file.fileUrl!);
        
        if (!fs.existsSync(filePath)) {
          console.log(`🗑️ Removendo entrada órfã - ID: ${file.id}, Nome: ${file.name}`);
          const success = await dbStorage.deleteMaterialFile(file.id);
          
          if (success) {
            deletedFiles.push({
              id: file.id,
              name: file.name,
              fileUrl: file.fileUrl
            });
          }
        }
      }
    }
    
    console.log(`🧹 Limpeza concluída - ${deletedFiles.length} entradas removidas`);
    res.json({
      message: `${deletedFiles.length} entradas órfãs removidas com sucesso`,
      deletedFiles
    });
  } catch (error) {
    console.error("Erro na limpeza de entradas órfãs:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;