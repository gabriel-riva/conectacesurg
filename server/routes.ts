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
import featureSettingsRouter from "./feature-settings";
import userCategoriesRouter from "./user-categories";
import userCategoryAssignmentsRouter from "./user-category-assignments";
import trailsRouter from "./trails";

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
        
        // Check if user is active
        if (user.isActive === false) {
          console.log(`⛔ Usuário inativo tentando fazer login: ${user.email}`);
          return res.redirect('/?error=account_inactive');
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
  
  // Atenção! Esta rota deve estar antes das rotas dinâmicas como "/api/users/:id" por conflito de rotas
  // Filtrar usuários por grupo ou retornar todos os usuários se groupId não for fornecido
  app.get("/api/users/filter", checkAdmin, async (req, res) => {
    try {
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : null;
      
      // Verificar se o grupo ID é válido quando fornecido
      if (groupId !== null && isNaN(groupId)) {
        console.error(`ID de grupo inválido: ${req.query.groupId}`);
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      if (groupId) {
        // Se o groupId foi fornecido, retorna usuários desse grupo
        console.log(`Buscando usuários do grupo com ID: ${groupId}`);
        const users = await storage.getGroupUsers(groupId);
        console.log(`Filtrando usuários do grupo ${groupId}: Encontrados ${users.length} usuários`);
        return res.json(users);
      } else {
        // Se não foi fornecido groupId, retorna todos os usuários
        const users = await storage.getAllUsers();
        console.log(`Retornando todos os usuários: Encontrados ${users.length} usuários`);
        return res.json(users);
      }
    } catch (error) {
      console.error("Erro ao filtrar usuários por grupo:", error);
      res.status(500).json({ message: "Failed to filter users by group" });
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
      
      // Permitir apenas atualização de nome, email e role
      const sanitizedData = {
        name: userData.name || existingUser.name,
        email: userData.email || existingUser.email,
        role: userData.role || existingUser.role
      };
      
      // Validar o papel do usuário
      if (sanitizedData.role !== "user" && sanitizedData.role !== "admin") {
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
  
  app.use('/api/upload', uploadRouter);
  
  // Adicionar rotas de materiais
  app.use('/api/materials', materialsRouter);
  
  // Adicionar rotas de configurações de funcionalidades
  app.use('/api/feature-settings', featureSettingsRouter);
  
  // Adicionar rotas de categorias de usuários
  app.use('/api/user-categories', userCategoriesRouter);
  
  // Adicionar rotas de atribuições de categoria de usuário
  app.use('/api/user-category-assignments', userCategoryAssignmentsRouter);
  
  // Adicionar rotas de trilhas
  app.use('/api/trails', trailsRouter);
  
  // Configurar acesso estático para a pasta de uploads
  app.use('/uploads', express.static('uploads'));
  
  // Configurar acesso estático para a pasta public/uploads
  app.use('/public/uploads', express.static('public/uploads'));
  
  // Configurar acesso estático para a pasta do TinyMCE
  app.use('/tinymce', express.static('public/tinymce'));

  const httpServer = createServer(app);
  return httpServer;
}
