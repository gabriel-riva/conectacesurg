import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { db } from './db';
import { posts, comments, likes, groups, users, userGroups, messages, conversations, notifications, User } from '@shared/schema';
import { eq, desc, asc, and, or, isNull, inArray, sql, ilike } from 'drizzle-orm';

// Extender o tipo Request do Express para incluir o usuário
declare global {
  namespace Express {
    interface User {
      id: number;
      // Outros campos necessários
    }
  }
}

const router = Router();

// Set up multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, PDFs, Word documents, and text files are allowed.') as any);
    }
  }
});

// Helper functions
const getMediaTypeFromMimetype = (mimetype: string) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype === 'application/msword' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'document';
  return 'file';
};

// Check if user is in a group
const isUserInGroup = async (userId: number, groupId: number) => {
  const userGroup = await db.query.userGroups.findFirst({
    where: and(
      eq(userGroups.userId, userId),
      eq(userGroups.groupId, groupId),
      eq(userGroups.status, 'approved')
    )
  });
  return !!userGroup;
};

// Check if user is admin of a group
const isUserGroupAdmin = async (userId: number, groupId: number) => {
  const userGroup = await db.query.userGroups.findFirst({
    where: and(
      eq(userGroups.userId, userId),
      eq(userGroups.groupId, groupId),
      eq(userGroups.isAdmin, true)
    )
  });
  return !!userGroup;
};

// Routes for posts
router.get('/posts', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    
    // Get groups the user is in
    const userGroupsData = await db.select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, userId));
    
    const groupIds = userGroupsData.map(g => g.groupId);
    
    // Get posts from general feed and the user's groups
    const postsData = await db.query.posts.findMany({
      where: or(
        isNull(posts.groupId),
        inArray(posts.groupId, groupIds)
      ),
      with: {
        user: true,
        group: true,
        comments: {
          with: {
            user: true
          },
          orderBy: [desc(comments.createdAt)]
        },
        likes: true
      },
      orderBy: [desc(posts.createdAt)]
    });
    
    // Enhance posts with like and comment counts
    const enhancedPosts = postsData.map(post => ({
      ...post,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      isLiked: post.likes.some(like => like.userId === userId)
    }));
    
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/posts', upload.array('media', 5), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { content, groupId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // If posting to a group, check if user is in that group
    if (groupId && !(await isUserInGroup(req.user.id, parseInt(groupId)))) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    
    // Process uploaded files
    const files = req.files as Express.Multer.File[];
    const mediaUrls: string[] = [];
    const mediaTypes: string[] = [];
    
    if (files && files.length > 0) {
      files.forEach(file => {
        // Create a relative URL path for the file
        const mediaUrl = `/uploads/${file.filename}`;
        mediaUrls.push(mediaUrl);
        mediaTypes.push(getMediaTypeFromMimetype(file.mimetype));
      });
    }
    
    // Create post
    const [post] = await db.insert(posts).values({
      userId: req.user.id,
      groupId: groupId ? parseInt(groupId) : null,
      content,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : null,
      mediaTypes: mediaTypes.length > 0 ? mediaTypes : null,
    }).returning();
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Route for commenting on a post
router.post('/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const postId = parseInt(req.params.postId);
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        group: true
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // If post is in a group, check if user is in that group
    if (post.groupId && !(await isUserInGroup(req.user.id, post.groupId))) {
      return res.status(403).json({ error: 'You do not have permission to comment on this post' });
    }
    
    // Create comment
    const [comment] = await db.insert(comments).values({
      postId,
      userId: req.user.id,
      content,
    }).returning();
    
    // Get the complete comment with user info
    const newComment = await db.query.comments.findFirst({
      where: eq(comments.id, comment.id),
      with: {
        user: true
      }
    });
    
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Route for liking a post
router.post('/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const postId = parseInt(req.params.postId);
    
    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        group: true
      }
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // If post is in a group, check if user is in that group
    if (post.groupId && !(await isUserInGroup(req.user.id, post.groupId))) {
      return res.status(403).json({ error: 'You do not have permission to like this post' });
    }
    
    // Check if user already liked this post
    const existingLike = await db.query.likes.findFirst({
      where: and(
        eq(likes.userId, req.user.id),
        eq(likes.postId, postId)
      )
    });
    
    if (existingLike) {
      // Unlike the post
      await db.delete(likes).where(and(
        eq(likes.userId, req.user.id),
        eq(likes.postId, postId)
      ));
      return res.json({ liked: false });
    }
    
    // Like the post
    await db.insert(likes).values({
      userId: req.user.id,
      postId,
    });
    
    res.json({ liked: true });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Routes for groups
router.get('/groups/user', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get groups where user is a member
    const userGroupsData = await db.query.userGroups.findMany({
      where: eq(userGroups.userId, req.user.id),
      with: {
        group: true
      }
    });
    
    const groups = userGroupsData.map(ug => ug.group);
    
    res.json(groups);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
});

router.get('/groups/admin', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get groups where user is an admin
    const adminGroupsData = await db.query.userGroups.findMany({
      where: and(
        eq(userGroups.userId, req.user.id),
        eq(userGroups.isAdmin, true)
      ),
      with: {
        group: true
      }
    });
    
    const groups = adminGroupsData.map(ug => ug.group);
    
    res.json(groups);
  } catch (error) {
    console.error('Error fetching admin groups:', error);
    res.status(500).json({ error: 'Failed to fetch admin groups' });
  }
});

router.post('/groups', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('Usuário criando grupo:', req.user);
    console.log('Req body:', req.body);
    
    const { name, description, isPrivate, requiresApproval } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    // Check if a group with this name already exists
    const existingGroup = await db.query.groups.findFirst({
      where: eq(groups.name, name)
    });
    
    if (existingGroup) {
      return res.status(400).json({ error: 'A group with this name already exists' });
    }
    
    // Create the group
    const userId = parseInt(req.user.id.toString());
    console.log('ID do usuário para creator_id:', userId);
    
    // Processando a imagem se enviada
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      console.log('Imagem do grupo salva em:', imageUrl);
    }

    const [group] = await db.insert(groups).values({
      name,
      description: description || null,
      creatorId: userId,
      isPrivate: isPrivate === true,
      requiresApproval: requiresApproval === true,
      imageUrl: imageUrl,
    }).returning();
    
    // Add creator as an admin of the group
    await db.insert(userGroups).values({
      userId: userId,
      groupId: group.id,
      isAdmin: true,
      status: 'approved',
    });
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.post('/groups/:groupId/join', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const groupId = parseInt(req.params.groupId);
    
    // Check if group exists
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId)
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is already in the group
    const existingMembership = await db.query.userGroups.findFirst({
      where: and(
        eq(userGroups.userId, req.user.id),
        eq(userGroups.groupId, groupId)
      )
    });
    
    if (existingMembership) {
      if (existingMembership.status === 'approved') {
        return res.status(400).json({ error: 'You are already a member of this group' });
      } else if (existingMembership.status === 'pending') {
        return res.status(400).json({ error: 'Your join request is pending approval' });
      } else {
        // Update rejected status to pending
        await db.update(userGroups)
          .set({ status: 'pending' })
          .where(and(
            eq(userGroups.userId, req.user.id),
            eq(userGroups.groupId, groupId)
          ));
          
        return res.json({ status: 'pending', message: 'Your join request is pending approval' });
      }
    }
    
    // Determine status based on group settings
    const status = group.requiresApproval ? 'pending' : 'approved';
    
    // Add user to group
    await db.insert(userGroups).values({
      userId: req.user.id,
      groupId,
      isAdmin: false,
      status,
    });
    
    res.json({ 
      status, 
      message: status === 'approved' 
        ? 'You have joined the group' 
        : 'Your join request is pending approval' 
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Routes for conversations and messages
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get all conversations where the user is involved
    const userConversations = await db.query.conversations.findMany({
      where: or(
        eq(conversations.user1Id, req.user.id),
        eq(conversations.user2Id, req.user.id)
      ),
      with: {
        user1: true,
        user2: true,
      },
      orderBy: [desc(conversations.lastMessageAt)]
    });
    
    res.json(userConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/messages/:conversationId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const conversationId = parseInt(req.params.conversationId);
    
    // Check if conversation exists and user is part of it
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.user1Id, req.user.id),
          eq(conversations.user2Id, req.user.id)
        )
      )
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages for this conversation
    const conversationMessages = await db.query.messages.findMany({
      where: or(
        and(
          eq(messages.senderId, conversation.user1Id),
          eq(messages.receiverId, conversation.user2Id)
        ),
        and(
          eq(messages.senderId, conversation.user2Id),
          eq(messages.receiverId, conversation.user1Id)
        )
      ),
      orderBy: [asc(messages.createdAt)]
    });
    
    // Mark messages as read if the user is the receiver
    const unreadMessages = conversationMessages.filter(
      msg => msg.receiverId === req.user?.id && !msg.isRead
    );
    
    if (unreadMessages.length > 0) {
      await db.update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.receiverId, req.user.id),
            inArray(
              messages.id, 
              unreadMessages.map(msg => msg.id)
            )
          )
        );
    }
    
    res.json(conversationMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { receiverId, content } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }
    
    const receiverIdNum = parseInt(receiverId);
    
    // Check if receiver exists
    const receiver = await db.query.users.findFirst({
      where: eq(users.id, receiverIdNum)
    });
    
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    
    // Find or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: or(
        and(
          eq(conversations.user1Id, req.user.id),
          eq(conversations.user2Id, receiverIdNum)
        ),
        and(
          eq(conversations.user1Id, receiverIdNum),
          eq(conversations.user2Id, req.user.id)
        )
      )
    });
    
    if (!conversation) {
      // Create new conversation
      const [newConversation] = await db.insert(conversations).values({
        user1Id: req.user.id,
        user2Id: receiverIdNum,
        lastMessageText: content,
      }).returning();
      
      conversation = newConversation;
    } else {
      // Update conversation's last message
      await db.update(conversations)
        .set({ 
          lastMessageAt: new Date(),
          lastMessageText: content
        })
        .where(eq(conversations.id, conversation.id));
    }
    
    // Create message
    const [message] = await db.insert(messages).values({
      senderId: req.user.id,
      receiverId: receiverIdNum,
      content,
    }).returning();
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Search
router.get('/search', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const searchQuery = req.query.q as string;
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Get groups the user is in
    const userGroupsData = await db.select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, req.user.id));
    
    const groupIds = userGroupsData.map(g => g.groupId);
    
    // Search for posts matching the query
    const searchResults = await db.query.posts.findMany({
      where: and(
        ilike(posts.content, `%${searchQuery}%`),
        or(
          isNull(posts.groupId),
          inArray(posts.groupId, groupIds)
        )
      ),
      with: {
        user: true,
        group: true,
        comments: {
          with: {
            user: true
          },
          orderBy: [desc(comments.createdAt)]
        },
        likes: true
      },
      orderBy: [desc(posts.createdAt)]
    });
    
    // Also search in comments
    const commentResults = await db.query.comments.findMany({
      where: ilike(comments.content, `%${searchQuery}%`),
      with: {
        post: {
          with: {
            user: true,
            group: true,
            comments: {
              with: {
                user: true
              },
              orderBy: [desc(comments.createdAt)]
            },
            likes: true
          }
        },
        user: true
      }
    });
    
    // Filter comment results to only include posts the user has access to
    const commentPostResults = commentResults
      .map(comment => comment.post)
      .filter(post => 
        post.groupId === null || 
        groupIds.includes(post.groupId)
      );
    
    // Combine and deduplicate results
    const allPosts = [...searchResults, ...commentPostResults];
    const uniquePosts = allPosts.filter((post, index, self) =>
      index === self.findIndex((p) => p.id === post.id)
    );
    
    // Enhance posts with like and comment counts
    const enhancedPosts = uniquePosts.map(post => ({
      ...post,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      isLiked: post.likes.some(like => like.userId === req.user?.id)
    }));
    
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// Rota para buscar convites de grupo pendentes para o usuário
router.get('/group-invites', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Buscar convites de grupo (são entradas na tabela user_groups com status 'pending')
    const pendingInvites = await db.query.userGroups.findMany({
      where: and(
        eq(userGroups.userId, req.user.id),
        eq(userGroups.status, 'pending')
      ),
      with: {
        group: {
          with: {
            creator: true
          }
        }
      }
    });

    const formattedInvites = pendingInvites.map(invite => ({
      id: invite.groupId,
      name: invite.group.name,
      description: invite.group.description,
      imageUrl: invite.group.imageUrl,
      isPrivate: invite.group.isPrivate,
      requiresApproval: invite.group.requiresApproval,
      createdAt: invite.joinedAt,
      invitedBy: invite.group.creator?.name || 'Administrador'
    }));

    res.json(formattedInvites);
  } catch (error) {
    console.error('Error fetching group invites:', error);
    res.status(500).json({ error: 'Failed to fetch group invites' });
  }
});

// Rota para aceitar um convite de grupo
router.post('/group-invites/:groupId/accept', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const groupId = parseInt(req.params.groupId);
    
    // Verificar se o convite existe
    const invite = await db.query.userGroups.findFirst({
      where: and(
        eq(userGroups.userId, req.user.id),
        eq(userGroups.groupId, groupId),
        eq(userGroups.status, 'pending')
      )
    });

    if (!invite) {
      return res.status(404).json({ error: 'Convite não encontrado' });
    }

    // Atualizar status para 'approved'
    await db.update(userGroups)
      .set({ status: 'approved' })
      .where(and(
        eq(userGroups.userId, req.user.id),
        eq(userGroups.groupId, groupId)
      ));

    // Criar notificação para o criador do grupo
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId)
    });

    if (group) {
      await db.insert(notifications).values({
        userId: group.creatorId,
        type: 'group_accepted',
        title: 'Novo membro no grupo',
        message: `${req.user.name || 'Um usuário'} aceitou o convite para o grupo "${group.name}"`,
        relatedId: groupId,
        relatedType: 'group',
        fromUserId: req.user.id
      });
    }

    res.json({ success: true, message: 'Convite aceito com sucesso' });
  } catch (error) {
    console.error('Error accepting group invite:', error);
    res.status(500).json({ error: 'Failed to accept group invite' });
  }
});

// Rota para recusar um convite de grupo
router.post('/group-invites/:groupId/reject', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const groupId = parseInt(req.params.groupId);
    
    // Verificar se o convite existe
    const invite = await db.query.userGroups.findFirst({
      where: and(
        eq(userGroups.userId, req.user.id),
        eq(userGroups.groupId, groupId),
        eq(userGroups.status, 'pending')
      )
    });

    if (!invite) {
      return res.status(404).json({ error: 'Convite não encontrado' });
    }

    // Remover o convite
    await db.delete(userGroups)
      .where(and(
        eq(userGroups.userId, req.user.id),
        eq(userGroups.groupId, groupId)
      ));

    res.json({ success: true, message: 'Convite recusado com sucesso' });
  } catch (error) {
    console.error('Error rejecting group invite:', error);
    res.status(500).json({ error: 'Failed to reject group invite' });
  }
});

// Rota para convidar um usuário para um grupo
router.post('/groups/:groupId/invite', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const groupId = parseInt(req.params.groupId);
    const { userId } = req.body;

    // Log detalhado para debugging
    console.log(`Recebendo solicitação para convidar usuário - groupId: ${groupId}, userId: ${userId}, solicitado por: ${req.user.id}`);
    
    if (!userId) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    // Verificar se o usuário que está convidando é admin do grupo
    const isAdmin = await isUserGroupAdmin(req.user.id, groupId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem convidar usuários' });
    }

    // Verificar se o usuário já está no grupo
    const userInGroup = await db.query.userGroups.findFirst({
      where: and(
        eq(userGroups.userId, userId),
        eq(userGroups.groupId, groupId)
      )
    });

    if (userInGroup) {
      return res.status(400).json({ error: 'Usuário já está no grupo ou já foi convidado' });
    }

    // Obter informações do grupo
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId)
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // Criar o convite (entrada em user_groups com status 'pending')
    await db.insert(userGroups).values({
      userId: userId,
      groupId: groupId,
      status: 'pending',
      isAdmin: false
    });

    // Criar notificação para o usuário convidado
    await db.insert(notifications).values({
      userId: userId,
      type: 'GROUP_INVITE',
      title: 'Convite para grupo',
      message: `Você foi convidado para o grupo ${group.name}`,
      relatedId: groupId,
      relatedType: 'group',
      fromUserId: req.user.id,
      isRead: false,
      actionTaken: false,
      createdAt: new Date()
    });

    res.json({ success: true, message: 'Convite enviado com sucesso' });
  } catch (error) {
    console.error('Error inviting user to group:', error);
    res.status(500).json({ error: 'Failed to invite user to group' });
  }
});

// Rota de teste para criar convites de grupo (apenas para desenvolvimento)
router.post('/group-invites/test', async (req: Request, res: Response) => {
  try {
    const { userId, groupId } = req.body;
    
    // Verificar se os parâmetros necessários estão presentes
    if (!userId || !groupId) {
      return res.status(400).json({ error: 'userId e groupId são obrigatórios' });
    }
    
    // Verificar se o usuário já tem um convite para este grupo
    const existingInvite = await db.query.userGroups.findFirst({
      where: and(
        eq(userGroups.userId, userId),
        eq(userGroups.groupId, groupId)
      )
    });
    
    if (existingInvite) {
      // Atualizar para status pendente
      await db.update(userGroups)
        .set({ status: 'pending' })
        .where(and(
          eq(userGroups.userId, userId),
          eq(userGroups.groupId, groupId)
        ));
    } else {
      // Criar uma nova entrada de convite
      await db.insert(userGroups).values({
        userId: userId,
        groupId: groupId,
        status: 'pending',
        isAdmin: false
      });
    }
    
    // Obter informações do grupo
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId)
    });
    
    if (group) {
      // Criar uma notificação para o usuário
      await db.insert(notifications).values({
        userId: userId,
        type: 'GROUP_INVITE',
        title: 'Convite para grupo (TESTE)',
        message: `Você foi convidado para o grupo ${group.name}`,
        relatedId: groupId,
        relatedType: 'group',
        fromUserId: group.creatorId,
        isRead: false,
        actionTaken: false,
        createdAt: new Date()
      });
    }
    
    res.json({ success: true, message: 'Convite de teste criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar convite de teste:', error);
    res.status(500).json({ error: 'Falha ao criar convite de teste' });
  }
});

export default router;