import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { InsertNews, InsertNewsCategory } from "@shared/schema";

// Função para extrair informações da notícia da CESURG
async function extractCesurgNews(url: string) {
  try {
    // Validar URL
    if (!url.includes('cesurgmarau.com.br/noticia/')) {
      throw new Error('URL deve ser de uma notícia da CESURG');
    }

    // Extrair ID da notícia da URL
    const urlIdMatch = url.match(/\/noticia\/(\d+)\//);
    const newsId = urlIdMatch ? parseInt(urlIdMatch[1]) : null;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao acessar a URL: ${response.status}`);
    }

    const html = await response.text();
    
    // Extrair título dos meta tags Open Graph
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const title = ogTitleMatch ? ogTitleMatch[1].trim() : '';
    
    // Extrair imagem dos meta tags Open Graph
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const imageUrl = ogImageMatch ? ogImageMatch[1] : null;
    
    // Extrair descrição dos meta tags Open Graph
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    let description = ogDescMatch ? ogDescMatch[1].trim() : '';
    
    // Se não tiver descrição, criar uma breve
    if (!description) {
      description = "Confira esta notícia no site da CESURG";
    }

    // Não vamos extrair data - deixar sem data de publicação
    let publishedAt = null;
    console.log(`Importando notícia sem data de publicação: ${url}`);
    
    return {
      title,
      description,
      content: description, // Conteúdo simples já que vai abrir no site original
      imageUrl,
      publishedAt,
    };
  } catch (error) {
    console.error('Erro ao extrair notícia da CESURG:', error);
    throw error;
  }
}

// Função para importar últimas notícias da CESURG
async function importLatestCesurgNews() {
  try {
    // URLs das notícias mais recentes da CESURG (baseado em IDs reais encontrados)
    const testUrls = [
      'https://cesurgmarau.com.br/noticia/516/aplicativo-auxilia-aprendizagem-de-exatas-no-colegio-integrado-cesurg',
      'https://cesurgmarau.com.br/noticia/515/curso-de-comunicacao-eficaz-e-concluido-com-sucesso-na-faculdade-cesurg-marau',
      'https://cesurgmarau.com.br/noticia/514/engenharia-mecanica-cesurg-entrega-cadeiras-de-rodas-adaptadas-e-andador-a-apae-de-marau',
      'https://cesurgmarau.com.br/noticia/513/faculdade-cesurg-marau-realiza-competicao-de-superpontes-de-espaguete',
      'https://cesurgmarau.com.br/noticia/512/curso-de-formacao-continuada-da-faculdade-cesurg-marau-reune-gestores-escolares-da-regiao',
    ];
    
    const importedNews = [];
    
    for (const url of testUrls) {
      try {
        // Verificar se já existe notícia com essa URL
        const existingNews = await storage.getNewsBySourceUrl(url);
        if (existingNews) {
          console.log(`Notícia já existe: ${url}`);
          continue;
        }
        
        // Extrair informações da notícia
        const newsData = await extractCesurgNews(url);
        
        if (newsData.title && newsData.content) {
          const insertData: InsertNews = {
            title: newsData.title,
            description: newsData.description,
            content: newsData.content,
            sourceUrl: url,
            imageUrl: newsData.imageUrl,
            creatorId: 1, // Usar o primeiro admin como criador
            isPublished: true,
            publishedAt: newsData.publishedAt,
          };
          
          const newNews = await storage.createNews(insertData);
          importedNews.push(newNews);
          console.log(`Notícia importada: ${newsData.title}`);
        }
      } catch (error) {
        console.error(`Erro ao importar notícia ${url}:`, error);
        // Continuar com as próximas URLs mesmo se uma falhar
      }
    }
    
    return importedNews;
  } catch (error) {
    console.error('Erro ao importar notícias da CESURG:', error);
    throw error;
  }
}

// Configurar o multer para upload de imagens
const uploadDir = path.join(process.cwd(), "public", "uploads", "news");

// Certifique-se de que o diretório existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar apenas imagens
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage: storage2,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Middleware para verificar autenticação
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Não autenticado" });
};

// Middleware para verificar se é administrador
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (
    req.isAuthenticated && 
    req.isAuthenticated() && 
    req.user && 
    (req.user.role === "admin" || req.user.role === "superadmin")
  ) {
    return next();
  }
  return res.status(403).json({ error: "Acesso negado" });
};

const router = Router();

// Rotas para Categorias de Notícias (somente admin)
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await storage.getAllNewsCategories();
    res.json(categories);
  } catch (error) {
    console.error("Erro ao buscar categorias de notícias:", error);
    res.status(500).json({ error: "Erro ao buscar categorias de notícias" });
  }
});

router.get("/categories/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const category = await storage.getNewsCategory(id);
    if (!category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    res.json(category);
  } catch (error) {
    console.error("Erro ao buscar categoria:", error);
    res.status(500).json({ error: "Erro ao buscar categoria" });
  }
});

router.post("/categories", isAdmin, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Nome da categoria é obrigatório" });
    }

    const newCategory = await storage.createNewsCategory({ name });
    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    res.status(500).json({ error: "Erro ao criar categoria" });
  }
});

router.put("/categories/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Nome da categoria é obrigatório" });
    }

    const category = await storage.getNewsCategory(id);
    if (!category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    const updatedCategory = await storage.updateNewsCategory(id, { name });
    res.json(updatedCategory);
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    res.status(500).json({ error: "Erro ao atualizar categoria" });
  }
});

router.delete("/categories/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const category = await storage.getNewsCategory(id);
    if (!category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    // Verificar se há notícias usando esta categoria antes de excluir
    const allNews = await storage.getAllNews(true);
    const hasNews = allNews.some(news => news.categoryId === id);
    
    if (hasNews) {
      return res.status(400).json({ 
        error: "Não é possível excluir esta categoria pois existem notícias associadas a ela" 
      });
    }

    const success = await storage.deleteNewsCategory(id);
    if (success) {
      res.json({ message: "Categoria excluída com sucesso" });
    } else {
      res.status(500).json({ error: "Erro ao excluir categoria" });
    }
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    res.status(500).json({ error: "Erro ao excluir categoria" });
  }
});

// Rotas para Notícias
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeUnpublished = req.query.includeUnpublished === "true" && 
      req.isAuthenticated && 
      req.isAuthenticated() && 
      req.user && 
      (req.user.role === "admin" || req.user.role === "superadmin");
    
    const news = await storage.getAllNews(includeUnpublished);
    res.json(news);
  } catch (error) {
    console.error("Erro ao buscar notícias:", error);
    res.status(500).json({ error: "Erro ao buscar notícias" });
  }
});

router.get("/latest/:limit", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.params.limit) || 5;
    const latestNews = await storage.getLatestNews(limit);
    res.json(latestNews);
  } catch (error) {
    console.error("Erro ao buscar últimas notícias:", error);
    res.status(500).json({ error: "Erro ao buscar últimas notícias" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const newsItem = await storage.getNewsById(id);
    if (!newsItem) {
      return res.status(404).json({ error: "Notícia não encontrada" });
    }

    // Verificar se o usuário pode ver notícias não publicadas
    if (!newsItem.isPublished) {
      const isAdminUser = req.isAuthenticated && 
        req.isAuthenticated() && 
        req.user && 
        (req.user.role === "admin" || req.user.role === "superadmin");
      
      if (!isAdminUser) {
        return res.status(404).json({ error: "Notícia não encontrada" });
      }
    }

    res.json(newsItem);
  } catch (error) {
    console.error("Erro ao buscar notícia:", error);
    res.status(500).json({ error: "Erro ao buscar notícia" });
  }
});

// Rota para importar notícia da CESURG
router.post("/import-cesurg", isAdmin, async (req: Request, res: Response) => {
  try {
    const { url, categoryId } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: "URL da notícia é obrigatória" 
      });
    }

    // Verificar se a notícia já existe
    const existingNews = await storage.getNewsBySourceUrl(url);
    if (existingNews) {
      return res.status(400).json({ 
        error: "Esta notícia já foi importada" 
      });
    }

    // Extrair informações da notícia
    const extractedData = await extractCesurgNews(url);
    
    if (!extractedData.title || !extractedData.content) {
      return res.status(400).json({ 
        error: "Não foi possível extrair informações da notícia" 
      });
    }

    const newsData: InsertNews = {
      title: extractedData.title,
      description: extractedData.description,
      content: extractedData.content,
      sourceUrl: url,
      imageUrl: extractedData.imageUrl,
      creatorId: req.user.id,
      isPublished: true,
      publishedAt: extractedData.publishedAt,
    };

    // Se tiver categoria, adicionar
    if (categoryId) {
      const categoryIdNum = parseInt(categoryId);
      if (!isNaN(categoryIdNum)) {
        const category = await storage.getNewsCategory(categoryIdNum);
        if (category) {
          newsData.categoryId = categoryIdNum;
        }
      }
    }

    const newNews = await storage.createNews(newsData);
    res.status(201).json(newNews);
  } catch (error) {
    console.error("Erro ao importar notícia:", error);
    res.status(500).json({ error: error.message || "Erro ao importar notícia" });
  }
});

// Rota para importar últimas notícias da CESURG
router.post("/import-latest-cesurg", isAdmin, async (req: Request, res: Response) => {
  try {
    const importedNews = await importLatestCesurgNews();
    
    res.status(200).json({ 
      message: `${importedNews.length} notícias importadas com sucesso`,
      news: importedNews 
    });
  } catch (error) {
    console.error("Erro ao importar notícias da CESURG:", error);
    res.status(500).json({ error: "Erro ao importar notícias da CESURG" });
  }
});

router.post("/", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { title, description, content, categoryId } = req.body;
    
    if (!title || !description || !content) {
      return res.status(400).json({ 
        error: "Título, descrição e conteúdo são obrigatórios" 
      });
    }

    const newsData: InsertNews = {
      title,
      description,
      content,
      creatorId: req.user.id,
      isPublished: req.body.isPublished === "true",
    };

    // Se tiver categoria, adicionar
    if (categoryId) {
      const categoryIdNum = parseInt(categoryId);
      if (!isNaN(categoryIdNum)) {
        const category = await storage.getNewsCategory(categoryIdNum);
        if (category) {
          newsData.categoryId = categoryIdNum;
        }
      }
    }

    // Se a notícia for publicada, definir a data de publicação
    if (newsData.isPublished) {
      newsData.publishedAt = new Date();
    }

    // Se tiver imagem, adicionar o caminho
    if (req.file) {
      const relativePath = `/uploads/news/${req.file.filename}`;
      newsData.imageUrl = relativePath;
    }

    const newNews = await storage.createNews(newsData);
    res.status(201).json(newNews);
  } catch (error) {
    console.error("Erro ao criar notícia:", error);
    res.status(500).json({ error: "Erro ao criar notícia" });
  }
});

router.put("/:id", isAdmin, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const newsItem = await storage.getNewsById(id);
    if (!newsItem) {
      return res.status(404).json({ error: "Notícia não encontrada" });
    }

    const { title, description, content, categoryId } = req.body;
    
    const newsData: Partial<InsertNews> = {};

    if (title) newsData.title = title;
    if (description) newsData.description = description;
    if (content) newsData.content = content;

    // Se tiver categoria, atualizar
    if (categoryId) {
      const categoryIdNum = parseInt(categoryId);
      if (!isNaN(categoryIdNum)) {
        const category = await storage.getNewsCategory(categoryIdNum);
        if (category) {
          newsData.categoryId = categoryIdNum;
        }
      } else if (categoryId === "null") {
        newsData.categoryId = null;
      }
    }

    // Se tiver imagem, atualizar o caminho
    if (req.file) {
      const relativePath = `/uploads/news/${req.file.filename}`;
      newsData.imageUrl = relativePath;

      // Remover imagem antiga se existir
      if (newsItem.imageUrl) {
        const oldImagePath = path.join(process.cwd(), "public", newsItem.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const updatedNews = await storage.updateNews(id, newsData);
    res.json(updatedNews);
  } catch (error) {
    console.error("Erro ao atualizar notícia:", error);
    res.status(500).json({ error: "Erro ao atualizar notícia" });
  }
});

router.post("/:id/publish", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const newsItem = await storage.getNewsById(id);
    if (!newsItem) {
      return res.status(404).json({ error: "Notícia não encontrada" });
    }

    const publishedNews = await storage.publishNews(id);
    res.json(publishedNews);
  } catch (error) {
    console.error("Erro ao publicar notícia:", error);
    res.status(500).json({ error: "Erro ao publicar notícia" });
  }
});

router.post("/:id/unpublish", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const newsItem = await storage.getNewsById(id);
    if (!newsItem) {
      return res.status(404).json({ error: "Notícia não encontrada" });
    }

    const unpublishedNews = await storage.unpublishNews(id);
    res.json(unpublishedNews);
  } catch (error) {
    console.error("Erro ao despublicar notícia:", error);
    res.status(500).json({ error: "Erro ao despublicar notícia" });
  }
});

router.delete("/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const newsItem = await storage.getNewsById(id);
    if (!newsItem) {
      return res.status(404).json({ error: "Notícia não encontrada" });
    }

    // Remover imagem se existir
    if (newsItem.imageUrl) {
      const imagePath = path.join(process.cwd(), "public", newsItem.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    const success = await storage.deleteNews(id);
    if (success) {
      res.json({ message: "Notícia excluída com sucesso" });
    } else {
      res.status(500).json({ error: "Erro ao excluir notícia" });
    }
  } catch (error) {
    console.error("Erro ao excluir notícia:", error);
    res.status(500).json({ error: "Erro ao excluir notícia" });
  }
});

export default router;