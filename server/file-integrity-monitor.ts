import fs from "fs";
import path from "path";
import { storage } from "./storage";
import cron from "node-cron";

interface IntegrityCheck {
  timestamp: Date;
  totalFiles: number;
  orphanedRecords: number;
  orphanedFiles: number;
  issues: string[];
}

export class FileIntegrityMonitor {
  private static instance: FileIntegrityMonitor;
  private uploadsPath = path.join(process.cwd(), "public", "uploads", "materials");
  
  static getInstance(): FileIntegrityMonitor {
    if (!FileIntegrityMonitor.instance) {
      FileIntegrityMonitor.instance = new FileIntegrityMonitor();
    }
    return FileIntegrityMonitor.instance;
  }

  async checkIntegrity(): Promise<IntegrityCheck> {
    const result: IntegrityCheck = {
      timestamp: new Date(),
      totalFiles: 0,
      orphanedRecords: 0,
      orphanedFiles: 0,
      issues: []
    };

    try {
      // Buscar todos os registros de arquivos no banco
      const dbFiles = await storage.getAllMaterialFiles();
      result.totalFiles = dbFiles.length;

      // Verificar arquivos órfãos no banco (sem arquivo físico)
      for (const dbFile of dbFiles) {
        if (dbFile.fileUrl) {
          const filePath = path.join(process.cwd(), "public", dbFile.fileUrl);
          if (!fs.existsSync(filePath)) {
            result.orphanedRecords++;
            result.issues.push(`Arquivo órfão no banco: ID ${dbFile.id} - ${dbFile.name} (${dbFile.fileUrl})`);
            
            // Opcionalmente, remover registro órfão automaticamente
            console.warn(`🚨 ARQUIVO ÓRFÃO DETECTADO: ID ${dbFile.id} - ${dbFile.name}`);
          }
        }
      }

      // Verificar arquivos físicos órfãos (sem registro no banco)
      if (fs.existsSync(this.uploadsPath)) {
        const physicalFiles = fs.readdirSync(this.uploadsPath);
        const dbFileUrls = dbFiles
          .filter(f => f.fileUrl)
          .map(f => path.basename(f.fileUrl!));

        for (const physicalFile of physicalFiles) {
          if (!dbFileUrls.includes(physicalFile)) {
            result.orphanedFiles++;
            result.issues.push(`Arquivo físico órfão: ${physicalFile}`);
            console.warn(`🚨 ARQUIVO FÍSICO ÓRFÃO: ${physicalFile}`);
          }
        }
      }

      // Log do resultado
      if (result.issues.length === 0) {
        console.log(`✅ Verificação de integridade OK - ${result.totalFiles} arquivos verificados`);
      } else {
        console.error(`❌ Problemas de integridade detectados:`, result.issues);
      }

      return result;
    } catch (error) {
      console.error("Erro na verificação de integridade:", error);
      result.issues.push(`Erro na verificação: ${error}`);
      return result;
    }
  }

  async createFileBackup(): Promise<void> {
    try {
      const backupDir = path.join(process.cwd(), "backups", "files");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `files-backup-${timestamp}.tar`);

      // Criar backup usando tar (mais eficiente que copiar arquivo por arquivo)
      const { execSync } = require('child_process');
      execSync(`tar -cf "${backupPath}" -C "${this.uploadsPath}" .`);
      
      console.log(`📦 Backup de arquivos criado: ${backupPath}`);
    } catch (error) {
      console.error("Erro ao criar backup de arquivos:", error);
    }
  }

  startMonitoring(): void {
    // Verificação de integridade a cada hora
    cron.schedule('0 * * * *', () => {
      console.log('🔍 Iniciando verificação de integridade automática...');
      this.checkIntegrity();
    });

    // Backup diário às 2h da madrugada
    cron.schedule('0 2 * * *', () => {
      console.log('📦 Iniciando backup automático de arquivos...');
      this.createFileBackup();
    });

    console.log('🛡️ Monitoramento de integridade de arquivos iniciado');
  }

  async emergencyRestore(backupFile: string): Promise<void> {
    try {
      const backupPath = path.join(process.cwd(), "backups", "files", backupFile);
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup não encontrado: ${backupPath}`);
      }

      // Restaurar arquivos do backup
      const { execSync } = require('child_process');
      execSync(`tar -xf "${backupPath}" -C "${this.uploadsPath}"`);
      
      console.log(`🔄 Arquivos restaurados do backup: ${backupFile}`);
    } catch (error) {
      console.error("Erro na restauração de emergência:", error);
      throw error;
    }
  }
}

// Exportar instância singleton
export const fileIntegrityMonitor = FileIntegrityMonitor.getInstance();