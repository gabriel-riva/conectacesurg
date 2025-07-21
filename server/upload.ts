import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/feedback';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por arquivo
    files: 5 // Máximo 5 arquivos por upload
  }
});

// Middleware para verificar se o usuário está logado ou permite anônimo
const requireAuthOrAnonymous = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Para uploads de feedback, permitimos tanto usuários logados quanto anônimos
  next();
};

// POST /api/upload/feedback-images - Upload de imagens para feedback
router.post('/feedback-images', requireAuthOrAnonymous, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      fileName: file.filename,
      fileUrl: `/uploads/feedback/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      isScreenshot: req.body.isScreenshot === 'true'
    }));

    res.json({
      success: true,
      images: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading feedback images:', error);
    res.status(500).json({ 
      message: 'Failed to upload images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /uploads/feedback/:filename - Servir arquivos de feedback
router.get('/feedback/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(process.cwd(), 'uploads', 'feedback', filename);
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  // Servir o arquivo
  res.sendFile(filepath);
});

export default router;