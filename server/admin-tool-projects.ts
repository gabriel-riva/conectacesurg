import { Request, Response } from 'express';
import { db } from './db';
import { toolProjects, users } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
// Authentication middleware
function requireAuth(req: Request) {
  if (!req.isAuthenticated()) {
    throw new Error('Authentication required');
  }
}

function requireAdmin(req: Request) {
  const user = req.user as any;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    throw new Error('Admin access required');
  }
}

// Buscar todos os projetos (admin)
export async function getAllToolProjects(req: Request, res: Response) {
  try {
    requireAuth(req);
    requireAdmin(req);

    const projects = await db
      .select({
        id: toolProjects.id,
        creator_id: toolProjects.creatorId,
        creator_name: users.name,
        tipo_atividade: toolProjects.tipoAtividade,
        data_realizacao: toolProjects.dataRealizacao,
        local: toolProjects.local,
        nome_profissionais: toolProjects.nomeProfissionais,
        status: toolProjects.status,
        created_at: toolProjects.createdAt,
        updated_at: toolProjects.updatedAt,
        observacoes: toolProjects.observacoes,
        dados_ia: toolProjects.dadosIa,
      })
      .from(toolProjects)
      .leftJoin(users, eq(toolProjects.creatorId, users.id))
      .orderBy(desc(toolProjects.createdAt));

    res.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Alterar status de um projeto
export async function updateProjectStatus(req: Request, res: Response) {
  try {
    requireAuth(req);
    requireAdmin(req);

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
    requireAuth(req);
    requireAdmin(req);

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
    requireAuth(req);
    requireAdmin(req);

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