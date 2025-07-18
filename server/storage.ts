import { 
  users, 
  groups, 
  userGroups,
  userCategories,
  aiAgents,
  aiPrompts,
  aiPromptAgents,
  aiConversations,
  aiMessages,
  utilityLinks,
  calendarEvents,
  news,
  newsCategories,
  announcements,
  materialFolders,
  materialFiles,
  trailCategories,
  trails,
  trailContents,
  trailComments,
  trailCommentLikes,
  trailProgress,
  feedbacks,
  challengeComments,
  challengeCommentLikes,
  type User, 
  type InsertUser, 
  type InsertGoogleUser,
  type Group,
  type InsertGroup,
  type UserGroup,
  type UserCategory,
  type InsertUserCategory,
  type AiAgent,
  type AiPrompt,
  type AiConversation,
  type AiMessage,
  type InsertAiAgent,
  type UtilityLink,
  type InsertUtilityLink,
  type InsertAiPrompt,
  type InsertAiConversation,
  type InsertAiMessage,
  type CalendarEvent,
  type InsertCalendarEvent,
  type News,
  type InsertNews,
  type NewsCategory,
  type InsertNewsCategory,
  type Announcement,
  type InsertAnnouncement,
  type MaterialFolder,
  type MaterialFile,
  type InsertMaterialFolder,
  type InsertMaterialFile,
  type TrailCategory,
  type Trail,
  type TrailContent,
  type TrailComment,
  type TrailCommentLike,
  type TrailProgress,
  type InsertTrailCategory,
  type InsertTrail,
  type InsertTrailContent,
  type InsertTrailComment,
  type InsertTrailCommentLike,
  type InsertTrailProgress,
  type Feedback,
  type InsertFeedback,
  type UpdateFeedback,
  type ChallengeComment,
  type InsertChallengeComment,
  type ChallengeCommentLike,
  type InsertChallengeCommentLike
} from "@shared/schema";
import { db, pool } from "./db";
import { and, asc, desc, eq, gte, lte, or, inArray, SQL, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOrUpdateGoogleUser(user: InsertGoogleUser): Promise<User>;
  updateExistingUserWithGoogleInfo(user: InsertGoogleUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserStatus(id: number, isActive: boolean): Promise<User | undefined>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  
  // Group related methods
  createGroup(group: InsertGroup): Promise<Group>;
  getAllGroups(): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;
  
  // User Group relationship methods
  addUserToGroup(userId: number, groupId: number): Promise<boolean>;
  removeUserFromGroup(userId: number, groupId: number): Promise<boolean>;
  getUserGroups(userId: number): Promise<Group[]>;
  getGroupUsers(groupId: number): Promise<User[]>;
  
  // User Category methods
  getAllUserCategories(): Promise<UserCategory[]>;
  getUserCategory(id: number): Promise<UserCategory | undefined>;
  createUserCategory(category: InsertUserCategory): Promise<UserCategory>;
  updateUserCategory(id: number, categoryData: Partial<InsertUserCategory>): Promise<UserCategory | undefined>;
  deleteUserCategory(id: number): Promise<boolean>;
  
  // AI Agent methods
  getAllAiAgents(): Promise<AiAgent[]>;
  getAiAgent(id: number): Promise<AiAgent | undefined>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: number, agentData: Partial<InsertAiAgent>): Promise<AiAgent | undefined>;
  deleteAiAgent(id: number): Promise<boolean>;
  
  // AI Prompt methods
  getAllAiPrompts(userId?: number): Promise<AiPrompt[]>;
  getPublicAiPrompts(): Promise<AiPrompt[]>;
  getAiPrompt(id: number): Promise<AiPrompt | undefined>;
  createAiPrompt(prompt: InsertAiPrompt): Promise<AiPrompt>;
  updateAiPrompt(id: number, promptData: Partial<InsertAiPrompt>): Promise<AiPrompt | undefined>;
  deleteAiPrompt(id: number): Promise<boolean>;
  
  // AI Prompt-Agent relationship methods
  assignPromptToAgent(promptId: number, agentId: number): Promise<boolean>;
  removePromptFromAgent(promptId: number, agentId: number): Promise<boolean>;
  removeAllPromptAgentAssignments(promptId: number): Promise<boolean>;
  getAgentPrompts(agentId: number): Promise<AiPrompt[]>;
  
  // AI Conversation methods
  getUserAiConversations(userId: number): Promise<(AiConversation & { agent: AiAgent })[]>;
  getAiConversation(id: number): Promise<AiConversation | undefined>;
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  updateAiConversationLastMessage(id: number, preview: string): Promise<boolean>;
  deleteAiConversation(id: number): Promise<boolean>;
  
  // AI Message methods
  getAiConversationMessages(conversationId: number): Promise<AiMessage[]>;
  createAiMessage(message: InsertAiMessage): Promise<AiMessage>;
  
  // Utility Links methods
  getAllUtilityLinks(): Promise<UtilityLink[]>;
  getUtilityLink(id: number): Promise<UtilityLink | undefined>;
  createUtilityLink(link: InsertUtilityLink): Promise<UtilityLink>;
  updateUtilityLink(id: number, linkData: Partial<InsertUtilityLink>): Promise<UtilityLink | undefined>;
  deleteUtilityLink(id: number): Promise<boolean>;
  
  // Calendar Event methods
  getCalendarEvents(includeInactive?: boolean): Promise<CalendarEvent[]>;
  getUpcomingCalendarEvents(startDate: string, endDate: string, limit?: number): Promise<CalendarEvent[]>;
  getCalendarEventById(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, eventData: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  
  // News Category methods
  getAllNewsCategories(): Promise<NewsCategory[]>;
  getNewsCategory(id: number): Promise<NewsCategory | undefined>;
  createNewsCategory(category: InsertNewsCategory): Promise<NewsCategory>;
  updateNewsCategory(id: number, categoryData: Partial<InsertNewsCategory>): Promise<NewsCategory | undefined>;
  deleteNewsCategory(id: number): Promise<boolean>;
  
  // News methods
  getAllNews(includeUnpublished?: boolean): Promise<(News & { category?: NewsCategory })[]>;
  getLatestNews(limit: number): Promise<(News & { category?: NewsCategory })[]>;
  getNewsById(id: number): Promise<(News & { category?: NewsCategory }) | undefined>;
  getNewsBySourceUrl(sourceUrl: string): Promise<News | undefined>;
  createNews(news: InsertNews): Promise<News>;
  updateNews(id: number, newsData: Partial<InsertNews>): Promise<News | undefined>;
  publishNews(id: number): Promise<News | undefined>;
  unpublishNews(id: number): Promise<News | undefined>;
  deleteNews(id: number): Promise<boolean>;
  
  // Announcement methods
  getAllAnnouncements(includeInactive?: boolean): Promise<(Announcement & { creator: User })[]>;
  getActiveAnnouncements(limit?: number): Promise<(Announcement & { creator: User })[]>;
  getAnnouncementById(id: number): Promise<(Announcement & { creator: User }) | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, announcementData: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<boolean>;
  
  // Material Folder methods
  getAllMaterialFolders(userId?: number): Promise<(MaterialFolder & { creator: User; parent?: MaterialFolder; children?: MaterialFolder[]; files?: MaterialFile[] })[]>;
  getMaterialFolder(id: number): Promise<(MaterialFolder & { creator: User; parent?: MaterialFolder; children?: MaterialFolder[]; files?: MaterialFile[] }) | undefined>;
  createMaterialFolder(folder: InsertMaterialFolder): Promise<MaterialFolder>;
  updateMaterialFolder(id: number, folderData: Partial<InsertMaterialFolder>): Promise<MaterialFolder | undefined>;
  deleteMaterialFolder(id: number): Promise<boolean>;
  
  // Material File methods
  getAllMaterialFiles(folderId?: number): Promise<(MaterialFile & { folder?: MaterialFolder; uploader: User })[]>;
  getMaterialFile(id: number): Promise<(MaterialFile & { folder?: MaterialFolder; uploader: User }) | undefined>;
  createMaterialFile(file: InsertMaterialFile): Promise<MaterialFile>;
  updateMaterialFile(id: number, fileData: Partial<InsertMaterialFile>): Promise<MaterialFile | undefined>;
  deleteMaterialFile(id: number): Promise<boolean>;
  incrementDownloadCount(id: number): Promise<boolean>;

  // Trail Category methods
  getAllTrailCategories(): Promise<TrailCategory[]>;
  getTrailCategory(id: number): Promise<TrailCategory | undefined>;
  createTrailCategory(category: InsertTrailCategory): Promise<TrailCategory>;
  updateTrailCategory(id: number, categoryData: Partial<InsertTrailCategory>): Promise<TrailCategory | undefined>;
  deleteTrailCategory(id: number): Promise<boolean>;

  // Trail methods
  getAllTrails(includeUnpublished?: boolean): Promise<(Trail & { category?: TrailCategory; creator: User; contentCount: number })[]>;
  getTrail(id: number): Promise<(Trail & { category?: TrailCategory; creator: User; contents: TrailContent[] }) | undefined>;
  createTrail(trail: InsertTrail): Promise<Trail>;
  updateTrail(id: number, trailData: Partial<InsertTrail>): Promise<Trail | undefined>;
  deleteTrail(id: number): Promise<boolean>;
  incrementTrailViewCount(id: number): Promise<boolean>;

  // Trail Content methods
  getTrailContents(trailId: number, includeDrafts?: boolean): Promise<TrailContent[]>;
  getTrailContent(id: number): Promise<(TrailContent & { trail: Trail; commentsCount: number }) | undefined>;
  createTrailContent(content: InsertTrailContent): Promise<TrailContent>;
  updateTrailContent(id: number, contentData: Partial<InsertTrailContent>): Promise<TrailContent | undefined>;
  deleteTrailContent(id: number): Promise<boolean>;
  incrementTrailContentViewCount(id: number): Promise<boolean>;

  // Trail Comment methods
  getTrailComments(contentId: number, userId?: number): Promise<(TrailComment & { user: User; replies: (TrailComment & { user: User; likeCount: number; isLikedByUser: boolean })[] ; likeCount: number; isLikedByUser: boolean })[]>;
  createTrailComment(comment: InsertTrailComment): Promise<TrailComment>;
  updateTrailComment(id: number, commentData: Partial<InsertTrailComment>): Promise<TrailComment | undefined>;
  deleteTrailComment(id: number): Promise<boolean>;

  // Trail Comment Like methods
  likeTrailComment(userId: number, commentId: number): Promise<boolean>;
  unlikeTrailComment(userId: number, commentId: number): Promise<boolean>;
  getTrailCommentLikes(commentId: number): Promise<TrailCommentLike[]>;

  // Trail Progress methods
  getUserTrailProgress(userId: number, trailId: number): Promise<TrailProgress | undefined>;
  createOrUpdateTrailProgress(progress: InsertTrailProgress): Promise<TrailProgress>;
  getUserTrailProgresses(userId: number): Promise<(TrailProgress & { trail: Trail })[]>;

  // Feedback methods
  getAllFeedbacks(): Promise<(Feedback & { user?: User })[]>;
  getFeedback(id: number): Promise<(Feedback & { user?: User }) | undefined>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: number, updates: UpdateFeedback): Promise<Feedback | undefined>;
  deleteFeedback(id: number): Promise<boolean>;

  // Challenge Comment methods
  getChallengeComments(challengeId: number): Promise<(ChallengeComment & { user: User; replies: (ChallengeComment & { user: User; likeCount: number; isLikedByUser: boolean })[] ; likeCount: number; isLikedByUser: boolean })[]>;
  createChallengeComment(comment: InsertChallengeComment): Promise<ChallengeComment>;
  updateChallengeComment(id: number, commentData: Partial<InsertChallengeComment>): Promise<ChallengeComment | undefined>;
  deleteChallengeComment(id: number): Promise<boolean>;

  // Challenge Comment Like methods
  likeChallengeComment(userId: number, commentId: number): Promise<boolean>;
  unlikeChallengeComment(userId: number, commentId: number): Promise<boolean>;
  getChallengeCommentLikes(commentId: number): Promise<ChallengeCommentLike[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize database if needed
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Check if superadmin exists
      const superadmin = await this.getUserByEmail("conecta@cesurg.com");
      
      // If no superadmin, create one
      if (!superadmin) {
        await this.createUser({
          email: "conecta@cesurg.com",
          name: "Conecta Admin",
          role: "superadmin",
        });
        console.log("Superadmin user created");
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const normalizedEmail = email.toLowerCase();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail));
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleId));
      return user;
    } catch (error) {
      console.error("Error getting user by Google ID:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Ensure email is lowercase
      const normalizedUser = {
        ...insertUser,
        email: insertUser.email.toLowerCase(),
      };
      
      // Insert the user
      const [user] = await db
        .insert(users)
        .values(normalizedUser)
        .returning();
      
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  async createOrUpdateGoogleUser(insertUser: InsertGoogleUser): Promise<User> {
    try {
      // Check if user exists by email
      const existingUser = await this.getUserByEmail(insertUser.email);
      
      if (existingUser) {
        // Update existing user with Google ID
        const [updatedUser] = await db
          .update(users)
          .set({
            googleId: insertUser.googleId,
            photoUrl: insertUser.photoUrl || existingUser.photoUrl,
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        
        return updatedUser;
      }

      // Create new user
      const role = insertUser.email === "conecta@cesurg.com" ? "superadmin" : "user";
      const normalizedUser = {
        ...insertUser,
        email: insertUser.email.toLowerCase(),
        role,
      };
      
      const [user] = await db
        .insert(users)
        .values(normalizedUser)
        .returning();
      
      return user;
    } catch (error) {
      console.error("Error creating/updating Google user:", error);
      throw new Error("Failed to create or update Google user");
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user role:", error);
      return undefined;
    }
  }
  
  async updateUserStatus(id: number, isActive: boolean): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ isActive })
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user status:", error);
      return undefined;
    }
  }

  async updateExistingUserWithGoogleInfo(insertUser: InsertGoogleUser): Promise<User> {
    try {
      // Check if user exists by email
      const existingUser = await this.getUserByEmail(insertUser.email);
      
      if (!existingUser) {
        throw new Error(`Usuário com email ${insertUser.email} não está cadastrado`);
      }
      
      // Update existing user with Google ID and photo
      const [updatedUser] = await db
        .update(users)
        .set({
          googleId: insertUser.googleId,
          photoUrl: insertUser.photoUrl || existingUser.photoUrl,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user with Google info:", error);
      throw new Error("Failed to update user with Google information");
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      // Ensure email is lowercase if provided
      const normalizedData = userData.email
        ? { ...userData, email: userData.email.toLowerCase() }
        : userData;
        
      const [updatedUser] = await db
        .update(users)
        .set(normalizedData)
        .where(eq(users.id, id))
        .returning();
        
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  // Group methods
  async createGroup(group: InsertGroup): Promise<Group> {
    try {
      const [newGroup] = await db
        .insert(groups)
        .values(group)
        .returning();
      
      return newGroup;
    } catch (error) {
      console.error("Error creating group:", error);
      throw new Error("Failed to create group");
    }
  }

  async getAllGroups(): Promise<Group[]> {
    try {
      return await db.select().from(groups);
    } catch (error) {
      console.error("Error getting all groups:", error);
      return [];
    }
  }

  async getGroup(id: number): Promise<Group | undefined> {
    try {
      const [group] = await db.select().from(groups).where(eq(groups.id, id));
      return group;
    } catch (error) {
      console.error("Error getting group by ID:", error);
      return undefined;
    }
  }

  async updateGroup(id: number, groupData: Partial<InsertGroup>): Promise<Group | undefined> {
    try {
      const [updatedGroup] = await db
        .update(groups)
        .set(groupData)
        .where(eq(groups.id, id))
        .returning();
      
      return updatedGroup;
    } catch (error) {
      console.error("Error updating group:", error);
      return undefined;
    }
  }

  async deleteGroup(id: number): Promise<boolean> {
    try {
      const result = await db.delete(groups).where(eq(groups.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting group:", error);
      return false;
    }
  }

  // User Group relationship methods
  async addUserToGroup(userId: number, groupId: number): Promise<boolean> {
    try {
      // Check if user exists
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Check if group exists
      const group = await this.getGroup(groupId);
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }

      // Check if relation already exists
      const [existingRelation] = await db
        .select()
        .from(userGroups)
        .where(
          and(
            eq(userGroups.userId, userId),
            eq(userGroups.groupId, groupId)
          )
        );

      if (existingRelation) {
        return true; // Relation already exists
      }

      // Add user to group
      await db
        .insert(userGroups)
        .values({
          userId,
          groupId,
        });

      return true;
    } catch (error) {
      console.error("Error adding user to group:", error);
      return false;
    }
  }

  async removeUserFromGroup(userId: number, groupId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(userGroups)
        .where(
          and(
            eq(userGroups.userId, userId),
            eq(userGroups.groupId, groupId)
          )
        )
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error removing user from group:", error);
      return false;
    }
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    try {
      const userGroupRecords: { groupId: number }[] = await db
        .select({
          groupId: userGroups.groupId
        })
        .from(userGroups)
        .where(eq(userGroups.userId, userId));

      if (userGroupRecords.length === 0) {
        return [];
      }

      const groupIds = userGroupRecords.map((record: { groupId: number }) => record.groupId);
      
      // Using a more specialized query to get all groups that match the group IDs
      const groupsList = await Promise.all(
        groupIds.map(async (groupId: number) => {
          const [group] = await db
            .select()
            .from(groups)
            .where(eq(groups.id, groupId));
          return group;
        })
      );

      return groupsList.filter(Boolean) as Group[];
    } catch (error) {
      console.error("Error getting user groups:", error);
      return [];
    }
  }

  async getGroupUsers(groupId: number): Promise<User[]> {
    try {
      console.log(`Buscando usuários para o grupo ${groupId}`);
      
      // Usando um JOIN para obter todos os usuários de um grupo em uma única consulta
      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          photoUrl: users.photoUrl,
          googleId: users.googleId,
          createdAt: users.createdAt
        })
        .from(userGroups)
        .innerJoin(users, eq(userGroups.userId, users.id))
        .where(eq(userGroups.groupId, groupId));
      
      console.log(`Encontrados ${usersList.length} usuários no grupo ${groupId}`);
      
      return usersList as User[];
    } catch (error) {
      console.error("Error getting group users:", error);
      return [];
    }
  }

  // AI Agent methods
  async getAllAiAgents(): Promise<AiAgent[]> {
    try {
      return await db.select().from(aiAgents);
    } catch (error) {
      console.error("Error getting all AI agents:", error);
      return [];
    }
  }

  async getAiAgent(id: number): Promise<AiAgent | undefined> {
    try {
      const [agent] = await db
        .select()
        .from(aiAgents)
        .where(eq(aiAgents.id, id));
      
      return agent;
    } catch (error) {
      console.error("Error getting AI agent by ID:", error);
      return undefined;
    }
  }

  async createAiAgent(agent: InsertAiAgent): Promise<AiAgent> {
    try {
      const [newAgent] = await db
        .insert(aiAgents)
        .values(agent)
        .returning();
      
      return newAgent;
    } catch (error) {
      console.error("Error creating AI agent:", error);
      throw new Error("Failed to create AI agent");
    }
  }

  async updateAiAgent(id: number, agentData: Partial<InsertAiAgent>): Promise<AiAgent | undefined> {
    try {
      const [updatedAgent] = await db
        .update(aiAgents)
        .set(agentData)
        .where(eq(aiAgents.id, id))
        .returning();
      
      return updatedAgent;
    } catch (error) {
      console.error("Error updating AI agent:", error);
      return undefined;
    }
  }

  async deleteAiAgent(id: number): Promise<boolean> {
    try {
      // First, delete any agent-prompt relationships
      await db
        .delete(aiPromptAgents)
        .where(eq(aiPromptAgents.agentId, id));
      
      // Then, delete the agent
      const result = await db
        .delete(aiAgents)
        .where(eq(aiAgents.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting AI agent:", error);
      return false;
    }
  }

  // AI Prompt methods
  async getAllAiPrompts(userId?: number): Promise<AiPrompt[]> {
    try {
      if (userId) {
        // Return all prompts that are either public or created by the user
        return await db
          .select()
          .from(aiPrompts)
          .where(
            or(
              eq(aiPrompts.isPublic, true),
              eq(aiPrompts.creatorId, userId)
            )
          );
      }
      
      // Return all prompts
      return await db.select().from(aiPrompts);
    } catch (error) {
      console.error("Error getting AI prompts:", error);
      return [];
    }
  }

  async getPublicAiPrompts(): Promise<AiPrompt[]> {
    try {
      return await db
        .select()
        .from(aiPrompts)
        .where(eq(aiPrompts.isPublic, true));
    } catch (error) {
      console.error("Error getting public AI prompts:", error);
      return [];
    }
  }

  async getAiPrompt(id: number): Promise<AiPrompt | undefined> {
    try {
      const [prompt] = await db
        .select()
        .from(aiPrompts)
        .where(eq(aiPrompts.id, id));
      
      return prompt;
    } catch (error) {
      console.error("Error getting AI prompt by ID:", error);
      return undefined;
    }
  }

  async createAiPrompt(prompt: InsertAiPrompt): Promise<AiPrompt> {
    try {
      const [newPrompt] = await db
        .insert(aiPrompts)
        .values(prompt)
        .returning();
      
      return newPrompt;
    } catch (error) {
      console.error("Error creating AI prompt:", error);
      throw new Error("Failed to create AI prompt");
    }
  }

  async updateAiPrompt(id: number, promptData: Partial<InsertAiPrompt>): Promise<AiPrompt | undefined> {
    try {
      const [updatedPrompt] = await db
        .update(aiPrompts)
        .set(promptData)
        .where(eq(aiPrompts.id, id))
        .returning();
      
      return updatedPrompt;
    } catch (error) {
      console.error("Error updating AI prompt:", error);
      return undefined;
    }
  }

  async deleteAiPrompt(id: number): Promise<boolean> {
    try {
      // First, delete any prompt-agent relationships
      await db
        .delete(aiPromptAgents)
        .where(eq(aiPromptAgents.promptId, id));
      
      // Then, delete the prompt
      const result = await db
        .delete(aiPrompts)
        .where(eq(aiPrompts.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting AI prompt:", error);
      return false;
    }
  }

  // AI Prompt-Agent relationship methods
  async assignPromptToAgent(promptId: number, agentId: number): Promise<boolean> {
    try {
      // Check if the relationship already exists
      const [existingRelation] = await db
        .select()
        .from(aiPromptAgents)
        .where(
          and(
            eq(aiPromptAgents.promptId, promptId),
            eq(aiPromptAgents.agentId, agentId)
          )
        );
      
      if (existingRelation) {
        return true; // Relationship already exists
      }
      
      // Create the relationship
      await db
        .insert(aiPromptAgents)
        .values({
          promptId,
          agentId
        });
      
      return true;
    } catch (error) {
      console.error("Error assigning prompt to agent:", error);
      return false;
    }
  }

  async removePromptFromAgent(promptId: number, agentId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(aiPromptAgents)
        .where(
          and(
            eq(aiPromptAgents.promptId, promptId),
            eq(aiPromptAgents.agentId, agentId)
          )
        )
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error removing prompt from agent:", error);
      return false;
    }
  }

  async removeAllPromptAgentAssignments(promptId: number): Promise<boolean> {
    try {
      await db
        .delete(aiPromptAgents)
        .where(eq(aiPromptAgents.promptId, promptId));
      
      return true;
    } catch (error) {
      console.error("Error removing all prompt-agent assignments:", error);
      return false;
    }
  }

  async getAgentPrompts(agentId: number): Promise<AiPrompt[]> {
    try {
      const relations = await db
        .select()
        .from(aiPromptAgents)
        .where(eq(aiPromptAgents.agentId, agentId));
      
      if (relations.length === 0) {
        return [];
      }
      
      const promptIds = relations.map(r => r.promptId);
      
      return await db
        .select()
        .from(aiPrompts)
        .where(inArray(aiPrompts.id, promptIds));
    } catch (error) {
      console.error("Error getting agent prompts:", error);
      return [];
    }
  }

  // AI Conversation methods
  async getUserAiConversations(userId: number): Promise<(AiConversation & { agent: AiAgent })[]> {
    try {
      const conversations = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.userId, userId))
        .orderBy(desc(aiConversations.lastMessageAt));
      
      // Fetch the associated agent for each conversation
      const result: (AiConversation & { agent: AiAgent })[] = [];
      
      for (const conversation of conversations) {
        const [agent] = await db
          .select()
          .from(aiAgents)
          .where(eq(aiAgents.id, conversation.agentId));
        
        if (agent) {
          result.push({
            ...conversation,
            agent
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error getting user AI conversations:", error);
      return [];
    }
  }

  async getAiConversation(id: number): Promise<AiConversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, id));
      
      return conversation;
    } catch (error) {
      console.error("Error getting AI conversation by ID:", error);
      return undefined;
    }
  }

  async createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    try {
      const [newConversation] = await db
        .insert(aiConversations)
        .values(conversation)
        .returning();
      
      return newConversation;
    } catch (error) {
      console.error("Error creating AI conversation:", error);
      throw new Error("Failed to create AI conversation");
    }
  }

  async updateAiConversationLastMessage(id: number, preview: string): Promise<boolean> {
    try {
      const now = new Date();
      const result = await db
        .update(aiConversations)
        .set({
          lastMessageAt: now
        })
        .where(eq(aiConversations.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error updating AI conversation last message:", error);
      return false;
    }
  }

  async deleteAiConversation(id: number): Promise<boolean> {
    try {
      // First, delete all messages in the conversation
      await db
        .delete(aiMessages)
        .where(eq(aiMessages.conversationId, id));
      
      // Then, delete the conversation
      const result = await db
        .delete(aiConversations)
        .where(eq(aiConversations.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting AI conversation:", error);
      return false;
    }
  }

  // AI Message methods
  async getAiConversationMessages(conversationId: number): Promise<AiMessage[]> {
    try {
      return await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .orderBy(asc(aiMessages.createdAt));
    } catch (error) {
      console.error("Error getting AI conversation messages:", error);
      return [];
    }
  }

  async createAiMessage(message: InsertAiMessage): Promise<AiMessage> {
    try {
      const [newMessage] = await db
        .insert(aiMessages)
        .values(message)
        .returning();
      
      return newMessage;
    } catch (error) {
      console.error("Error creating AI message:", error);
      throw new Error("Failed to create AI message");
    }
  }

  // Utility Links methods
  async getAllUtilityLinks(): Promise<UtilityLink[]> {
    try {
      return await db.select().from(utilityLinks).orderBy(utilityLinks.order);
    } catch (error) {
      console.error("Error getting all utility links:", error);
      return [];
    }
  }

  async getUtilityLink(id: number): Promise<UtilityLink | undefined> {
    try {
      const [link] = await db.select().from(utilityLinks).where(eq(utilityLinks.id, id));
      return link;
    } catch (error) {
      console.error("Error getting utility link by ID:", error);
      return undefined;
    }
  }

  async createUtilityLink(link: InsertUtilityLink): Promise<UtilityLink> {
    try {
      const [newLink] = await db
        .insert(utilityLinks)
        .values(link)
        .returning();
      
      return newLink;
    } catch (error) {
      console.error("Error creating utility link:", error);
      throw new Error("Failed to create utility link");
    }
  }

  async updateUtilityLink(id: number, linkData: Partial<InsertUtilityLink>): Promise<UtilityLink | undefined> {
    try {
      const [updatedLink] = await db
        .update(utilityLinks)
        .set(linkData)
        .where(eq(utilityLinks.id, id))
        .returning();
      
      return updatedLink;
    } catch (error) {
      console.error("Error updating utility link:", error);
      return undefined;
    }
  }

  async deleteUtilityLink(id: number): Promise<boolean> {
    try {
      const result = await db.delete(utilityLinks).where(eq(utilityLinks.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting utility link:", error);
      return false;
    }
  }
  
  // Calendar Event methods
  async getCalendarEvents(includeInactive: boolean = false): Promise<CalendarEvent[]> {
    try {
      let query = db.select().from(calendarEvents);
      
      if (!includeInactive) {
        query = query.where(eq(calendarEvents.isActive, true));
      }
      
      return await query.orderBy(desc(calendarEvents.eventDate));
    } catch (error) {
      console.error("Error getting all calendar events:", error);
      return [];
    }
  }
  
  async getUpcomingCalendarEvents(startDate: string, endDate: string, limit?: number): Promise<CalendarEvent[]> {
    try {
      // Usar o Drizzle ORM em vez do SQL direto
      let query = db.select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.isActive, true),
            gte(calendarEvents.eventDate, startDate),
            lte(calendarEvents.eventDate, endDate)
          )
        )
        .orderBy(asc(calendarEvents.eventDate));
      
      // Aplicar limite se especificado
      if (limit !== undefined) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      console.error("Error getting upcoming calendar events:", error);
      return [];
    }
  }
  
  async getCalendarEventById(id: number): Promise<CalendarEvent | undefined> {
    try {
      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, id));
      
      return event;
    } catch (error) {
      console.error("Error getting calendar event by ID:", error);
      return undefined;
    }
  }
  
  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    try {
      const [newEvent] = await db
        .insert(calendarEvents)
        .values(event)
        .returning();
      
      return newEvent;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw new Error("Failed to create calendar event");
    }
  }
  
  async updateCalendarEvent(id: number, eventData: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    try {
      const [updatedEvent] = await db
        .update(calendarEvents)
        .set(eventData)
        .where(eq(calendarEvents.id, id))
        .returning();
      
      return updatedEvent;
    } catch (error) {
      console.error("Error updating calendar event:", error);
      return undefined;
    }
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(calendarEvents)
        .where(eq(calendarEvents.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      return false;
    }
  }

  // News Category methods
  async getAllNewsCategories(): Promise<NewsCategory[]> {
    try {
      return await db.select().from(newsCategories);
    } catch (error) {
      console.error("Error getting all news categories:", error);
      return [];
    }
  }

  async getNewsCategory(id: number): Promise<NewsCategory | undefined> {
    try {
      const [category] = await db
        .select()
        .from(newsCategories)
        .where(eq(newsCategories.id, id));
      
      return category;
    } catch (error) {
      console.error("Error getting news category by ID:", error);
      return undefined;
    }
  }

  async createNewsCategory(category: InsertNewsCategory): Promise<NewsCategory> {
    try {
      const [newCategory] = await db
        .insert(newsCategories)
        .values(category)
        .returning();
      
      return newCategory;
    } catch (error) {
      console.error("Error creating news category:", error);
      throw new Error("Failed to create news category");
    }
  }

  async updateNewsCategory(id: number, categoryData: Partial<InsertNewsCategory>): Promise<NewsCategory | undefined> {
    try {
      const [updatedCategory] = await db
        .update(newsCategories)
        .set(categoryData)
        .where(eq(newsCategories.id, id))
        .returning();
      
      return updatedCategory;
    } catch (error) {
      console.error("Error updating news category:", error);
      return undefined;
    }
  }

  async deleteNewsCategory(id: number): Promise<boolean> {
    try {
      const result = await db.delete(newsCategories).where(eq(newsCategories.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting news category:", error);
      return false;
    }
  }

  // News methods
  async getAllNews(includeUnpublished: boolean = false): Promise<(News & { category?: NewsCategory })[]> {
    try {
      const query = db
        .select({
          ...news,
          category: newsCategories
        })
        .from(news)
        .leftJoin(newsCategories, eq(news.categoryId, newsCategories.id))
        .orderBy(desc(news.createdAt));
      
      if (!includeUnpublished) {
        query.where(eq(news.isPublished, true));
      }
      
      const results = await query;
      
      return results.map(item => ({
        ...item,
        category: item.category || undefined
      }));
    } catch (error) {
      console.error("Error getting all news:", error);
      return [];
    }
  }

  async getLatestNews(limit: number): Promise<(News & { category?: NewsCategory })[]> {
    try {
      const results = await db
        .select({
          ...news,
          category: newsCategories
        })
        .from(news)
        .leftJoin(newsCategories, eq(news.categoryId, newsCategories.id))
        .where(eq(news.isPublished, true))
        .orderBy(desc(news.publishedAt), desc(news.createdAt))
        .limit(limit);
      
      return results.map(item => ({
        ...item,
        category: item.category || undefined
      }));
    } catch (error) {
      console.error("Error getting latest news:", error);
      return [];
    }
  }

  async getNewsById(id: number): Promise<(News & { category?: NewsCategory }) | undefined> {
    try {
      const [result] = await db
        .select({
          ...news,
          category: newsCategories
        })
        .from(news)
        .leftJoin(newsCategories, eq(news.categoryId, newsCategories.id))
        .where(eq(news.id, id));
      
      if (!result) return undefined;
      
      return {
        ...result,
        category: result.category || undefined
      };
    } catch (error) {
      console.error("Error getting news by ID:", error);
      return undefined;
    }
  }

  async getNewsBySourceUrl(sourceUrl: string): Promise<News | undefined> {
    try {
      const [result] = await db
        .select()
        .from(news)
        .where(eq(news.sourceUrl, sourceUrl));
      
      return result;
    } catch (error) {
      console.error("Error getting news by source URL:", error);
      return undefined;
    }
  }

  async createNews(newsItem: InsertNews): Promise<News> {
    try {
      const [newNews] = await db
        .insert(news)
        .values(newsItem)
        .returning();
      
      return newNews;
    } catch (error) {
      console.error("Error creating news:", error);
      throw new Error("Failed to create news");
    }
  }

  async updateNews(id: number, newsData: Partial<InsertNews>): Promise<News | undefined> {
    try {
      const [updatedNews] = await db
        .update(news)
        .set(newsData)
        .where(eq(news.id, id))
        .returning();
      
      return updatedNews;
    } catch (error) {
      console.error("Error updating news:", error);
      return undefined;
    }
  }

  async publishNews(id: number): Promise<News | undefined> {
    try {
      const [publishedNews] = await db
        .update(news)
        .set({ 
          isPublished: true,
          publishedAt: new Date()
        })
        .where(eq(news.id, id))
        .returning();
      
      return publishedNews;
    } catch (error) {
      console.error("Error publishing news:", error);
      return undefined;
    }
  }

  async unpublishNews(id: number): Promise<News | undefined> {
    try {
      const [unpublishedNews] = await db
        .update(news)
        .set({ 
          isPublished: false,
          publishedAt: null
        })
        .where(eq(news.id, id))
        .returning();
      
      return unpublishedNews;
    } catch (error) {
      console.error("Error unpublishing news:", error);
      return undefined;
    }
  }

  async deleteNews(id: number): Promise<boolean> {
    try {
      const result = await db.delete(news).where(eq(news.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting news:", error);
      return false;
    }
  }

  // Announcement methods
  async getAllAnnouncements(includeInactive?: boolean): Promise<(Announcement & { creator: User })[]> {
    try {
      const query = db
        .select({
          announcement: announcements,
          creator: users,
        })
        .from(announcements)
        .leftJoin(users, eq(announcements.creatorId, users.id))
        .orderBy(desc(announcements.createdAt));

      if (!includeInactive) {
        query.where(eq(announcements.isActive, true));
      }

      const results = await query;
      return results.map((result: any) => ({
        ...result.announcement,
        creator: result.creator,
      }));
    } catch (error) {
      console.error("Error getting announcements:", error);
      return [];
    }
  }

  async getActiveAnnouncements(limit?: number): Promise<(Announcement & { creator: User })[]> {
    try {
      const now = new Date();
      
      let query = db
        .select({
          announcement: announcements,
          creator: users,
        })
        .from(announcements)
        .leftJoin(users, eq(announcements.creatorId, users.id))
        .where(
          and(
            eq(announcements.isActive, true),
            lte(announcements.startDate, now),
            or(
              isNull(announcements.endDate),
              gte(announcements.endDate, now)
            )
          )
        )
        .orderBy(desc(announcements.createdAt));

      if (limit) {
        query = query.limit(limit);
      }

      const results = await query;
      
      return results.map((result: any) => ({
        ...result.announcement,
        creator: result.creator,
      }));
    } catch (error) {
      console.error("Error getting active announcements:", error);
      return [];
    }
  }

  async getAnnouncementById(id: number): Promise<(Announcement & { creator: User }) | undefined> {
    try {
      const [result] = await db
        .select({
          announcement: announcements,
          creator: users,
        })
        .from(announcements)
        .leftJoin(users, eq(announcements.creatorId, users.id))
        .where(eq(announcements.id, id));

      if (!result) return undefined;

      return {
        ...result.announcement,
        creator: result.creator,
      };
    } catch (error) {
      console.error("Error getting announcement by ID:", error);
      return undefined;
    }
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    try {
      const [newAnnouncement] = await db
        .insert(announcements)
        .values(announcement)
        .returning();
      
      return newAnnouncement;
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
  }

  async updateAnnouncement(id: number, announcementData: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    try {
      const [updatedAnnouncement] = await db
        .update(announcements)
        .set(announcementData)
        .where(eq(announcements.id, id))
        .returning();
      
      return updatedAnnouncement;
    } catch (error) {
      console.error("Error updating announcement:", error);
      return undefined;
    }
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    try {
      const result = await db.delete(announcements).where(eq(announcements.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting announcement:", error);
      return false;
    }
  }

  // Material Folder methods
  async getAllMaterialFolders(userId?: number): Promise<(MaterialFolder & { creator: User; parent?: MaterialFolder; children?: MaterialFolder[]; files?: MaterialFile[] })[]> {
    try {
      const query = db
        .select({
          folder: materialFolders,
          creator: users,
        })
        .from(materialFolders)
        .leftJoin(users, eq(materialFolders.creatorId, users.id));

      const results = await query;
      
      // Transform results to include nested structure
      return results.map((result: any) => ({
        ...result.folder,
        creator: result.creator,
        children: [], // Will be populated by frontend if needed
        files: [], // Will be populated by frontend if needed
      }));
    } catch (error) {
      console.error("Error getting material folders:", error);
      return [];
    }
  }

  async getMaterialFolder(id: number): Promise<(MaterialFolder & { creator: User; parent?: MaterialFolder; children?: MaterialFolder[]; files?: MaterialFile[] }) | undefined> {
    try {
      const folderQuery = db
        .select({
          folder: materialFolders,
          creator: users,
        })
        .from(materialFolders)
        .leftJoin(users, eq(materialFolders.creatorId, users.id))
        .where(eq(materialFolders.id, id));

      const [folderResult] = await folderQuery;
      
      if (!folderResult) return undefined;

      // Get children folders
      const childrenQuery = db
        .select()
        .from(materialFolders)
        .where(eq(materialFolders.parentId, id));
      
      const children = await childrenQuery;

      // Get files in this folder
      const filesQuery = db
        .select({
          file: materialFiles,
          uploader: users,
        })
        .from(materialFiles)
        .leftJoin(users, eq(materialFiles.uploaderId, users.id))
        .where(eq(materialFiles.folderId, id));
      
      const filesResults = await filesQuery;
      const files = filesResults.map((result: any) => ({
        ...result.file,
        uploader: result.uploader,
      }));

      return {
        ...folderResult.folder,
        creator: folderResult.creator,
        children,
        files,
      };
    } catch (error) {
      console.error("Error getting material folder:", error);
      return undefined;
    }
  }

  async createMaterialFolder(folder: InsertMaterialFolder): Promise<MaterialFolder> {
    try {
      const [newFolder] = await db
        .insert(materialFolders)
        .values(folder)
        .returning();
      
      return newFolder;
    } catch (error) {
      console.error("Error creating material folder:", error);
      throw new Error("Failed to create material folder");
    }
  }

  async updateMaterialFolder(id: number, folderData: Partial<InsertMaterialFolder>): Promise<MaterialFolder | undefined> {
    try {
      const [updatedFolder] = await db
        .update(materialFolders)
        .set(folderData)
        .where(eq(materialFolders.id, id))
        .returning();
      
      return updatedFolder;
    } catch (error) {
      console.error("Error updating material folder:", error);
      return undefined;
    }
  }

  async deleteMaterialFolder(id: number): Promise<boolean> {
    try {
      const result = await db.delete(materialFolders).where(eq(materialFolders.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting material folder:", error);
      return false;
    }
  }

  // Material File methods
  async getAllMaterialFiles(folderId?: number): Promise<(MaterialFile & { folder?: MaterialFolder; uploader: User })[]> {
    try {
      let query = db
        .select({
          file: materialFiles,
          folder: materialFolders,
          uploader: users,
        })
        .from(materialFiles)
        .leftJoin(materialFolders, eq(materialFiles.folderId, materialFolders.id))
        .leftJoin(users, eq(materialFiles.uploaderId, users.id));

      if (folderId) {
        query = query.where(eq(materialFiles.folderId, folderId));
      }

      const results = await query;
      
      return results.map((result: any) => ({
        ...result.file,
        folder: result.folder,
        uploader: result.uploader,
      }));
    } catch (error) {
      console.error("Error getting material files:", error);
      return [];
    }
  }

  async getMaterialFile(id: number): Promise<(MaterialFile & { folder?: MaterialFolder; uploader: User }) | undefined> {
    try {
      const query = db
        .select({
          file: materialFiles,
          folder: materialFolders,
          uploader: users,
        })
        .from(materialFiles)
        .leftJoin(materialFolders, eq(materialFiles.folderId, materialFolders.id))
        .leftJoin(users, eq(materialFiles.uploaderId, users.id))
        .where(eq(materialFiles.id, id));

      const [result] = await query;
      
      if (!result) return undefined;

      return {
        ...result.file,
        folder: result.folder,
        uploader: result.uploader,
      };
    } catch (error) {
      console.error("Error getting material file:", error);
      return undefined;
    }
  }

  async createMaterialFile(file: InsertMaterialFile): Promise<MaterialFile> {
    try {
      const [newFile] = await db
        .insert(materialFiles)
        .values(file)
        .returning();
      
      return newFile;
    } catch (error) {
      console.error("Error creating material file:", error);
      throw new Error("Failed to create material file");
    }
  }

  async updateMaterialFile(id: number, fileData: Partial<InsertMaterialFile>): Promise<MaterialFile | undefined> {
    try {
      const [updatedFile] = await db
        .update(materialFiles)
        .set(fileData)
        .where(eq(materialFiles.id, id))
        .returning();
      
      return updatedFile;
    } catch (error) {
      console.error("Error updating material file:", error);
      return undefined;
    }
  }

  async deleteMaterialFile(id: number): Promise<boolean> {
    try {
      const result = await db.delete(materialFiles).where(eq(materialFiles.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting material file:", error);
      return false;
    }
  }

  async incrementDownloadCount(id: number): Promise<boolean> {
    try {
      const result = await db
        .update(materialFiles)
        .set({ downloadCount: materialFiles.downloadCount + 1 })
        .where(eq(materialFiles.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error incrementing download count:", error);
      return false;
    }
  }

  // User Category methods
  async getAllUserCategories(): Promise<UserCategory[]> {
    try {
      return await db.select().from(userCategories).orderBy(userCategories.name);
    } catch (error) {
      console.error("Error getting all user categories:", error);
      return [];
    }
  }

  async getUserCategory(id: number): Promise<UserCategory | undefined> {
    try {
      const [category] = await db.select().from(userCategories).where(eq(userCategories.id, id));
      return category;
    } catch (error) {
      console.error("Error getting user category:", error);
      return undefined;
    }
  }

  async createUserCategory(category: InsertUserCategory): Promise<UserCategory> {
    try {
      const [newCategory] = await db
        .insert(userCategories)
        .values(category)
        .returning();
      
      return newCategory;
    } catch (error) {
      console.error("Error creating user category:", error);
      throw new Error("Failed to create user category");
    }
  }

  async updateUserCategory(id: number, categoryData: Partial<InsertUserCategory>): Promise<UserCategory | undefined> {
    try {
      const [updatedCategory] = await db
        .update(userCategories)
        .set(categoryData)
        .where(eq(userCategories.id, id))
        .returning();
      
      return updatedCategory;
    } catch (error) {
      console.error("Error updating user category:", error);
      return undefined;
    }
  }

  async deleteUserCategory(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(userCategories)
        .where(eq(userCategories.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting user category:", error);
      return false;
    }
  }

  // Trail Category methods
  async getAllTrailCategories(): Promise<TrailCategory[]> {
    try {
      return await db.select().from(trailCategories).where(eq(trailCategories.isActive, true)).orderBy(trailCategories.name);
    } catch (error) {
      console.error("Error getting all trail categories:", error);
      return [];
    }
  }

  async getTrailCategory(id: number): Promise<TrailCategory | undefined> {
    try {
      const [category] = await db.select().from(trailCategories).where(eq(trailCategories.id, id));
      return category;
    } catch (error) {
      console.error("Error getting trail category:", error);
      return undefined;
    }
  }

  async createTrailCategory(category: InsertTrailCategory): Promise<TrailCategory> {
    try {
      const [newCategory] = await db
        .insert(trailCategories)
        .values(category)
        .returning();
      
      return newCategory;
    } catch (error) {
      console.error("Error creating trail category:", error);
      throw new Error("Failed to create trail category");
    }
  }

  async updateTrailCategory(id: number, categoryData: Partial<InsertTrailCategory>): Promise<TrailCategory | undefined> {
    try {
      const [updatedCategory] = await db
        .update(trailCategories)
        .set(categoryData)
        .where(eq(trailCategories.id, id))
        .returning();
      
      return updatedCategory;
    } catch (error) {
      console.error("Error updating trail category:", error);
      return undefined;
    }
  }

  async deleteTrailCategory(id: number): Promise<boolean> {
    try {
      const result = await db.delete(trailCategories).where(eq(trailCategories.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting trail category:", error);
      return false;
    }
  }

  // Trail methods
  async getAllTrails(includeUnpublished?: boolean): Promise<(Trail & { category?: TrailCategory; creator: User; contentCount: number })[]> {
    try {
      const query = db
        .select({
          trail: trails,
          category: trailCategories,
          creator: users,
          contentCount: sql<number>`COALESCE(content_counts.count, 0)`.as('contentCount'),
        })
        .from(trails)
        .leftJoin(trailCategories, eq(trails.categoryId, trailCategories.id))
        .leftJoin(users, eq(trails.creatorId, users.id))
        .leftJoin(
          sql`(
            SELECT trail_id, COUNT(*) as count 
            FROM trail_contents 
            WHERE is_draft = false 
            GROUP BY trail_id
          ) as content_counts`,
          sql`content_counts.trail_id = ${trails.id}`
        )
        .where(
          and(
            eq(trails.isActive, true),
            includeUnpublished ? undefined : eq(trails.isPublished, true)
          )
        )
        .orderBy(trails.order, trails.createdAt);

      const results = await query;
      
      return results.map((result: any) => ({
        ...result.trail,
        category: result.category,
        creator: result.creator,
        contentCount: result.contentCount,
      }));
    } catch (error) {
      console.error("Error getting all trails:", error);
      return [];
    }
  }

  async getTrail(id: number): Promise<(Trail & { category?: TrailCategory; creator: User; contents: TrailContent[] }) | undefined> {
    try {
      const trailQuery = db
        .select({
          trail: trails,
          category: trailCategories,
          creator: users,
        })
        .from(trails)
        .leftJoin(trailCategories, eq(trails.categoryId, trailCategories.id))
        .leftJoin(users, eq(trails.creatorId, users.id))
        .where(eq(trails.id, id));

      const [trailResult] = await trailQuery;
      
      if (!trailResult) return undefined;

      const contentsQuery = db
        .select()
        .from(trailContents)
        .where(
          and(
            eq(trailContents.trailId, id),
            eq(trailContents.isDraft, false)
          )
        )
        .orderBy(trailContents.order, trailContents.createdAt);

      const contents = await contentsQuery;

      return {
        ...trailResult.trail,
        category: trailResult.category,
        creator: trailResult.creator,
        contents,
      };
    } catch (error) {
      console.error("Error getting trail:", error);
      return undefined;
    }
  }

  async createTrail(trail: InsertTrail): Promise<Trail> {
    try {
      const [newTrail] = await db
        .insert(trails)
        .values(trail)
        .returning();
      
      return newTrail;
    } catch (error) {
      console.error("Error creating trail:", error);
      throw new Error("Failed to create trail");
    }
  }

  async updateTrail(id: number, trailData: Partial<InsertTrail>): Promise<Trail | undefined> {
    try {
      const [updatedTrail] = await db
        .update(trails)
        .set(trailData)
        .where(eq(trails.id, id))
        .returning();
      
      return updatedTrail;
    } catch (error) {
      console.error("Error updating trail:", error);
      return undefined;
    }
  }

  async deleteTrail(id: number): Promise<boolean> {
    try {
      const result = await db.delete(trails).where(eq(trails.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting trail:", error);
      return false;
    }
  }

  async incrementTrailViewCount(id: number): Promise<boolean> {
    try {
      const result = await db
        .update(trails)
        .set({ viewCount: sql`${trails.viewCount} + 1` })
        .where(eq(trails.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error incrementing trail view count:", error);
      return false;
    }
  }

  // Trail Content methods
  async getTrailContents(trailId: number, includeDrafts?: boolean): Promise<TrailContent[]> {
    try {
      const query = db
        .select()
        .from(trailContents)
        .where(
          and(
            eq(trailContents.trailId, trailId),
            includeDrafts ? undefined : eq(trailContents.isDraft, false)
          )
        )
        .orderBy(trailContents.order, trailContents.createdAt);

      return await query;
    } catch (error) {
      console.error("Error getting trail contents:", error);
      return [];
    }
  }

  async getTrailContent(id: number): Promise<(TrailContent & { trail: Trail; commentsCount: number }) | undefined> {
    try {
      const contentQuery = db
        .select({
          content: trailContents,
          trail: trails,
          commentsCount: sql<number>`COALESCE(comment_counts.count, 0)`.as('commentsCount'),
        })
        .from(trailContents)
        .leftJoin(trails, eq(trailContents.trailId, trails.id))
        .leftJoin(
          sql`(
            SELECT content_id, COUNT(*) as count 
            FROM trail_comments 
            GROUP BY content_id
          ) as comment_counts`,
          sql`comment_counts.content_id = ${trailContents.id}`
        )
        .where(eq(trailContents.id, id));

      const [result] = await contentQuery;
      
      if (!result) return undefined;

      return {
        ...result.content,
        trail: result.trail,
        commentsCount: result.commentsCount,
      };
    } catch (error) {
      console.error("Error getting trail content:", error);
      return undefined;
    }
  }

  async createTrailContent(content: InsertTrailContent): Promise<TrailContent> {
    try {
      const [newContent] = await db
        .insert(trailContents)
        .values(content)
        .returning();
      
      return newContent;
    } catch (error) {
      console.error("Error creating trail content:", error);
      throw new Error("Failed to create trail content");
    }
  }

  async updateTrailContent(id: number, contentData: Partial<InsertTrailContent>): Promise<TrailContent | undefined> {
    try {
      const [updatedContent] = await db
        .update(trailContents)
        .set(contentData)
        .where(eq(trailContents.id, id))
        .returning();
      
      return updatedContent;
    } catch (error) {
      console.error("Error updating trail content:", error);
      return undefined;
    }
  }

  async deleteTrailContent(id: number): Promise<boolean> {
    try {
      const result = await db.delete(trailContents).where(eq(trailContents.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting trail content:", error);
      return false;
    }
  }

  async incrementTrailContentViewCount(id: number): Promise<boolean> {
    try {
      const result = await db
        .update(trailContents)
        .set({ viewCount: sql`${trailContents.viewCount} + 1` })
        .where(eq(trailContents.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error incrementing trail content view count:", error);
      return false;
    }
  }

  // Trail Comment methods
  async getTrailComments(contentId: number, userId?: number): Promise<(TrailComment & { user: User; replies: (TrailComment & { user: User; likeCount: number; isLikedByUser: boolean })[] ; likeCount: number; isLikedByUser: boolean })[]> {
    try {
      const commentsQuery = db
        .select({
          comment: trailComments,
          user: users,
        })
        .from(trailComments)
        .leftJoin(users, eq(trailComments.userId, users.id))
        .where(and(eq(trailComments.contentId, contentId), isNull(trailComments.parentId)))
        .orderBy(trailComments.createdAt);

      const comments = await commentsQuery;

      const commentsWithReplies = await Promise.all(
        comments.map(async (comment: any) => {
          // Get likes for this comment
          const likes = await db
            .select()
            .from(trailCommentLikes)
            .where(eq(trailCommentLikes.commentId, comment.comment.id));

          // Check if current user liked this comment
          const isLikedByUser = userId ? likes.some(like => like.userId === userId) : false;

          // Get replies for this comment
          const repliesQuery = db
            .select({
              comment: trailComments,
              user: users,
            })
            .from(trailComments)
            .leftJoin(users, eq(trailComments.userId, users.id))
            .where(eq(trailComments.parentId, comment.comment.id))
            .orderBy(trailComments.createdAt);

          const replies = await repliesQuery;

          const repliesWithLikes = await Promise.all(
            replies.map(async (reply: any) => {
              const replyLikes = await db
                .select()
                .from(trailCommentLikes)
                .where(eq(trailCommentLikes.commentId, reply.comment.id));

              const isReplyLikedByUser = userId ? replyLikes.some(like => like.userId === userId) : false;

              return {
                ...reply.comment,
                user: reply.user,
                likeCount: replyLikes.length,
                isLikedByUser: isReplyLikedByUser,
              };
            })
          );

          return {
            ...comment.comment,
            user: comment.user,
            likeCount: likes.length,
            isLikedByUser: isLikedByUser,
            replies: repliesWithLikes,
          };
        })
      );

      return commentsWithReplies;
    } catch (error) {
      console.error("Error getting trail comments:", error);
      return [];
    }
  }

  async createTrailComment(comment: InsertTrailComment): Promise<TrailComment> {
    try {
      const [newComment] = await db
        .insert(trailComments)
        .values(comment)
        .returning();
      
      return newComment;
    } catch (error) {
      console.error("Error creating trail comment:", error);
      throw new Error("Failed to create trail comment");
    }
  }

  async updateTrailComment(id: number, commentData: Partial<InsertTrailComment>): Promise<TrailComment | undefined> {
    try {
      const [updatedComment] = await db
        .update(trailComments)
        .set(commentData)
        .where(eq(trailComments.id, id))
        .returning();
      
      return updatedComment;
    } catch (error) {
      console.error("Error updating trail comment:", error);
      return undefined;
    }
  }

  async deleteTrailComment(id: number): Promise<boolean> {
    try {
      // Primeiro, deletar as curtidas dos comentários filhos
      const childComments = await db
        .select()
        .from(trailComments)
        .where(eq(trailComments.parentId, id));
      
      for (const childComment of childComments) {
        await db.delete(trailCommentLikes).where(eq(trailCommentLikes.commentId, childComment.id));
      }
      
      // Deletar comentários filhos
      await db.delete(trailComments).where(eq(trailComments.parentId, id));
      
      // Deletar curtidas do comentário principal
      await db.delete(trailCommentLikes).where(eq(trailCommentLikes.commentId, id));
      
      // Deletar o comentário principal
      const result = await db.delete(trailComments).where(eq(trailComments.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting trail comment:", error);
      return false;
    }
  }

  // Trail Comment Like methods
  async likeTrailComment(userId: number, commentId: number): Promise<boolean> {
    try {
      await db
        .insert(trailCommentLikes)
        .values({ userId, commentId })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error("Error liking trail comment:", error);
      return false;
    }
  }

  async unlikeTrailComment(userId: number, commentId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(trailCommentLikes)
        .where(and(eq(trailCommentLikes.userId, userId), eq(trailCommentLikes.commentId, commentId)))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error unliking trail comment:", error);
      return false;
    }
  }

  async getTrailCommentLikes(commentId: number): Promise<TrailCommentLike[]> {
    try {
      const likes = await db
        .select()
        .from(trailCommentLikes)
        .where(eq(trailCommentLikes.commentId, commentId));
      return likes;
    } catch (error) {
      console.error("Error getting trail comment likes:", error);
      return [];
    }
  }

  // Trail Progress methods
  async getUserTrailProgress(userId: number, trailId: number): Promise<TrailProgress | undefined> {
    try {
      const [progress] = await db
        .select()
        .from(trailProgress)
        .where(and(eq(trailProgress.userId, userId), eq(trailProgress.trailId, trailId)));
      
      return progress;
    } catch (error) {
      console.error("Error getting user trail progress:", error);
      return undefined;
    }
  }

  async createOrUpdateTrailProgress(progress: InsertTrailProgress): Promise<TrailProgress> {
    try {
      const [result] = await db
        .insert(trailProgress)
        .values(progress)
        .onConflictDoUpdate({
          target: [trailProgress.userId, trailProgress.trailId],
          set: {
            completedContents: progress.completedContents,
            lastAccessed: sql`now()`,
            completionPercentage: progress.completionPercentage,
            updatedAt: sql`now()`,
          },
        })
        .returning();
      
      return result;
    } catch (error) {
      console.error("Error creating or updating trail progress:", error);
      throw new Error("Failed to create or update trail progress");
    }
  }

  async getUserTrailProgresses(userId: number): Promise<(TrailProgress & { trail: Trail })[]> {
    try {
      const query = db
        .select({
          progress: trailProgress,
          trail: trails,
        })
        .from(trailProgress)
        .leftJoin(trails, eq(trailProgress.trailId, trails.id))
        .where(eq(trailProgress.userId, userId))
        .orderBy(trailProgress.lastAccessed);

      const results = await query;
      
      return results.map((result: any) => ({
        ...result.progress,
        trail: result.trail,
      }));
    } catch (error) {
      console.error("Error getting user trail progresses:", error);
      return [];
    }
  }

  // Feedback methods
  async getAllFeedbacks(): Promise<(Feedback & { user?: User })[]> {
    try {
      const results = await db
        .select({
          feedback: feedbacks,
          user: users,
        })
        .from(feedbacks)
        .leftJoin(users, eq(feedbacks.userId, users.id))
        .orderBy(desc(feedbacks.createdAt));

      return results.map(result => ({
        ...result.feedback,
        user: result.user || undefined,
      }));
    } catch (error) {
      console.error("Error getting all feedbacks:", error);
      return [];
    }
  }

  async getFeedback(id: number): Promise<(Feedback & { user?: User }) | undefined> {
    try {
      const [result] = await db
        .select({
          feedback: feedbacks,
          user: users,
        })
        .from(feedbacks)
        .leftJoin(users, eq(feedbacks.userId, users.id))
        .where(eq(feedbacks.id, id));

      if (!result) return undefined;

      return {
        ...result.feedback,
        user: result.user || undefined,
      };
    } catch (error) {
      console.error("Error getting feedback:", error);
      return undefined;
    }
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    try {
      const [newFeedback] = await db
        .insert(feedbacks)
        .values(feedback)
        .returning();

      return newFeedback;
    } catch (error) {
      console.error("Error creating feedback:", error);
      throw new Error("Failed to create feedback");
    }
  }

  async updateFeedback(id: number, updates: UpdateFeedback): Promise<Feedback | undefined> {
    try {
      const [updatedFeedback] = await db
        .update(feedbacks)
        .set({
          ...updates,
          updatedAt: sql`now()`,
        })
        .where(eq(feedbacks.id, id))
        .returning();

      return updatedFeedback;
    } catch (error) {
      console.error("Error updating feedback:", error);
      return undefined;
    }
  }

  async deleteFeedback(id: number): Promise<boolean> {
    try {
      const result = await db.delete(feedbacks).where(eq(feedbacks.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting feedback:", error);
      return false;
    }
  }

  // Challenge Comment methods
  async getChallengeComments(challengeId: number): Promise<(ChallengeComment & { user: User; replies: (ChallengeComment & { user: User; likeCount: number; isLikedByUser: boolean })[] ; likeCount: number; isLikedByUser: boolean })[]> {
    try {
      // Get all comments for the challenge
      const comments = await db
        .select({
          comment: challengeComments,
          user: users,
        })
        .from(challengeComments)
        .leftJoin(users, eq(challengeComments.userId, users.id))
        .where(eq(challengeComments.challengeId, challengeId))
        .orderBy(asc(challengeComments.createdAt));

      // Get like counts for all comments
      const likeCounts = await db
        .select({
          commentId: challengeCommentLikes.commentId,
          likeCount: sql<number>`count(*)`.as('likeCount'),
        })
        .from(challengeCommentLikes)
        .where(inArray(challengeCommentLikes.commentId, comments.map(c => c.comment.id)))
        .groupBy(challengeCommentLikes.commentId);

      // Build the result structure
      const result: (ChallengeComment & { user: User; replies: (ChallengeComment & { user: User; likeCount: number; isLikedByUser: boolean })[] ; likeCount: number; isLikedByUser: boolean })[] = [];
      
      // First pass: create main comments
      for (const comment of comments) {
        if (!comment.comment.parentId) {
          const likes = likeCounts.find(l => l.commentId === comment.comment.id)?.likeCount || 0;
          result.push({
            ...comment.comment,
            user: comment.user,
            replies: [],
            likeCount: likes,
            isLikedByUser: false, // TODO: implement user-specific like status
          });
        }
      }

      // Second pass: add replies
      for (const comment of comments) {
        if (comment.comment.parentId) {
          const parentComment = result.find(c => c.id === comment.comment.parentId);
          if (parentComment) {
            const likes = likeCounts.find(l => l.commentId === comment.comment.id)?.likeCount || 0;
            parentComment.replies.push({
              ...comment.comment,
              user: comment.user,
              likeCount: likes,
              isLikedByUser: false, // TODO: implement user-specific like status
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Error getting challenge comments:", error);
      return [];
    }
  }

  async createChallengeComment(comment: InsertChallengeComment): Promise<ChallengeComment> {
    try {
      const [newComment] = await db
        .insert(challengeComments)
        .values(comment)
        .returning();
      
      return newComment;
    } catch (error) {
      console.error("Error creating challenge comment:", error);
      throw error;
    }
  }

  async updateChallengeComment(id: number, commentData: Partial<InsertChallengeComment>): Promise<ChallengeComment | undefined> {
    try {
      const [updatedComment] = await db
        .update(challengeComments)
        .set({
          ...commentData,
          updatedAt: sql`now()`,
        })
        .where(eq(challengeComments.id, id))
        .returning();
      
      return updatedComment;
    } catch (error) {
      console.error("Error updating challenge comment:", error);
      return undefined;
    }
  }

  async deleteChallengeComment(id: number): Promise<boolean> {
    try {
      const result = await db.delete(challengeComments).where(eq(challengeComments.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting challenge comment:", error);
      return false;
    }
  }

  // Challenge Comment Like methods
  async likeChallengeComment(userId: number, commentId: number): Promise<boolean> {
    try {
      await db
        .insert(challengeCommentLikes)
        .values({
          userId,
          commentId,
        });
      
      return true;
    } catch (error) {
      console.error("Error liking challenge comment:", error);
      return false;
    }
  }

  async unlikeChallengeComment(userId: number, commentId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(challengeCommentLikes)
        .where(
          and(
            eq(challengeCommentLikes.userId, userId),
            eq(challengeCommentLikes.commentId, commentId)
          )
        )
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error unliking challenge comment:", error);
      return false;
    }
  }

  async getChallengeCommentLikes(commentId: number): Promise<ChallengeCommentLike[]> {
    try {
      return await db
        .select()
        .from(challengeCommentLikes)
        .where(eq(challengeCommentLikes.commentId, commentId));
    } catch (error) {
      console.error("Error getting challenge comment likes:", error);
      return [];
    }
  }
}

// Export a new instance of DatabaseStorage
export const storage = new DatabaseStorage();
