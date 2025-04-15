import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  password: text("password"),
  googleId: text("google_id").unique(),
  photoUrl: text("photo_url"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  password: true,
  googleId: true
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGoogleUser = z.infer<typeof insertGoogleUserSchema>;
export type User = typeof users.$inferSelect;
