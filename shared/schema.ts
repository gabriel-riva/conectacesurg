import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, jsonb, uniqueIndex, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Tabela para categorias/grupos de usuários (classificações)
export const userCategories = pgTable("user_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // Cor para identificação visual
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  userCategoryId: integer("user_category_id").references(() => userCategories.id), // Categoria do usuário
  password: text("password"),
  googleId: text("google_id").unique(),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").notNull().default(true),
  // Novos campos para perfil
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phoneNumbers: text("phone_numbers").array(),
  secondaryEmail: text("secondary_email"),
  biografia: text("biografia"), // Campo de biografia/descrição pessoal
  joinDate: date("join_date"), // Data de ingresso na instituição (editável apenas por admins)
  emergencyContact: jsonb("emergency_contact").$type<{name: string, phone: string, relationship: string}>(),
  documents: jsonb("documents").$type<{name: string, url: string, type: string, description: string}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  isPrivate: boolean("is_private").notNull().default(false),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userGroups = pgTable("user_groups", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  isAdmin: boolean("is_admin").notNull().default(false),
  status: text("status").notNull().default("approved"), // 'pending', 'approved', 'rejected'
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.groupId] }),
  };
});

export const userCategoryAssignments = pgTable("user_category_assignments", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").notNull().references(() => userCategories.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.categoryId] }),
  };
});

export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("nova"), // 'nova', 'em_avaliacao', 'priorizada', 'em_execucao', 'concluida', 'rejeitada'
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  responsibleId: integer("responsible_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
  attachments: jsonb("attachments").$type<{name: string, url: string, type: string}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ideaVotes = pgTable("idea_votes", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  ideaId: integer("idea_id").notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  vote: integer("vote").notNull(), // 1 for upvote, -1 for downvote
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.ideaId] }),
  };
});

export const ideaComments: any = pgTable("idea_comments", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => ideaComments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ideaVolunteers = pgTable("idea_volunteers", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  ideaId: integer("idea_id").notNull().references(() => ideas.id, { onDelete: 'cascade' }),
  message: text("message"),
  status: text("status").notNull().default("pendente"), // 'pendente', 'aprovado', 'rejeitado'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.ideaId] }),
  };
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'group_invite', 'comment', 'like', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"), // ID do grupo, post, etc. relacionado
  relatedType: text("related_type"), // 'group', 'post', 'comment', etc.
  fromUserId: integer("from_user_id").references(() => users.id),
  isRead: boolean("is_read").notNull().default(false),
  actionTaken: boolean("action_taken").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer("group_id").references(() => groups.id, { onDelete: 'cascade' }), // null for general feed
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(), // URLs to media files (images, videos, documents)
  mediaTypes: text("media_types").array(), // Types of media ('image', 'video', 'document', 'pdf', 'link')
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(), // URLs to media files
  mediaTypes: text("media_types").array(), // Types of media
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const likes = pgTable("likes", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  commentId: integer("comment_id").references(() => comments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.postId || table.commentId] }), 
  };
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  user2Id: integer("user2_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  lastMessageText: text("last_message_text"),
}, (table) => {
  return {
    uniqueIdx: uniqueIndex("conversation_user_idx").on(table.user1Id, table.user2Id),
  };
});

export const aiAgents = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  n8nWebhookUrl: text("n8n_webhook_url"),
  n8nApiKey: text("n8n_api_key"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiPrompts = pgTable("ai_prompts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiPromptAgents = pgTable("ai_prompt_agents", {
  promptId: integer("prompt_id").notNull().references(() => aiPrompts.id, { onDelete: 'cascade' }),
  agentId: integer("agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.promptId, table.agentId] }),
  };
});

export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  agentId: integer("agent_id").notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isFromUser: boolean("is_from_user").notNull(),
  attachments: jsonb("attachments").$type<{name: string, url: string, type: string}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const utilityLinks = pgTable("utility_links", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  logoUrl: text("logo_url"),
  order: integer("order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventDate: date("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  externalUrl: text("external_url"),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const newsCategories = pgTable("news_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(), // HTML content from Plate editor
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"), // URL original da notícia da CESURG
  categoryId: integer("category_id").references(() => newsCategories.id),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const featureSettings = pgTable("feature_settings", {
  id: serial("id").primaryKey(),
  featureName: text("feature_name").notNull().unique(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  showInHeader: boolean("show_in_header").notNull().default(true),
  disabledMessage: text("disabled_message").default("Em breve, novidades!"),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabelas para o Portal de Trilhas
export const trailCategories = pgTable("trail_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#3B82F6"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trails = pgTable("trails", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  categoryId: integer("category_id").references(() => trailCategories.id),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  isPublished: boolean("is_published").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  order: integer("order").default(0),
  targetUserCategories: integer("target_user_categories").array().default([]), // IDs das categorias de usuário que podem ver a trilha
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trailContents = pgTable("trail_contents", {
  id: serial("id").primaryKey(),
  trailId: integer("trail_id").notNull().references(() => trails.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(), // Conteúdo HTML do TinyMCE
  order: integer("order").notNull().default(0),
  isDraft: boolean("is_draft").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trailComments: any = pgTable("trail_comments", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => trailContents.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => trailComments.id, { onDelete: 'cascade' }),
  isAdminReply: boolean("is_admin_reply").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trailCommentLikes = pgTable("trail_comment_likes", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  commentId: integer("comment_id").notNull().references(() => trailComments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.commentId] }),
  };
});

export const trailProgress = pgTable("trail_progress", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  trailId: integer("trail_id").notNull().references(() => trails.id, { onDelete: 'cascade' }),
  completedContents: integer("completed_contents").array().default([]),
  lastAccessed: timestamp("last_accessed").defaultNow(),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.trailId] }),
  };
});

export const trailContentRatings = pgTable("trail_content_ratings", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => trailContents.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(), // 1-5 stars
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    uniqueUserContent: unique().on(table.userId, table.contentId),
  };
});

// Tabelas para Gamificação
export const gamificationSettings = pgTable("gamification_settings", {
  id: serial("id").primaryKey(),
  generalCategoryId: integer("general_category_id").references(() => userCategories.id),
  enabledCategoryIds: integer("enabled_category_ids").array().default([]),
  cycleStartDate: date("cycle_start_date"),
  cycleEndDate: date("cycle_end_date"),
  annualStartDate: date("annual_start_date"),
  annualEndDate: date("annual_end_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gamificationPoints = pgTable("gamification_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("manual"), // 'manual', 'automatic'
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gamificationChallenges = pgTable("gamification_challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  detailedDescription: text("detailed_description").notNull(), // Rich text content
  imageUrl: text("image_url"),
  points: integer("points").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  type: text("type").notNull().default("periodic"), // 'periodic', 'annual'
  isActive: boolean("is_active").notNull().default(true),
  targetUserCategories: integer("target_user_categories").array().default([]), // IDs das categorias de usuário alvo
  // displayOrder: integer("display_order").notNull().default(0), // Campo para controlar ordem de exibição - TEMPORARIAMENTE DESABILITADO
  // Novos campos para tipos de avaliação
  evaluationType: text("evaluation_type").notNull().default("none"), // 'none', 'quiz', 'text', 'file', 'qrcode'
  evaluationConfig: jsonb("evaluation_config").$type<{
    // Quiz config
    quiz?: {
      questions: {
        id: string;
        question: string;
        options: string[];
        correctAnswer: number;
      }[];
      minScore: number;
      maxAttempts: number;
      allowMultipleAttempts: boolean;
      scoreReductionPerAttempt: number;
    };
    // Text config
    text?: {
      placeholder: string;
      maxLength?: number;
      instructions?: string;
    };
    // File config
    file?: {
      fileRequirements: {
        id: string;
        name: string;
        description: string;
        points: number;
        acceptedTypes: string[];
        maxSize: number;
      }[];
      maxFiles: number;
    };
    // QR Code config
    qrcode?: {
      qrCodeData: string;
      qrCodeImage: string;
      instructions: string;
    };
  }>().default({}),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challengeComments: any = pgTable("challenge_comments", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => gamificationChallenges.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => challengeComments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challengeCommentLikes = pgTable("challenge_comment_likes", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  commentId: integer("comment_id").notNull().references(() => challengeComments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.commentId] }),
  };
});

// Tabela para submissões de desafios
export const challengeSubmissions = pgTable("challenge_submissions", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => gamificationChallenges.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  submissionType: text("submission_type").notNull(), // 'quiz', 'text', 'file', 'qrcode'
  submissionData: jsonb("submission_data").$type<{
    // Quiz submission
    quiz?: {
      answers: { questionId: string; answer: number }[];
      score: number;
      totalQuestions: number;
      attemptNumber: number;
    };
    // Text submission
    text?: {
      content: string;
    };
    // File submission
    file?: {
      files: {
        requirementId: string;
        fileName: string;
        fileUrl: string;
        fileSize: number;
        mimeType: string;
      }[];
    };
    // QR Code submission
    qrcode?: {
      scannedData: string;
      timestamp: string;
    };
  }>().notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'completed'
  points: integer("points").notNull().default(0),
  adminFeedback: text("admin_feedback"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tool Categories schema
export const toolCategories = pgTable("tool_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // Hex color for the category
  icon: text("icon").default("settings"), // Icon name for the category
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tools schema
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => toolCategories.id),
  allowedUserCategories: jsonb("allowed_user_categories").$type<number[]>().default([]), // Array of user category IDs
  isActive: boolean("is_active").default(true).notNull(),
  settings: jsonb("settings"), // Tool-specific settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ferramentas - Tabelas para Registro de Aulas, Visitas e Eventos
export const toolProjects = pgTable("tool_projects", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").references(() => tools.id).notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  
  // Campos estruturados baseados no schema da especificação
  tipoAtividade: text("tipo_atividade").notNull(), // "aula_convidado" | "visita_tecnica" | "outro_evento"
  dataRealizacao: date("data_realizacao").notNull(),
  local: text("local").notNull(),
  nomeProfissionais: text("nome_profissionais").notNull(),
  quantidadeEncontros: integer("quantidade_encontros"), // opcional, só para aula_convidado
  transporteNecessario: boolean("transporte_necessario").notNull().default(false),
  demandasMarketing: text("demandas_marketing").array().default([]), // array de strings
  publicoExclusivo: boolean("publico_exclusivo").notNull().default(false), // só para aula_convidado
  turmasEnv: text("turmas_env"), // se publico_exclusivo for true
  horarioSaida: text("horario_saida"), // só para visita_tecnica
  horarioRetorno: text("horario_retorno"), // só para visita_tecnica
  cidade: text("cidade"), // só para visita_tecnica
  empresasVisitadas: text("empresas_visitadas"), // só para visita_tecnica
  logisticaVisita: text("logistica_visita"), // só para visita_tecnica
  tipoVeiculo: text("tipo_veiculo"), // "van" | "micro" | "onibus" (só para visita_tecnica)
  custoAluno: integer("custo_aluno"), // só para visita_tecnica (em centavos)
  descricaoEvento: text("descricao_evento"), // só para outro_evento
  observacoes: text("observacoes"), // opcional
  
  // Campos de controle de workflow
  status: text("status").notNull().default("rascunho"), // "rascunho", "pendente", "aprovado", "rejeitado", "realizado", "relatorio_pendente", "finalizado"
  dadosIA: jsonb("dados_ia").$type<any>(), // Dados coletados pela IA
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const toolProjectReports = pgTable("tool_project_reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => toolProjects.id, { onDelete: 'cascade' }),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  
  // Campos estruturados baseados no schema de relatório da especificação
  dataRealizacao: date("data_realizacao").notNull(),
  resumoAtividade: text("resumo_atividade").notNull(),
  resultadosAlcancados: text("resultados_alcancados").notNull(),
  pontosPositivos: text("pontos_positivos").notNull(),
  desafiosDificuldades: text("desafios_dificuldades").notNull(),
  sugestoesMelhoria: text("sugestoes_melhoria").notNull(),
  fotosAnexadas: text("fotos_anexadas").array().default([]), // URLs ou identificadores dos arquivos
  observacoesFinais: text("observacoes_finais"), // opcional
  
  // Campos de controle
  status: text("status").notNull().default("pendente"), // "pendente", "aprovado", "rejeitado"
  dadosIA: jsonb("dados_ia").$type<any>(), // Dados coletados pela IA
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tipos e esquemas para o UtilityLink estão definidos abaixo junto com os outros esquemas

// Relations
export const userCategoriesRelations = relations(userCategories, ({ many }) => ({
  userAssignments: many(userCategoryAssignments),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  userCategory: one(userCategories, {
    fields: [users.userCategoryId],
    references: [userCategories.id],
  }),
  userGroups: many(userGroups),
  createdGroups: many(groups, { relationName: "creator" }),
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
  notifications: many(notifications),
  sentNotifications: many(notifications, { relationName: "fromUser" }),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  conversationsAsUser1: many(conversations, { relationName: "user1" }),
  conversationsAsUser2: many(conversations, { relationName: "user2" }),
  createdIdeas: many(ideas, { relationName: "creator" }),
  responsibleForIdeas: many(ideas, { relationName: "responsible" }),
  ideaVotes: many(ideaVotes),
  ideaComments: many(ideaComments),
  ideaVolunteers: many(ideaVolunteers),
  aiPrompts: many(aiPrompts, { relationName: "creator" }),
  aiConversations: many(aiConversations),
  calendarEvents: many(calendarEvents, { relationName: "creator" }),
  news: many(news, { relationName: "creator" }),
  announcements: many(announcements, { relationName: "creator" }),
  featureSettings: many(featureSettings, { relationName: "lastUpdatedBy" }),
  userCategoryAssignments: many(userCategoryAssignments),
}));

export const groupsRelations = relations(groups, ({ many, one }) => ({
  userGroups: many(userGroups),
  posts: many(posts),
  ideas: many(ideas),
  creator: one(users, {
    fields: [groups.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

export const userCategoryAssignmentsRelations = relations(userCategoryAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userCategoryAssignments.userId],
    references: [users.id],
  }),
  category: one(userCategories, {
    fields: [userCategoryAssignments.categoryId],
    references: [userCategories.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [posts.groupId],
    references: [groups.id],
  }),
  comments: many(comments),
  likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  likes: many(likes),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [likes.commentId],
    references: [comments.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver"
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user1: one(users, {
    fields: [conversations.user1Id],
    references: [users.id],
    relationName: "user1"
  }),
  user2: one(users, {
    fields: [conversations.user2Id],
    references: [users.id],
    relationName: "user2"
  }),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  creator: one(users, {
    fields: [ideas.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
  responsible: one(users, {
    fields: [ideas.responsibleId],
    references: [users.id],
    relationName: "responsible"
  }),
  group: one(groups, {
    fields: [ideas.groupId],
    references: [groups.id],
  }),
  votes: many(ideaVotes),
  comments: many(ideaComments),
  volunteers: many(ideaVolunteers),
}));

export const ideaVotesRelations = relations(ideaVotes, ({ one }) => ({
  user: one(users, {
    fields: [ideaVotes.userId],
    references: [users.id],
  }),
  idea: one(ideas, {
    fields: [ideaVotes.ideaId],
    references: [ideas.id],
  }),
}));

export const ideaCommentsRelations = relations(ideaComments, ({ one, many }) => ({
  user: one(users, {
    fields: [ideaComments.userId],
    references: [users.id],
  }),
  idea: one(ideas, {
    fields: [ideaComments.ideaId],
    references: [ideas.id],
  }),
  parent: one(ideaComments, {
    fields: [ideaComments.parentId],
    references: [ideaComments.id],
  }),
  replies: many(ideaComments, { relationName: 'parent' }),
}));

export const ideaVolunteersRelations = relations(ideaVolunteers, ({ one }) => ({
  user: one(users, {
    fields: [ideaVolunteers.userId],
    references: [users.id],
  }),
  idea: one(ideas, {
    fields: [ideaVolunteers.ideaId],
    references: [ideas.id],
  }),
}));

export const aiAgentsRelations = relations(aiAgents, ({ many }) => ({
  conversations: many(aiConversations),
  promptAgents: many(aiPromptAgents),
}));

export const aiPromptsRelations = relations(aiPrompts, ({ one, many }) => ({
  creator: one(users, {
    fields: [aiPrompts.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
  promptAgents: many(aiPromptAgents),
}));

export const aiPromptAgentsRelations = relations(aiPromptAgents, ({ one }) => ({
  prompt: one(aiPrompts, {
    fields: [aiPromptAgents.promptId],
    references: [aiPrompts.id],
  }),
  agent: one(aiAgents, {
    fields: [aiPromptAgents.agentId],
    references: [aiAgents.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  agent: one(aiAgents, {
    fields: [aiConversations.agentId],
    references: [aiAgents.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  creator: one(users, {
    fields: [calendarEvents.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
}));

export const newsCategoriesRelations = relations(newsCategories, ({ many }) => ({
  news: many(news),
}));

export const newsRelations = relations(news, ({ one }) => ({
  category: one(newsCategories, {
    fields: [news.categoryId],
    references: [newsCategories.id],
  }),
  creator: one(users, {
    fields: [news.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  creator: one(users, {
    fields: [announcements.creatorId],
    references: [users.id],
    relationName: "creator"
  }),
}));

export const featureSettingsRelations = relations(featureSettings, ({ one }) => ({
  lastUpdatedBy: one(users, {
    fields: [featureSettings.lastUpdatedBy],
    references: [users.id],
    relationName: "lastUpdatedBy"
  }),
}));

// Relações para as tabelas de trilhas
export const trailCategoriesRelations = relations(trailCategories, ({ many }) => ({
  trails: many(trails),
}));

export const trailsRelations = relations(trails, ({ one, many }) => ({
  category: one(trailCategories, {
    fields: [trails.categoryId],
    references: [trailCategories.id],
  }),
  creator: one(users, {
    fields: [trails.creatorId],
    references: [users.id],
  }),
  contents: many(trailContents),
  progress: many(trailProgress),
}));

export const trailContentsRelations = relations(trailContents, ({ one, many }) => ({
  trail: one(trails, {
    fields: [trailContents.trailId],
    references: [trails.id],
  }),
  comments: many(trailComments),
}));

export const trailCommentsRelations = relations(trailComments, ({ one, many }) => ({
  content: one(trailContents, {
    fields: [trailComments.contentId],
    references: [trailContents.id],
  }),
  user: one(users, {
    fields: [trailComments.userId],
    references: [users.id],
  }),
  parent: one(trailComments, {
    fields: [trailComments.parentId],
    references: [trailComments.id],
  }),
  replies: many(trailComments, { relationName: 'parent' }),
  likes: many(trailCommentLikes),
}));

export const trailCommentLikesRelations = relations(trailCommentLikes, ({ one }) => ({
  user: one(users, {
    fields: [trailCommentLikes.userId],
    references: [users.id],
  }),
  comment: one(trailComments, {
    fields: [trailCommentLikes.commentId],
    references: [trailComments.id],
  }),
}));

export const trailProgressRelations = relations(trailProgress, ({ one }) => ({
  user: one(users, {
    fields: [trailProgress.userId],
    references: [users.id],
  }),
  trail: one(trails, {
    fields: [trailProgress.trailId],
    references: [trails.id],
  }),
}));

// Relações para Gamificação
export const gamificationSettingsRelations = relations(gamificationSettings, ({ one }) => ({
  generalCategory: one(userCategories, {
    fields: [gamificationSettings.generalCategoryId],
    references: [userCategories.id],
  }),
}));

export const gamificationPointsRelations = relations(gamificationPoints, ({ one }) => ({
  user: one(users, {
    fields: [gamificationPoints.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [gamificationPoints.createdBy],
    references: [users.id],
    relationName: "createdBy"
  }),
}));

export const gamificationChallengesRelations = relations(gamificationChallenges, ({ one, many }) => ({
  creator: one(users, {
    fields: [gamificationChallenges.createdBy],
    references: [users.id],
  }),
  comments: many(challengeComments),
}));

export const challengeCommentsRelations = relations(challengeComments, ({ one, many }) => ({
  challenge: one(gamificationChallenges, {
    fields: [challengeComments.challengeId],
    references: [gamificationChallenges.id],
  }),
  user: one(users, {
    fields: [challengeComments.userId],
    references: [users.id],
  }),
  parent: one(challengeComments, {
    fields: [challengeComments.parentId],
    references: [challengeComments.id],
  }),
  replies: many(challengeComments),
  likes: many(challengeCommentLikes),
}));

export const challengeCommentLikesRelations = relations(challengeCommentLikes, ({ one }) => ({
  user: one(users, {
    fields: [challengeCommentLikes.userId],
    references: [users.id],
  }),
  comment: one(challengeComments, {
    fields: [challengeCommentLikes.commentId],
    references: [challengeComments.id],
  }),
}));

export const challengeSubmissionsRelations = relations(challengeSubmissions, ({ one }) => ({
  challenge: one(gamificationChallenges, {
    fields: [challengeSubmissions.challengeId],
    references: [gamificationChallenges.id],
  }),
  user: one(users, {
    fields: [challengeSubmissions.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [challengeSubmissions.reviewedBy],
    references: [users.id],
    relationName: "reviewer"
  }),
}));

// Relações para Ferramentas
export const toolCategoriesRelations = relations(toolCategories, ({ many }) => ({
  tools: many(tools),
}));

export const toolsRelations = relations(tools, ({ one, many }) => ({
  category: one(toolCategories, {
    fields: [tools.categoryId],
    references: [toolCategories.id],
  }),
  projects: many(toolProjects),
}));

export const toolProjectsRelations = relations(toolProjects, ({ one, many }) => ({
  tool: one(tools, {
    fields: [toolProjects.toolId],
    references: [tools.id],
  }),
  creator: one(users, {
    fields: [toolProjects.creatorId],
    references: [users.id],
  }),
  reports: many(toolProjectReports),
}));

export const toolProjectReportsRelations = relations(toolProjectReports, ({ one }) => ({
  project: one(toolProjects, {
    fields: [toolProjectReports.projectId],
    references: [toolProjects.id],
  }),
  creator: one(users, {
    fields: [toolProjectReports.creatorId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserCategorySchema = createInsertSchema(userCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
  emergencyContact: true,
  documents: true,
  phoneNumbers: true,
}).extend({
  email: z.string().email().refine(
    (email) => email.endsWith('@cesurg.com'), 
    { message: "Only @cesurg.com emails are allowed" }
  )
});

export const updateProfileSchema = createInsertSchema(users).omit({
  id: true,
  email: true, // Email principal não pode ser alterado
  role: true,
  password: true,
  googleId: true,
  isActive: true,
  joinDate: true, // Data de ingresso não pode ser editada pelo usuário
  createdAt: true,
  updatedAt: true,
}).extend({
  secondaryEmail: z.string().email().optional(),
  phoneNumbers: z.array(z.string()).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string()
  }).optional(),
  biografia: z.string().optional(),
});

// Schema específico para admins editarem perfis de usuários (inclui joinDate)
export const adminUpdateUserSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  secondaryEmail: z.string().email().optional(),
  phoneNumbers: z.array(z.string()).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string()
  }).optional(),
  biografia: z.string().optional(),
  joinDate: z.string().optional().transform((str) => str ? new Date(str) : null),
});

export const insertGoogleUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  googleId: true,
  photoUrl: true
}).extend({
  email: z.string().email().refine(
    (email) => email.endsWith('@cesurg.com'), 
    { message: "Only @cesurg.com emails are allowed" }
  )
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserGroupSchema = createInsertSchema(userGroups);

export const insertUserCategoryAssignmentSchema = createInsertSchema(userCategoryAssignments);

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  lastMessageAt: true,
});

export const insertIdeaSchema = createInsertSchema(ideas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIdeaVoteSchema = createInsertSchema(ideaVotes).omit({
  createdAt: true,
});

export const insertIdeaCommentSchema = createInsertSchema(ideaComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIdeaVolunteerSchema = createInsertSchema(ideaVolunteers).omit({
  createdAt: true,
});

export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiPromptSchema = createInsertSchema(aiPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiPromptAgentSchema = createInsertSchema(aiPromptAgents);

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  lastMessageAt: true,
  createdAt: true,
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUtilityLinkSchema = createInsertSchema(utilityLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewsCategorySchema = createInsertSchema(newsCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeatureSettingSchema = createInsertSchema(featureSettings).omit({
  id: true,
  updatedAt: true,
});

// Schemas para Gamificação
export const insertGamificationSettingsSchema = createInsertSchema(gamificationSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertGamificationPointsSchema = createInsertSchema(gamificationPoints).omit({
  id: true,
  createdAt: true,
});

export const insertGamificationChallengeSchema = createInsertSchema(gamificationChallenges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  endDate: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val),
});

export const updateGamificationChallengeSchema = createInsertSchema(gamificationChallenges).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).extend({
  startDate: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  endDate: z.union([z.date(), z.string()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  updatedAt: z.date().optional(),
});

export const updateGamificationSettingsSchema = insertGamificationSettingsSchema.partial();

export const insertChallengeCommentSchema = createInsertSchema(challengeComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChallengeCommentLikeSchema = createInsertSchema(challengeCommentLikes).omit({
  createdAt: true,
});

export const insertChallengeSubmissionSchema = createInsertSchema(challengeSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const updateChallengeSubmissionSchema = createInsertSchema(challengeSubmissions).omit({
  id: true,
  challengeId: true,
  userId: true,
  createdAt: true,
}).extend({
  updatedAt: z.date().optional(),
});

// Tabela para feedbacks do sistema
export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'bug', 'improvement', 'general'
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  userId: integer("userId").references(() => users.id),
  attachments: jsonb("attachments").$type<{
    images: {
      id: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      isScreenshot: boolean;
    }[];
  }>().default({ images: [] }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  adminNotes: text("adminNotes"),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: integer("resolvedBy").references(() => users.id),
});

// Relações para feedbacks
export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  user: one(users, {
    fields: [feedbacks.userId],
    references: [users.id],
  }),
}));

// Schema para inserir feedback
export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  adminNotes: true,
  resolvedAt: true,
  resolvedBy: true,
});

// Schema para atualizar feedback (admin)
export const updateFeedbackSchema = createInsertSchema(feedbacks).pick({
  status: true,
  adminNotes: true,
  attachments: true,
});

// Types
export type InsertUserCategory = z.infer<typeof insertUserCategorySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;
export type InsertGoogleUser = z.infer<typeof insertGoogleUserSchema>;
export type InsertUtilityLink = z.infer<typeof insertUtilityLinkSchema>;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type InsertUserCategoryAssignment = z.infer<typeof insertUserCategoryAssignmentSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type InsertIdeaVote = z.infer<typeof insertIdeaVoteSchema>;
export type InsertIdeaComment = z.infer<typeof insertIdeaCommentSchema>;
export type InsertIdeaVolunteer = z.infer<typeof insertIdeaVolunteerSchema>;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type InsertAiPrompt = z.infer<typeof insertAiPromptSchema>;
export type InsertAiPromptAgent = z.infer<typeof insertAiPromptAgentSchema>;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type InsertNewsCategory = z.infer<typeof insertNewsCategorySchema>;
export type InsertNews = z.infer<typeof insertNewsSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertFeatureSetting = z.infer<typeof insertFeatureSettingSchema>;
export type InsertGamificationSettings = z.infer<typeof insertGamificationSettingsSchema>;
export type InsertGamificationPoints = z.infer<typeof insertGamificationPointsSchema>;
export type InsertGamificationChallenge = z.infer<typeof insertGamificationChallengeSchema>;
export type UpdateGamificationChallenge = z.infer<typeof updateGamificationChallengeSchema>;
export type UpdateGamificationSettings = z.infer<typeof updateGamificationSettingsSchema>;
export type InsertChallengeComment = z.infer<typeof insertChallengeCommentSchema>;
export type InsertChallengeCommentLike = z.infer<typeof insertChallengeCommentLikeSchema>;
export type InsertChallengeSubmission = z.infer<typeof insertChallengeSubmissionSchema>;
export type UpdateChallengeSubmission = z.infer<typeof updateChallengeSubmissionSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type UpdateFeedback = z.infer<typeof updateFeedbackSchema>;

export type UserCategory = typeof userCategories.$inferSelect;
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type UserGroup = typeof userGroups.$inferSelect;
export type UserCategoryAssignment = typeof userCategoryAssignments.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type IdeaVote = typeof ideaVotes.$inferSelect;
export type IdeaComment = typeof ideaComments.$inferSelect;
export type IdeaVolunteer = typeof ideaVolunteers.$inferSelect;
export type AiAgent = typeof aiAgents.$inferSelect;
export type AiPrompt = typeof aiPrompts.$inferSelect;
export type AiPromptAgent = typeof aiPromptAgents.$inferSelect;
export type AiConversation = typeof aiConversations.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
export type UtilityLink = typeof utilityLinks.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewsCategory = typeof newsCategories.$inferSelect;
export type News = typeof news.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type FeatureSetting = typeof featureSettings.$inferSelect;
export type GamificationSettings = typeof gamificationSettings.$inferSelect;
export type GamificationPoints = typeof gamificationPoints.$inferSelect;
export type GamificationChallenge = typeof gamificationChallenges.$inferSelect;
export type ChallengeComment = typeof challengeComments.$inferSelect;
export type ChallengeCommentLike = typeof challengeCommentLikes.$inferSelect;
export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;
export type Feedback = typeof feedbacks.$inferSelect;

// Tabela para pastas de materiais
export const materialFolders: any = pgTable("material_folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id").references(() => materialFolders.id, { onDelete: 'cascade' }),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  imageUrl: text("image_url"),
  isPublic: boolean("is_public").notNull().default(false),
  groupIds: integer("group_ids").array().default([]), // IDs dos grupos que têm acesso
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela para arquivos de materiais
export const materialFiles = pgTable("material_files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  folderId: integer("folder_id").references(() => materialFolders.id, { onDelete: 'cascade' }),
  uploaderId: integer("uploader_id").notNull().references(() => users.id),
  fileUrl: text("file_url"), // Pode ser null para links do YouTube
  fileName: text("file_name"), // Pode ser null para links do YouTube
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull().default(0), // 0 para links do YouTube
  downloadCount: integer("download_count").notNull().default(0),
  contentType: text("content_type").notNull().default("file"), // "file" ou "youtube"
  youtubeUrl: text("youtube_url"), // URL do YouTube quando contentType é "youtube"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações para pastas de materiais
export const materialFoldersRelations = relations(materialFolders, ({ one, many }) => ({
  creator: one(users, {
    fields: [materialFolders.creatorId],
    references: [users.id],
  }),
  parent: one(materialFolders, {
    fields: [materialFolders.parentId],
    references: [materialFolders.id],
  }),
  children: many(materialFolders),
  files: many(materialFiles),
}));

// Relações para arquivos de materiais
export const materialFilesRelations = relations(materialFiles, ({ one }) => ({
  folder: one(materialFolders, {
    fields: [materialFiles.folderId],
    references: [materialFolders.id],
  }),
  uploader: one(users, {
    fields: [materialFiles.uploaderId],
    references: [users.id],
  }),
}));

// Schemas para inserção
export const insertMaterialFolderSchema = createInsertSchema(materialFolders);
export const insertMaterialFileSchema = createInsertSchema(materialFiles);

// Tipos para inserção
export type InsertMaterialFolder = z.infer<typeof insertMaterialFolderSchema>;
export type InsertMaterialFile = z.infer<typeof insertMaterialFileSchema>;

// Tipos para seleção
export type MaterialFolder = typeof materialFolders.$inferSelect;
export type MaterialFile = typeof materialFiles.$inferSelect;

// Schemas para inserção das trilhas
export const insertTrailCategorySchema = createInsertSchema(trailCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrailSchema = createInsertSchema(trails).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrailContentSchema = createInsertSchema(trailContents).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrailCommentSchema = createInsertSchema(trailComments).omit({
  id: true,
  isAdminReply: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrailCommentLikeSchema = createInsertSchema(trailCommentLikes).omit({
  createdAt: true,
});

export const insertTrailProgressSchema = createInsertSchema(trailProgress).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTrailContentRatingSchema = createInsertSchema(trailContentRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tipos para inserção das trilhas
export type InsertTrailCategory = z.infer<typeof insertTrailCategorySchema>;
export type InsertTrail = z.infer<typeof insertTrailSchema>;
export type InsertTrailContent = z.infer<typeof insertTrailContentSchema>;
export type InsertTrailComment = z.infer<typeof insertTrailCommentSchema>;
export type InsertTrailCommentLike = z.infer<typeof insertTrailCommentLikeSchema>;
export type InsertTrailProgress = z.infer<typeof insertTrailProgressSchema>;
export type InsertTrailContentRating = z.infer<typeof insertTrailContentRatingSchema>;

// Tipos para seleção das trilhas
export type TrailCategory = typeof trailCategories.$inferSelect;
export type Trail = typeof trails.$inferSelect;
export type TrailContent = typeof trailContents.$inferSelect;
export type TrailComment = typeof trailComments.$inferSelect;
export type TrailCommentLike = typeof trailCommentLikes.$inferSelect;
export type TrailProgress = typeof trailProgress.$inferSelect;
export type TrailContentRating = typeof trailContentRatings.$inferSelect;

// =====================================
// SISTEMA DE PESQUISAS DE OPINIÃO
// =====================================

// Tabela principal para pesquisas
export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"), // Instruções para o usuário
  isActive: boolean("is_active").notNull().default(false), // Se a pesquisa está ativa
  allowMultipleResponses: boolean("allow_multiple_responses").notNull().default(false),
  allowAnonymousResponses: boolean("allow_anonymous_responses").notNull().default(true), // Se permite respostas anônimas
  targetUserCategories: integer("target_user_categories").array().default([]), // IDs das categorias de usuário
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela para perguntas das pesquisas
export const surveyQuestions = pgTable("survey_questions", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  type: text("type").notNull(), // 'multiple_choice', 'likert_scale', 'text_free', 'yes_no', 'rating', 'date', 'email'
  order: integer("order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  options: jsonb("options").$type<{
    // Para multiple_choice
    choices?: string[];
    // Para likert_scale
    scale?: {
      min: number;
      max: number;
      minLabel: string;
      maxLabel: string;
      step?: number;
    };
    // Para text_free
    textConfig?: {
      placeholder?: string;
      maxLength?: number;
      multiline?: boolean;
    };
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela para respostas das pesquisas
export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }), // null para respostas anônimas
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  responseData: jsonb("response_data").$type<{
    [questionId: string]: {
      questionType: string;
      answer: string | number | string[]; // Dependendo do tipo da pergunta
    };
  }>().notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  ipAddress: text("ip_address"), // Para controle de respostas duplicadas em pesquisas anônimas
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Configurações globais do widget de pesquisas
export const surveyWidgetSettings = pgTable("survey_widget_settings", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  displayStyle: text("display_style").notNull().default("floating"), // 'floating', 'banner', 'sidebar'
  position: text("position").notNull().default("bottom-right"), // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  showCloseButton: boolean("show_close_button").notNull().default(true),
  autoShowDelay: integer("auto_show_delay").notNull().default(3000), // ms
  primaryColor: text("primary_color").default("#3B82F6"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações para surveys
export const surveysRelations = relations(surveys, ({ one, many }) => ({
  creator: one(users, {
    fields: [surveys.creatorId],
    references: [users.id],
  }),
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyQuestions.surveyId],
    references: [surveys.id],
  }),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  user: one(users, {
    fields: [surveyResponses.userId],
    references: [users.id],
  }),
}));

export const surveyWidgetSettingsRelations = relations(surveyWidgetSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [surveyWidgetSettings.updatedBy],
    references: [users.id],
  }),
}));

// Schemas para inserção
export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.string(), z.date()]).optional().nullable().transform((val) => {
    if (!val || val === '') return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
  endDate: z.union([z.string(), z.date()]).optional().nullable().transform((val) => {
    if (!val || val === '') return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  createdAt: true,
});

export const insertToolCategorySchema = createInsertSchema(toolCategories, {
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  color: z.string().default("#3B82F6"),
  icon: z.string().default("settings"),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertToolSchema = createInsertSchema(tools, {
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  categoryId: z.number().optional(),
  allowedUserCategories: z.array(z.number()).default([]),
  isActive: z.boolean().default(true),
  settings: z.any().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertToolProjectSchema = createInsertSchema(toolProjects, {
  toolId: z.number().min(1, "ID da ferramenta é obrigatório"),
  tipoAtividade: z.enum(['aula_convidado', 'visita_tecnica', 'outro_evento']),
  dataRealizacao: z.string().transform((str) => new Date(str)),
  local: z.string().min(1, "Local é obrigatório"),
  nomeProfissionais: z.string().min(1, "Nome dos profissionais é obrigatório"),
  quantidadeEncontros: z.number().min(1).optional(),
  transporteNecessario: z.boolean(),
  demandasMarketing: z.array(z.string()).default([]),
  publicoExclusivo: z.boolean(),
  turmasEnv: z.string().optional(),
  horarioSaida: z.string().optional(),
  horarioRetorno: z.string().optional(),
  cidade: z.string().optional(),
  empresasVisitadas: z.string().optional(),
  logisticaVisita: z.string().optional(),
  tipoVeiculo: z.enum(['van', 'micro', 'onibus']).optional(),
  custoAluno: z.number().min(0).optional(),
  descricaoEvento: z.string().optional(),
  observacoes: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertToolProjectReportSchema = createInsertSchema(toolProjectReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSurveyWidgetSettingsSchema = createInsertSchema(surveyWidgetSettings).omit({
  id: true,
  updatedAt: true,
});

// Tipos para inserção
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type InsertSurveyWidgetSettings = z.infer<typeof insertSurveyWidgetSettingsSchema>;
export type InsertToolCategory = z.infer<typeof insertToolCategorySchema>;
export type InsertTool = z.infer<typeof insertToolSchema>;
export type InsertToolProject = z.infer<typeof insertToolProjectSchema>;
export type InsertToolProjectReport = z.infer<typeof insertToolProjectReportSchema>;

// Tipos para seleção
export type Survey = typeof surveys.$inferSelect;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type SurveyWidgetSettings = typeof surveyWidgetSettings.$inferSelect;
export type ToolCategory = typeof toolCategories.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type ToolProject = typeof toolProjects.$inferSelect;
export type ToolProjectReport = typeof toolProjectReports.$inferSelect;
