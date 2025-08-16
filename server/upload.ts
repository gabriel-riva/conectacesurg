import { Request, Response, Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { ObjectStorageService, objectStorageClient } from "./objectStorage.js";
import { randomUUID } from "crypto";

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
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
};

// Configuração do multer para armazenamento em memória (Object Storage)
const storage = multer.memoryStorage();

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Permitir ampla gama de tipos de arquivo
    const allowedTypes = [
      // Imagens
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Texto
      'text/plain',
      'text/csv',
      'text/rtf',
      // Outros
      'application/zip',
      'application/x-rar-compressed',
      'application/json',
      'application/xml',
      'text/xml'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log(`Tipo de arquivo rejeitado: ${file.mimetype} para arquivo: ${file.originalname}`);
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
  }
});

// Endpoint para upload de arquivo único (migrado para Object Storage)
router.post("/", isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }

    console.log(`🔄 UPLOAD GAMIFICAÇÃO: Enviando ${req.file.originalname} para Object Storage`);

    // Criar instância do Object Storage
    const objectStorageService = new ObjectStorageService();

    // Gerar ID único para o arquivo
    const fileId = randomUUID();
    const privateDir = objectStorageService.getPrivateObjectDir();
    const ext = path.extname(req.file.originalname);
    const objectPath = `${privateDir}/challenges/${fileId}${ext}`;

    try {
      // Parse object path para obter bucket e object name
      const { bucketName, objectName } = parseObjectPath(objectPath);
      
      // Upload direto para Object Storage
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const stream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
          metadata: {
            originalName: req.file.originalname,
            uploadedBy: (req.user as any).id.toString(),
            uploadType: 'gamification_challenge'
          }
        }
      });

      await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', resolve);
        stream.end(req.file.buffer);
      });

      // Definir ACL policy
      await objectStorageService.trySetObjectEntityAclPolicy(`/objects/challenges/${fileId}${ext}`, {
        owner: (req.user as any).id.toString(),
        visibility: "private"
      });

      console.log(`✅ UPLOAD GAMIFICAÇÃO: Arquivo ${req.file.originalname} salvo com sucesso no Object Storage`);

      // Retornar URL do arquivo no formato Object Storage
      res.json({
        url: `/objects/challenges/${fileId}${ext}`,
        filename: `${fileId}${ext}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

    } catch (storageError) {
      console.error(`❌ ERRO OBJECT STORAGE GAMIFICAÇÃO:`, storageError);
      throw new Error(`Falha no Object Storage: ${storageError.message}`);
    }

  } catch (error) {
    console.error('Erro no upload de gamificação:', error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para upload de múltiplos arquivos (migrado para Object Storage)
router.post("/multiple", isAuthenticated, upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }

    console.log(`🔄 UPLOAD MÚLTIPLO GAMIFICAÇÃO: Enviando ${req.files.length} arquivos para Object Storage`);

    const objectStorageService = new ObjectStorageService();
    const privateDir = objectStorageService.getPrivateObjectDir();
    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        // Gerar ID único para cada arquivo
        const fileId = randomUUID();
        const ext = path.extname(file.originalname);
        const objectPath = `${privateDir}/challenges/${fileId}${ext}`;

        // Parse object path
        const { bucketName, objectName } = parseObjectPath(objectPath);
        
        // Upload para Object Storage
        const bucket = objectStorageClient.bucket(bucketName);
        const storageFile = bucket.file(objectName);
        
        const stream = storageFile.createWriteStream({
          metadata: {
            contentType: file.mimetype,
            metadata: {
              originalName: file.originalname,
              uploadedBy: (req.user as any).id.toString(),
              uploadType: 'gamification_challenge_multiple'
            }
          }
        });

        await new Promise((resolve, reject) => {
          stream.on('error', reject);
          stream.on('finish', resolve);
          stream.end(file.buffer);
        });

        // Definir ACL policy
        await objectStorageService.trySetObjectEntityAclPolicy(`/objects/challenges/${fileId}${ext}`, {
          owner: (req.user as any).id.toString(),
          visibility: "private"
        });

        uploadedFiles.push({
          url: `/objects/challenges/${fileId}${ext}`,
          filename: `${fileId}${ext}`,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        });

        console.log(`✅ UPLOAD MÚLTIPLO: Arquivo ${file.originalname} salvo no Object Storage`);

      } catch (error) {
        console.error(`❌ ERRO no upload de ${file.originalname}:`, error);
        throw error;
      }
    }
    
    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Erro no upload múltiplo de gamificação:', error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;