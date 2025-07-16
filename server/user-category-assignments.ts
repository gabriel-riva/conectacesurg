import { Router } from "express";
import { db } from "./db";
import { userCategoryAssignments, userCategories, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Buscar categorias de um usuário específico
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID do usuário inválido" });
    }

    const assignments = await db
      .select({
        id: userCategoryAssignments.categoryId,
        name: userCategories.name,
        description: userCategories.description,
        color: userCategories.color,
        isActive: userCategories.isActive,
        assignedAt: userCategoryAssignments.assignedAt,
      })
      .from(userCategoryAssignments)
      .innerJoin(userCategories, eq(userCategoryAssignments.categoryId, userCategories.id))
      .where(eq(userCategoryAssignments.userId, userId));

    res.json(assignments);
  } catch (error) {
    console.error("Erro ao buscar categorias do usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Buscar usuários de uma categoria específica
router.get("/category/:categoryId", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "ID da categoria inválido" });
    }

    const assignments = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        photoUrl: users.photoUrl,
        role: users.role,
        assignedAt: userCategoryAssignments.assignedAt,
      })
      .from(userCategoryAssignments)
      .innerJoin(users, eq(userCategoryAssignments.userId, users.id))
      .where(eq(userCategoryAssignments.categoryId, categoryId));

    res.json(assignments);
  } catch (error) {
    console.error("Erro ao buscar usuários da categoria:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Atribuir categoria a um usuário
router.post("/", async (req, res) => {
  try {
    const { userId, categoryId } = req.body;

    if (!userId || !categoryId) {
      return res.status(400).json({ message: "ID do usuário e da categoria são obrigatórios" });
    }

    // Verificar se o usuário já tem essa categoria
    const existingAssignment = await db
      .select()
      .from(userCategoryAssignments)
      .where(and(
        eq(userCategoryAssignments.userId, userId),
        eq(userCategoryAssignments.categoryId, categoryId)
      ))
      .limit(1);

    if (existingAssignment.length > 0) {
      return res.status(409).json({ message: "Usuário já possui esta categoria" });
    }

    // Criar nova atribuição
    await db.insert(userCategoryAssignments).values({
      userId,
      categoryId,
    });

    res.json({ message: "Categoria atribuída com sucesso" });
  } catch (error) {
    console.error("Erro ao atribuir categoria:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Remover categoria de um usuário
router.delete("/", async (req, res) => {
  try {
    const { userId, categoryId } = req.body;

    if (!userId || !categoryId) {
      return res.status(400).json({ message: "ID do usuário e da categoria são obrigatórios" });
    }

    await db
      .delete(userCategoryAssignments)
      .where(and(
        eq(userCategoryAssignments.userId, userId),
        eq(userCategoryAssignments.categoryId, categoryId)
      ));

    res.json({ message: "Categoria removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover categoria:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;