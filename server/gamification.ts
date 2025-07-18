import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "./db";
import { gamificationSettings, gamificationPoints, gamificationChallenges, users, userCategories, userCategoryAssignments } from "@/shared/schema";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { insertGamificationSettingsSchema, insertGamificationPointsSchema, insertGamificationChallengeSchema, updateGamificationChallengeSchema, updateGamificationSettingsSchema } from "@/shared/schema";

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
    
    const challenges = await query;
    
    res.json(challenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buscar desafio por ID
router.get("/challenges/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
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
        createdAt: gamificationChallenges.createdAt,
        createdBy: gamificationChallenges.createdBy,
        creatorName: users.name,
      })
      .from(gamificationChallenges)
      .leftJoin(users, eq(gamificationChallenges.createdBy, users.id))
      .where(eq(gamificationChallenges.id, parseInt(id)))
      .limit(1);
    
    if (challenge.length === 0) {
      return res.status(404).json({ error: "Challenge not found" });
    }
    
    res.json(challenge[0]);
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

export default router;