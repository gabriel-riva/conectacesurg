import express, { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { storage } from "./storage";
import multer from "multer";
import { insertAiAgentSchema, insertAiPromptSchema, insertAiConversationSchema, insertAiMessageSchema } from "../shared/schema";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  const user = req.user as any;
  if (!req.isAuthenticated || !req.isAuthenticated() || !user || (user.role !== "admin" && user.role !== "superadmin")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// Get all AI agents - acessível para todos usuários autenticados
router.get("/agents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agents = await storage.getAllAiAgents();
    res.json(agents);
  } catch (error) {
    console.error("Error fetching AI agents:", error);
    res.status(500).json({ error: "Failed to fetch AI agents" });
  }
});

// Get a single AI agent
router.get("/agents/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.id);
    const agent = await storage.getAiAgent(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: "AI agent not found" });
    }
    
    res.json(agent);
  } catch (error) {
    console.error("Error fetching AI agent:", error);
    res.status(500).json({ error: "Failed to fetch AI agent" });
  }
});

// Admin: Create a new AI agent
router.post(
  "/agents",
  isAuthenticated, // Apenas autenticação necessária para ver agentes
  body("name").isString().notEmpty().withMessage("Name is required"),
  body("description").isString().withMessage("Description is required"),
  body("n8nWebhookUrl").isString().withMessage("n8n webhook URL is required"),
  body("n8nApiKey").isString().withMessage("n8n API key is required"),
  body("active").isBoolean().optional(),
  body("imageUrl").isString().optional(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newAgent = insertAiAgentSchema.parse(req.body);
      const agent = await storage.createAiAgent(newAgent);
      res.status(201).json(agent);
    } catch (error) {
      console.error("Error creating AI agent:", error);
      res.status(500).json({ error: "Failed to create AI agent" });
    }
  }
);

// Admin: Update an AI agent
router.put(
  "/agents/:id",
  isAuthenticated, // Alterado para autenticação básica
  param("id").isInt().withMessage("Invalid agent ID"),
  body("name").isString().optional(),
  body("description").isString().optional(),
  body("n8nWebhookUrl").isString().optional(),
  body("n8nApiKey").isString().optional(),
  body("active").isBoolean().optional(),
  body("imageUrl").isString().optional(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const agentId = parseInt(req.params.id);
      const agentData = req.body;
      const updatedAgent = await storage.updateAiAgent(agentId, agentData);
      
      if (!updatedAgent) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      
      res.json(updatedAgent);
    } catch (error) {
      console.error("Error updating AI agent:", error);
      res.status(500).json({ error: "Failed to update AI agent" });
    }
  }
);

// Admin: Delete an AI agent
router.delete(
  "/agents/:id",
  isAuthenticated, // Alterado para autenticação básica
  param("id").isInt().withMessage("Invalid agent ID"),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const agentId = parseInt(req.params.id);
      const success = await storage.deleteAiAgent(agentId);
      
      if (!success) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting AI agent:", error);
      res.status(500).json({ error: "Failed to delete AI agent" });
    }
  }
);

// Get all AI prompts
router.get("/prompts", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id;
    let prompts;
    
    if (req.query.includePrivate === "true" && userId) {
      // Include private prompts created by the current user
      prompts = await storage.getAllAiPrompts(userId);
    } else {
      // Only public prompts
      prompts = await storage.getPublicAiPrompts();
    }
    
    res.json(prompts);
  } catch (error) {
    console.error("Error fetching AI prompts:", error);
    res.status(500).json({ error: "Failed to fetch AI prompts" });
  }
});

// Create a new AI prompt
router.post(
  "/prompts",
  isAuthenticated,
  body("title").isString().notEmpty().withMessage("Title is required"),
  body("content").isString().notEmpty().withMessage("Content is required"),
  body("isPublic").isBoolean().optional(),
  body("agentIds").isArray().optional(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { agentIds, ...promptData } = req.body;
      const user = req.user as any;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Set the creator ID to the current user
      const newPromptData = {
        ...promptData,
        creatorId: userId
      };
      
      const newPrompt = insertAiPromptSchema.parse(newPromptData);
      const prompt = await storage.createAiPrompt(newPrompt);
      
      // If agent IDs are provided, assign the prompt to those agents
      if (agentIds && agentIds.length > 0) {
        await Promise.all(
          agentIds.map((agentId: number) => 
            storage.assignPromptToAgent(prompt.id, agentId)
          )
        );
      }
      
      res.status(201).json(prompt);
    } catch (error) {
      console.error("Error creating AI prompt:", error);
      res.status(500).json({ error: "Failed to create AI prompt" });
    }
  }
);

// Update an AI prompt
router.put(
  "/prompts/:id",
  isAuthenticated,
  param("id").isInt().withMessage("Invalid prompt ID"),
  body("title").isString().optional(),
  body("content").isString().optional(),
  body("isPublic").isBoolean().optional(),
  body("agentIds").isArray().optional(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const promptId = parseInt(req.params.id);
      const { agentIds, ...promptData } = req.body;
      const user = req.user as any;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Check if the prompt exists and belongs to the user (or user is admin)
      const existingPrompt = await storage.getAiPrompt(promptId);
      
      if (!existingPrompt) {
        return res.status(404).json({ error: "AI prompt not found" });
      }
      
      const isAdmin = user?.role === "admin" || user?.role === "superadmin";
      
      if (existingPrompt.creatorId !== userId && !isAdmin) {
        return res.status(403).json({ error: "You don't have permission to update this prompt" });
      }
      
      const updatedPrompt = await storage.updateAiPrompt(promptId, promptData);
      
      // If agent IDs are provided, update the prompt-agent assignments
      if (agentIds) {
        // First, remove all existing assignments
        await storage.removeAllPromptAgentAssignments(promptId);
        
        // Then, add the new assignments
        if (agentIds.length > 0) {
          await Promise.all(
            agentIds.map((agentId: number) => 
              storage.assignPromptToAgent(promptId, agentId)
            )
          );
        }
      }
      
      res.json(updatedPrompt);
    } catch (error) {
      console.error("Error updating AI prompt:", error);
      res.status(500).json({ error: "Failed to update AI prompt" });
    }
  }
);

// Delete an AI prompt
router.delete(
  "/prompts/:id",
  isAuthenticated,
  param("id").isInt().withMessage("Invalid prompt ID"),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const promptId = parseInt(req.params.id);
      const user = req.user as any;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Check if the prompt exists and belongs to the user (or user is admin)
      const existingPrompt = await storage.getAiPrompt(promptId);
      
      if (!existingPrompt) {
        return res.status(404).json({ error: "AI prompt not found" });
      }
      
      const isAdmin = user?.role === "admin" || user?.role === "superadmin";
      
      if (existingPrompt.creatorId !== userId && !isAdmin) {
        return res.status(403).json({ error: "You don't have permission to delete this prompt" });
      }
      
      const success = await storage.deleteAiPrompt(promptId);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to delete AI prompt" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting AI prompt:", error);
      res.status(500).json({ error: "Failed to delete AI prompt" });
    }
  }
);

// Get user's AI conversations
router.get("/conversations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const conversations = await storage.getUserAiConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching AI conversations:", error);
    res.status(500).json({ error: "Failed to fetch AI conversations" });
  }
});

// Create a new AI conversation
router.post(
  "/conversations",
  isAuthenticated,
  body("agentId").isInt().withMessage("Agent ID is required"),
  body("title").isString().notEmpty().withMessage("Title is required"),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = req.user as any;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const conversationData = {
        ...req.body,
        userId
      };
      
      const newConversation = insertAiConversationSchema.parse(conversationData);
      const conversation = await storage.createAiConversation(newConversation);
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating AI conversation:", error);
      res.status(500).json({ error: "Failed to create AI conversation" });
    }
  }
);

// Get messages for a conversation
router.get(
  "/conversations/:id/messages",
  isAuthenticated,
  param("id").isInt().withMessage("Invalid conversation ID"),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const conversationId = parseInt(req.params.id);
      const user = req.user as any;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Check if the conversation belongs to the user
      const conversation = await storage.getAiConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to access this conversation" });
      }
      
      const messages = await storage.getAiConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ error: "Failed to fetch conversation messages" });
    }
  }
);

// Send a message in an AI conversation
router.post(
  "/conversations/:id/messages",
  isAuthenticated,
  upload.array("attachments", 5),
  param("id").isInt().withMessage("Invalid conversation ID"),
  body("content").isString().notEmpty().withMessage("Message content is required"),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const conversationId = parseInt(req.params.id);
      const user = req.user as any;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Check if the conversation belongs to the user
      const conversation = await storage.getAiConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to access this conversation" });
      }
      
      // Process attachments (if any)
      const attachments: { name: string; url: string; type: string }[] = [];
      
      if (req.files && Array.isArray(req.files)) {
        // Handle file upload logic here
        // In a real implementation, you would save these files and get their URLs
        for (const file of req.files) {
          attachments.push({
            name: file.originalname,
            url: `/uploads/${file.filename}`, // This would be a real URL in production
            type: file.mimetype
          });
        }
      }
      
      // Create the user message
      const userMessageData = {
        conversationId,
        content: req.body.content,
        isFromUser: true,
        attachments
      };
      
      const userMessage = insertAiMessageSchema.parse(userMessageData);
      const savedUserMessage = await storage.createAiMessage(userMessage);
      
      // In a real application, you would now call the n8n webhook to process the message
      // and get a response from the AI agent
      
      // For now, we'll simulate an AI response
      const aiMessageData = {
        conversationId,
        content: `This is a simulated response to: "${req.body.content}"`,
        isFromUser: false,
        attachments: []
      };
      
      const aiMessage = insertAiMessageSchema.parse(aiMessageData);
      const savedAiMessage = await storage.createAiMessage(aiMessage);
      
      // Update the last message timestamp for the conversation
      await storage.updateAiConversationLastMessage(conversationId, `${req.body.content.substring(0, 50)}...`);
      
      res.status(201).json({
        userMessage: savedUserMessage,
        aiMessage: savedAiMessage
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

export default router;