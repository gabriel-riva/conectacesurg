import { Router, Request, Response } from 'express';
import { db } from './db';
import { tools, toolCategories, toolProjects, userCategories, users, userCategoryAssignments } from '../shared/schema';
import { insertToolSchema, insertToolCategorySchema } from '../shared/schema';
import { eq, desc, and, inArray, or, sql } from 'drizzle-orm';

const router = Router();

// Helper function to check if user is admin
function requireAdmin(req: Request, res: Response, next: any) {
  if (!req.user || !['admin', 'superadmin'].includes((req.user as any).role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Helper function to check if user is authenticated
function requireAuth(req: Request, res: Response, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// GET /api/admin/tools/categories - Listar categorias de ferramentas
router.get('/admin/tools/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const categories = await db.select().from(toolCategories).orderBy(desc(toolCategories.id));
    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias de ferramentas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/tools/categories - Criar nova categoria
router.post('/admin/tools/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = insertToolCategorySchema.parse(req.body);
    const [newCategory] = await db.insert(toolCategories).values(validatedData).returning();
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Erro ao criar categoria de ferramenta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/tools/categories/:id - Atualizar categoria
router.put('/admin/tools/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    const validatedData = insertToolCategorySchema.partial().parse(req.body);
    
    const [updatedCategory] = await db
      .update(toolCategories)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(toolCategories.id, categoryId))
      .returning();

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json(updatedCategory);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/admin/tools/categories/:id - Excluir categoria
router.delete('/admin/tools/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    // Verificar se existem ferramentas usando esta categoria
    const toolsUsingCategory = await db
      .select({ id: tools.id })
      .from(tools)
      .where(eq(tools.categoryId, categoryId))
      .limit(1);

    if (toolsUsingCategory.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir categoria que está sendo usada por ferramentas' 
      });
    }
    
    const deletedRows = await db
      .delete(toolCategories)
      .where(eq(toolCategories.id, categoryId));

    if (deletedRows.rowCount === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/tools - Listar todas as ferramentas com categorias
router.get('/admin/tools', requireAdmin, async (req: Request, res: Response) => {
  try {
    const toolsWithCategories = await db
      .select({
        id: tools.id,
        name: tools.name,
        description: tools.description,
        isActive: tools.isActive,
        allowedUserCategories: tools.allowedUserCategories,
        settings: tools.settings,
        createdAt: tools.createdAt,
        updatedAt: tools.updatedAt,
        category: {
          id: toolCategories.id,
          name: toolCategories.name,
          color: toolCategories.color,
          icon: toolCategories.icon
        }
      })
      .from(tools)
      .leftJoin(toolCategories, eq(tools.categoryId, toolCategories.id))
      .orderBy(desc(tools.id));

    res.json(toolsWithCategories);
  } catch (error) {
    console.error('Erro ao buscar ferramentas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/tools - Criar nova ferramenta
router.post('/admin/tools', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = insertToolSchema.parse(req.body);
    const [newTool] = await db.insert(tools).values(validatedData).returning();
    res.status(201).json(newTool);
  } catch (error) {
    console.error('Erro ao criar ferramenta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/tools/:id - Atualizar ferramenta
router.put('/admin/tools/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const toolId = parseInt(req.params.id);
    const validatedData = insertToolSchema.partial().parse(req.body);
    
    const [updatedTool] = await db
      .update(tools)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(tools.id, toolId))
      .returning();

    if (!updatedTool) {
      return res.status(404).json({ error: 'Ferramenta não encontrada' });
    }

    res.json(updatedTool);
  } catch (error) {
    console.error('Erro ao atualizar ferramenta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/tools/:id - Obter ferramenta específica
router.get('/admin/tools/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const toolId = parseInt(req.params.id);
    
    const tool = await db
      .select({
        id: tools.id,
        name: tools.name,
        description: tools.description,
        isActive: tools.isActive,
        allowedUserCategories: tools.allowedUserCategories,
        settings: tools.settings,
        createdAt: tools.createdAt,
        updatedAt: tools.updatedAt,
        category: {
          id: toolCategories.id,
          name: toolCategories.name,
          color: toolCategories.color,
          icon: toolCategories.icon
        }
      })
      .from(tools)
      .leftJoin(toolCategories, eq(tools.categoryId, toolCategories.id))
      .where(eq(tools.id, toolId))
      .limit(1);

    if (tool.length === 0) {
      return res.status(404).json({ error: 'Ferramenta não encontrada' });
    }

    res.json(tool[0]);
  } catch (error) {
    console.error('Erro ao buscar ferramenta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/tools/:id/projects - Listar projetos de uma ferramenta específica
router.get('/admin/tools/:id/projects', requireAdmin, async (req: Request, res: Response) => {
  try {
    const toolId = parseInt(req.params.id);
    
    const projects = await db
      .select({
        id: toolProjects.id,
        toolId: toolProjects.toolId,
        creatorId: toolProjects.creatorId,
        tipoAtividade: toolProjects.tipoAtividade,
        dataRealizacao: toolProjects.dataRealizacao,
        local: toolProjects.local,
        nomeProfissionais: toolProjects.nomeProfissionais,
        status: toolProjects.status,
        observacoes: toolProjects.observacoes,
        createdAt: toolProjects.createdAt,
        updatedAt: toolProjects.updatedAt,
        creator: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(toolProjects)
      .leftJoin(users, eq(toolProjects.creatorId, users.id))
      .where(eq(toolProjects.toolId, toolId))
      .orderBy(desc(toolProjects.id));

    res.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos da ferramenta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/tools/:toolId/projects/:projectId - Atualizar projeto específico
router.put('/admin/tools/:toolId/projects/:projectId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const toolId = parseInt(req.params.toolId);
    
    if (isNaN(projectId) || isNaN(toolId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    // Verificar se o projeto existe e pertence à ferramenta
    const [existingProject] = await db
      .select()
      .from(toolProjects)
      .where(and(eq(toolProjects.id, projectId), eq(toolProjects.toolId, toolId)));

    if (!existingProject) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // Atualizar o projeto
    const [updatedProject] = await db
      .update(toolProjects)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(toolProjects.id, projectId))
      .returning();

    res.json(updatedProject);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/tools/user/accessible - Listar ferramentas acessíveis ao usuário atual
router.get('/user/accessible', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar categorias do usuário
    const userCategories = await db
      .select({ categoryId: userCategoryAssignments.categoryId })
      .from(userCategoryAssignments)
      .where(eq(userCategoryAssignments.userId, userId));

    const userCategoryIds = userCategories.map(uc => uc.categoryId);

    // Buscar ferramentas ativas que o usuário pode acessar
    const accessibleTools = await db
      .select({
        id: tools.id,
        name: tools.name,
        description: tools.description,
        isActive: tools.isActive,
        categoryId: tools.categoryId,
        allowedUserCategories: tools.allowedUserCategories,
        settings: tools.settings,
        createdAt: tools.createdAt,
        updatedAt: tools.updatedAt,
        category: {
          id: toolCategories.id,
          name: toolCategories.name,
          description: toolCategories.description,
          icon: toolCategories.icon,
        }
      })
      .from(tools)
      .leftJoin(toolCategories, eq(tools.categoryId, toolCategories.id))
      .where(
        and(
          eq(tools.isActive, true),
          or(
            // Ferramenta não tem restrições (allowedUserCategories vazio)
            sql`array_length(${tools.allowedUserCategories}, 1) IS NULL`,
            // OU o usuário pertence a uma das categorias permitidas
            sql`${tools.allowedUserCategories} && ${userCategoryIds}`
          )
        )
      );

    res.json(accessibleTools);
  } catch (error) {
    console.error('Erro ao buscar ferramentas acessíveis:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/tools/categories - Listar categorias de ferramentas
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await db
      .select()
      .from(toolCategories)
      .orderBy(toolCategories.name);

    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias de ferramentas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/user-categories - Listar categorias de usuários para permissões
router.get('/user-categories', async (req: Request, res: Response) => {
  try {
    const categories = await db.select().from(userCategories).where(eq(userCategories.isActive, true));
    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias de usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;