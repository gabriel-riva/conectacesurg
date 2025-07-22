import { Router, Request, Response } from 'express';
import { db } from './db';
import { toolProjects, toolProjectReports, users } from '../shared/schema';
import { insertToolProjectSchema, insertToolProjectReportSchema } from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// Helper function to check if user is admin
function isUserAdmin(req: Request): boolean {
  return (req.user as any)?.role === 'admin' || (req.user as any)?.role === 'superadmin';
}

async function createToolProject(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const validatedData = insertToolProjectSchema.parse({
      ...req.body,
      creatorId: userId
    });

    const [project] = await db.insert(toolProjects).values(validatedData).returning();
    
    res.status(201).json(project);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(400).json({ error: 'Dados inválidos' });
  }
}

async function getToolProjects(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const isAdmin = isUserAdmin(req);
    
    // Admin pode ver todos os projetos, usuário comum só os próprios
    const projects = await db.select({
      project: toolProjects,
      creator: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(toolProjects)
    .leftJoin(users, eq(toolProjects.creatorId, users.id))
    .where(isAdmin ? undefined : eq(toolProjects.creatorId, userId))
    .orderBy(desc(toolProjects.createdAt));

    res.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function getToolProject(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const isAdmin = isUserAdmin(req);
    
    const [project] = await db.select({
      project: toolProjects,
      creator: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(toolProjects)
    .leftJoin(users, eq(toolProjects.creatorId, users.id))
    .where(
      isAdmin 
        ? eq(toolProjects.id, projectId)
        : and(eq(toolProjects.id, projectId), eq(toolProjects.creatorId, userId))
    );

    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    res.json(project);
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function updateToolProject(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const isAdmin = isUserAdmin(req);
    
    // Verificar se o projeto existe e se o usuário tem permissão
    const [existingProject] = await db.select()
      .from(toolProjects)
      .where(
        isAdmin 
          ? eq(toolProjects.id, projectId)
          : and(eq(toolProjects.id, projectId), eq(toolProjects.creatorId, userId))
      );

    if (!existingProject) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const validatedData = insertToolProjectSchema.partial().parse(req.body);
    
    const [updatedProject] = await db.update(toolProjects)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(toolProjects.id, projectId))
      .returning();

    res.json(updatedProject);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(400).json({ error: 'Dados inválidos' });
  }
}

async function updateToolProjectStatus(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    const { status } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const isAdmin = isUserAdmin(req);
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem alterar status' });
    }

    const [updatedProject] = await db.update(toolProjects)
      .set({ status, updatedAt: new Date() })
      .where(eq(toolProjects.id, projectId))
      .returning();

    if (!updatedProject) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    res.json(updatedProject);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function deleteToolProject(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const isAdmin = isUserAdmin(req);
    
    // Verificar se o projeto existe e se o usuário tem permissão
    const [existingProject] = await db.select()
      .from(toolProjects)
      .where(
        isAdmin 
          ? eq(toolProjects.id, projectId)
          : and(eq(toolProjects.id, projectId), eq(toolProjects.creatorId, userId))
      );

    if (!existingProject) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    await db.delete(toolProjects).where(eq(toolProjects.id, projectId));
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Funções para relatórios
async function createToolProjectReport(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Verificar se o projeto existe e se o usuário tem permissão
    const [existingProject] = await db.select()
      .from(toolProjects)
      .where(eq(toolProjects.id, projectId));

    if (!existingProject) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const isAdmin = isUserAdmin(req);
    if (!isAdmin && existingProject.creatorId !== userId) {
      return res.status(403).json({ error: 'Sem permissão para criar relatório deste projeto' });
    }

    const validatedData = insertToolProjectReportSchema.parse({
      ...req.body,
      projectId,
      creatorId: userId
    });

    const [report] = await db.insert(toolProjectReports).values(validatedData).returning();
    
    res.status(201).json(report);
  } catch (error) {
    console.error('Erro ao criar relatório:', error);
    res.status(400).json({ error: 'Dados inválidos' });
  }
}

async function getToolProjectReports(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const isAdmin = isUserAdmin(req);
    
    // Verificar se o usuário tem acesso ao projeto
    const [project] = await db.select()
      .from(toolProjects)
      .where(
        isAdmin 
          ? eq(toolProjects.id, projectId)
          : and(eq(toolProjects.id, projectId), eq(toolProjects.creatorId, userId))
      );

    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const reports = await db.select({
      report: toolProjectReports,
      creator: {
        id: users.id,
        name: users.name,
        email: users.email
      }
    })
    .from(toolProjectReports)
    .leftJoin(users, eq(toolProjectReports.creatorId, users.id))
    .where(eq(toolProjectReports.projectId, projectId))
    .orderBy(desc(toolProjectReports.createdAt));

    res.json(reports);
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function updateToolProjectReportStatus(req: Request, res: Response) {
  try {
    const reportId = parseInt(req.params.reportId);
    const { status } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const isAdmin = isUserAdmin(req);
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem alterar status de relatórios' });
    }

    const [updatedReport] = await db.update(toolProjectReports)
      .set({ status, updatedAt: new Date() })
      .where(eq(toolProjectReports.id, reportId))
      .returning();

    if (!updatedReport) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    res.json(updatedReport);
  } catch (error) {
    console.error('Erro ao atualizar status do relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Routes
router.get('/', getToolProjects);
router.post('/', createToolProject);
router.get('/:id', getToolProject);
router.put('/:id', updateToolProject);
router.patch('/:id/status', updateToolProjectStatus);
router.delete('/:id', deleteToolProject);

// Report routes
router.post('/:projectId/reports', createToolProjectReport);
router.get('/:projectId/reports', getToolProjectReports);
router.patch('/reports/:reportId/status', updateToolProjectReportStatus);

export default router;