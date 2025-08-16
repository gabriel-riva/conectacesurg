import { Router } from "express";
import type { Request, Response } from "express";
import { db, databaseEnvironment } from "./db";
import { gamificationSettings, gamificationPoints, gamificationChallenges, users, userCategories, userCategoryAssignments, challengeComments, challengeCommentLikes, challengeSubmissions } from "@/shared/schema";
import { eq, desc, asc, and, gte, lte, sql, inArray, like } from "drizzle-orm";
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
    const { type = "all", admin = "false" } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userId = req.user.id;
    const userRole = (req.user as any).role;
    const isAdminRequest = admin === "true" && (userRole === "admin" || userRole === "superadmin");
    
    // Buscar todas as categorias do usuário
    const userCategories = await db
      .select({ categoryId: userCategoryAssignments.categoryId })
      .from(userCategoryAssignments)
      .where(eq(userCategoryAssignments.userId, userId));
    
    const userCategoryIds = userCategories.map(uc => uc.categoryId);
    
    // Construir condições WHERE
    const conditions: any[] = [];
    
    // Para usuários não-admin, filtrar apenas desafios ativos
    if (!isAdminRequest) {
      conditions.push(eq(gamificationChallenges.isActive, true));
    }
    
    // Filtrar por tipo se especificado
    if (type !== "all") {
      conditions.push(eq(gamificationChallenges.type, type as string));
    }
    
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
        displayOrder: gamificationChallenges.displayOrder,
      })
      .from(gamificationChallenges)
      .leftJoin(users, eq(gamificationChallenges.createdBy, users.id));
    
    // Aplicar condições WHERE se existirem
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    // Aplicar ordenação
    query = query.orderBy(
      isAdminRequest ? 
        desc(gamificationChallenges.createdAt) : 
        asc(gamificationChallenges.displayOrder), 
      desc(gamificationChallenges.createdAt)
    );
    
    const allChallenges = await query;
    
    // Filtrar desafios baseado nas categorias do usuário
    const filteredChallenges = allChallenges.filter(challenge => {
      // Para requisições admin, administradores e superadministradores veem TODOS os desafios sem filtros
      if (isAdminRequest && (userRole === 'admin' || userRole === 'superadmin')) {
        return true;
      }
      
      // Para requisições não-admin, aplicar filtros normais mesmo para admins
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

// Buscar desafios ativos não completados pelo usuário
router.get("/challenges/active-for-user", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const now = new Date();
    
    // Buscar desafios ativos
    const activeChallenges = await db
      .select({
        id: gamificationChallenges.id,
        title: gamificationChallenges.title,
        description: gamificationChallenges.description,
        imageUrl: gamificationChallenges.imageUrl,
        points: gamificationChallenges.points,
        startDate: sql<string>`DATE(${gamificationChallenges.startDate})`,
        endDate: sql<string>`DATE(${gamificationChallenges.endDate})`,
        type: gamificationChallenges.type,
        evaluationType: gamificationChallenges.evaluationType,
        isActive: gamificationChallenges.isActive,
        targetUserCategories: gamificationChallenges.targetUserCategories,
      })
      .from(gamificationChallenges)
      .where(and(
        eq(gamificationChallenges.isActive, true),
        sql`${gamificationChallenges.startDate} <= NOW()`,
        sql`${gamificationChallenges.endDate} >= NOW()`
      ))
      .orderBy(asc(gamificationChallenges.endDate));



    // Se não há desafios ativos, retornar array vazio
    if (activeChallenges.length === 0) {
      return res.json([]);
    }

    // Buscar submissões do usuário para estes desafios
    const userSubmissions = await db
      .select({
        challengeId: challengeSubmissions.challengeId,
        status: challengeSubmissions.status,
      })
      .from(challengeSubmissions)
      .where(and(
        eq(challengeSubmissions.userId, userId),
        inArray(challengeSubmissions.challengeId, activeChallenges.map(c => c.id))
      ));

    // Criar um mapa das submissões por desafio
    const submissionMap = new Map();
    userSubmissions.forEach(sub => {
      submissionMap.set(sub.challengeId, sub.status);
    });

    // Filtrar desafios que o usuário não completou
    const uncompletedChallenges = activeChallenges.filter(challenge => {
      const submissionStatus = submissionMap.get(challenge.id);
      // Mostrar se não tem submissão ou se foi rejeitado
      return !submissionStatus || submissionStatus === 'rejected';
    });

    res.json(uncompletedChallenges);
  } catch (error) {
    console.error("Error fetching active challenges for user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar desafio por ID
router.get("/challenges/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
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
    // Administradores e superadministradores sempre podem ver todos os desafios
    if (userRole !== 'admin' && userRole !== 'superadmin') {
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
    }
    
    res.json(challengeData);
  } catch (error) {
    console.error("Error fetching challenge:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Criar desafio (admin)
// Reordenar desafios
router.put("/challenges/reorder", isAdmin, async (req: Request, res: Response) => {
  try {
    const { challengeIds } = req.body;
    
    if (!Array.isArray(challengeIds)) {
      return res.status(400).json({ error: "challengeIds must be an array" });
    }
    
    // Atualizar a ordem de cada desafio
    for (let i = 0; i < challengeIds.length; i++) {
      await db
        .update(gamificationChallenges)
        .set({ displayOrder: i })
        .where(eq(gamificationChallenges.id, challengeIds[i]));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error reordering challenges:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/challenges", isAdmin, async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      createdBy: req.user!.id
    };
    
    // Converter datas corretamente
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate);
    }
    if (data.endDate && typeof data.endDate === 'string') {
      data.endDate = new Date(data.endDate);
    }
    
    // Para desafios de arquivo, calcular automaticamente a pontuação total
    if (data.evaluationType === 'file' && data.evaluationConfig?.file?.fileRequirements) {
      const totalPoints = data.evaluationConfig.file.fileRequirements.reduce((sum: number, req: any) => {
        return sum + (req.points || 0);
      }, 0);
      data.points = totalPoints;
    }
    
    // Remover campos que não devem ser inseridos
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    
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
    console.log("Updating challenge:", id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    const data = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Converter datas corretamente
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate);
    }
    if (data.endDate && typeof data.endDate === 'string') {
      data.endDate = new Date(data.endDate);
    }
    
    // Para desafios de arquivo, calcular automaticamente a pontuação total
    if (data.evaluationType === 'file' && data.evaluationConfig?.file?.fileRequirements) {
      const totalPoints = data.evaluationConfig.file.fileRequirements.reduce((sum: number, req: any) => {
        return sum + (req.points || 0);
      }, 0);
      data.points = totalPoints;
    }
    
    // Remover campos que não devem ser atualizados
    delete data.id;
    delete data.createdBy;
    delete data.createdAt;
    
    console.log("Data to update:", JSON.stringify(data, null, 2));
    
    const result = await db
      .update(gamificationChallenges)
      .set(data)
      .where(eq(gamificationChallenges.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    console.log("Update successful:", result[0].id);
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating challenge:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verificar se desafio tem submissões antes de deletar (admin)
router.get("/challenges/:id/submission-count", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const challengeId = parseInt(id);
    
    // Buscar informações do desafio
    const challenge = await db
      .select({ title: gamificationChallenges.title })
      .from(gamificationChallenges)
      .where(eq(gamificationChallenges.id, challengeId))
      .limit(1);
      
    if (challenge.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    // Contar submissões existentes
    const submissionCount = await db
      .select({ count: sql`count(*)` })
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.challengeId, challengeId));
    
    const count = parseInt(submissionCount[0].count as string) || 0;
    
    res.json({ 
      challengeTitle: challenge[0].title,
      submissionCount: count,
      hasSubmissions: count > 0 
    });
  } catch (error) {
    console.error("Error checking challenge submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Devolver apenas submissões sem deletar desafio (admin)
router.delete("/challenges/:id/return-submissions", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const challengeId = parseInt(id);
    
    // Verificar se o desafio existe
    const challenge = await db
      .select()
      .from(gamificationChallenges)
      .where(eq(gamificationChallenges.id, challengeId))
      .limit(1);
      
    if (challenge.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    // Buscar submissões existentes
    const existingSubmissions = await db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.challengeId, challengeId));
    
    if (existingSubmissions.length === 0) {
      return res.status(400).json({ error: "No submissions found" });
    }
    
    console.log(`🔄 Devolvendo ${existingSubmissions.length} submissões do desafio "${challenge[0].title}" (mantendo o desafio ativo)`);
    
    const { ObjectStorageService } = await import("./objectStorage.js");
    const objectStorageService = new ObjectStorageService();
    
    let returnedSubmissions = 0;
    
    for (const submission of existingSubmissions) {
      try {
        // Remover pontos relacionados a este desafio para este usuário
        await db
          .delete(gamificationPoints)
          .where(and(
            eq(gamificationPoints.userId, submission.userId),
            like(gamificationPoints.description, `%${challenge[0].title}%`)
          ));
        
        // Se for submissão de arquivo, excluir arquivos do Object Storage
        if (submission.submissionType === 'file' && submission.submissionData?.file) {
          const fileSubmissionData = submission.submissionData.file as any;
          
          if (fileSubmissionData.files && Array.isArray(fileSubmissionData.files)) {
            for (const file of fileSubmissionData.files) {
              try {
                const filePath = file.fileUrl;
                const objectFile = await objectStorageService.getObjectEntityFile(filePath);
                await objectStorageService.deleteFile(objectFile);
              } catch (error) {
                console.warn(`⚠️ Erro ao excluir arquivo ${file.fileUrl}:`, error);
              }
            }
          }
        }
        
        returnedSubmissions++;
      } catch (error) {
        console.error(`❌ Erro ao devolver submissão ${submission.id}:`, error);
      }
    }
    
    // Deletar todas as submissões
    await db
      .delete(challengeSubmissions)
      .where(eq(challengeSubmissions.challengeId, challengeId));
    
    console.log(`✅ ${returnedSubmissions} submissões devolvidas. Desafio "${challenge[0].title}" continua ativo para novas submissões`);
    
    res.json({ 
      success: true, 
      returnedSubmissions,
      challengeTitle: challenge[0].title,
      message: `${returnedSubmissions} submissões foram devolvidas. O desafio continua ativo e os usuários podem resubmeter.`
    });
  } catch (error) {
    console.error("Error returning submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deletar desafio com proteção (admin)
router.delete("/challenges/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { forceDelete } = req.body;
    const challengeId = parseInt(id);
    
    // Verificar se o desafio existe
    const challenge = await db
      .select()
      .from(gamificationChallenges)
      .where(eq(gamificationChallenges.id, challengeId))
      .limit(1);
      
    if (challenge.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    // Verificar submissões existentes
    const existingSubmissions = await db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.challengeId, challengeId));
    
    // Se há submissões e não foi forçada a exclusão, bloquear
    if (existingSubmissions.length > 0 && !forceDelete) {
      return res.status(400).json({ 
        error: "Challenge has submissions",
        submissionCount: existingSubmissions.length,
        challengeTitle: challenge[0].title,
        message: `Este desafio possui ${existingSubmissions.length} submissão(ões). Escolha uma das opções para continuar.`
      });
    }
    
    // Se há submissões e foi forçada a exclusão, deletar tudo
    if (existingSubmissions.length > 0 && forceDelete) {
      console.log(`🗑️ Deletando desafio "${challenge[0].title}" com ${existingSubmissions.length} submissões (exclusão completa)`);
      
      const { ObjectStorageService } = await import("./objectStorage.js");
      const objectStorageService = new ObjectStorageService();
      
      for (const submission of existingSubmissions) {
        try {
          // Remover pontos relacionados a este desafio para este usuário
          await db
            .delete(gamificationPoints)
            .where(and(
              eq(gamificationPoints.userId, submission.userId),
              like(gamificationPoints.description, `%${challenge[0].title}%`)
            ));
          
          // Se for submissão de arquivo, excluir arquivos do Object Storage
          if (submission.submissionType === 'file' && submission.submissionData?.file) {
            const fileSubmissionData = submission.submissionData.file as any;
            
            if (fileSubmissionData.files && Array.isArray(fileSubmissionData.files)) {
              for (const file of fileSubmissionData.files) {
                try {
                  const filePath = file.fileUrl;
                  const objectFile = await objectStorageService.getObjectEntityFile(filePath);
                  await objectStorageService.deleteFile(objectFile);
                } catch (error) {
                  console.warn(`⚠️ Erro ao excluir arquivo ${file.fileUrl}:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao limpar submissão ${submission.id}:`, error);
        }
      }
      
      // Deletar todas as submissões
      await db
        .delete(challengeSubmissions)
        .where(eq(challengeSubmissions.challengeId, challengeId));
    }
    
    // Deletar comentários do desafio
    await db
      .delete(challengeComments)
      .where(eq(challengeComments.challengeId, challengeId));
    
    // Finalmente, deletar o desafio
    const result = await db
      .delete(gamificationChallenges)
      .where(eq(gamificationChallenges.id, challengeId))
      .returning();
    
    console.log(`✅ Desafio "${challenge[0].title}" deletado completamente`);
    
    res.json({ 
      success: true, 
      deletedSubmissions: existingSubmissions.length,
      challengeTitle: challenge[0].title 
    });
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
          
          // Quizzes são automaticamente aprovados (completados) ao serem enviados
          // A pontuação determina quantos pontos o usuário ganha
          if (score >= quizConfig.minScore) {
            let basePoints = challengeData.points;
            
            // Aplicar redução de pontos por tentativa
            if (attemptNumber > 1 && quizConfig.scoreReductionPerAttempt > 0) {
              const reduction = (attemptNumber - 1) * quizConfig.scoreReductionPerAttempt;
              basePoints = Math.max(0, basePoints - (basePoints * reduction / 100));
            }
            
            points = Math.round(basePoints);
          } else {
            // Mesmo não atingindo a pontuação mínima, o quiz é considerado completado
            points = 0;
          }
          
          // Quizzes são sempre marcados como 'completed' pois são avaliados automaticamente
          status = 'completed';
          
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
          status = 'approved';
        } else {
          return res.status(400).json({ error: "Invalid QR code" });
        }
        break;
        
      case 'text':
        // Para texto, pontos são atribuídos provisoriamente
        points = challengeData.points;
        status = 'pending';
        break;
        
      case 'file':
        // Para arquivo, calcular pontos proporcionais baseado nos requisitos enviados
        const fileSubmission = submissionData.file;
        const fileConfig = challengeData.evaluationConfig as any;
        
        if (fileConfig?.file && fileSubmission?.files) {
          // Calcular pontos baseado nos requisitos atendidos
          let totalRequirementPoints = 0;
          let achievedPoints = 0;
          
          // Primeiro, calcular o total de pontos possível de todos os requisitos
          if (fileConfig.file.fileRequirements) {
            totalRequirementPoints = fileConfig.file.fileRequirements.reduce((sum: number, req: any) => sum + req.points, 0);
          }
          
          // Se não há requisitos específicos com pontos, usar o ponto total do desafio
          if (totalRequirementPoints === 0) {
            totalRequirementPoints = challengeData.points;
          }
          
          // Calcular pontos pelos requisitos atendidos
          const submittedRequirementIds = fileSubmission.files.map((f: any) => f.requirementId);
          const uniqueSubmittedIds = [...new Set(submittedRequirementIds)];
          
          for (const reqId of uniqueSubmittedIds) {
            const requirement = fileConfig.file.fileRequirements?.find((req: any) => req.id === reqId);
            if (requirement) {
              achievedPoints += requirement.points;
            }
          }
          
          // Se não há sistema de pontos por requisito, calcular proporcionalmente
          if (fileConfig.file.fileRequirements && fileConfig.file.fileRequirements.length > 0) {
            const totalRequirements = fileConfig.file.fileRequirements.length;
            const completedRequirements = uniqueSubmittedIds.length;
            
            if (achievedPoints === 0) {
              // Fallback: calcular proporcionalmente se não há pontos específicos
              points = Math.round((completedRequirements / totalRequirements) * challengeData.points);
            } else {
              // Usar pontos específicos dos requisitos
              points = achievedPoints;
            }
          } else {
            // Se não há configuração de requisitos, usar pontos totais
            points = challengeData.points;
          }
        } else {
          points = challengeData.points;
        }
        
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
    console.log(`🎯 PONTOS - Submissão criada: status=${status}, points=${points}, type=${challengeData.evaluationType}`);
    
    if (status === 'approved') {
      // Para submissões automaticamente aprovadas (quiz, qrcode)
      console.log(`✅ PONTOS - Adicionando pontos automaticamente: ${points} pontos para usuário ${userId}`);
      await db
        .insert(gamificationPoints)
        .values({
          userId,
          points,
          description: `Desafio aprovado automaticamente: ${challengeData.title}`,
          type: 'automatic'
        });
    } else if (status === 'completed' && points > 0) {
      // Para submissões completadas (quiz)
      console.log(`✅ PONTOS - Adicionando pontos de quiz completado: ${points} pontos para usuário ${userId}`);
      await db
        .insert(gamificationPoints)
        .values({
          userId,
          points,
          description: `Quiz completado: ${challengeData.title}`,
          type: 'quiz'
        });
    } else if (status === 'pending' && points > 0) {
      // Para submissões pendentes (texto, arquivo), adicionar pontos provisórios
      console.log(`⏳ PONTOS - Adicionando pontos provisórios: ${points} pontos para usuário ${userId}`);
      await db
        .insert(gamificationPoints)
        .values({
          userId,
          points,
          description: `Desafio submetido (aguardando aprovação): ${challengeData.title}`,
          type: 'provisional'
        });
    } else {
      console.log(`❌ PONTOS - Nenhum ponto adicionado: status=${status}, points=${points}`);
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

// Buscar TODAS as submissões (admin)
router.get("/all-submissions", isAdmin, async (req: Request, res: Response) => {
  try {
    console.log("🔍 ===== ADMIN BUSCANDO TODAS AS SUBMISSÕES =====");
    console.log("🔍 Database environment:", databaseEnvironment);
    console.log("🔍 User:", req.user?.name, req.user?.email);
    console.log("🔍 Timestamp:", new Date().toISOString());
    
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
        challengeTitle: gamificationChallenges.title,
        challengeType: gamificationChallenges.type,
      })
      .from(challengeSubmissions)
      .leftJoin(users, eq(challengeSubmissions.userId, users.id))
      .leftJoin(gamificationChallenges, eq(challengeSubmissions.challengeId, gamificationChallenges.id))
      .orderBy(desc(challengeSubmissions.createdAt));
    
    console.log(`📊 Encontradas ${submissions.length} submissões:`, submissions.map(s => ({id: s.id, status: s.status, type: s.submissionType, userId: s.userId, points: s.points})));
    
    // Log detalhado da primeira submissão para debug
    if (submissions.length > 0) {
      console.log('🔍 Primeira submissão (detalhada):', JSON.stringify(submissions[0], null, 2));
      
      // Corrigir submissões de quiz que deveriam estar completed
      for (const submission of submissions) {
        if (submission.submissionType === 'quiz' && submission.status === 'pending') {
          console.log(`🔧 Corrigindo status da submissão ${submission.id} de pending para completed`);
          await db
            .update(challengeSubmissions)
            .set({ 
              status: 'completed',
              updatedAt: new Date()
            })
            .where(eq(challengeSubmissions.id, submission.id));
          
          // Atualizar o objeto retornado
          submission.status = 'completed';
        }
      }
    }
    
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching all submissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

// Revisar submissão granular por requisito (admin)
router.put("/submissions/:id/review-granular", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submissionId = parseInt(id);
    const { requirementReviews, adminFeedback } = req.body;
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
    
    // Buscar o desafio para obter a configuração dos requisitos
    const challenge = await db
      .select()
      .from(gamificationChallenges)
      .where(eq(gamificationChallenges.id, currentSubmission.challengeId))
      .limit(1);

    if (challenge.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const challengeData = challenge[0];
    const evaluationConfig = challengeData.evaluationConfig;
    
    // Calcular pontuação total baseada nas aprovações
    let totalPoints = 0;
    const fileRequirements = evaluationConfig?.file?.fileRequirements || [];
    
    // Atualizar o submissionData com o status de revisão de cada requisito
    const updatedSubmissionData = {
      ...currentSubmission.submissionData,
      requirementReviews
    };
    
    // Calcular pontos apenas dos requisitos aprovados
    requirementReviews.forEach((review: any) => {
      if (review.status === 'approved') {
        const requirement = fileRequirements.find((req: any) => req.id === review.requirementId);
        if (requirement) {
          totalPoints += requirement.points;
        }
      }
    });
    
    // Determinar status geral da submissão
    const allApproved = requirementReviews.every((review: any) => review.status === 'approved');
    const anyRejected = requirementReviews.some((review: any) => review.status === 'rejected');
    const overallStatus = allApproved ? 'approved' : anyRejected ? 'partially_approved' : 'pending';
    
    // Atualizar a submissão
    const updatedSubmission = await db
      .update(challengeSubmissions)
      .set({
        status: overallStatus,
        points: totalPoints,
        submissionData: updatedSubmissionData,
        adminFeedback,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(challengeSubmissions.id, submissionId))
      .returning();

    // Gerenciar pontos na tabela de gamificação
    // Remover pontos provisórios anteriores
    await db
      .delete(gamificationPoints)
      .where(and(
        eq(gamificationPoints.userId, currentSubmission.userId),
        eq(gamificationPoints.type, 'provisional'),
        like(gamificationPoints.description, `%${challengeData.title}%`)
      ));

    // Adicionar pontos finais baseados na revisão granular
    if (totalPoints > 0) {
      await db
        .insert(gamificationPoints)
        .values({
          userId: currentSubmission.userId,
          points: totalPoints,
          description: `Desafio aprovado (${requirementReviews.filter((r: any) => r.status === 'approved').length}/${requirementReviews.length} requisitos): ${challengeData.title}`,
          type: 'challenge',
          createdBy: reviewerId
        });
    }

    res.json(updatedSubmission[0]);
  } catch (error) {
    console.error("Error reviewing submission granularly:", error);
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
    if (status === 'rejected' && currentSubmission.status !== 'rejected') {
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

// Devolver submissão (admin) - Remove completamente a submissão e seus efeitos
router.delete("/submissions/:id/return", isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar se o ID é válido (não pode ser 'null' ou 'undefined')
    if (id === 'null' || id === 'undefined' || !id) {
      return res.status(400).json({ error: "ID de submissão inválido" });
    }
    
    const submissionId = parseInt(id);
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (isNaN(submissionId)) {
      return res.status(400).json({ error: "ID de submissão deve ser um número válido" });
    }

    console.log(`🔄 DEVOLVER SUBMISSÃO: Admin ${req.user?.email} devolvendo submissão ${submissionId}`);

    // Buscar a submissão para verificar se existe e obter dados
    const submission = await db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      return res.status(404).json({ error: "Submissão não encontrada" });
    }

    const currentSubmission = submission[0];
    // Todas as submissões podem ser devolvidas (incluindo quiz e QR code completados)
    console.log(`✅ Submissão pode ser devolvida: Tipo ${currentSubmission.submissionType}, Status ${currentSubmission.status}`);

    

    // Buscar dados do desafio para logs e exclusão de arquivos
    const challenge = await db
      .select()
      .from(gamificationChallenges)
      .where(eq(gamificationChallenges.id, currentSubmission.challengeId))
      .limit(1);

    const challengeTitle = challenge.length > 0 ? challenge[0].title : `ID ${currentSubmission.challengeId}`;
    
    console.log(`📋 Devolvendo submissão: Usuário ${currentSubmission.userId}, Desafio "${challengeTitle}", Status: ${currentSubmission.status}`);

    // PASSO 1: Remover TODOS os pontos relacionados a este desafio para este usuário
    const deletedPoints = await db
      .delete(gamificationPoints)
      .where(and(
        eq(gamificationPoints.userId, currentSubmission.userId),
        like(gamificationPoints.description, `%${challengeTitle}%`)
      ))
      .returning();
    
    console.log(`🗑️ Removidos ${deletedPoints.length} registros de pontos relacionados ao desafio`);

    // PASSO 2: Se for submissão de arquivo, excluir arquivos do Object Storage
    if (currentSubmission.submissionType === 'file' && currentSubmission.submissionData?.file) {
      const { ObjectStorageService } = await import("./objectStorage.js");
      const objectStorageService = new ObjectStorageService();
      
      const fileSubmissionData = currentSubmission.submissionData.file as any;
      const files = fileSubmissionData.files || fileSubmissionData.submissions || [];
      
      for (const file of files) {
        if (file.type === 'file' && file.fileUrl) {
          try {
            // Extrair caminho do arquivo
            const filePath = file.fileUrl; // Ex: /objects/dev/challenges/filename.ext
            console.log(`🗑️ Excluindo arquivo: ${filePath}`);
            
            // Buscar e deletar o arquivo
            const objectFile = await objectStorageService.getObjectEntityFile(filePath);
            await objectStorageService.deleteFile(objectFile);
            console.log(`✅ Arquivo excluído com sucesso: ${filePath}`);
          } catch (error) {
            console.warn(`⚠️ Erro ao excluir arquivo ${file.fileUrl}:`, error);
            // Continuar mesmo se não conseguir deletar um arquivo
          }
        }
      }
    }

    // PASSO 3: Deletar a submissão completamente
    const deletedSubmission = await db
      .delete(challengeSubmissions)
      .where(eq(challengeSubmissions.id, submissionId))
      .returning();

    if (deletedSubmission.length === 0) {
      return res.status(500).json({ error: "Erro ao excluir submissão" });
    }

    console.log(`✅ SUBMISSÃO DEVOLVIDA: Submissão ${submissionId} devolvida com sucesso`);
    console.log(`📊 Resultado: Usuário ${currentSubmission.userId} pode resubmeter o desafio "${challengeTitle}"`);

    res.json({ 
      success: true, 
      message: `Submissão devolvida com sucesso. O usuário pode agora resubmeter o desafio "${challengeTitle}".`,
      deletedPoints: deletedPoints.length,
      deletedFiles: currentSubmission.submissionType === 'file' ? 
        (currentSubmission.submissionData?.file?.files?.length || 0) : 0
    });

  } catch (error) {
    console.error("❌ Erro ao devolver submissão:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;