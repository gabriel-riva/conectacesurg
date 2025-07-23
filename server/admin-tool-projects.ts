import { Request, Response } from 'express';
import { db } from './db';
import { toolProjects, users } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
// Authentication middleware
function requireAuth(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response) {
  const user = req.user as any;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// Buscar todos os projetos (admin)
export async function getAllToolProjects(req: Request, res: Response) {
  try {
    if (!requireAuth(req, res)) return;
    if (!requireAdmin(req, res)) return;

    // Buscar os projetos primeiro
    const projectsRaw = await db
      .select()
      .from(toolProjects)
      .orderBy(desc(toolProjects.createdAt));

    // Depois buscar os dados dos usuários
    const projects = [];
    for (const project of projectsRaw) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, project.creatorId))
        .limit(1);

      projects.push({
        id: project.id,
        creator_id: project.creatorId,
        creator_name: user[0]?.name || 'Usuário não encontrado',
        tipo_atividade: project.tipoAtividade,
        data_realizacao: project.dataRealizacao,
        local: project.local,
        nome_profissionais: project.nomeProfissionais,
        status: project.status,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
        observacoes: project.observacoes,
        dados_ia: project.dadosIa,
      });
    }

    res.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Alterar status de um projeto
export async function updateProjectStatus(req: Request, res: Response) {
  try {
    if (!requireAuth(req, res)) return;
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { status, comment } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const validStatuses = ['rascunho', 'enviado', 'em_analise', 'aprovado', 'rejeitado', 'em_execucao', 'concluido'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Buscar o projeto atual
    const currentProject = await db
      .select()
      .from(toolProjects)
      .where(eq(toolProjects.id, parseInt(id)))
      .limit(1);

    if (currentProject.length === 0) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // Atualizar o status
    const [updatedProject] = await db
      .update(toolProjects)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(toolProjects.id, parseInt(id)))
      .returning();

    // Aqui você pode adicionar lógica para envio de email
    // await sendStatusChangeNotification(currentProject[0], status, comment);

    res.json(updatedProject);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Configurações de email
export async function getEmailSettings(req: Request, res: Response) {
  try {
    if (!requireAuth(req, res)) return;
    if (!requireAdmin(req, res)) return;

    // Por enquanto, retorna configurações mockadas
    // Em produção, você salvaria essas configurações no banco
    const settings = {
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: parseInt(process.env.SMTP_PORT || '587'),
      smtp_user: process.env.SMTP_USER || '',
      smtp_password: process.env.SMTP_PASSWORD || '',
      from_email: process.env.FROM_EMAIL || '',
      from_name: process.env.FROM_NAME || 'Portal Conecta CESURG',
    };

    res.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações de email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function saveEmailSettings(req: Request, res: Response) {
  try {
    if (!requireAuth(req, res)) return;
    if (!requireAdmin(req, res)) return;

    const { smtp_host, smtp_port, smtp_user, smtp_password, from_email, from_name } = req.body;

    // Em produção, você salvaria essas configurações no banco ou variáveis de ambiente
    // Por enquanto, apenas confirmamos que foram recebidas

    res.json({ 
      message: 'Configurações salvas com sucesso',
      settings: {
        smtp_host,
        smtp_port,
        smtp_user,
        smtp_password: '***', // Não retornar a senha
        from_email,
        from_name,
      }
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Função para envio de notificações (implementar futuramente)
async function sendStatusChangeNotification(project: any, newStatus: string, comment?: string) {
  // Implementar envio de email baseado nas configurações
  console.log(`Enviando notificação para projeto ${project.id}: status alterado para ${newStatus}`);
  if (comment) {
    console.log(`Comentário: ${comment}`);
  }
}