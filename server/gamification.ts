import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "./db";
import { gamificationSettings, gamificationPoints, gamificationChallenges, users, userCategories, userCategoryAssignments, challengeComments, challengeCommentLikes, challengeSubmissions } from "@/shared/schema";
import { eq, desc, and, gte, lte, sql, inArray, like } from "drizzle-orm";
import { z } from "zod";
import { insertGamificationSettingsSchema, insertGamificationPointsSchema, insertGamificationChallengeSchema, updateGamificationChallengeSchema, updateGamificationSettingsSchema, insertChallengeCommentSchema, insertChallengeCommentLikeSchema, insertChallengeSubmissionSchema, updateChallengeSubmissionSchema } from "@/shared/schema";

const router = Router();

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Middleware para verificar se é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// Buscar configurações de gamificação
router.get("/settings", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const settings = await db
      .select()
      .from(gamificationSettings)
      .limit(1);
    
    res.json(settings[0] || null);
  } catch (error) {
    console.error("Error fetching gamification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Atualizar configurações de gamificação (admin)
router.put("/settings", isAdmin, async (req: Request, res: Response) => {
  try {
    const data = updateGamificationSettingsSchema.parse(req.body);
    
    // Verificar se já existe configuração
    const existingSettings = await db
      .select()
      .from(gamificationSettings)
      .limit(1);
    
    let result;
    if (existingSettings.length > 0) {
      // Atualizar existente
      result = await db
        .update(gamificationSettings)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(gamificationSettings.id, existingSettings[0].id))
        .returning();
    } else {
      // Criar novo
      result = await db
        .insert(gamificationSettings)
        .values(data)
        .returning();
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating gamification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar ranking de usuários
router.get("/ranking", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { filter, categoryId } = req.query;
    
    // Buscar configurações atuais
    const settings = await db
      .select()
      .from(gamificationSettings)
      .limit(1);
    
    const currentSettings = settings[0];
    
    // Construir condições de filtro de data
    let dateCondition = sql`1=1`;
    
    if (filter === 'cycle' && currentSettings?.cycleStartDate && currentSettings?.cycleEndDate) {
      dateCondition = and(
        gte(gamificationPoints.createdAt, new Date(currentSettings.cycleStartDate)),
        lte(gamificationPoints.createdAt, new Date(currentSettings.cycleEndDate))
      );
    } else if (filter === 'annual' && currentSettings?.annualStartDate && currentSettings?.annualEndDate) {
      dateCondition = and(
        gte(gamificationPoints.createdAt, new Date(currentSettings.annualStartDate)),
        lte(gamificationPoints.createdAt, new Date(currentSettings.annualEndDate))
      );
    }

    // Buscar usuários elegíveis baseados na configuração de gamificação
    let eligibleUserIds: number[] = [];
    
    // Se há filtro por categoria específica (para visualização)
    if (categoryId) {
      const categoryUsers = await db
        .select({ userId: userCategoryAssignments.userId })
        .from(userCategoryAssignments)
        .where(eq(userCategoryAssignments.categoryId, parseInt(categoryId as string)));
      
      eligibleUserIds = categoryUsers.map(u => u.userId);
    }
    // Se há categoria geral configurada, usar ela como base para participação na gamificação
    else if (currentSettings?.generalCategoryId) {
      const generalCategoryUsers = await db
        .select({ userId: userCategoryAssignments.userId })
        .from(userCategoryAssignments)
        .where(eq(userCategoryAssignments.categoryId, currentSettings.generalCategoryId));
      
      eligibleUserIds = generalCategoryUsers.map(u => u.userId);
    }
    // Se há categorias habilitadas configuradas, usar elas como base
    else if (currentSettings?.enabledCategoryIds?.length > 0) {
      const enabledCategoryUsers = await db
        .select({ userId: userCategoryAssignments.userId })
        .from(userCategoryAssignments)
        .where(inArray(userCategoryAssignments.categoryId, currentSettings.enabledCategoryIds));
      
      // Remover duplicatas usando Set
      eligibleUserIds = Array.from(new Set(enabledCategoryUsers.map(u => u.userId)));
    }

    // Se não há usuários elegíveis, retornar array vazio
    if (eligibleUserIds.length === 0) {
      return res.json([]);
    }

    // Buscar dados dos usuários elegíveis
    const eligibleUsers = await db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        photoUrl: users.photoUrl,
        isActive: users.isActive
      })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        inArray(users.id, eligibleUserIds)
      ));

    // Buscar pontos para cada usuário elegível
    const userPointsMap = new Map<number, number>();
    
    if (eligibleUsers.length > 0) {
      const userIds = eligibleUsers.map(u => u.userId);
      
      const pointsQuery = db
        .select({
          userId: gamificationPoints.userId,
          totalPoints: sql<number>`sum(${gamificationPoints.points})`
        })
        .from(gamificationPoints)
        .where(and(
          inArray(gamificationPoints.userId, userIds),
          dateCondition
        ))
        .groupBy(gamificationPoints.userId);

      const pointsResults = await pointsQuery;
      
      // Criar mapa de pontos por usuário
      pointsResults.forEach(result => {
        userPointsMap.set(result.userId, result.totalPoints || 0);
      });
    }

    // Combinar dados de usuários com pontos e ordenar
    const rankingData = eligibleUsers.map(user => ({
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      photoUrl: user.photoUrl,
      totalPoints: userPointsMap.get(user.userId) || 0
    }));

    // Ordenar: primeiro por pontos (decrescente), depois por nome (alfabética) para empates
    rankingData.sort((a, b) => {
      if (a.totalPoints !== b.totalPoints) {
        return b.totalPoints - a.totalPoints; // Pontos decrescentes
      }
      return a.userName.localeCompare(b.userName); // Nome alfabético para empates
    });

    // Buscar informações de categoria para cada usuário
    const rankingWithCategories = await Promise.all(
      rankingData.map(async (user, index) => {
        let categoryInfo = null;
        
        // Se há filtro por categoria específica, buscar a categoria
        if (categoryId) {
          const categoryResult = await db
            .select({
              categoryId: userCategories.id,
              categoryName: userCategories.name
            })
            .from(userCategories)
            .where(eq(userCategories.id, parseInt(categoryId as string)))
            .limit(1);
          
          if (categoryResult.length > 0) {
            categoryInfo = categoryResult[0];
          }
        }
        
        return {
          ...user,
          categoryId: categoryInfo?.categoryId || null,
          categoryName: categoryInfo?.categoryName || null,
          position: index + 1
        };
      })
    );
    
    res.json(rankingWithCategories);
  } catch (error) {
    console.error("Error fetching ranking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar extrato de pontos do usuário logado
router.get("/points/extract", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    const pointsHistory = await db
      .select({
        id: gamificationPoints.id,
        points: gamificationPoints.points,
        description: gamificationPoints.description,
        type: gamificationPoints.type,
        createdAt: gamificationPoints.createdAt,
        createdBy: users.name
      })
      .from(gamificationPoints)
      .leftJoin(users, eq(gamificationPoints.createdBy, users.id))
      .where(eq(gamificationPoints.userId, userId))
      .orderBy(desc(gamificationPoints.createdAt));
    
    // Calcular total de pontos
    const totalPoints = pointsHistory.reduce((sum, entry) => sum + entry.points, 0);
    
    res.json({
      totalPoints,
      history: pointsHistory
    });
  } catch (error) {
    console.error("Error fetching points extract:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Adicionar pontos a um usuário (admin)
router.post("/points", isAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertGamificationPointsSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    
    const result = await db
      .insert(gamificationPoints)
      .values(data)
      .returning();
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error adding points:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Listar todas as transações de pontos (admin)
router.get("/points", isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, limit = 100, offset = 0 } = req.query;
    
    let query = db
      .select({
        id: gamificationPoints.id,
        points: gamificationPoints.points,
        description: gamificationPoints.description,
        type: gamificationPoints.type,
        createdAt: gamificationPoints.createdAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        createdBy: sql<string>`creator.name`
      })
      .from(gamificationPoints)
      .innerJoin(users, eq(gamificationPoints.userId, users.id))
      .leftJoin(sql`users as creator`, sql`${gamificationPoints.createdBy} = creator.id`)
      .orderBy(desc(gamificationPoints.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    // Filtrar por usuário se especificado
    if (userId) {
      query = query.where(eq(gamificationPoints.userId, parseInt(userId as string)));
    }
    
    const points = await query;
    
    res.json(points);
  } catch (error) {
    console.error("Error fetching points:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remover pontos (admin)
router.delete("/points/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db
      .delete(gamificationPoints)
      .where(eq(gamificationPoints.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing points:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar categorias de usuários configuradas para gamificação
router.get("/categories", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Buscar configurações atuais
    const settings = await db
      .select()
      .from(gamificationSettings)
      .limit(1);
    
    const currentSettings = settings[0];
    
    if (!currentSettings?.enabledCategoryIds?.length) {
      return res.json([]);
    }
    
    // Buscar apenas as categorias habilitadas nas configurações
    const categories = await db
      .select()
      .from(userCategories)
      .where(
        and(
          eq(userCategories.isActive, true),
          inArray(userCategories.id, currentSettings.enabledCategoryIds)
        )
      )
      .orderBy(userCategories.name);
    
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Listar desafios
router.get("/challenges", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { type = "all" } = req.query;
    const userId = req.user.id;
    
    // Buscar todas as categorias do usuário
    const userCategories = await db
      .select({ categoryId: userCategoryAssignments.categoryId })
      .from(userCategoryAssignments)
      .where(eq(userCategoryAssignments.userId, userId));
    
    const userCategoryIds = userCategories.map(uc => uc.categoryId);
    
    let query = db
      .select({
        id: gamificationChallenges.id,
        title: gamificationChallenges.title,
        description: gamificationChallenges.description,
        detailedDescription: gamificationChallenges.detailedDescription,
        imageUrl: gamificationChallenges.imageUrl,
        points: gamificationChallenges.points,
        startDate: sql<string>`DATE(${gamificationChallenges.startDate})`,
        endDate: sql<string>`DATE(${gamificationChallenges.endDate})`,
        type: gamificationChallenges.type,
        isActive: gamificationChallenges.isActive,
        evaluationType: gamificationChallenges.evaluationType,
        evaluationConfig: gamificationChallenges.evaluationConfig,
        targetUserCategories: gamificationChallenges.targetUserCategories,
        createdAt: gamificationChallenges.createdAt,
        createdBy: gamificationChallenges.createdBy,
        creatorName: users.name,
      })
      .from(gamificationChallenges)
      .leftJoin(users, eq(gamificationChallenges.createdBy, users.id))
      .where(eq(gamificationChallenges.isActive, true))
      .orderBy(desc(gamificationChallenges.createdAt));
    
    if (type !== "all") {
      query = query.where(eq(gamificationChallenges.type, type as string));
    }
    
    const allChallenges = await query;
    
    // Filtrar desafios baseado nas categorias do usuário
    const filteredChallenges = allChallenges.filter(challenge => {
      // Se o desafio não tem categorias específicas (array vazio ou null), é visível para todos
      if (!challenge.targetUserCategories || challenge.targetUserCategories.length === 0) {
        return true;
      }
      
      // Se o usuário não tem categorias, só pode ver desafios sem categorias específicas
      if (userCategoryIds.length === 0) {
        return false;
      }
      
      // Verificar se o usuário possui alguma das categorias alvo do desafio
      return challenge.targetUserCategories.some(categoryId => 
        userCategoryIds.includes(categoryId)
      );
    });
    
    res.json(filteredChallenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar desafio por ID
router.get("/challenges/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Buscar as categorias do usuário
    const userCategories = await db
      .select({ categoryId: userCategoryAssignments.categoryId })
      .from(userCategoryAssignments)
      .where(eq(userCategoryAssignments.userId, userId));
    
    const userCategoryIds = userCategories.map(uc => uc.categoryId);
    
    const challenge = await db
      .select({
        id: gamificationChallenges.id,
        title: gamificationChallenges.title,
        description: gamificationChallenges.description,
        detailedDescription: gamificationChallenges.detailedDescription,
        imageUrl: gamificationChallenges.imageUrl,
        points: gamificationChallenges.points,
        startDate: sql<string>`DATE(${gamificationChallenges.startDate})`,
        endDate: sql<string>`DATE(${gamificationChallenges.endDate})`,
        type: gamificationChallenges.type,
        isActive: gamificationChallenges.isActive,
        targetUserCategories: gamificationChallenges.targetUserCategories,
        evaluationType: gamificationChallenges.evaluationType,
        evaluationConfig: gamificationChallenges.evaluationConfig,
        createdAt: gamificationChallenges.createdAt,
        createdBy: gamificationChallenges.createdBy,
        creatorName: users.name,
      })
      .from(gamificationChallenges)
      .leftJoin(users, eq(gamificationChallenges.createdBy, users.id))
      .where(and(
        eq(gamificationChallenges.id, parseInt(id)),
        eq(gamificationChallenges.isActive, true)
      ))
      .limit(1);
    
    if (challenge.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    const challengeData = challenge[0];
    
    // Verificar se o usuário tem permissão para ver este desafio
    if (challengeData.targetUserCategories && challengeData.targetUserCategories.length > 0) {
      // Se o usuário não tem categorias, não pode ver desafios com categorias específicas
      if (userCategoryIds.length === 0) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      
      // Verificar se o usuário possui alguma das categorias alvo do desafio
      const hasMatchingCategory = challengeData.targetUserCategories.some(categoryId => 
        userCategoryIds.includes(categoryId)
      );
      
      if (!hasMatchingCategory) {
        return res.status(404).json({ error: "Challenge not found" });
      }
    }
    
    res.json(challengeData);
  } catch (error) {
    console.error("Error fetching challenge:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Criar desafio (admin)
router.post("/challenges", isAdmin, async (req: Request, res: Response) => {
  try {
    const data = insertGamificationChallengeSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    
    const result = await db
      .insert(gamificationChallenges)
      .values(data)
      .returning();
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Atualizar desafio (admin)
router.put("/challenges/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateGamificationChallengeSchema.parse({
      ...req.body,
      updatedAt: new Date()
    });
    
    const result = await db
      .update(gamificationChallenges)
      .set(data)
      .where(eq(gamificationChallenges.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating challenge:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deletar desafio (admin)
router.delete("/challenges/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(gamificationChallenges)
      .where(eq(gamificationChallenges.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar comentários de um desafio
router.get("/challenges/:id/comments", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const challengeId = parseInt(id);
    
    const comments = await db
      .select({
        id: challengeComments.id,
        challengeId: challengeComments.challengeId,
        userId: challengeComments.userId,
        content: challengeComments.content,
        parentId: challengeComments.parentId,
        createdAt: challengeComments.createdAt,
        updatedAt: challengeComments.updatedAt,
        userName: users.name,
        userPhotoUrl: users.photoUrl,
      })
      .from(challengeComments)
      .leftJoin(users, eq(challengeComments.userId, users.id))
      .where(eq(challengeComments.challengeId, challengeId))
      .orderBy(challengeComments.createdAt);

    // Obter contagem de likes para cada comentário
    const commentIds = comments.map(c => c.id);
    const likeCounts = await db
      .select({
        commentId: challengeCommentLikes.commentId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(challengeCommentLikes)
      .where(inArray(challengeCommentLikes.commentId, commentIds))
      .groupBy(challengeCommentLikes.commentId);

    // Verificar se o usuário atual curtiu os comentários
    const currentUserId = req.user?.id;
    let userLikes: { commentId: number }[] = [];
    
    if (currentUserId) {
      userLikes = await db
        .select({
          commentId: challengeCommentLikes.commentId,
        })
        .from(challengeCommentLikes)
        .where(
          and(
            eq(challengeCommentLikes.userId, currentUserId),
            inArray(challengeCommentLikes.commentId, commentIds)
          )
        );
    }

    // Organizar comentários em estrutura hierárquica
    const commentsWithMeta = comments.map(comment => ({
      ...comment,
      likeCount: likeCounts.find(l => l.commentId === comment.id)?.count || 0,
      isLikedByUser: userLikes.some(l => l.commentId === comment.id),
      replies: [] as any[],
    }));

    const topLevelComments = commentsWithMeta.filter(c => !c.parentId);
    const replies = commentsWithMeta.filter(c => c.parentId);

    // Organizar replies dentro dos comentários pai
    replies.forEach(reply => {
      const parentComment = topLevelComments.find(c => c.id === reply.parentId);
      if (parentComment) {
        parentComment.replies.push(reply);
      }
    });

    res.json(topLevelComments);
  } catch (error) {
    console.error("Error fetching challenge comments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Criar comentário em um desafio
router.post("/challenges/:id/comments", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const challengeId = parseInt(id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = insertChallengeCommentSchema.parse({
      ...req.body,
      challengeId,
      userId,
    });

    const result = await db
      .insert(challengeComments)
      .values(data)
      .returning();

    // Buscar o comentário criado com informações do usuário
    const [comment] = await db
      .select({
        id: challengeComments.id,
        challengeId: challengeComments.challengeId,
        userId: challengeComments.userId,
        content: challengeComments.content,
        parentId: challengeComments.parentId,
        createdAt: challengeComments.createdAt,
        updatedAt: challengeComments.updatedAt,
        userName: users.name,
        userPhotoUrl: users.photoUrl,
      })
      .from(challengeComments)
      .leftJoin(users, eq(challengeComments.userId, users.id))
      .where(eq(challengeComments.id, result[0].id));

    res.json({
      ...comment,
      likeCount: 0,
      isLikedByUser: false,
      replies: [],
    });
  } catch (error) {
    console.error("Error creating challenge comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Curtir/descurtir comentário
router.post("/comments/:id/like", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const commentId = parseInt(id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verificar se já curtiu
    const existingLike = await db
      .select()
      .from(challengeCommentLikes)
      .where(
        and(
          eq(challengeCommentLikes.userId, userId),
          eq(challengeCommentLikes.commentId, commentId)
        )
      )
      .limit(1);

    if (existingLike.length > 0) {
      // Descurtir
      await db
        .delete(challengeCommentLikes)
        .where(
          and(
            eq(challengeCommentLikes.userId, userId),
            eq(challengeCommentLikes.commentId, commentId)
          )
        );
      
      res.json({ liked: false });
    } else {
      // Curtir
      await db
        .insert(challengeCommentLikes)
        .values({
          userId,
          commentId,
        });
      
      res.json({ liked: true });
    }
  } catch (error) {
    console.error("Error liking challenge comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deletar comentário
router.delete("/comments/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const commentId = parseInt(id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verificar se o usuário é o autor do comentário ou é admin
    const comment = await db
      .select()
      .from(challengeComments)
      .where(eq(challengeComments.id, commentId))
      .limit(1);

    if (comment.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const isOwner = comment[0].userId === userId;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db
      .delete(challengeComments)
      .where(eq(challengeComments.id, commentId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting challenge comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// =================== ROTAS PARA SUBMISSÕES DE DESAFIOS ===================

// Criar uma submissão de desafio
router.post("/challenges/:id/submit", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const challengeId = parseInt(id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verificar se o desafio existe e está ativo
    const challenge = await db
      .select()
      .from(gamificationChallenges)
      .where(and(
        eq(gamificationChallenges.id, challengeId),
        eq(gamificationChallenges.isActive, true)
      ))
      .limit(1);

    if (challenge.length === 0) {
      return res.status(404).json({ error: "Challenge not found or inactive" });
    }

    const challengeData = challenge[0];
    
    // Verificar se o desafio está dentro do período válido
    const now = new Date();
    const startDate = new Date(challengeData.startDate);
    const endDate = new Date(challengeData.endDate);
    
    if (now < startDate || now > endDate) {
      return res.status(400).json({ error: "Challenge is not in active period" });
    }

    // Verificar se o usuário já tem uma submissão para este desafio
    const existingSubmission = await db
      .select()
      .from(challengeSubmissions)
      .where(and(
        eq(challengeSubmissions.challengeId, challengeId),
        eq(challengeSubmissions.userId, userId)
      ))
      .limit(1);

    // Para quiz, permitir múltiplas tentativas se configurado
    if (existingSubmission.length > 0 && challengeData.evaluationType === 'quiz') {
      const config = challengeData.evaluationConfig as any;
      const quizConfig = config?.quiz;
      
      if (quizConfig && quizConfig.allowMultipleAttempts) {
        const currentAttempts = existingSubmission.length;
        if (currentAttempts >= quizConfig.maxAttempts) {
          return res.status(400).json({ error: "Maximum attempts reached" });
        }
      } else if (existingSubmission.length > 0) {
        return res.status(400).json({ error: "You have already submitted this challenge" });
      }
    } else if (existingSubmission.length > 0) {
      return res.status(400).json({ error: "You have already submitted this challenge" });
    }

    // Processar dados da submissão baseado no tipo
    const submissionData = req.body;
    let points = 0;
    let status = 'pending';

    switch (challengeData.evaluationType) {
      case 'quiz':
        // Calcular pontuação para quiz
        const quizSubmission = submissionData.quiz;
        const config = challengeData.evaluationConfig as any;
        const quizConfig = config?.quiz;
        
        if (quizConfig && quizSubmission) {
          const score = calculateQuizScore(quizSubmission.answers, quizConfig.questions);
          const attemptNumber = existingSubmission.length + 1;
          
          if (score >= quizConfig.minScore) {
            let basePoints = challengeData.points;
            
            // Aplicar redução de pontos por tentativa
            if (attemptNumber > 1 && quizConfig.scoreReductionPerAttempt > 0) {
              const reduction = (attemptNumber - 1) * quizConfig.scoreReductionPerAttempt;
              basePoints = Math.max(0, basePoints - (basePoints * reduction / 100));
            }
            
            points = Math.round(basePoints);
            status = 'completed';
          } else {
            status = 'pending';
          }
          
          submissionData.quiz.score = score;
          submissionData.quiz.totalQuestions = quizConfig.questions.length;
          submissionData.quiz.attemptNumber = attemptNumber;
        }
        break;
        
      case 'qrcode':
        // Para QR code, verificar se o código está correto
        const qrSubmission = submissionData.qrcode;
        const qrConfig = challengeData.evaluationConfig as any;
        
        if (qrConfig?.qrcode && qrSubmission?.scannedData === qrConfig.qrcode.qrCodeData) {
          points = challengeData.points;
          status = 'completed';
        } else {
          return res.status(400).json({ error: "Invalid QR code" });
        }
        break;
        
      case 'text':
      case 'file':
        // Para texto e arquivo, pontos são atribuídos provisoriamente
        points = challengeData.points;
        status = 'pending';
        break;
    }

    // Criar a submissão
    const submission = await db
      .insert(challengeSubmissions)
      .values({
        challengeId,
        userId,
        submissionType: challengeData.evaluationType,
        submissionData,
        points,
        status
      })
      .returning();

    // Adicionar pontos baseado no status
    if (status === 'completed') {
      // Para submissões automaticamente aprovadas (quiz, qrcode)
      await db
        .insert(gamificationPoints)
        .values({
          userId,
          points,
          description: `Desafio concluído: ${challengeData.title}`,
          type: 'automatic'
        });
    } else if (status === 'pending' && points > 0) {
      // Para submissões pendentes (texto, arquivo), adicionar pontos provisórios
      await db
        .insert(gamificationPoints)
        .values({
          userId,
          points,
          description: `Desafio submetido (aguardando aprovação): ${challengeData.title}`,
          type: 'provisional'
        });
    }

    res.json(submission[0]);
  } catch (error) {
    console.error("Error submitting challenge:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Função auxiliar para calcular pontuação do quiz
function calculateQuizScore(answers: { questionId: string; answer: number }[], questions: any[]): number {
  let correct = 0;
  
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (question && question.correctAnswer === answer.answer) {
      correct++;
    }
  }
  
  return Math.round((correct / questions.length) * 100);
}

// Buscar submissões de um desafio (admin)
router.get("/challenges/:id/submissions", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const challengeId = parseInt(id);
    
    const submissions = await db
      .select({
        id: challengeSubmissions.id,
        challengeId: challengeSubmissions.challengeId,
        userId: challengeSubmissions.userId,
        submissionType: challengeSubmissions.submissionType,
        submissionData: challengeSubmissions.submissionData,
        status: challengeSubmissions.status,
        points: challengeSubmissions.points,
        adminFeedback: challengeSubmissions.adminFeedback,
        reviewedBy: challengeSubmissions.reviewedBy,
        reviewedAt: challengeSubmissions.reviewedAt,
        createdAt: challengeSubmissions.createdAt,
        updatedAt: challengeSubmissions.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userPhotoUrl: users.photoUrl,
      })
      .from(challengeSubmissions)
      .leftJoin(users, eq(challengeSubmissions.userId, users.id))
      .where(eq(challengeSubmissions.challengeId, challengeId))
      .orderBy(desc(challengeSubmissions.createdAt));
    
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching challenge submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Revisar uma submissão (admin)
router.put("/submissions/:id/review", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submissionId = parseInt(id);
    const { status, points, adminFeedback } = req.body;
    const reviewerId = req.user?.id;
    
    if (!reviewerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Buscar a submissão
    const submission = await db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const currentSubmission = submission[0];
    
    // Atualizar a submissão
    const updatedSubmission = await db
      .update(challengeSubmissions)
      .set({
        status,
        points: points || currentSubmission.points,
        adminFeedback,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(challengeSubmissions.id, submissionId))
      .returning();

    // Gerenciar pontos baseado no status
    if (status === 'approved' && currentSubmission.status !== 'approved') {
      // Buscar o desafio
      const challenge = await db
        .select()
        .from(gamificationChallenges)
        .where(eq(gamificationChallenges.id, currentSubmission.challengeId))
        .limit(1);

      if (challenge.length > 0) {
        // Remover pontos provisórios se existirem
        await db
          .delete(gamificationPoints)
          .where(and(
            eq(gamificationPoints.userId, currentSubmission.userId),
            eq(gamificationPoints.type, 'provisional'),
            like(gamificationPoints.description, `%${challenge[0].title}%`)
          ));

        // Adicionar pontos aprovados
        await db
          .insert(gamificationPoints)
          .values({
            userId: currentSubmission.userId,
            points: points || currentSubmission.points,
            description: `Desafio aprovado: ${challenge[0].title}`,
            type: 'approved',
            createdBy: reviewerId
          });
      }
    } else if (status === 'rejected' && currentSubmission.status !== 'rejected') {
      // Buscar o desafio para feedback
      const challenge = await db
        .select()
        .from(gamificationChallenges)
        .where(eq(gamificationChallenges.id, currentSubmission.challengeId))
        .limit(1);

      if (challenge.length > 0) {
        // Remover pontos provisórios
        await db
          .delete(gamificationPoints)
          .where(and(
            eq(gamificationPoints.userId, currentSubmission.userId),
            eq(gamificationPoints.type, 'provisional'),
            like(gamificationPoints.description, `%${challenge[0].title}%`)
          ));

        // Adicionar entrada negativa para mostrar rejeição
        await db
          .insert(gamificationPoints)
          .values({
            userId: currentSubmission.userId,
            points: 0,
            description: `Desafio rejeitado: ${challenge[0].title}`,
            type: 'rejected',
            createdBy: reviewerId
          });
      }
    }

    res.json(updatedSubmission[0]);
  } catch (error) {
    console.error("Error reviewing submission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar submissões do usuário atual
router.get("/my-submissions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const submissions = await db
      .select({
        id: challengeSubmissions.id,
        challengeId: challengeSubmissions.challengeId,
        submissionType: challengeSubmissions.submissionType,
        submissionData: challengeSubmissions.submissionData,
        status: challengeSubmissions.status,
        points: challengeSubmissions.points,
        adminFeedback: challengeSubmissions.adminFeedback,
        reviewedAt: challengeSubmissions.reviewedAt,
        createdAt: challengeSubmissions.createdAt,
        updatedAt: challengeSubmissions.updatedAt,
        challengeTitle: gamificationChallenges.title,
        challengeDescription: gamificationChallenges.description,
      })
      .from(challengeSubmissions)
      .leftJoin(gamificationChallenges, eq(challengeSubmissions.challengeId, gamificationChallenges.id))
      .where(eq(challengeSubmissions.userId, userId))
      .orderBy(desc(challengeSubmissions.createdAt));
    
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar submissão específica do usuário para um desafio
router.get("/challenges/:id/my-submission", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const challengeId = parseInt(id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const submission = await db
      .select()
      .from(challengeSubmissions)
      .where(and(
        eq(challengeSubmissions.challengeId, challengeId),
        eq(challengeSubmissions.userId, userId)
      ))
      .orderBy(desc(challengeSubmissions.createdAt))
      .limit(1);
    
    if (submission.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.json(submission[0]);
  } catch (error) {
    console.error("Error fetching user submission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;