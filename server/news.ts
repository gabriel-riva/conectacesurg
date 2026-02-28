import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { InsertNews, InsertNewsCategory } from "@shared/schema";

const CESURG_API_BASE = 'https://www.cesurgmarau.com.br/api/site';
const CESURG_UPLOAD_BASE = 'https://www.cesurgmarau.com.br/upload/noticia';

// Função para buscar detalhes de uma notícia da CESURG via API
async function fetchCesurgNewsDetail(cesurgId: number) {
  // Tentar até 2 vezes com delay entre tentativas
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Tentativa ${attempt + 1} para notícia ${cesurgId}...`);
      }
      const response = await fetch(`${CESURG_API_BASE}/noticia/${cesurgId}`);
      if (!response.ok) {
        throw new Error(`Erro ao acessar API da CESURG: ${response.status}`);
      }
      const data = await response.json();
      return parseCesurgNewsData(data);
    } catch (error: any) {
      lastError = error;
    }
  }
  throw lastError;
}

function parseCesurgNewsData(data: any) {

  const title = data.titulo || '';
  const content = data.texto || '';
  // Criar descrição a partir do texto HTML (remover tags e pegar primeiros 200 chars)
  const plainText = content.replace(/<[^>]+>/g, '').trim();
  const description = plainText.substring(0, 200) || 'Confira esta notícia no site da CESURG';

  // Montar URL da imagem
  let imageUrl = null;
  if (data.imagem) {
    imageUrl = `${CESURG_UPLOAD_BASE}/${data.imagem}`;
  } else if (data.fotos && data.fotos.length > 0) {
    imageUrl = `${CESURG_UPLOAD_BASE}/${data.fotos[0].nome}`;
  }

  // Parsear data no formato DD/MM/YYYY
  let publishedAt: Date | null = null;
  if (data.data) {
    const [day, month, year] = data.data.split('/');
    if (day && month && year) {
      publishedAt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }

  return {
    cesurgId: data.id,
    title,
    description,
    content,
    imageUrl,
    publishedAt,
  };
}

// Função para extrair informações da notícia da CESURG a partir de uma URL
async function extractCesurgNews(url: string) {
  try {
    // Validar URL
    if (!url.includes('cesurgmarau.com.br/noticia/')) {
      throw new Error('URL deve ser de uma notícia da CESURG');
    }

    // Extrair ID da notícia da URL
    const urlIdMatch = url.match(/\/noticia\/(\d+)/);
    if (!urlIdMatch) {
      throw new Error('Não foi possível extrair o ID da notícia da URL');
    }
    const cesurgId = parseInt(urlIdMatch[1]);

    return await fetchCesurgNewsDetail(cesurgId);
  } catch (error) {
    console.error('Erro ao extrair notícia da CESURG:', error);
    throw error;
  }
}

// Helper: delay entre requests para evitar rate limiting
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para importar últimas notícias da CESURG via API real
async function importLatestCesurgNews() {
  const errors: string[] = [];
  const skipped: string[] = [];

  try {
    // Buscar as últimas 10 notícias da API da CESURG
    console.log(`Buscando notícias de: ${CESURG_API_BASE}/noticias?page=1&rowsPerPage=10`);
    const response = await fetch(`${CESURG_API_BASE}/noticias?page=1&rowsPerPage=10`);
    if (!response.ok) {
      throw new Error(`Erro ao acessar API da CESURG: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    const cesurgNewsList = result.data || [];

    console.log(`CESURG API retornou ${cesurgNewsList.length} notícias`);

    // Primeiro, filtrar quais notícias ainda não existem no banco
    const newItems = [];
    for (const cesurgItem of cesurgNewsList) {
      const sourceUrl = `https://www.cesurgmarau.com.br/noticia/${cesurgItem.id}`;
      const existingNews = await storage.getNewsBySourceUrl(sourceUrl);
      if (existingNews) {
        skipped.push(`${cesurgItem.id}: ${cesurgItem.titulo} (já existe)`);
        continue;
      }
      newItems.push({ ...cesurgItem, sourceUrl });
    }

    console.log(`${newItems.length} notícias novas para importar, ${skipped.length} já existentes`);

    const importedNews = [];

    for (let i = 0; i < newItems.length; i++) {
      const cesurgItem = newItems[i];
      try {
        // Delay entre requests para evitar rate limiting da API da CESURG
        if (i > 0) {
          await delay(500);
        }

        // Buscar detalhes completos da notícia
        console.log(`Buscando detalhes da notícia ${cesurgItem.id} (${i + 1}/${newItems.length})...`);
        const newsData = await fetchCesurgNewsDetail(cesurgItem.id);

        if (newsData.title && newsData.content) {
          // Usar imagem da listagem como fallback (a listagem sempre tem imagem)
          let imageUrl = newsData.imageUrl;
          if (!imageUrl && cesurgItem.imagem) {
            imageUrl = `${CESURG_UPLOAD_BASE}/${cesurgItem.imagem}`;
          }

          const insertData: any = {
            title: newsData.title,
            description: newsData.description,
            content: newsData.content,
            sourceUrl: cesurgItem.sourceUrl,
            imageUrl: imageUrl,
            creatorId: 1,
            isPublished: true,
          };

          // Setar publishedAt se tiver data
          if (newsData.publishedAt) {
            insertData.publishedAt = newsData.publishedAt;
          }

          const newNews = await storage.createNews(insertData);
          importedNews.push(newNews);
          console.log(`Notícia importada com sucesso: ${newsData.title}`);
        } else {
          const msg = `${cesurgItem.id}: sem título ou conteúdo (title=${!!newsData.title}, content_len=${newsData.content?.length || 0})`;
          errors.push(msg);
          console.log(msg);
        }
      } catch (error: any) {
        const msg = `${cesurgItem.id} (${cesurgItem.titulo}): ${error?.message || String(error)}`;
        errors.push(msg);
        console.error(`Erro ao importar notícia:`, msg);
      }
    }

    return { importedNews, errors, skipped, totalFromApi: cesurgNewsList.length };
  } catch (error: any) {
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

    // Extrair informações da notícia via API
    const extractedData = await extractCesurgNews(url);

    if (!extractedData.title || !extractedData.content) {
      return res.status(400).json({
        error: "Não foi possível extrair informações da notícia"
      });
    }

    // Normalizar sourceUrl para formato consistente
    const sourceUrl = `https://www.cesurgmarau.com.br/noticia/${extractedData.cesurgId}`;

    // Verificar se a notícia já existe (checar tanto a URL original quanto a normalizada)
    const existingNews = await storage.getNewsBySourceUrl(sourceUrl) || await storage.getNewsBySourceUrl(url);
    if (existingNews) {
      return res.status(400).json({
        error: "Esta notícia já foi importada"
      });
    }

    const newsData: InsertNews = {
      title: extractedData.title,
      description: extractedData.description,
      content: extractedData.content,
      sourceUrl: sourceUrl,
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
    const result = await importLatestCesurgNews();

    res.status(200).json({
      message: `${result.importedNews.length} notícias importadas com sucesso`,
      news: result.importedNews,
      debug: {
        totalFromApi: result.totalFromApi,
        imported: result.importedNews.length,
        skipped: result.skipped,
        errors: result.errors,
      }
    });
  } catch (error: any) {
    console.error("Erro ao importar notícias da CESURG:", error);
    res.status(500).json({ error: error?.message || "Erro ao importar notícias da CESURG" });
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