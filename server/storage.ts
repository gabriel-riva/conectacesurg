import { users, type User, type InsertUser, type InsertGoogleUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOrUpdateGoogleUser(user: InsertGoogleUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
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
}

// Export a new instance of DatabaseStorage
export const storage = new DatabaseStorage();
