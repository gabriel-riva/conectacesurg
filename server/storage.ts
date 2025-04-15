import { users, type User, type InsertUser, type InsertGoogleUser } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;

    // Initialize with superadmin user
    this.createUser({
      email: "conecta@cesurg.com",
      name: "Conecta Admin",
      role: "superadmin",
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, googleId: null, photoUrl: null, password: null };
    this.users.set(id, user);
    return user;
  }

  async createOrUpdateGoogleUser(insertUser: InsertGoogleUser): Promise<User> {
    // Check if user exists by email
    const existingUser = await this.getUserByEmail(insertUser.email);
    
    if (existingUser) {
      // Update existing user with Google ID if not present
      const updatedUser: User = {
        ...existingUser,
        googleId: insertUser.googleId,
        photoUrl: insertUser.photoUrl || existingUser.photoUrl,
      };
      this.users.set(existingUser.id, updatedUser);
      return updatedUser;
    }

    // Create new user
    const id = this.currentId++;
    const role = insertUser.email === "conecta@cesurg.com" ? "superadmin" : "user";
    const user: User = { 
      ...insertUser, 
      id, 
      role, 
      password: null 
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (user) {
      const updatedUser: User = { ...user, role };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }
}

export const storage = new MemStorage();
