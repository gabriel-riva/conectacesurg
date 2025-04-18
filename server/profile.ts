import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { UpdateProfile, updateProfileSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";

// Configuração do multer para upload de arquivos
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = file.fieldname === "photo" ? "uploads/photos" : "uploads/documents";
    
    // Criar pasta se não existir
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    // Gera um nome de arquivo único baseado no timestamp e nome original
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  }
});

// Filtro para tipos de arquivos permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === "photo") {
    // Para fotos, aceita apenas imagens
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  } else if (file.fieldname === "documents") {
    // Para documentos, aceita PDFs, imagens e documentos comuns
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage: storage_config,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

const router = Router();

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
  }
  next();
};

// Rota para obter dados do perfil do usuário
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    // Remove campos sensíveis
    const { password, ...userProfile } = user;
    
    res.json(userProfile);
  } catch (error) {
    console.error("Erro ao obter perfil:", error);
    res.status(500).json({ error: "Erro ao obter dados do perfil" });
  }
});

// Rota para atualizar dados básicos do perfil
router.put('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    
    try {
      // Validar dados com Zod
      const profileData = updateProfileSchema.parse(req.body);
      
      // Atualizar no banco de dados
      const updatedUser = await storage.updateUser(userId, profileData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Remove campos sensíveis
      const { password, ...userProfile } = updatedUser;
      
      res.json(userProfile);
    } catch (error) {
      console.error("Erro de validação:", error);
      res.status(400).json({ error: "Dados inválidos", details: error });
    }
    
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res.status(500).json({ error: "Erro ao atualizar dados do perfil" });
  }
});

// Rota para upload de foto de perfil
router.post('/photo', isAuthenticated, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: "Nenhuma foto enviada ou formato inválido" });
    }
    
    // Caminho relativo para acessar a foto
    const photoUrl = `/uploads/photos/${file.filename}`;
    
    // Atualizar o URL da foto no banco de dados
    const updatedUser = await storage.updateUser(userId, { photoUrl });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    res.json({ success: true, photoUrl });
    
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    res.status(500).json({ error: "Erro ao atualizar foto de perfil" });
  }
});

// Rota para upload de documentos
router.post('/documents', isAuthenticated, upload.array('documents', 5), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const files = req.files as Express.Multer.File[];
    const descriptions = Array.isArray(req.body.descriptions) 
      ? req.body.descriptions 
      : [req.body.descriptions];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Nenhum documento enviado ou formato inválido" });
    }
    
    // Buscar o usuário atual para obter documentos existentes
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    // Criar array com os novos documentos
    const newDocuments = files.map((file, index) => {
      return {
        name: file.originalname,
        url: `/uploads/documents/${file.filename}`,
        type: file.mimetype,
        description: descriptions[index] || ''
      };
    });
    
    // Combinar documentos existentes com novos
    const documents = [
      ...(user.documents || []),
      ...newDocuments
    ];
    
    // Atualizar documentos no banco de dados
    const updatedUser = await storage.updateUser(userId, { documents });
    
    res.json({ 
      success: true, 
      documents: newDocuments,
      totalDocuments: documents.length
    });
    
  } catch (error) {
    console.error("Erro ao fazer upload de documentos:", error);
    res.status(500).json({ error: "Erro ao atualizar documentos" });
  }
});

// Rota para excluir um documento
router.delete('/documents/:index', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const index = parseInt(req.params.index);
    
    // Buscar o usuário atual
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    // Verificar se o documento existe
    if (!user.documents || index >= user.documents.length) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }
    
    // Obter o caminho do arquivo para exclusão
    const documentToDelete = user.documents[index];
    const filePath = path.join(process.cwd(), documentToDelete.url.slice(1)); // Remover a barra inicial
    
    // Remover o documento do array
    const documents = user.documents.filter((_, i) => i !== index);
    
    // Atualizar documentos no banco de dados
    const updatedUser = await storage.updateUser(userId, { documents });
    
    // Tentar excluir o arquivo físico (ignorando erros)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn("Aviso: Não foi possível excluir o arquivo físico", err);
    }
    
    res.json({ 
      success: true, 
      message: "Documento excluído com sucesso",
      remainingDocuments: documents.length
    });
    
  } catch (error) {
    console.error("Erro ao excluir documento:", error);
    res.status(500).json({ error: "Erro ao excluir documento" });
  }
});

export default router;