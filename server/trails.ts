import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { insertTrailCategorySchema, insertTrailSchema, insertTrailContentSchema, insertTrailCommentSchema, trailComments, trailCategories } from '@shared/schema';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { db } from './db';
import { eq } from 'drizzle-orm';

const router = Router();

// Configurar multer para upload de imagens
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'), false);
    }
  },
});

// Middleware de autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Não autorizado' });
};

// Middleware de admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && ['admin', 'superadmin'].includes(req.user.role)) {
    return next();
  }
  res.status(403).json({ error: 'Acesso negado' });
};

// ROTAS ADMIN (temporárias sem auth para debugging)
router.get('/admin-categories-temp', async (req: Request, res: Response) => {
  try {
    console.log('Rota admin-categories-temp acessada');
    const categories = await db.select().from(trailCategories).orderBy(trailCategories.name);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao obter categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS PÚBLICAS - Área pública do portal

// Rota de teste simples
router.get('/test-simple', (req: Request, res: Response) => {
  res.json({ message: 'Trail router funcionando', timestamp: new Date().toISOString() });
});

// Obter todas as trilhas publicadas
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const search = req.query.search as string;
    
    let trails = await storage.getAllTrails(false); // Apenas trilhas publicadas
    
    // Filtrar por categoria se especificada
    if (category) {
      trails = trails.filter(trail => trail.category?.id === parseInt(category));
    }
    
    // Filtrar por busca se especificada
    if (search) {
      trails = trails.filter(trail => 
        trail.title.toLowerCase().includes(search.toLowerCase()) ||
        trail.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    res.json(trails);
  } catch (error) {
    console.error('Erro ao obter trilhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter uma trilha específica
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const trail = await storage.getTrail(id);
    
    if (!trail) {
      return res.status(404).json({ error: 'Trilha não encontrada' });
    }
    
    // Verificar se a trilha está publicada (área pública)
    if (!trail.isPublished) {
      return res.status(404).json({ error: 'Trilha não encontrada' });
    }
    
    // Incrementar contador de visualizações
    await storage.incrementTrailViewCount(id);
    
    res.json(trail);
  } catch (error) {
    console.error('Erro ao obter trilha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conteúdos de uma trilha
router.get('/:id/contents', async (req: Request, res: Response) => {
  try {
    const trailId = parseInt(req.params.id);
    const contents = await storage.getTrailContents(trailId, false); // Apenas conteúdos não-draft
    
    res.json(contents);
  } catch (error) {
    console.error('Erro ao obter conteúdos da trilha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter um conteúdo específico
router.get('/content/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const content = await storage.getTrailContent(id);
    
    if (!content) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    // Verificar se o conteúdo não é um rascunho
    if (content.isDraft) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    // Incrementar contador de visualizações
    await storage.incrementTrailContentViewCount(id);
    
    res.json(content);
  } catch (error) {
    console.error('Erro ao obter conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter comentários de um conteúdo
router.get('/content/:id/comments', async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.isAuthenticated && req.isAuthenticated() ? req.user?.id : undefined;
    const comments = await storage.getTrailComments(contentId, userId);
    
    res.json(comments);
  } catch (error) {
    console.error('Erro ao obter comentários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar comentário em um conteúdo (requer autenticação)
router.post('/content/:id/comments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const contentId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    const validationResult = insertTrailCommentSchema.safeParse({
      contentId,
      userId,
      content: req.body.content,
      parentId: req.body.parentId || null,
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors });
    }
    
    const comment = await storage.createTrailComment(validationResult.data);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Curtir comentário de trilha (requer autenticação)
router.post('/comments/:id/like', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    const success = await storage.likeTrailComment(userId, commentId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Erro ao curtir comentário' });
    }
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Descurtir comentário de trilha (requer autenticação)
router.delete('/comments/:id/like', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    const success = await storage.unlikeTrailComment(userId, commentId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Erro ao descurtir comentário' });
    }
  } catch (error) {
    console.error('Erro ao descurtir comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar comentário de trilha (admin ou autor)
router.delete('/comments/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Buscar o comentário específico para verificar permissões
    const commentQuery = await db
      .select()
      .from(trailComments)
      .where(eq(trailComments.id, commentId))
      .limit(1);
    
    if (commentQuery.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    
    const comment = commentQuery[0];
    
    // Permitir apenas admin/superadmin ou autor do comentário
    if (!['admin', 'superadmin'].includes(userRole) && comment.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const success = await storage.deleteTrailComment(commentId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Erro ao deletar comentário' });
    }
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter categorias de trilhas
router.get('/categories/list', async (req: Request, res: Response) => {
  try {
    const categories = await storage.getAllTrailCategories();
    res.json(categories);
  } catch (error) {
    console.error('Erro ao obter categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS ADMINISTRATIVAS - Área administrativa

// Obter todas as trilhas (incluindo não publicadas) - Admin apenas
router.get('/admin/all', isAdmin, async (req: Request, res: Response) => {
  try {
    const trails = await storage.getAllTrails(true); // Incluir não publicadas
    res.json(trails);
  } catch (error) {
    console.error('Erro ao obter trilhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conteúdos de uma trilha (incluindo rascunhos) - Admin apenas
router.get('/:id/contents', isAdmin, async (req: Request, res: Response) => {
  try {
    const trailId = parseInt(req.params.id);
    const includeUnpublished = req.query.includeUnpublished === 'true';
    
    // Para admin, incluir drafts sempre
    const contents = await storage.getTrailContents(trailId, true);
    
    res.json(contents);
  } catch (error) {
    console.error('Erro ao obter conteúdos da trilha (admin):', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo conteúdo para uma trilha - Admin apenas
router.post('/:id/contents', isAdmin, async (req: Request, res: Response) => {
  try {
    const trailId = parseInt(req.params.id);
    const contentData = {
      ...req.body,
      trailId
    };
    
    const newContent = await storage.createTrailContent(contentData);
    res.json(newContent);
  } catch (error) {
    console.error('Erro ao criar conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar conteúdo - Admin apenas
router.put('/content/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updatedContent = await storage.updateTrailContent(id, req.body);
    
    if (!updatedContent) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    res.json(updatedContent);
  } catch (error) {
    console.error('Erro ao atualizar conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir conteúdo - Admin apenas
router.delete('/content/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteTrailContent(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    res.json({ message: 'Conteúdo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova trilha - Admin apenas
router.post('/admin/create', isAdmin, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const validationResult = insertTrailSchema.safeParse({
      title: req.body.title,
      description: req.body.description,
      categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : null,
      creatorId: req.user!.id,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      isPublished: req.body.isPublished === 'true',
      order: req.body.order ? parseInt(req.body.order) : 0,
      targetUserCategories: req.body.targetUserCategories ? JSON.parse(req.body.targetUserCategories) : [],
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors });
    }
    
    const trail = await storage.createTrail(validationResult.data);
    res.status(201).json(trail);
  } catch (error) {
    console.error('Erro ao criar trilha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar trilha - Admin apenas
router.put('/admin/:id', isAdmin, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const updateData: any = {
      title: req.body.title,
      description: req.body.description,
      categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : null,
      isPublished: req.body.isPublished === 'true',
      order: req.body.order ? parseInt(req.body.order) : 0,
      targetUserCategories: req.body.targetUserCategories ? JSON.parse(req.body.targetUserCategories) : [],
    };
    
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const trail = await storage.updateTrail(id, updateData);
    
    if (!trail) {
      return res.status(404).json({ error: 'Trilha não encontrada' });
    }
    
    res.json(trail);
  } catch (error) {
    console.error('Erro ao atualizar trilha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar trilha - Admin apenas
router.delete('/admin/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteTrail(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Trilha não encontrada' });
    }
    
    res.json({ message: 'Trilha deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar trilha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conteúdos de uma trilha (incluindo rascunhos) - Admin apenas
router.get('/admin/:id/contents', isAdmin, async (req: Request, res: Response) => {
  try {
    const trailId = parseInt(req.params.id);
    const contents = await storage.getTrailContents(trailId, true); // Incluir rascunhos
    
    res.json(contents);
  } catch (error) {
    console.error('Erro ao obter conteúdos da trilha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar conteúdo em uma trilha - Admin apenas
router.post('/admin/:id/contents', isAdmin, async (req: Request, res: Response) => {
  try {
    const trailId = parseInt(req.params.id);
    
    const validationResult = insertTrailContentSchema.safeParse({
      trailId,
      title: req.body.title,
      content: req.body.content,
      order: req.body.order ? parseInt(req.body.order) : 0,
      isDraft: req.body.isDraft === 'true',
      estimatedMinutes: req.body.estimatedMinutes ? parseInt(req.body.estimatedMinutes) : 0,
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors });
    }
    
    const content = await storage.createTrailContent(validationResult.data);
    res.status(201).json(content);
  } catch (error) {
    console.error('Erro ao criar conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar conteúdo - Admin apenas
router.put('/admin/content/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const updateData = {
      title: req.body.title,
      content: req.body.content,
      order: req.body.order ? parseInt(req.body.order) : 0,
      isDraft: req.body.isDraft === 'true',
      estimatedMinutes: req.body.estimatedMinutes ? parseInt(req.body.estimatedMinutes) : 0,
    };
    
    const content = await storage.updateTrailContent(id, updateData);
    
    if (!content) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Erro ao atualizar conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar conteúdo - Admin apenas
router.delete('/admin/content/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteTrailContent(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    res.json({ message: 'Conteúdo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar conteúdo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter categorias (temporária sem auth)
router.get('/categories/list', async (req: Request, res: Response) => {
  try {
    console.log('Obtendo lista de categorias');
    const categories = await db.select().from(trailCategories).orderBy(trailCategories.name);
    console.log('Categorias encontradas:', categories.length);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao obter categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Esta rota foi movida para o topo do arquivo

router.post('/admin/categories', isAdmin, async (req: Request, res: Response) => {
  try {
    const validationResult = insertTrailCategorySchema.safeParse({
      name: req.body.name,
      description: req.body.description,
      color: req.body.color || '#3B82F6',
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors });
    }
    
    const category = await storage.createTrailCategory(validationResult.data);
    res.status(201).json(category);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/admin/categories/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      color: req.body.color,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    };
    
    const category = await storage.updateTrailCategory(id, updateData);
    
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/admin/categories/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteTrailCategory(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    
    res.json({ message: 'Categoria deletada com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar categoria:', error);
    if (error.message && error.message.includes('sendo usada por trilhas')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Moderar comentários - Admin apenas
router.delete('/admin/comments/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteTrailComment(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }
    
    res.json({ message: 'Comentário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Responder como admin
router.post('/admin/comments/:id/reply', isAdmin, async (req: Request, res: Response) => {
  try {
    const parentId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    // Buscar o comentário pai para obter o contentId
    const parentComment = await storage.getTrailComments(0); // Implementar método específico se necessário
    
    const validationResult = insertTrailCommentSchema.safeParse({
      contentId: req.body.contentId, // Deve ser enviado no body
      userId,
      content: req.body.content,
      parentId,
      isAdminReply: true,
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors });
    }
    
    const comment = await storage.createTrailComment(validationResult.data);
    res.status(201).json(comment);
  } catch (error) {
    console.error('Erro ao responder comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;