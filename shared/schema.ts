import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  password: text("password"),
  googleId: text("google_id").unique(),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").notNull().default(true),
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

export const ideaComments = pgTable("idea_comments", {
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email().refine(
    (email) => email.endsWith('@cesurg.com'), 
    { message: "Only @cesurg.com emails are allowed" }
  )
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGoogleUser = z.infer<typeof insertGoogleUserSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type InsertIdeaVote = z.infer<typeof insertIdeaVoteSchema>;
export type InsertIdeaComment = z.infer<typeof insertIdeaCommentSchema>;
export type InsertIdeaVolunteer = z.infer<typeof insertIdeaVolunteerSchema>;

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type UserGroup = typeof userGroups.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type IdeaVote = typeof ideaVotes.$inferSelect;
export type IdeaComment = typeof ideaComments.$inferSelect;
export type IdeaVolunteer = typeof ideaVolunteers.$inferSelect;
