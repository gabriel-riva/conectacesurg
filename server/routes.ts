import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGoogleUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import MemoryStore from "memorystore";

// Create memory store for sessions
const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "conecta-cesurg-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: app.get("env") === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Verificar as variáveis de ambiente necessárias para OAuth
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    console.error("⚠️ AVISO: GOOGLE_CLIENT_SECRET não está definido no ambiente!");
    console.error("Para a autenticação Google OAuth funcionar, você precisa configurar este segredo.");
    console.error("Adicione GOOGLE_CLIENT_SECRET nas variáveis de ambiente de produção.");
  }

  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: "1033430857520-a0q61g5f6dl8o20g1oejuukrqdb4lol1.apps.googleusercontent.com",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackURL: "https://conectacesurg.replit.app/api/auth/google/callback",
    scope: ["profile", "email"]
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user data from Google profile
      const email = profile.emails?.[0]?.value;
      
      // Check if email ends with @cesurg.com
      if (!email || !email.endsWith('@cesurg.com')) {
        return done(new Error('Only @cesurg.com emails are allowed'), undefined);
      }
      
      // Role assignment: conecta@cesurg.com is superadmin, others are regular users
      const role = email === 'conecta@cesurg.com' ? 'superadmin' : 'user';
      
      const userData = {
        googleId: profile.id,
        email: email,
        name: profile.displayName,
        photoUrl: profile.photos?.[0]?.value || null,
        role
      };
      
      // Find or create user in DB
      const user = await storage.createOrUpdateGoogleUser(userData);
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));

  // Authentication status check
  app.get("/api/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ 
        authenticated: true, 
        user: req.user 
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Google auth routes
  app.get('/api/auth/google', 
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      hd: 'cesurg.com' // Hosted domain restriction
    })
  );

  // Google auth callback
  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { 
      failureRedirect: '/?error=auth_failed',
      session: true
    }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // User management routes - protected by admin check
  const checkAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as any;
    if (user.role !== "superadmin" && user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    next();
  };

  // Get all users - admin only
  app.get("/api/users", checkAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Add a new user - admin only
  app.post("/api/users", checkAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user role - admin only
  app.patch("/api/users/:id/role", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || (role !== "user" && role !== "admin")) {
        return res.status(400).json({ message: "Invalid role value" });
      }
      
      const updatedUser = await storage.updateUserRole(id, role);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Delete user - admin only
  app.delete("/api/users/:id", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
