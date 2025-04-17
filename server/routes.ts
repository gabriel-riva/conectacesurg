import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGoogleUserSchema, insertGroupSchema } from "@shared/schema";
import { ZodError } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Create PostgreSQL session store for production or memory store for development
const createSessionStore = () => {
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    const PgSession = connectPgSimple(session);
    console.log('Usando armazenamento PostgreSQL para sessões');
    return new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true
    });
  }
  
  // Fallback para MemoryStore em desenvolvimento
  const SessionStore = MemoryStore(session);
  console.log('Usando armazenamento em memória para sessões');
  return new SessionStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
};

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
        // No ambiente de produção, a cookie só pode ser usada em HTTPS
        // Adicionamos a opção sameSite para melhorar a segurança
        sameSite: app.get("env") === "production" ? 'none' : 'lax',
      },
      store: createSessionStore(),
      // Ajuste para funcionamento com proxy da Replit
      proxy: true,
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
      
      // Check if the user is already registered in the system
      const existingUser = await storage.getUserByEmail(email);
      
      // If user doesn't exist in our database, don't allow login
      if (!existingUser) {
        console.log(`⛔ Login negado: ${email} não está pré-cadastrado no sistema`);
        // Instead of generic error, store the email in the request for the next middleware
        return done(null, false, { message: 'access_denied', email });
      }
      
      const userData = {
        googleId: profile.id,
        email: email,
        name: profile.displayName,
        photoUrl: profile.photos?.[0]?.value || null,
      };
      
      // Update existing user with Google info
      const user = await storage.updateExistingUserWithGoogleInfo(userData);
      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));

  // Authentication status check
  app.get("/api/auth/status", (req, res) => {
    console.log("📊 Verificando status de autenticação");
    console.log(`Autenticado: ${req.isAuthenticated()}`);
    
    if (req.isAuthenticated()) {
      console.log(`Usuário logado: ${(req.user as any)?.name || 'Desconhecido'}`);
      console.log(`Email: ${(req.user as any)?.email || 'Não disponível'}`);
      console.log(`Função: ${(req.user as any)?.role || 'Não disponível'}`);
      
      res.json({ 
        authenticated: true, 
        user: req.user 
      });
    } else {
      console.log("Nenhum usuário autenticado na sessão");
      res.json({ authenticated: false });
    }
  });

  // Rotas de desenvolvimento para facilitar testes
  if (process.env.NODE_ENV === 'development') {
    // Rota para listar todos os usuários cadastrados (apenas em desenvolvimento)
    app.get('/api/auth/dev-user-list', async (_req, res) => {
      try {
        // Buscar todos os usuários do banco de dados
        const users = await storage.getAllUsers();
        
        // Retornar a lista de usuários
        res.json(users);
      } catch (error) {
        console.error('Erro ao buscar usuários para dev login:', error);
        res.status(500).json({ message: 'Erro ao buscar usuários' });
      }
    });
    
    // Rota para fazer login como qualquer usuário pelo ID
    app.get('/api/auth/dev-login/:userId', async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        
        // Buscar o usuário do banco de dados
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Fazer login como o usuário
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Erro ao fazer login de desenvolvimento' });
          }
          
          console.log(`🧪 Login de desenvolvimento como: ${user.name} (${user.role})`);
          res.redirect('/dashboard');
        });
      } catch (error) {
        console.error('Erro no login de desenvolvimento:', error);
        res.status(500).json({ message: 'Erro ao processar login de desenvolvimento' });
      }
    });
    
    // Rota para criar usuário de teste se necessário
    app.post('/api/auth/dev-create-test-user', async (_req, res) => {
      try {
        // Verificar se já existe o superadmin
        const existingSuperAdmin = await storage.getUserByEmail('conecta@cesurg.com');
        
        if (!existingSuperAdmin) {
          // Criar usuário superadmin para testes
          const testUser = await storage.createUser({
            name: 'Admin Conecta (Teste)',
            email: 'conecta@cesurg.com',
            role: 'superadmin'
          });
          
          return res.status(201).json({ 
            message: 'Usuário de teste criado com sucesso', 
            user: testUser 
          });
        }
        
        // Se já existe, apenas retorna sucesso
        res.json({ message: 'Usuário superadmin já existe' });
      } catch (error) {
        console.error('Erro ao criar usuário de teste:', error);
        res.status(500).json({ message: 'Erro ao criar usuário de teste' });
      }
    });
  }

  // Google auth routes
  app.get('/api/auth/google', 
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      hd: 'cesurg.com' // Hosted domain restriction
    })
  );

  // Google auth callback
  app.get('/api/auth/google/callback', 
    (req, res, next) => {
      // Log callback recebido
      console.log("🔄 Callback do Google OAuth recebido");
      next();
    },
    (req, res, next) => {
      passport.authenticate('google', (err, user, info) => {
        if (err) {
          console.error("Erro na autenticação:", err);
          return res.redirect('/?error=auth_failed');
        }
        
        // Access denied for user not registered in the system
        if (!user && info && info.message === 'access_denied') {
          console.log(`⛔ Redirecionando para página de acesso negado, email: ${info.email}`);
          return res.redirect(`/access-denied?email=${encodeURIComponent(info.email)}`);
        }
        
        // Other authentication failures
        if (!user) {
          return res.redirect('/?error=auth_failed');
        }
        
        // Login successful user
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Erro ao criar sessão:", loginErr);
            return res.redirect('/?error=auth_failed');
          }
          
          // Log autenticação bem-sucedida
          console.log("✅ Autenticação bem-sucedida, redirecionando para dashboard");
          console.log(`👤 Usuário: ${user?.name || 'Desconhecido'}`);
          
          // Successful authentication, redirect to dashboard
          return res.redirect('/dashboard');
        });
      })(req, res, next);
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

  // Group management routes
  // Get all groups - admin only
  app.get("/api/groups", checkAdmin, async (req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  // Get a specific group - admin only
  app.get("/api/groups/:id", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const group = await storage.getGroup(id);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  // Create a new group - admin only
  app.post("/api/groups", checkAdmin, async (req, res) => {
    try {
      const groupData = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Update a group - admin only
  app.patch("/api/groups/:id", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const groupData = req.body;
      
      // For safety, only allow name and description updates through this endpoint
      const sanitizedData = {
        name: groupData.name,
        description: groupData.description
      };
      
      const updatedGroup = await storage.updateGroup(id, sanitizedData);
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json(updatedGroup);
    } catch (error) {
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  // Delete a group - admin only
  app.delete("/api/groups/:id", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGroup(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // User-Group relationship routes
  // Get all groups a user belongs to
  app.get("/api/users/:id/groups", checkAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  // Get all users in a group
  app.get("/api/groups/:id/users", checkAdmin, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const users = await storage.getGroupUsers(groupId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group users" });
    }
  });

  // Add a user to a group
  app.post("/api/users/:userId/groups/:groupId", checkAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const groupId = parseInt(req.params.groupId);
      
      const success = await storage.addUserToGroup(userId, groupId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to add user to group" });
      }
      
      res.status(201).json({ message: "User added to group successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add user to group" });
    }
  });

  // Remove a user from a group
  app.delete("/api/users/:userId/groups/:groupId", checkAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const groupId = parseInt(req.params.groupId);
      
      const success = await storage.removeUserFromGroup(userId, groupId);
      
      if (!success) {
        return res.status(404).json({ message: "User-group relationship not found" });
      }
      
      res.json({ message: "User removed from group successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user from group" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
