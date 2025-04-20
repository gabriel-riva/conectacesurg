import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuração do multer para armazenamento de arquivos
const storage = multer.diskStorage({
  destination: function(_req, _file, cb) {
    // Garante que o diretório existe
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(_req, file, cb) {
    // Gera um nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filtro para tipos de arquivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceita apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Configure o upload com limites
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Não autorizado' });
};

// Endpoint para upload de imagens
router.post('/image', isAuthenticated, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado ou tipo de arquivo inválido' });
  }

  // Constrói a URL do arquivo
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const relativePath = `/uploads/${req.file.filename}`;
  const fileUrl = `${baseUrl}${relativePath}`;

  // Retorna a URL do arquivo para o TinyMCE
  res.json({
    location: fileUrl,
    success: true
  });
});

export default router;