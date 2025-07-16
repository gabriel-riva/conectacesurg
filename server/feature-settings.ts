import { Router, Request, Response } from 'express';
import { db } from './db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.user) {
    next();
  } else {
    res.status(401).json({ error: 'Não autorizado' });
  }
};

// Middleware para verificar se o usuário é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado' });
  }
};

// GET /api/feature-settings - Listar todas as configurações
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await db.query.featureSettings.findMany({
      with: {
        lastUpdatedBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: schema.featureSettings.featureName,
    });

    res.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/feature-settings/check/:featureName - Verificar se uma funcionalidade está habilitada
router.get('/check/:featureName', async (req: Request, res: Response) => {
  try {
    const { featureName } = req.params;
    
    const setting = await db.query.featureSettings.findFirst({
      where: eq(schema.featureSettings.featureName, featureName),
    });

    if (!setting) {
      return res.json({ isEnabled: true, disabledMessage: null }); // Default: habilitado
    }

    res.json({
      isEnabled: setting.isEnabled,
      disabledMessage: setting.isEnabled ? null : setting.disabledMessage,
    });
  } catch (error) {
    console.error('Erro ao verificar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/feature-settings/:featureName - Atualizar configuração de uma funcionalidade
router.put('/:featureName', isAdmin, async (req: Request, res: Response) => {
  try {
    const { featureName } = req.params;
    const { isEnabled, showInHeader, disabledMessage } = req.body;

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'isEnabled deve ser um boolean' });
    }

    if (showInHeader !== undefined && typeof showInHeader !== 'boolean') {
      return res.status(400).json({ error: 'showInHeader deve ser um boolean' });
    }

    // Verificar se a configuração existe
    const existingSetting = await db.query.featureSettings.findFirst({
      where: eq(schema.featureSettings.featureName, featureName),
    });

    if (existingSetting) {
      // Atualizar configuração existente
      const updateData: any = {
        isEnabled,
        disabledMessage: disabledMessage || 'Em breve, novidades!',
        lastUpdatedBy: req.user!.id,
        updatedAt: new Date(),
      };
      
      if (showInHeader !== undefined) {
        updateData.showInHeader = showInHeader;
      }
      
      await db.update(schema.featureSettings)
        .set(updateData)
        .where(eq(schema.featureSettings.featureName, featureName));
    } else {
      // Criar nova configuração
      await db.insert(schema.featureSettings).values({
        featureName,
        isEnabled,
        showInHeader: showInHeader !== undefined ? showInHeader : true,
        disabledMessage: disabledMessage || 'Em breve, novidades!',
        lastUpdatedBy: req.user!.id,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;