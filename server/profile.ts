import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { UpdateProfile, updateProfileSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import { ObjectStorageService, objectStorageClient } from "./objectStorage.js";
import { randomUUID } from "crypto";

// Configuração do multer para armazenamento em memória (Object Storage)
const storage_config = multer.memoryStorage();

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
    fileSize: 10 * 1024 * 1024, // 10MB para Object Storage
  }
});

// Função utilitária para parse do object path
function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

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

// Rota para upload de foto de perfil - OBJECT STORAGE
router.post('/photo', isAuthenticated, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: "Nenhuma foto enviada ou formato inválido" });
    }

    console.log(`🔄 UPLOAD FOTO PERFIL: Enviando ${file.originalname} para Object Storage`);

    // Upload para Object Storage
    const objectStorageService = new ObjectStorageService();
    const fileId = randomUUID();
    const ext = path.extname(file.originalname);
    const privateDir = objectStorageService.getPrivateObjectDir();
    const objectPath = `${privateDir}/profile/photos/${fileId}${ext}`;

    // Parse object path para obter bucket e object name
    const { bucketName, objectName } = parseObjectPath(objectPath);
    
    // Upload direto para Object Storage
    const bucket = objectStorageClient.bucket(bucketName);
    const storageFile = bucket.file(objectName);
    
    await storageFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedBy: userId.toString(),
          uploadType: 'profile_photo'
        }
      }
    });

    // Definir ACL policy (foto pública)
    await objectStorageService.trySetObjectEntityAclPolicy(`/objects/profile/photos/${fileId}${ext}`, {
      owner: userId.toString(),
      visibility: "public" // Fotos de perfil são públicas
    });

    const photoUrl = `/objects/profile/photos/${fileId}${ext}`;
    
    // Atualizar o URL da foto no banco de dados
    const updatedUser = await storage.updateUser(userId, { photoUrl });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    console.log(`✅ UPLOAD FOTO PERFIL: Foto ${file.originalname} salva no Object Storage`);
    res.json({ success: true, photoUrl });
    
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    res.status(500).json({ error: "Erro ao atualizar foto de perfil - Object Storage" });
  }
});

// Rota para upload de documentos - OBJECT STORAGE
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

    console.log(`🔄 UPLOAD DOCUMENTOS PERFIL: Enviando ${files.length} documentos para Object Storage`);
    
    // Buscar o usuário atual para obter documentos existentes
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const objectStorageService = new ObjectStorageService();
    const privateDir = objectStorageService.getPrivateObjectDir();
    const newDocuments = [];
    
    // Upload cada documento para Object Storage
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const fileId = randomUUID();
      const ext = path.extname(file.originalname);
      const objectPath = `${privateDir}/profile/documents/${fileId}${ext}`;

      // Parse object path
      const { bucketName, objectName } = parseObjectPath(objectPath);
      
      // Upload para Object Storage
      const bucket = objectStorageClient.bucket(bucketName);
      const storageFile = bucket.file(objectName);
      
      await storageFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedBy: userId.toString(),
            uploadType: 'profile_document'
          }
        }
      });

      // Definir ACL policy (documento privado)
      await objectStorageService.trySetObjectEntityAclPolicy(`/objects/profile/documents/${fileId}${ext}`, {
        owner: userId.toString(),
        visibility: "private" // Documentos são privados
      });

      newDocuments.push({
        name: file.originalname,
        url: `/objects/profile/documents/${fileId}${ext}`,
        type: file.mimetype,
        description: descriptions[index] || ''
      });
    }
    
    // Combinar documentos existentes com novos
    const documents = [
      ...(user.documents || []),
      ...newDocuments
    ];
    
    // Atualizar documentos no banco de dados
    const updatedUser = await storage.updateUser(userId, { documents });

    console.log(`✅ UPLOAD DOCUMENTOS PERFIL: ${files.length} documentos salvos no Object Storage`);
    
    res.json({ 
      success: true, 
      documents: newDocuments,
      totalDocuments: documents.length
    });
    
  } catch (error) {
    console.error("Erro ao fazer upload de documentos:", error);
    res.status(500).json({ error: "Erro ao atualizar documentos - Object Storage" });
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