import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import { insertFeedbackSchema, updateFeedbackSchema } from '@shared/schema';
import { ZodError } from 'zod';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'feedback');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware para verificar se o usuário está logado
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user && !req.body.isAnonymous) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Middleware para verificar se o usuário é admin
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user || (req.user as any).role !== 'admin' && (req.user as any).role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// POST /api/feedback/upload - Upload de imagens
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/feedback/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// GET /api/feedback - Listar todos os feedbacks (admin apenas)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const feedbacks = await storage.getAllFeedbacks();
    res.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ message: 'Failed to fetch feedbacks' });
  }
});

// GET /api/feedback/:id - Obter feedback específico (admin apenas)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }
    
    const feedback = await storage.getFeedback(id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
});

// POST /api/feedback - Criar novo feedback
router.post('/', requireAuth, async (req, res) => {
  try {
    const feedbackData = insertFeedbackSchema.parse(req.body);
    
    // Se não for anônimo, usar o ID do usuário logado
    if (!feedbackData.isAnonymous && req.user) {
      feedbackData.userId = (req.user as any).id;
    }
    
    const feedback = await storage.createFeedback(feedbackData);
    res.status(201).json(feedback);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    console.error('Error creating feedback:', error);
    res.status(500).json({ message: 'Failed to create feedback' });
  }
});

// PATCH /api/feedback/:id - Atualizar feedback (admin apenas)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }
    
    const updates = updateFeedbackSchema.parse(req.body);
    
    const updatedFeedback = await storage.updateFeedback(id, updates);
    
    if (!updatedFeedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    res.json(updatedFeedback);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    console.error('Error updating feedback:', error);
    res.status(500).json({ message: 'Failed to update feedback' });
  }
});

// DELETE /api/feedback/:id - Deletar feedback (admin apenas)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }
    
    const deleted = await storage.deleteFeedback(id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ message: 'Failed to delete feedback' });
  }
});

export default router;