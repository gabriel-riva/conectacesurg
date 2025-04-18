import express, { Request, Response } from 'express';
import multer from 'multer';
import { storage } from './storage';
import { db } from './db';
import * as schema from '@shared/schema';
import { and, asc, desc, eq, inArray, like, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configuração do multer para upload de arquivos
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido.'), false);
  }
};

const upload = multer({ 
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ error: 'Não autorizado' });
};

// Middleware para verificar se o usuário é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && 
      (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    return next();
  }
  res.status(403).json({ error: 'Acesso negado' });
};

// GET /api/ideas - Listar todas as ideias (com opção de filtros)
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search,
      page = 1,
      limit = 10
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    let query = db.select().from(schema.ideas)
      .leftJoin(schema.users, eq(schema.ideas.creatorId, schema.users.id), 'creator')
      .leftJoin(schema.users, eq(schema.ideas.responsibleId, schema.users.id), 'responsible_user')
      .leftJoin(schema.groups, eq(schema.ideas.groupId, schema.groups.id));
    
    // Aplicar filtros
    if (status) {
      query = query.where(eq(schema.ideas.status, String(status)));
    }
    
    if (search) {
      query = query.where(
        sql`${schema.ideas.title} ILIKE ${'%' + search + '%'} OR ${schema.ideas.description} ILIKE ${'%' + search + '%'}`
      );
    }
    
    // Aplicar ordenação
    if (sortBy === 'votes') {
      // Para ordenar por votos, precisamos de uma subconsulta que conta os votos
      const ideasWithVotes = db.select({
        ideaId: schema.ideaVotes.ideaId,
        voteCount: sql<number>`SUM(${schema.ideaVotes.vote})`.as('vote_count')
      })
      .from(schema.ideaVotes)
      .groupBy(schema.ideaVotes.ideaId)
      .as('ideas_with_votes');
      
      query = query.leftJoin(
        ideasWithVotes, 
        eq(schema.ideas.id, ideasWithVotes.ideaId)
      );
      
      if (sortOrder === 'desc') {
        query = query.orderBy(desc(ideasWithVotes.voteCount));
      } else {
        query = query.orderBy(asc(ideasWithVotes.voteCount));
      }
    } else if (sortBy === 'createdAt') {
      if (sortOrder === 'desc') {
        query = query.orderBy(desc(schema.ideas.createdAt));
      } else {
        query = query.orderBy(asc(schema.ideas.createdAt));
      }
    }
    
    // Aplicar paginação
    query = query.limit(Number(limit)).offset(offset);
    
    const ideas = await query;
    
    // Contar votos e comentários para cada ideia
    const ideaIds = ideas.map(i => i.ideas.id);
    
    // Obter contagens de votos
    const voteCounts = await db.select({
      ideaId: schema.ideaVotes.ideaId,
      count: sql<number>`SUM(${schema.ideaVotes.vote})`.as('vote_count')
    })
    .from(schema.ideaVotes)
    .where(inArray(schema.ideaVotes.ideaId, ideaIds))
    .groupBy(schema.ideaVotes.ideaId);
    
    // Obter contagens de comentários
    const commentCounts = await db.select({
      ideaId: schema.ideaComments.ideaId,
      count: sql<number>`COUNT(*)`.as('comment_count')
    })
    .from(schema.ideaComments)
    .where(inArray(schema.ideaComments.ideaId, ideaIds))
    .groupBy(schema.ideaComments.ideaId);
    
    // Mapear contagens para um objeto para fácil acesso
    const voteCountMap = new Map(voteCounts.map(v => [v.ideaId, v.count]));
    const commentCountMap = new Map(commentCounts.map(c => [c.ideaId, c.count]));
    
    // Verificar se o usuário atual já votou em cada ideia
    const userVotes = await db.select()
      .from(schema.ideaVotes)
      .where(and(
        inArray(schema.ideaVotes.ideaId, ideaIds),
        eq(schema.ideaVotes.userId, req.user!.id)
      ));
    
    const userVoteMap = new Map(userVotes.map(v => [v.ideaId, v.vote]));
    
    // Verificar se o usuário atual se voluntariou para cada ideia
    const userVolunteers = await db.select()
      .from(schema.ideaVolunteers)
      .where(and(
        inArray(schema.ideaVolunteers.ideaId, ideaIds),
        eq(schema.ideaVolunteers.userId, req.user!.id)
      ));
    
    const userVolunteerMap = new Map(userVolunteers.map(v => [v.ideaId, v.status]));
    
    // Combinar tudo em uma resposta formatada
    const enhancedIdeas = ideas.map(idea => ({
      ...idea.ideas,
      creator: {
        id: idea.users.id,
        name: idea.users.name,
        email: idea.users.email,
        photoUrl: idea.users.photoUrl
      },
      responsible: idea.responsible ? {
        id: idea.responsible.id,
        name: idea.responsible.name,
        email: idea.responsible.email,
        photoUrl: idea.responsible.photoUrl
      } : null,
      group: idea.groups ? {
        id: idea.groups.id,
        name: idea.groups.name,
        description: idea.groups.description,
        imageUrl: idea.groups.imageUrl
      } : null,
      voteCount: voteCountMap.get(idea.ideas.id) || 0,
      commentCount: commentCountMap.get(idea.ideas.id) || 0,
      userVote: userVoteMap.get(idea.ideas.id) || 0,
      userVolunteered: userVolunteerMap.has(idea.ideas.id) ? userVolunteerMap.get(idea.ideas.id) : null
    }));
    
    // Contar o total de ideias para paginação
    const totalCount = await db.select({ count: sql<number>`COUNT(*)` })
      .from(schema.ideas)
      .where(status ? eq(schema.ideas.status, String(status)) : undefined);
    
    res.json({
      ideas: enhancedIdeas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar ideias:', error);
    res.status(500).json({ error: 'Erro ao listar ideias' });
  }
});

// GET /api/ideas/my - Listar ideias do usuário logado (criadas ou responsáveis)
router.get('/my', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { type = 'all' } = req.query; // tipo pode ser 'created', 'responsible', ou 'all'
    const userId = req.user!.id;
    
    let query = db.select().from(schema.ideas)
      .leftJoin(schema.users, eq(schema.ideas.creatorId, schema.users.id), 'creator')
      .leftJoin(schema.users, eq(schema.ideas.responsibleId, schema.users.id), 'responsible_user')
      .leftJoin(schema.groups, eq(schema.ideas.groupId, schema.groups.id));
    
    if (type === 'created') {
      query = query.where(eq(schema.ideas.creatorId, userId));
    } else if (type === 'responsible') {
      query = query.where(eq(schema.ideas.responsibleId, userId));
    } else {
      // 'all' - ideias que o usuário criou ou é responsável
      query = query.where(
        sql`${schema.ideas.creator_id} = ${userId} OR ${schema.ideas.responsible_id} = ${userId}`
      );
    }
    
    const ideas = await query;
    
    // Mesma lógica anterior para adicionar contagens de votos e comentários
    const ideaIds = ideas.map(i => i.ideas.id);
    
    const voteCounts = await db.select({
      ideaId: schema.ideaVotes.ideaId,
      count: sql<number>`SUM(${schema.ideaVotes.vote})`.as('vote_count')
    })
    .from(schema.ideaVotes)
    .where(inArray(schema.ideaVotes.ideaId, ideaIds))
    .groupBy(schema.ideaVotes.ideaId);
    
    const commentCounts = await db.select({
      ideaId: schema.ideaComments.ideaId,
      count: sql<number>`COUNT(*)`.as('comment_count')
    })
    .from(schema.ideaComments)
    .where(inArray(schema.ideaComments.ideaId, ideaIds))
    .groupBy(schema.ideaComments.ideaId);
    
    const voteCountMap = new Map(voteCounts.map(v => [v.ideaId, v.count]));
    const commentCountMap = new Map(commentCounts.map(c => [c.ideaId, c.count]));
    
    const enhancedIdeas = ideas.map(idea => ({
      ...idea.ideas,
      creator: {
        id: idea.users.id,
        name: idea.users.name,
        email: idea.users.email,
        photoUrl: idea.users.photoUrl
      },
      responsible: idea.responsible ? {
        id: idea.responsible.id,
        name: idea.responsible.name,
        email: idea.responsible.email,
        photoUrl: idea.responsible.photoUrl
      } : null,
      group: idea.groups ? {
        id: idea.groups.id,
        name: idea.groups.name,
        description: idea.groups.description,
        imageUrl: idea.groups.imageUrl
      } : null,
      voteCount: voteCountMap.get(idea.ideas.id) || 0,
      commentCount: commentCountMap.get(idea.ideas.id) || 0
    }));
    
    res.json(enhancedIdeas);
  } catch (error) {
    console.error('Erro ao listar ideias do usuário:', error);
    res.status(500).json({ error: 'Erro ao listar ideias do usuário' });
  }
});

// GET /api/ideas/:id - Obter detalhes de uma ideia específica
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    
    const ideaResult = await db.select()
      .from(schema.ideas)
      .leftJoin(schema.users, eq(schema.ideas.creatorId, schema.users.id), 'creator')
      .leftJoin(schema.users, eq(schema.ideas.responsibleId, schema.users.id), 'responsible')
      .leftJoin(schema.groups, eq(schema.ideas.groupId, schema.groups.id))
      .where(eq(schema.ideas.id, ideaId))
      .limit(1);
    
    if (ideaResult.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    const idea = ideaResult[0];
    
    // Obter comentários
    const comments = await db.select()
      .from(schema.ideaComments)
      .leftJoin(schema.users, eq(schema.ideaComments.userId, schema.users.id))
      .where(eq(schema.ideaComments.ideaId, ideaId))
      .orderBy(desc(schema.ideaComments.createdAt));
    
    // Obter contagem de votos
    const voteCount = await db.select({
      count: sql<number>`SUM(${schema.ideaVotes.vote})`.as('vote_count')
    })
    .from(schema.ideaVotes)
    .where(eq(schema.ideaVotes.ideaId, ideaId));
    
    // Verificar se o usuário atual já votou nesta ideia
    const userVote = await db.select()
      .from(schema.ideaVotes)
      .where(and(
        eq(schema.ideaVotes.ideaId, ideaId),
        eq(schema.ideaVotes.userId, req.user!.id)
      ))
      .limit(1);
    
    // Verificar se o usuário atual já se voluntariou para esta ideia
    const userVolunteer = await db.select()
      .from(schema.ideaVolunteers)
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.userId, req.user!.id)
      ))
      .limit(1);
    
    // Obter voluntários para esta ideia
    const volunteers = await db.select()
      .from(schema.ideaVolunteers)
      .leftJoin(schema.users, eq(schema.ideaVolunteers.userId, schema.users.id))
      .where(eq(schema.ideaVolunteers.ideaId, ideaId));
    
    const formattedComments = comments.map(comment => ({
      id: comment.idea_comments.id,
      content: comment.idea_comments.content,
      parentId: comment.idea_comments.parentId,
      createdAt: comment.idea_comments.createdAt,
      user: {
        id: comment.users.id,
        name: comment.users.name,
        email: comment.users.email,
        photoUrl: comment.users.photoUrl
      }
    }));
    
    const formattedVolunteers = volunteers.map(volunteer => ({
      userId: volunteer.users.id,
      name: volunteer.users.name,
      email: volunteer.users.email,
      photoUrl: volunteer.users.photoUrl,
      message: volunteer.idea_volunteers.message,
      status: volunteer.idea_volunteers.status,
      createdAt: volunteer.idea_volunteers.createdAt
    }));
    
    // Organizar comentários em árvore (para respostas)
    const commentMap = new Map();
    const rootComments = [];
    
    formattedComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });
    
    formattedComments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        rootComments.push(commentMap.get(comment.id));
      }
    });
    
    const result = {
      ...idea.ideas,
      creator: {
        id: idea.users.id,
        name: idea.users.name,
        email: idea.users.email,
        photoUrl: idea.users.photoUrl
      },
      responsible: idea.responsible ? {
        id: idea.responsible.id,
        name: idea.responsible.name,
        email: idea.responsible.email,
        photoUrl: idea.responsible.photoUrl
      } : null,
      group: idea.groups ? {
        id: idea.groups.id,
        name: idea.groups.name,
        description: idea.groups.description,
        imageUrl: idea.groups.imageUrl
      } : null,
      voteCount: voteCount[0].count || 0,
      commentCount: comments.length,
      comments: rootComments,
      userVote: userVote.length > 0 ? userVote[0].vote : 0,
      userVolunteered: userVolunteer.length > 0 ? userVolunteer[0].status : null,
      volunteers: formattedVolunteers
    };
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao obter detalhes da ideia:', error);
    res.status(500).json({ error: 'Erro ao obter detalhes da ideia' });
  }
});

// POST /api/ideas - Criar uma nova ideia
router.post('/', isAuthenticated, upload.array('attachments', 5), async (req: Request, res: Response) => {
  try {
    const { title, description, takeResponsibility } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
    }
    
    const files = req.files as Express.Multer.File[];
    
    // Processar os anexos
    const attachments = files.map(file => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      type: file.mimetype
    }));
    
    // Criar a ideia no banco de dados
    const idea = await db.insert(schema.ideas).values({
      title,
      description,
      creatorId: req.user!.id,
      responsibleId: takeResponsibility === 'true' ? req.user!.id : null,
      attachments: attachments.length > 0 ? attachments : []
    }).returning();
    
    res.status(201).json(idea[0]);
  } catch (error) {
    console.error('Erro ao criar ideia:', error);
    res.status(500).json({ error: 'Erro ao criar ideia' });
  }
});

// PUT /api/ideas/:id - Atualizar uma ideia (somente criador ou admin)
router.put('/:id', isAuthenticated, upload.array('attachments', 5), async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const { title, description, removeAttachments } = req.body;
    
    // Verificar se a ideia existe e se o usuário tem permissão para editar
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    const idea = existingIdea[0];
    const isCreator = idea.creatorId === req.user!.id;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esta ideia' });
    }
    
    // Processar novos anexos
    const files = req.files as Express.Multer.File[];
    const newAttachments = files.map(file => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      type: file.mimetype
    }));
    
    // Processar anexos a remover
    let attachments = idea.attachments || [];
    if (removeAttachments) {
      const attachmentsToRemove = removeAttachments.split(',');
      attachments = attachments.filter((attachment: any) => !attachmentsToRemove.includes(attachment.url));
    }
    
    // Combinar anexos existentes com novos anexos
    const updatedAttachments = [...attachments, ...newAttachments];
    
    // Atualizar a ideia
    const updatedIdea = await db.update(schema.ideas)
      .set({
        title: title || idea.title,
        description: description || idea.description,
        attachments: updatedAttachments,
        updatedAt: new Date()
      })
      .where(eq(schema.ideas.id, ideaId))
      .returning();
    
    res.json(updatedIdea[0]);
  } catch (error) {
    console.error('Erro ao atualizar ideia:', error);
    res.status(500).json({ error: 'Erro ao atualizar ideia' });
  }
});

// DELETE /api/ideas/:id - Excluir uma ideia (somente criador ou admin)
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    
    // Verificar se a ideia existe e se o usuário tem permissão para excluir
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    const idea = existingIdea[0];
    const isCreator = idea.creatorId === req.user!.id;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'superadmin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir esta ideia' });
    }
    
    // Excluir a ideia
    await db.delete(schema.ideas).where(eq(schema.ideas.id, ideaId));
    
    // Remover anexos físicos
    if (idea.attachments && idea.attachments.length > 0) {
      idea.attachments.forEach((attachment: any) => {
        try {
          const filePath = path.join(process.cwd(), attachment.url.replace(/^\//, ''));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error('Erro ao excluir arquivo anexo:', err);
        }
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir ideia:', error);
    res.status(500).json({ error: 'Erro ao excluir ideia' });
  }
});

// POST /api/ideas/:id/vote - Votar em uma ideia
router.post('/:id/vote', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const { vote } = req.body;
    
    if (vote !== 1 && vote !== -1) {
      return res.status(400).json({ error: 'O voto deve ser 1 (para cima) ou -1 (para baixo)' });
    }
    
    // Verificar se a ideia existe
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    // Verificar se o usuário já votou nesta ideia
    const existingVote = await db.select()
      .from(schema.ideaVotes)
      .where(and(
        eq(schema.ideaVotes.ideaId, ideaId),
        eq(schema.ideaVotes.userId, req.user!.id)
      ))
      .limit(1);
    
    if (existingVote.length > 0) {
      // Atualizar voto existente
      await db.update(schema.ideaVotes)
        .set({ vote: vote })
        .where(and(
          eq(schema.ideaVotes.ideaId, ideaId),
          eq(schema.ideaVotes.userId, req.user!.id)
        ));
    } else {
      // Criar novo voto
      await db.insert(schema.ideaVotes)
        .values({
          ideaId,
          userId: req.user!.id,
          vote
        });
    }
    
    // Obter contagem atualizada de votos
    const voteCount = await db.select({
      count: sql<number>`SUM(${schema.ideaVotes.vote})`.as('vote_count')
    })
    .from(schema.ideaVotes)
    .where(eq(schema.ideaVotes.ideaId, ideaId));
    
    res.json({
      ideaId,
      voteCount: voteCount[0].count || 0,
      userVote: vote
    });
  } catch (error) {
    console.error('Erro ao votar na ideia:', error);
    res.status(500).json({ error: 'Erro ao votar na ideia' });
  }
});

// POST /api/ideas/:id/comments - Adicionar um comentário a uma ideia
router.post('/:id/comments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const { content, parentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }
    
    // Verificar se a ideia existe
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    // Se for uma resposta, verificar se o comentário pai existe
    if (parentId) {
      const parentComment = await db.select()
        .from(schema.ideaComments)
        .where(eq(schema.ideaComments.id, parseInt(parentId)))
        .limit(1);
      
      if (parentComment.length === 0) {
        return res.status(404).json({ error: 'Comentário pai não encontrado' });
      }
    }
    
    // Adicionar o comentário
    const comment = await db.insert(schema.ideaComments)
      .values({
        ideaId,
        userId: req.user!.id,
        content,
        parentId: parentId ? parseInt(parentId) : null
      })
      .returning();
    
    // Obter dados completos do comentário com informações do usuário
    const commentWithUser = await db.select()
      .from(schema.ideaComments)
      .leftJoin(schema.users, eq(schema.ideaComments.userId, schema.users.id))
      .where(eq(schema.ideaComments.id, comment[0].id))
      .limit(1);
    
    const formattedComment = {
      id: commentWithUser[0].idea_comments.id,
      content: commentWithUser[0].idea_comments.content,
      parentId: commentWithUser[0].idea_comments.parentId,
      createdAt: commentWithUser[0].idea_comments.createdAt,
      user: {
        id: commentWithUser[0].users.id,
        name: commentWithUser[0].users.name,
        email: commentWithUser[0].users.email,
        photoUrl: commentWithUser[0].users.photoUrl
      },
      replies: []
    };
    
    res.status(201).json(formattedComment);
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ error: 'Erro ao adicionar comentário' });
  }
});

// POST /api/ideas/:id/volunteer - Se voluntariar para implementar uma ideia
router.post('/:id/volunteer', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const { message } = req.body;
    
    // Verificar se a ideia existe
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    // Verificar se o usuário já se voluntariou para esta ideia
    const existingVolunteer = await db.select()
      .from(schema.ideaVolunteers)
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.userId, req.user!.id)
      ))
      .limit(1);
    
    if (existingVolunteer.length > 0) {
      return res.status(400).json({ error: 'Você já se voluntariou para esta ideia' });
    }
    
    // Adicionar o voluntário
    const volunteer = await db.insert(schema.ideaVolunteers)
      .values({
        ideaId,
        userId: req.user!.id,
        message: message || null,
        status: 'pendente'
      })
      .returning();
    
    res.status(201).json({
      ...volunteer[0],
      user: {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        photoUrl: req.user!.photoUrl
      }
    });
  } catch (error) {
    console.error('Erro ao se voluntariar para a ideia:', error);
    res.status(500).json({ error: 'Erro ao se voluntariar para a ideia' });
  }
});

// PUT /api/ideas/:id/status - Atualizar o status de uma ideia (somente admin)
router.put('/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const { status } = req.body;
    
    const validStatuses = ['nova', 'em_avaliacao', 'priorizada', 'em_execucao', 'concluida', 'rejeitada'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Status inválido',
        validStatuses
      });
    }
    
    // Verificar se a ideia existe
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    // Atualizar o status da ideia
    const updatedIdea = await db.update(schema.ideas)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(schema.ideas.id, ideaId))
      .returning();
    
    res.json(updatedIdea[0]);
  } catch (error) {
    console.error('Erro ao atualizar status da ideia:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da ideia' });
  }
});

// PUT /api/ideas/:id/assign - Delegar uma ideia para um usuário (somente admin)
router.put('/:id/assign', isAdmin, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const { userId, groupName, groupDescription, userIds } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }
    
    if (!groupName) {
      return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
    }
    
    // Verificar se a ideia existe
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    // Verificar se o usuário responsável existe
    const responsibleUser = await db.select().from(schema.users).where(eq(schema.users.id, parseInt(userId))).limit(1);
    
    if (responsibleUser.length === 0) {
      return res.status(404).json({ error: 'Usuário responsável não encontrado' });
    }
    
    // Criar o grupo para a ideia
    const group = await db.insert(schema.groups)
      .values({
        name: groupName,
        description: groupDescription || `Grupo para implementação da ideia: ${existingIdea[0].title}`,
        creatorId: req.user!.id,
        isPrivate: true,
        requiresApproval: false
      })
      .returning();
    
    // Adicionar o usuário responsável como administrador do grupo
    await db.insert(schema.userGroups)
      .values({
        userId: parseInt(userId),
        groupId: group[0].id,
        isAdmin: true,
        status: 'approved'
      });
    
    // Adicionar outros usuários ao grupo, se especificados
    if (userIds && userIds.length > 0) {
      const userIdsArray = Array.isArray(userIds) ? userIds : [userIds];
      
      for (const id of userIdsArray) {
        if (id !== userId) { // Evitar duplicação do responsável
          await db.insert(schema.userGroups)
            .values({
              userId: parseInt(id),
              groupId: group[0].id,
              isAdmin: false,
              status: 'approved'
            });
        }
      }
    }
    
    // Atualizar a ideia com o responsável e grupo
    const updatedIdea = await db.update(schema.ideas)
      .set({
        responsibleId: parseInt(userId),
        groupId: group[0].id,
        status: 'em_execucao',
        updatedAt: new Date()
      })
      .where(eq(schema.ideas.id, ideaId))
      .returning();
    
    // Rejeitar todos os voluntários pendentes
    await db.update(schema.ideaVolunteers)
      .set({
        status: 'rejeitado'
      })
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.status, 'pendente')
      ));
    
    // Obter detalhes completos da ideia atualizada
    const ideaWithDetails = await db.select()
      .from(schema.ideas)
      .leftJoin(schema.users, eq(schema.ideas.creatorId, schema.users.id))
      .leftJoin(schema.users, eq(schema.ideas.responsibleId, schema.users.id), 'responsible')
      .leftJoin(schema.groups, eq(schema.ideas.groupId, schema.groups.id))
      .where(eq(schema.ideas.id, ideaId))
      .limit(1);
    
    const result = {
      ...ideaWithDetails[0].ideas,
      creator: {
        id: ideaWithDetails[0].users.id,
        name: ideaWithDetails[0].users.name,
        email: ideaWithDetails[0].users.email,
        photoUrl: ideaWithDetails[0].users.photoUrl
      },
      responsible: ideaWithDetails[0].responsible ? {
        id: ideaWithDetails[0].responsible.id,
        name: ideaWithDetails[0].responsible.name,
        email: ideaWithDetails[0].responsible.email,
        photoUrl: ideaWithDetails[0].responsible.photoUrl
      } : null,
      group: ideaWithDetails[0].groups ? {
        id: ideaWithDetails[0].groups.id,
        name: ideaWithDetails[0].groups.name,
        description: ideaWithDetails[0].groups.description,
        imageUrl: ideaWithDetails[0].groups.imageUrl
      } : null
    };
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao delegar ideia:', error);
    res.status(500).json({ error: 'Erro ao delegar ideia' });
  }
});

// POST /api/ideas/:id/volunteer/:volunteerId/approve - Aprovar um voluntário (somente admin)
router.post('/:id/volunteer/:volunteerId/approve', isAdmin, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const volunteerId = parseInt(req.params.volunteerId);
    const { groupName, groupDescription } = req.body;
    
    if (!groupName) {
      return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
    }
    
    // Verificar se a ideia existe
    const existingIdea = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);
    
    if (existingIdea.length === 0) {
      return res.status(404).json({ error: 'Ideia não encontrada' });
    }
    
    // Verificar se o voluntário existe
    const volunteer = await db.select()
      .from(schema.ideaVolunteers)
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.userId, volunteerId)
      ))
      .limit(1);
    
    if (volunteer.length === 0) {
      return res.status(404).json({ error: 'Voluntário não encontrado' });
    }
    
    // Criar o grupo para a ideia
    const group = await db.insert(schema.groups)
      .values({
        name: groupName,
        description: groupDescription || `Grupo para implementação da ideia: ${existingIdea[0].title}`,
        creatorId: req.user!.id,
        isPrivate: true,
        requiresApproval: false
      })
      .returning();
    
    // Adicionar o voluntário como administrador do grupo
    await db.insert(schema.userGroups)
      .values({
        userId: volunteerId,
        groupId: group[0].id,
        isAdmin: true,
        status: 'approved'
      });
    
    // Atualizar a ideia com o responsável e grupo
    const updatedIdea = await db.update(schema.ideas)
      .set({
        responsibleId: volunteerId,
        groupId: group[0].id,
        status: 'em_execucao',
        updatedAt: new Date()
      })
      .where(eq(schema.ideas.id, ideaId))
      .returning();
    
    // Aprovar este voluntário
    await db.update(schema.ideaVolunteers)
      .set({
        status: 'aprovado'
      })
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.userId, volunteerId)
      ));
    
    // Rejeitar todos os outros voluntários pendentes
    await db.update(schema.ideaVolunteers)
      .set({
        status: 'rejeitado'
      })
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.status, 'pendente'),
        sql`${schema.ideaVolunteers.user_id} != ${volunteerId}`
      ));
    
    res.json(updatedIdea[0]);
  } catch (error) {
    console.error('Erro ao aprovar voluntário:', error);
    res.status(500).json({ error: 'Erro ao aprovar voluntário' });
  }
});

// POST /api/ideas/:id/volunteer/:volunteerId/reject - Rejeitar um voluntário (somente admin)
router.post('/:id/volunteer/:volunteerId/reject', isAdmin, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const volunteerId = parseInt(req.params.volunteerId);
    
    // Verificar se o voluntário existe
    const volunteer = await db.select()
      .from(schema.ideaVolunteers)
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.userId, volunteerId)
      ))
      .limit(1);
    
    if (volunteer.length === 0) {
      return res.status(404).json({ error: 'Voluntário não encontrado' });
    }
    
    // Rejeitar o voluntário
    await db.update(schema.ideaVolunteers)
      .set({
        status: 'rejeitado'
      })
      .where(and(
        eq(schema.ideaVolunteers.ideaId, ideaId),
        eq(schema.ideaVolunteers.userId, volunteerId)
      ));
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao rejeitar voluntário:', error);
    res.status(500).json({ error: 'Erro ao rejeitar voluntário' });
  }
});

export default router;