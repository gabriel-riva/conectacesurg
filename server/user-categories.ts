import { Router } from "express";
import { Request, Response } from "express";
import { db } from "./db";
import { userCategories } from "../shared/schema";
import { insertUserCategorySchema } from "../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware para verificar se é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.session.user;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

// Listar todas as categorias de usuários
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const categories = await db.select().from(userCategories).orderBy(userCategories.name);
    res.json(categories);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Buscar categoria por ID
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const category = await db.select().from(userCategories).where(eq(userCategories.id, categoryId)).limit(1);
    
    if (category.length === 0) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    res.json(category[0]);
  } catch (error) {
    console.error("Erro ao buscar categoria:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Criar nova categoria de usuário
router.post("/", isAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = insertUserCategorySchema.parse(req.body);
    
    const newCategory = await db
      .insert(userCategories)
      .values(validatedData)
      .returning();

    res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return res.status(400).json({ message: "Já existe uma categoria com este nome" });
      }
      return res.status(400).json({ message: "Dados inválidos", error: error.message });
    }
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Atualizar categoria de usuário
router.put("/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const validatedData = insertUserCategorySchema.parse(req.body);
    
    const updatedCategory = await db
      .update(userCategories)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(userCategories.id, categoryId))
      .returning();

    if (updatedCategory.length === 0) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    res.json(updatedCategory[0]);
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return res.status(400).json({ message: "Já existe uma categoria com este nome" });
      }
      return res.status(400).json({ message: "Dados inválidos", error: error.message });
    }
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Deletar categoria de usuário
router.delete("/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const deletedCategory = await db
      .delete(userCategories)
      .where(eq(userCategories.id, categoryId))
      .returning();

    if (deletedCategory.length === 0) {
      return res.status(404).json({ message: "Categoria não encontrada" });
    }

    res.json({ message: "Categoria deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar categoria:", error);
    if (error instanceof Error && error.message.includes("foreign key constraint")) {
      return res.status(400).json({ message: "Não é possível deletar esta categoria pois existem usuários associados a ela" });
    }
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;