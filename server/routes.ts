import express, { type Express, Request, Response, NextFunction } from "express";
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
import communityRoutes from "./community";
import ideasRoutes from "./ideas-fixed-final";
import aiRouter from "./ai";
import profileRouter from "./profile";
import utilityLinksRouter from "./utilityLinks";
import calendarRouter from "./calendar";
import newsRouter from "./news";
import announcementsRouter from "./announcements";
import uploadRouter from "./upload";
import materialsRouter from "./materials";
import materialsAdminRouter from "./materials-admin";
import featureSettingsRouter from "./feature-settings";
import userCategoriesRouter from "./user-categories";
import userCategoryAssignmentsRouter from "./user-category-assignments";
import trailsRouter from "./trails";
import gamificationRouter from "./gamification";
import feedbackRouter from "./feedback";
import surveysRouter from "./surveys";
import toolProjectsRouter from "./tool-projects";
import toolsRouter from "./tools";
import { getAllToolProjects, updateProjectStatus, getEmailSettings, saveEmailSettings } from './admin-tool-projects';
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

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
  // Configurar CORS para permitir credenciais em uploads e requisições AJAX
  app.use((req, res, next) => {
    const origin = req.headers.origin || req.headers.host || 'http://localhost:5000';
    
    // Permitir credenciais para todas as origens no mesmo domínio
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Responder imediatamente a preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

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
    callbackURL: "/api/auth/google/callback", // Use relative URL to work with any domain
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
    (req, res, next) => {
      // Store the original domain in the session for later redirect
      const host = req.get('host');
      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const originalDomain = `${protocol}://${host}`;
      
      if (req.session) {
        (req.session as any).originalDomain = originalDomain;
      }
      
      console.log(`🔄 Iniciando Google OAuth a partir de: ${originalDomain}`);
      next();
    },
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
        // Get the original domain from session for error redirects
        const originalDomain = (req.session as any)?.originalDomain;
        const host = req.get('host');
        const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
        const currentDomain = `${protocol}://${host}`;
        const redirectDomain = originalDomain || currentDomain;
        
        if (err) {
          console.error("Erro na autenticação:", err);
          return res.redirect(`${redirectDomain}/?error=auth_failed`);
        }
        
        // Access denied for user not registered in the system
        if (!user && info && info.message === 'access_denied') {
          console.log(`⛔ Redirecionando para página de acesso negado, email: ${info.email}`);
          return res.redirect(`${redirectDomain}/access-denied?email=${encodeURIComponent(info.email)}`);
        }
        
        // Other authentication failures
        if (!user) {
          return res.redirect(`${redirectDomain}/?error=auth_failed`);
        }
        
        // Check if user is active
        if (user.isActive === false) {
          console.log(`⛔ Usuário inativo tentando fazer login: ${user.email}`);
          return res.redirect(`${redirectDomain}/?error=account_inactive`);
        }
        
        // Login successful user
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Erro ao criar sessão:", loginErr);
            return res.redirect(`${redirectDomain}/?error=auth_failed`);
          }
          
          // Log autenticação bem-sucedida
          console.log("✅ Autenticação bem-sucedida, redirecionando para dashboard");
          console.log(`👤 Usuário: ${user?.name || 'Desconhecido'}`);
          
          // Get the original domain from session, fallback to current domain
          const originalDomain = (req.session as any)?.originalDomain;
          const host = req.get('host');
          const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
          const currentDomain = `${protocol}://${host}`;
          const redirectDomain = originalDomain || currentDomain;
          
          console.log(`🔄 Redirecionando para: ${redirectDomain}/dashboard`);
          
          // Successful authentication, redirect to dashboard maintaining original domain
          return res.redirect(`${redirectDomain}/dashboard`);
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
  
  // Atenção! Esta rota deve estar antes das rotas dinâmicas como "/api/users/:id" por conflito de rotas
  // Filtrar usuários por grupo ou categoria ou retornar todos os usuários se nenhum filtro for fornecido
  app.get("/api/users/filter", checkAdmin, async (req, res) => {
    try {
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : null;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
      
      // Verificar se os IDs são válidos quando fornecidos
      if (groupId !== null && isNaN(groupId)) {
        console.error(`ID de grupo inválido: ${req.query.groupId}`);
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      if (categoryId !== null && isNaN(categoryId)) {
        console.error(`ID de categoria inválido: ${req.query.categoryId}`);
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      if (groupId) {
        // Se o groupId foi fornecido, retorna usuários desse grupo
        console.log(`Buscando usuários do grupo com ID: ${groupId}`);
        const users = await storage.getGroupUsers(groupId);
        console.log(`Filtrando usuários do grupo ${groupId}: Encontrados ${users.length} usuários`);
        return res.json(users);
      } else if (categoryId) {
        // Se o categoryId foi fornecido, retorna usuários dessa categoria
        console.log(`Buscando usuários da categoria com ID: ${categoryId}`);
        const users = await storage.getCategoryUsers(categoryId);
        console.log(`Filtrando usuários da categoria ${categoryId}: Encontrados ${users.length} usuários`);
        return res.json(users);
      } else {
        // Se não foi fornecido nem groupId nem categoryId, retorna todos os usuários
        const users = await storage.getAllUsers();
        console.log(`Retornando todos os usuários: Encontrados ${users.length} usuários`);
        return res.json(users);
      }
    } catch (error) {
      console.error("Erro ao filtrar usuários:", error);
      res.status(500).json({ message: "Failed to filter users" });
    }
  });

  // Get a specific user by ID - admin only
  app.get("/api/users/:id", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o ID é um número válido
      if (isNaN(id)) {
        console.error(`ID inválido: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Buscando usuário com ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log(`Usuário com ID ${id} não encontrado`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`Usuário encontrado: ${user.name}`);
      res.json(user);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // Update user - admin only
  app.patch("/api/users/:id", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      // Validar o email
      if (userData.email && !userData.email.endsWith('@cesurg.com')) {
        return res.status(400).json({ message: "O email deve pertencer ao domínio @cesurg.com" });
      }
      
      // Verificar se o usuário existe
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Permitir apenas atualização de nome, email, role e joinDate
      const sanitizedData = {
        name: userData.name || existingUser.name,
        email: userData.email || existingUser.email,
        role: userData.role || existingUser.role,
        joinDate: userData.joinDate !== undefined ? userData.joinDate : existingUser.joinDate
      };
      
      // Validar o papel do usuário
      if (sanitizedData.role !== "user" && sanitizedData.role !== "admin" && sanitizedData.role !== "superadmin") {
        return res.status(400).json({ message: "Invalid role value" });
      }
      
      // Não permitir alterar superadmin
      if (existingUser.role === "superadmin") {
        return res.status(403).json({ message: "Cannot modify superadmin user" });
      }
      
      // Atualizar usuário
      const updatedUser = await storage.updateUser(id, sanitizedData);
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
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
  
  // Update user status (active/inactive) - admin only
  app.patch("/api/users/:id/status", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }
      
      // Não permitir desativar superadmin
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === "superadmin") {
        return res.status(403).json({ message: "Cannot deactivate superadmin account" });
      }
      
      const updatedUser = await storage.updateUserStatus(id, isActive);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user status" });
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

  // Get user profile for admin - admin only
  app.get("/api/users/:id/profile", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return complete user profile including all personal information
      res.json(user);
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Get user documents for admin - admin only
  app.get("/api/users/:id/documents", checkAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Buscando documentos do usuário com ID: ${id}`);
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user documents
      const userDocuments = {
        userId: user.id,
        userName: user.name,
        documents: user.documents || []
      };
      
      res.json(userDocuments);
    } catch (error) {
      console.error("Error getting user documents:", error);
      res.status(500).json({ message: "Failed to fetch user documents" });
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
  
  // Get user documents - admin only
  app.get("/api/users/:id/documents", checkAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verificar se o ID é um número válido
      if (isNaN(userId)) {
        console.error(`ID de usuário inválido: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Buscando documentos do usuário com ID: ${userId}`);
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.log(`Usuário com ID ${userId} não encontrado`);
        return res.status(404).json({ message: "User not found" });
      }
      
      // Retorna documentos do usuário ou array vazio
      res.json({
        userId: user.id,
        userName: user.name,
        documents: user.documents || []
      });
    } catch (error) {
      console.error("Erro ao buscar documentos do usuário:", error);
      res.status(500).json({ message: "Failed to fetch user documents" });
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

  // Adicionar rotas da comunidade
  app.use('/api/community', communityRoutes);
  
  // Adicionar rotas do programa de ideias
  app.use('/api/ideas', ideasRoutes);
  app.use('/api/ai', aiRouter);
  
  // Adicionar rotas de perfil de usuário
  app.use('/api/profile', profileRouter);
  
  // Adicionar rotas de links úteis
  app.use('/api/utility-links', utilityLinksRouter);
  
  // Adicionar rotas de calendário
  app.use('/api/calendar', calendarRouter);
  
  // Adicionar rotas de notícias
  app.use('/api/news', newsRouter);
  
  // Adicionar rotas de avisos
  app.use('/api/announcements', announcementsRouter);
  
  // Endpoint temporário de diagnóstico para upload
  app.get('/api/upload-debug', (req: Request, res: Response) => {
    const diagnostics = {
      environment: process.env.NODE_ENV,
      objectStorageConfigured: !!(process.env.PRIVATE_OBJECT_DIR && process.env.PUBLIC_OBJECT_SEARCH_PATHS),
      privateDir: process.env.PRIVATE_OBJECT_DIR || 'NOT SET',
      publicPaths: process.env.PUBLIC_OBJECT_SEARCH_PATHS || 'NOT SET',
      user: req.user ? { id: (req.user as any).id, email: (req.user as any).email } : 'NOT AUTHENTICATED',
      cookies: !!req.headers.cookie,
      sessionId: (req.session as any)?.id || 'NO SESSION'
    };
    res.json(diagnostics);
  });

  // Middleware de debug para upload
  app.use('/api/upload', (req, res, next) => {
    console.log('🔍 Upload route hit');
    console.log('🔍 Method:', req.method);
    console.log('🔍 User:', req.user ? (req.user as any).id : 'NOT AUTHENTICATED');
    console.log('🔍 Session ID:', (req as any).session?.id);
    console.log('🔍 Session Passport:', (req as any).session?.passport);
    console.log('🔍 Cookies:', req.headers.cookie ? 'Present' : 'Missing');
    next();
  });
  
  app.use('/api/upload', uploadRouter);
  
  // Adicionar rotas de materiais
  app.use('/api/materials', materialsRouter);
  app.use("/api/materials-admin", materialsAdminRouter);

  // ROTA CRÍTICA: Servir arquivos públicos do Object Storage (materiais)
  // Esta rota permite que usuários comuns acessem materiais sem autenticação especial
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        console.log(`❌ Arquivo público não encontrado: ${filePath}`);
        return res.status(404).json({ error: "File not found" });
      }
      console.log(`✅ Servindo arquivo público: ${filePath}`);
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Erro ao servir objeto público:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ROTA ESPECÍFICA: Servir materiais do Object Storage com separação por ambiente
  app.get("/objects/:env/materials/:fileId", async (req, res) => {
    const { env, fileId } = req.params;
    console.log(`🔍 MATERIAL DOWNLOAD: Tentando acessar material ${fileId} do ambiente ${env}`);
    
    // Validar ambiente
    if (env !== 'prod' && env !== 'dev') {
      return res.status(404).json({ error: "Ambiente não encontrado" });
    }
    
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/${env}/materials/${fileId}`;
      
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      console.log(`✅ MATERIAL DOWNLOAD: Material ${fileId} encontrado no Object Storage (ambiente: ${env})`);
      
      // MATERIAIS SÃO PÚBLICOS - Não verificar ACL, apenas baixar diretamente
      // Isso resolve o problema de "acesso negado" para usuários comuns
      await objectStorageService.downloadObject(objectFile, res, 3600);
      
    } catch (error) {
      console.error(`❌ MATERIAL DOWNLOAD: Erro ao acessar material ${fileId} (${env}):`, error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Material não encontrado" });
      }
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota legacy para materiais (sem ambiente) - redireciona para produção
  app.get("/objects/materials/:fileId", async (req, res) => {
    console.log(`🔄 LEGACY MATERIAL: Redirecionando material ${req.params.fileId} para ambiente de produção`);
    res.redirect(`/objects/prod/materials/${req.params.fileId}`);
  });

  // Rota para servir arquivos de desafios do Object Storage com separação por ambiente
  app.get("/objects/:env/challenges/:fileId", async (req, res) => {
    const { env, fileId } = req.params;
    console.log(`🔍 DOWNLOAD CHALLENGE: Tentando acessar desafio ${fileId} do ambiente ${env}`);
    
    // Validar ambiente
    if (env !== 'prod' && env !== 'dev') {
      return res.status(404).json({ error: "Ambiente não encontrado" });
    }
    
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/${env}/challenges/${fileId}`;
      
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
        
        // Verificar se o usuário está autenticado
        const user = req.user as any;
        if (!user) {
          console.log(`🚫 Acesso negado ao arquivo ${objectPath} - usuário não autenticado`);
          return res.status(403).json({ error: "Acesso negado" });
        }
        
        // Admins e superadmins sempre têm acesso aos arquivos de desafios
        // Para poder revisar as submissões dos usuários
        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        
        if (isAdmin) {
          console.log(`✅ Admin ${user.email} acessando arquivo de desafio: ${objectPath}`);
          return objectStorageService.downloadObject(objectFile, res);
        }
        
        // Para usuários comuns, verificar permissões normais
        const userId = user.id?.toString();
        const canAccess = await objectStorageService.canAccessObjectEntity({
          objectFile,
          userId: userId,
          requestedPermission: "read" as any
        });
        
        if (!canAccess) {
          console.log(`🚫 Acesso negado ao arquivo ${objectPath} para usuário ${userId}`);
          return res.status(403).json({ error: "Acesso negado" });
        }
        
        console.log(`✅ Servindo arquivo de desafio: ${objectPath} (ambiente: ${env})`);
        return objectStorageService.downloadObject(objectFile, res);
        
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          console.log(`❌ Arquivo de desafio não encontrado: ${objectPath}`);
          return res.status(404).json({ error: "Arquivo não encontrado" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Erro ao servir arquivo de desafio:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota legacy para desafios (sem ambiente) - redireciona para produção
  app.get("/objects/challenges/:fileId", async (req, res) => {
    console.log(`🔄 LEGACY CHALLENGE: Redirecionando desafio ${req.params.fileId} para ambiente de produção`);
    res.redirect(`/objects/prod/challenges/${req.params.fileId}`);
  });

  // Rotas para servir arquivos de perfil do Object Storage com separação por ambiente
  app.get("/objects/:env/profile/photos/:fileId", async (req, res) => {
    const { env, fileId } = req.params;
    console.log(`🔍 DOWNLOAD PROFILE PHOTO: Tentando acessar foto ${fileId} do ambiente ${env}`);
    
    // Validar ambiente
    if (env !== 'prod' && env !== 'dev') {
      return res.status(404).json({ error: "Ambiente não encontrado" });
    }
    
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage.js");
      
      const objectPath = `/objects/${env}/profile/photos/${fileId}`;
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      console.log(`✅ DOWNLOAD PROFILE PHOTO: Foto ${fileId} encontrada no Object Storage (ambiente: ${env})`);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error(`❌ DOWNLOAD PROFILE PHOTO: Erro ao acessar foto ${fileId} (${env}):`, error);
      const { ObjectNotFoundError } = await import("./objectStorage.js");
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Foto não encontrada" });
      }
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota legacy para fotos de perfil (sem ambiente) - redireciona para produção
  app.get("/objects/profile/photos/:fileId", async (req, res) => {
    console.log(`🔄 LEGACY PHOTO: Redirecionando foto ${req.params.fileId} para ambiente de produção`);
    res.redirect(`/objects/prod/profile/photos/${req.params.fileId}`);
  });

  app.get("/objects/:env/profile/documents/:fileId", async (req, res) => {
    const { env, fileId } = req.params;
    console.log(`🔍 DOWNLOAD PROFILE DOCUMENT: Tentando acessar documento ${fileId} do ambiente ${env}`);
    
    // Validar ambiente
    if (env !== 'prod' && env !== 'dev') {
      return res.status(404).json({ error: "Ambiente não encontrado" });
    }
    
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage.js");
      
      const objectPath = `/objects/${env}/profile/documents/${fileId}`;
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      // Verificar ACL para documentos privados
      const userId = (req.user as any)?.id;
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId?.toString(),
        requestedPermission: "read" as any
      });
      
      if (!canAccess) {
        console.log(`❌ DOWNLOAD PROFILE DOCUMENT: Acesso negado ao documento ${fileId} (${env})`);
        return res.status(403).json({ error: "Acesso negado ao documento" });
      }
      
      console.log(`✅ DOWNLOAD PROFILE DOCUMENT: Documento ${fileId} encontrado no Object Storage (ambiente: ${env})`);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error(`❌ DOWNLOAD PROFILE DOCUMENT: Erro ao acessar documento ${fileId} (${env}):`, error);
      const { ObjectNotFoundError } = await import("./objectStorage.js");
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota legacy para documentos de perfil (sem ambiente) - redireciona para produção
  app.get("/objects/profile/documents/:fileId", async (req, res) => {
    console.log(`🔄 LEGACY DOCUMENT: Redirecionando documento ${req.params.fileId} para ambiente de produção`);
    res.redirect(`/objects/prod/profile/documents/${req.params.fileId}`);
  });
  
  // Adicionar rotas de configurações de funcionalidades
  app.use('/api/feature-settings', featureSettingsRouter);
  
  // Adicionar rotas de categorias de usuários
  app.use('/api/user-categories', userCategoriesRouter);
  
  // Adicionar rotas de atribuições de categoria de usuário
  app.use('/api/user-category-assignments', userCategoryAssignmentsRouter);
  
  // Adicionar rotas de trilhas
  app.use('/api/trails', trailsRouter);
  
  // Adicionar rotas de gamificação
  app.use('/api/gamification', gamificationRouter);
  
  // Adicionar rotas de feedback
  app.use('/api/feedback', feedbackRouter);
  
  // Adicionar rotas de pesquisas de opinião
  app.use('/api/surveys', surveysRouter);
  
  // Adicionar rotas de ferramentas - projetos
  app.use('/api/tool-projects', toolProjectsRouter);
  
  // Adicionar rotas de ferramentas (admin)
  app.use('/api/tools', toolsRouter);
  
  // Admin routes for tool projects
  app.get("/api/admin/tool-projects", getAllToolProjects);
  app.patch("/api/admin/tool-projects/:id/status", updateProjectStatus);
  app.get("/api/admin/email-settings", getEmailSettings);
  app.post("/api/admin/email-settings", saveEmailSettings);
  
  // Configurar acesso estático para a pasta de uploads
  app.use('/uploads', express.static('uploads'));
  
  // Configurar acesso estático para a pasta public/uploads
  app.use('/public/uploads', express.static('public/uploads'));
  
  // Configurar acesso estático para a pasta do TinyMCE
  app.use('/tinymce', express.static('public/tinymce'));

  const httpServer = createServer(app);
  return httpServer;
}
