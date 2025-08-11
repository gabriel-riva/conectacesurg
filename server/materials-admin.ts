import express, { type Request, type Response } from "express";
import { fileIntegrityMonitor } from "./file-integrity-monitor";

const router = express.Router();

// Middleware para verificar se é admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.user || ((req.user as any).role !== "admin" && (req.user as any).role !== "superadmin")) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
};

// Rota para verificação manual de integridade
router.get("/integrity-check", isAdmin, async (req: Request, res: Response) => {
  try {
    const result = await fileIntegrityMonitor.checkIntegrity();
    res.json(result);
  } catch (error) {
    console.error("Erro na verificação de integridade:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota para criar backup manual
router.post("/backup", isAdmin, async (req: Request, res: Response) => {
  try {
    await fileIntegrityMonitor.createFileBackup();
    res.json({ message: "Backup criado com sucesso" });
  } catch (error) {
    console.error("Erro ao criar backup:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota para restaurar backup (USE COM CUIDADO!)
router.post("/restore/:backupFile", isAdmin, async (req: Request, res: Response) => {
  try {
    const { backupFile } = req.params;
    await fileIntegrityMonitor.emergencyRestore(backupFile);
    res.json({ message: "Restauração concluída com sucesso" });
  } catch (error) {
    console.error("Erro na restauração:", error);
    res.status(500).json({ error: "Erro na restauração: " + error });
  }
});

export default router;