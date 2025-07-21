import { Router } from "express";
import { 
  surveys, 
  surveyQuestions, 
  surveyResponses, 
  surveyWidgetSettings,
  userCategories,
  users,
  insertSurveySchema,
  insertSurveyQuestionSchema,
  insertSurveyResponseSchema,
  insertSurveyWidgetSettingsSchema,
  type Survey,
  type SurveyQuestion,
  type SurveyResponse,
  type SurveyWidgetSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// =====================
// CRUD SURVEYS (ADMIN)
// =====================

// Listar pesquisas (admin)
router.get("/", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveysWithStats = await db
      .select({
        survey: surveys,
        questionCount: sql<number>`CAST((
          SELECT COUNT(*) 
          FROM ${surveyQuestions} 
          WHERE ${surveyQuestions.survey_id} = ${surveys.id}
        ) AS INTEGER)`,
        responseCount: sql<number>`CAST((
          SELECT COUNT(*) 
          FROM ${surveyResponses} 
          WHERE ${surveyResponses.survey_id} = ${surveys.id}
        ) AS INTEGER)`,
        questions: sql<any[]>`
          COALESCE(
            (SELECT json_agg(row_to_json(sq.*) ORDER BY sq."order")
             FROM ${surveyQuestions} sq
             WHERE sq."survey_id" = ${surveys.id}),
            '[]'::json
          )`
      })
      .from(surveys)
      .orderBy(desc(surveys.createdAt));

    // Formatar resposta para incluir as perguntas
    const formattedSurveys = surveysWithStats.map(item => ({
      ...item,
      questions: item.questions || []
    }));
    
    res.json(formattedSurveys);
  } catch (error) {
    console.error("Erro ao buscar pesquisas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar perguntas de uma pesquisa específica (admin)
router.get("/:surveyId/questions", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveyId = parseInt(req.params.surveyId);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(asc(surveyQuestions.order));

    res.json(questions);
  } catch (error) {
    console.error("Erro ao buscar perguntas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar pesquisa específica (admin)
router.get("/:id", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveyId = parseInt(req.params.id);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const survey = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId))
      .limit(1);

    if (survey.length === 0) {
      return res.status(404).json({ error: "Pesquisa não encontrada" });
    }

    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(asc(surveyQuestions.order));

    res.json({
      survey: survey[0],
      questions
    });
  } catch (error) {
    console.error("Erro ao buscar pesquisa:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Criar pesquisa (admin)
router.post("/", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const validatedData = insertSurveySchema.parse({
      ...req.body,
      creatorId: user.id
    });

    const [newSurvey] = await db
      .insert(surveys)
      .values(validatedData)
      .returning();

    res.status(201).json(newSurvey);
  } catch (error) {
    console.error("Erro ao criar pesquisa:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Atualizar pesquisa (admin)
router.put("/:id", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveyId = parseInt(req.params.id);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const validatedData = insertSurveySchema.parse({
      ...req.body,
      creatorId: user.id
    });

    const [updatedSurvey] = await db
      .update(surveys)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(surveys.id, surveyId))
      .returning();

    if (!updatedSurvey) {
      return res.status(404).json({ error: "Pesquisa não encontrada" });
    }

    res.json(updatedSurvey);
  } catch (error) {
    console.error("Erro ao atualizar pesquisa:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Deletar pesquisa (admin)
router.delete("/:id", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveyId = parseInt(req.params.id);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const [deletedSurvey] = await db
      .delete(surveys)
      .where(eq(surveys.id, surveyId))
      .returning();

    if (!deletedSurvey) {
      return res.status(404).json({ error: "Pesquisa não encontrada" });
    }

    res.json({ message: "Pesquisa deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar pesquisa:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =============================
// CRUD QUESTIONS (ADMIN)
// =============================

// Criar pergunta para pesquisa
router.post("/:surveyId/questions", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveyId = parseInt(req.params.surveyId);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID da pesquisa inválido" });
    }

    const validatedData = insertSurveyQuestionSchema.parse({
      ...req.body,
      surveyId
    });

    const [newQuestion] = await db
      .insert(surveyQuestions)
      .values([validatedData])
      .returning();

    res.status(201).json(newQuestion);
  } catch (error) {
    console.error("Erro ao criar pergunta:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Atualizar pergunta
router.put("/:surveyId/questions/:questionId", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const questionId = parseInt(req.params.questionId);
    if (isNaN(questionId)) {
      return res.status(400).json({ error: "ID da pergunta inválido" });
    }

    const validatedData = insertSurveyQuestionSchema.parse(req.body);

    const [updatedQuestion] = await db
      .update(surveyQuestions)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(surveyQuestions.id, questionId))
      .returning();

    if (!updatedQuestion) {
      return res.status(404).json({ error: "Pergunta não encontrada" });
    }

    res.json(updatedQuestion);
  } catch (error) {
    console.error("Erro ao atualizar pergunta:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Deletar pergunta
router.delete("/:surveyId/questions/:questionId", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const questionId = parseInt(req.params.questionId);
    if (isNaN(questionId)) {
      return res.status(400).json({ error: "ID da pergunta inválido" });
    }

    const [deletedQuestion] = await db
      .delete(surveyQuestions)
      .where(eq(surveyQuestions.id, questionId))
      .returning();

    if (!deletedQuestion) {
      return res.status(404).json({ error: "Pergunta não encontrada" });
    }

    res.json({ message: "Pergunta deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar pergunta:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar respostas de uma pesquisa específica (admin)
router.get("/:surveyId/responses", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveyId = parseInt(req.params.surveyId);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const responses = await db
      .select({
        id: surveyResponses.id,
        userId: surveyResponses.userId,
        isAnonymous: surveyResponses.isAnonymous,
        responseData: surveyResponses.responseData,
        completedAt: surveyResponses.completedAt,
        userName: sql<string>`CASE WHEN ${surveyResponses.isAnonymous} = true THEN 'Anônimo' ELSE COALESCE(${users.name}, 'Usuário desconhecido') END`
      })
      .from(surveyResponses)
      .leftJoin(users, eq(surveyResponses.userId, users.id))
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(desc(surveyResponses.completedAt));

    res.json(responses);
  } catch (error) {
    console.error("Erro ao buscar respostas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =============================
// WIDGET SETTINGS (ADMIN)
// =============================

// Buscar configurações do widget
router.get("/widget/settings", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [settings] = await db
      .select()
      .from(surveyWidgetSettings)
      .limit(1);

    res.json(settings || {
      isEnabled: true,
      displayStyle: 'floating',
      position: 'bottom-right',
      showCloseButton: true,
      autoShowDelay: 3000,
      primaryColor: '#3B82F6'
    });
  } catch (error) {
    console.error("Erro ao buscar configurações do widget:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Atualizar configurações do widget
router.put("/widget/settings", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const validatedData = insertSurveyWidgetSettingsSchema.parse({
      ...req.body,
      updatedBy: user.id
    });

    // Verificar se já existe configuração
    const [existingSettings] = await db
      .select()
      .from(surveyWidgetSettings)
      .limit(1);

    let updatedSettings;
    if (existingSettings) {
      [updatedSettings] = await db
        .update(surveyWidgetSettings)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(surveyWidgetSettings.id, existingSettings.id))
        .returning();
    } else {
      [updatedSettings] = await db
        .insert(surveyWidgetSettings)
        .values(validatedData)
        .returning();
    }

    res.json(updatedSettings);
  } catch (error) {
    console.error("Erro ao atualizar configurações do widget:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =============================
// PUBLIC ENDPOINTS (USERS)
// =============================

// Buscar pesquisas ativas para o usuário atual
router.get("/public/active", async (req, res) => {
  try {
    const user = req.user;
    
    // Se não há usuário autenticado, retorna array vazio
    if (!user) {
      return res.json([]);
    }

    // Buscar pesquisas ativas que:
    // 1. Estão ativas (isActive = true)
    // 2. Estão dentro do período (se definido)
    // 3. São direcionadas para a categoria do usuário atual ou para todas as categorias (array vazio)
    const now = new Date();
    
    // Buscar pesquisas ativas primeiro
    const activeSurveysData = await db
      .select()
      .from(surveys)
      .where(eq(surveys.isActive, true))
      .orderBy(desc(surveys.createdAt));

    // Para cada pesquisa, buscar suas perguntas
    const activeSurveys = await Promise.all(
      activeSurveysData.map(async (survey) => {
        const questions = await db
          .select()
          .from(surveyQuestions)
          .where(eq(surveyQuestions.surveyId, survey.id))
          .orderBy(asc(surveyQuestions.order));
        
        return {
          survey,
          questions
        };
      })
    );

    // Se o usuário não permite múltiplas respostas, filtrar pesquisas já respondidas
    const surveysToShow = [];
    for (const surveyData of activeSurveys) {
      if (!surveyData.survey.allowMultipleResponses) {
        // Verificar se existe resposta para este usuário ou IP (para respostas anônimas)
        const existingResponse = await db
          .select()
          .from(surveyResponses)
          .where(
            and(
              eq(surveyResponses.surveyId, surveyData.survey.id),
              (user as any).id ? 
                eq(surveyResponses.userId, (user as any).id) : 
                eq(surveyResponses.ipAddress, req.ip || (req.connection as any)?.remoteAddress || 'unknown')
            )
          )
          .limit(1);
        
        if (existingResponse.length === 0) {
          surveysToShow.push(surveyData);
        }
      } else {
        surveysToShow.push(surveyData);
      }
    }

    res.json(surveysToShow);
  } catch (error) {
    console.error("Erro ao buscar pesquisas ativas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Submeter resposta de pesquisa
router.post("/public/:surveyId/respond", async (req, res) => {
  try {
    const user = req.user;

    const surveyId = parseInt(req.params.surveyId);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID da pesquisa inválido" });
    }

    const { responses, isAnonymous } = req.body;

    // Verificar se a pesquisa existe e está ativa
    const [survey] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId))
      .limit(1);

    if (!survey) {
      return res.status(404).json({ error: "Pesquisa não encontrada" });
    }

    if (!survey.isActive) {
      return res.status(400).json({ error: "Pesquisa não está ativa" });
    }

    // Verificar se o usuário pode responder múltiplas vezes
    if (!survey.allowMultipleResponses) {
      const existingResponse = await db
        .select()
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.surveyId, surveyId),
            (user as any)?.id ? eq(surveyResponses.userId, (user as any).id) : sql`false`
          )
        )
        .limit(1);

      if (existingResponse.length > 0) {
        return res.status(400).json({ error: "Você já respondeu esta pesquisa" });
      }
    }

    const validatedData = insertSurveyResponseSchema.parse({
      surveyId,
      userId: (isAnonymous || !user) ? null : (user as any).id,
      isAnonymous: !!(isAnonymous || !user),
      responseData: responses,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const [newResponse] = await db
      .insert(surveyResponses)
      .values(validatedData)
      .returning();

    res.status(201).json({ message: "Resposta enviada com sucesso", responseId: newResponse.id });
  } catch (error) {
    console.error("Erro ao submeter resposta:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar configurações do widget para usuários (sem autenticação)
router.get("/public/widget/settings", async (req, res) => {
  try {
    const [settings] = await db
      .select()
      .from(surveyWidgetSettings)
      .limit(1);

    res.json(settings || {
      id: 1,
      isEnabled: true,
      displayStyle: 'floating',
      position: 'bottom-right',
      showCloseButton: true,
      autoShowDelay: 3000,
      primaryColor: '#3B82F6'
    });
  } catch (error) {
    console.error("Erro ao buscar configurações do widget:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar categorias de usuário disponíveis (para seleção de público-alvo)
router.get("/user-categories", async (req, res) => {
  try {
    const user = req.user as any;
    console.log('Verificando acesso a categorias. Usuário:', user ? { id: user.id, email: user.email, role: user.role } : 'não autenticado');
    
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const categories = await db
      .select({
        id: userCategories.id,
        name: userCategories.name,
        description: userCategories.description,
        color: userCategories.color
      })
      .from(userCategories)
      .where(eq(userCategories.isActive, true))
      .orderBy(asc(userCategories.name));

    console.log('Categorias encontradas:', categories.length);
    res.json(categories);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =============================
// ANALYTICS (ADMIN)
// =============================

// Buscar análise de respostas da pesquisa
router.get("/:id/analytics", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const surveyId = parseInt(req.params.id);
    if (isNaN(surveyId)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Buscar todas as respostas da pesquisa
    const responses = await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(desc(surveyResponses.createdAt));

    // Buscar perguntas da pesquisa
    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(asc(surveyQuestions.order));

    res.json({
      totalResponses: responses.length,
      responses,
      questions
    });
  } catch (error) {
    console.error("Erro ao buscar análise:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;