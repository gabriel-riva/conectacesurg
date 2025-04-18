import express, { Request, Response } from 'express';
import multer from 'multer';
import { storage as dbStorage } from './storage';
import { db } from './db';
import * as schema from '@shared/schema';
import { and, asc, desc, eq, inArray, like, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { alias } from 'drizzle-orm/pg-core';

const router = express.Router();

// Configuração do multer para upload de arquivos
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ storage });

// Middleware de autenticação para as rotas de ideias
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  next();
};

// Middleware de verificação de administrador
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const user = req.user as { role: string };
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso não autorizado. Você não é um administrador.' });
  }
  
  next();
};

// Define aliases para evitar colisão de nomes nas junções
const creatorUsers = alias(schema.users, 'creator_users');
const responsibleUsers = alias(schema.users, 'responsible_users');
const commentUsers = alias(schema.users, 'comment_users');
const volunteerUsers = alias(schema.users, 'volunteer_users');

// GET /api/ideas - Listar todas as ideias com filtros e ordenação
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    let query = db.select().from(schema.ideas)
      .leftJoin(creatorUsers, eq(schema.ideas.creatorId, creatorUsers.id))
      .leftJoin(responsibleUsers, eq(schema.ideas.responsibleId, responsibleUsers.id))
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
        id: idea.creator_users?.id || null,
        name: idea.creator_users?.name || '',
        email: idea.creator_users?.email || '',
        photoUrl: idea.creator_users?.photoUrl || null
      },
      responsible: idea.responsible_users ? {
        id: idea.responsible_users.id,
        name: idea.responsible_users.name,
        email: idea.responsible_users.email,
        photoUrl: idea.responsible_users.photoUrl
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
      .leftJoin(creatorUsers, eq(schema.ideas.creatorId, creatorUsers.id))
      .leftJoin(responsibleUsers, eq(schema.ideas.responsibleId, responsibleUsers.id))
      .leftJoin(schema.groups, eq(schema.ideas.groupId, schema.groups.id));
    
    if (type === 'created') {
      query = query.where(eq(schema.ideas.creatorId, userId));
    } else if (type === 'responsible') {
      query = query.where(eq(schema.ideas.responsibleId, userId));
    } else {
      // 'all' - ideias que o usuário criou ou é responsável
      query = query.where(
        sql`${schema.ideas.creatorId} = ${userId} OR ${schema.ideas.responsibleId} = ${userId}`
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
        id: idea.creator_users?.id || null,
        name: idea.creator_users?.name || '',
        email: idea.creator_users?.email || '',
        photoUrl: idea.creator_users?.photoUrl || null
      },
      responsible: idea.responsible_users ? {
        id: idea.responsible_users.id,
        name: idea.responsible_users.name,
        email: idea.responsible_users.email,
        photoUrl: idea.responsible_users.photoUrl
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
      .leftJoin(creatorUsers, eq(schema.ideas.creatorId, creatorUsers.id))
      .leftJoin(responsibleUsers, eq(schema.ideas.responsibleId, responsibleUsers.id))
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
      .leftJoin(commentUsers, eq(schema.ideaComments.userId, commentUsers.id))
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
      .leftJoin(volunteerUsers, eq(schema.ideaVolunteers.userId, volunteerUsers.id))
      .where(eq(schema.ideaVolunteers.ideaId, ideaId));
    
    const formattedComments = comments.map(comment => ({
      id: comment.idea_comments.id,
      content: comment.idea_comments.content,
      parentId: comment.idea_comments.parentId,
      createdAt: comment.idea_comments.createdAt,
      user: {
        id: comment.comment_users.id,
        name: comment.comment_users.name,
        email: comment.comment_users.email,
        photoUrl: comment.comment_users.photoUrl
      }
    }));
    
    const formattedVolunteers = volunteers.map(volunteer => ({
      userId: volunteer.volunteer_users.id,
      name: volunteer.volunteer_users.name,
      email: volunteer.volunteer_users.email,
      photoUrl: volunteer.volunteer_users.photoUrl,
      message: volunteer.idea_volunteers.message,
      status: volunteer.idea_volunteers.status,
      createdAt: volunteer.idea_volunteers.createdAt
    }));
    
    // Organizar comentários em árvore (para respostas)
    const commentMap = new Map();
    const rootComments: any[] = [];
    
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
        id: idea.creator_users?.id || null,
        name: idea.creator_users?.name || '',
        email: idea.creator_users?.email || '',
        photoUrl: idea.creator_users?.photoUrl || null
      },
      responsible: idea.responsible_users ? {
        id: idea.responsible_users.id,
        name: idea.responsible_users.name,
        email: idea.responsible_users.email,
        photoUrl: idea.responsible_users.photoUrl
      } : null,
      group: idea.groups ? {
        id: idea.groups.id,
        name: idea.groups.name,
        description: idea.groups.description,
        imageUrl: idea.groups.imageUrl
      } : null,
      voteCount: voteCount[0]?.count || 0,
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
    // Vamos adicionar logs para depuração
    console.log("Corpo da requisição:", req.body);
    console.log("Arquivos:", req.files);
    
    const { title, description, takeResponsibility } = req.body;
    const userId = req.user!.id;
    
    console.log("Título:", title);
    console.log("Descrição:", description);
    console.log("Responsabilidade:", takeResponsibility);
    console.log("ID do usuário:", userId);
    
    // Validar dados básicos
    if (!title || !description) {
      return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
    }
    
    // Processar arquivos anexados (se houver)
    const files = req.files as Express.Multer.File[];
    const attachments = files.length > 0
      ? files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimeType: file.mimetype
        }))
      : [];
    
    // Criar a ideia no banco de dados
    const newIdea = await db.insert(schema.ideas).values({
      title,
      description,
      status: 'nova', // Status inicial
      creatorId: userId,
      responsibleId: takeResponsibility === 'true' ? userId : null,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Se o usuário também quer ser responsável, adiciona-o como voluntário aprovado
    if (takeResponsibility === 'true') {
      await db.insert(schema.ideaVolunteers).values({
        ideaId: newIdea[0].id,
        userId: userId,
        message: 'Criador da ideia (responsável automático)',
        status: 'approved',
        createdAt: new Date()
      });
      
      // Criar um grupo para esta ideia (para colaboração)
      const newGroup = await db.insert(schema.groups).values({
        name: `Grupo: ${title}`,
        description: `Grupo de colaboração para a ideia: ${title}`,
        isPrivate: true,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      // Associar o grupo à ideia
      await db.update(schema.ideas)
        .set({ groupId: newGroup[0].id })
        .where(eq(schema.ideas.id, newIdea[0].id));
      
      // Adicionar o criador como membro do grupo (e como admin)
      await db.insert(schema.userGroups).values({
        userId: userId,
        groupId: newGroup[0].id,
        role: 'admin', // O criador é admin do grupo
        joinedAt: new Date()
      });
    }
    
    res.status(201).json(newIdea[0]);
  } catch (error) {
    console.error('Erro ao criar ideia:', error);
    res.status(500).json({ error: 'Erro ao criar ideia' });
  }
});

// As demais rotas seguem o mesmo padrão, com os aliases corretos

export default router;