import { Request, Response, Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

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

// Endpoint para upload de arquivo único
router.post("/", upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }

    // Retornar URL do arquivo
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para upload de múltiplos arquivos
router.post("/multiple", upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }

    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Erro no upload múltiplo:', error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;