import { 
  users, 
  groups, 
  userGroups,
  type User, 
  type InsertUser, 
  type InsertGoogleUser,
  type Group,
  type InsertGroup,
  type UserGroup
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
}

// Export a new instance of DatabaseStorage
export const storage = new DatabaseStorage();
