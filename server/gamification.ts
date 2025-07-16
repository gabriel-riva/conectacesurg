import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "./db";
import { gamificationSettings, gamificationPoints, users, userCategories, userCategoryAssignments } from "@/shared/schema";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { insertGamificationSettingsSchema, insertGamificationPointsSchema, updateGamificationSettingsSchema } from "@/shared/schema";

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
    
    // Query base - usando subquery para categorias do usuário
    let baseQuery = db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        photoUrl: users.photoUrl,
        totalPoints: sql<number>`sum(${gamificationPoints.points})`
      })
      .from(gamificationPoints)
      .innerJoin(users, eq(gamificationPoints.userId, users.id))
      .where(dateCondition)
      .groupBy(users.id, users.name, users.email, users.photoUrl)
      .orderBy(desc(sql<number>`sum(${gamificationPoints.points})`));
    
    // Filtrar por categoria específica se especificado
    if (categoryId) {
      baseQuery = baseQuery
        .innerJoin(userCategoryAssignments, eq(users.id, userCategoryAssignments.userId))
        .where(and(
          dateCondition,
          eq(userCategoryAssignments.categoryId, parseInt(categoryId as string))
        ));
    }
    
    // Filtrar por categorias habilitadas se for classificação geral
    else if (filter === 'general' && currentSettings?.enabledCategoryIds?.length > 0) {
      baseQuery = baseQuery
        .innerJoin(userCategoryAssignments, eq(users.id, userCategoryAssignments.userId))
        .where(and(
          dateCondition,
          inArray(userCategoryAssignments.categoryId, currentSettings.enabledCategoryIds)
        ));
    }
    
    const ranking = await baseQuery;
    
    // Buscar informações de categoria para cada usuário
    const rankingWithCategories = await Promise.all(
      ranking.map(async (user, index) => {
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

export default router;