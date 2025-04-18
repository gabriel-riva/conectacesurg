import { 
  users, 
  groups, 
  userGroups,
  aiAgents,
  aiPrompts,
  aiPromptAgents,
  aiConversations,
  aiMessages,
  utilityLinks,
  calendarEvents,
  type User, 
  type InsertUser, 
  type InsertGoogleUser,
  type Group,
  type InsertGroup,
  type UserGroup,
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
  type InsertCalendarEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, desc, asc } from "drizzle-orm";

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
  getAllCalendarEvents(includeInactive?: boolean): Promise<CalendarEvent[]>;
  getUpcomingCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, eventData: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
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
      let query = db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.isActive, true),
            gte(calendarEvents.eventDate, startDate),
            lte(calendarEvents.eventDate, endDate)
          )
        )
        .orderBy(asc(calendarEvents.eventDate));
      
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
}

// Export a new instance of DatabaseStorage
export const storage = new DatabaseStorage();
