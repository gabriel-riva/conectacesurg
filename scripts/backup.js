#!/usr/bin/env node

/**
 * Sistema de Backup Automático para Portal Conecta CESURG
 * 
 * Este script realiza backup completo dos dados:
 * - Banco de dados PostgreSQL (export SQL)
 * - Arquivos uploaded pelos usuários
 * - Configurações do sistema
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DATABASE_URL = process.env.DATABASE_URL;

// Criar diretório de backup se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Gera timestamp para nomear arquivos de backup
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
         now.toTimeString().split(' ')[0].replace(/:/g, '-');
}

/**
 * Executa comando e retorna Promise
 */
function executeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}: ${error}`));
      }
    });
  });
}

/**
 * Realiza backup do banco de dados
 */
async function backupDatabase() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada');
  }

  const timestamp = getTimestamp();
  const backupFile = path.join(BACKUP_DIR, `database_${timestamp}.sql`);
  
  console.log('🗄️ Iniciando backup do banco de dados...');
  
  try {
    // Usar pg_dump para fazer backup do banco
    await executeCommand('pg_dump', [DATABASE_URL, '-f', backupFile]);
    
    const stats = fs.statSync(backupFile);
    console.log(`✅ Backup do banco concluído: ${backupFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ Erro no backup do banco:', error.message);
    throw error;
  }
}

/**
 * Realiza backup dos arquivos uploaded
 */
async function backupFiles() {
  const timestamp = getTimestamp();
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const backupFile = path.join(BACKUP_DIR, `uploads_${timestamp}.tar.gz`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Diretório de uploads não encontrado, pulando backup de arquivos');
    return null;
  }
  
  console.log('📁 Iniciando backup dos arquivos...');
  
  try {
    // Criar arquivo tar.gz com os uploads
    await executeCommand('tar', ['-czf', backupFile, '-C', path.join(process.cwd(), 'public'), 'uploads']);
    
    const stats = fs.statSync(backupFile);
    console.log(`✅ Backup de arquivos concluído: ${backupFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ Erro no backup de arquivos:', error.message);
    throw error;
  }
}

/**
 * Realiza backup das configurações
 */
async function backupConfig() {
  const timestamp = getTimestamp();
  const configFile = path.join(BACKUP_DIR, `config_${timestamp}.json`);
  
  console.log('⚙️ Iniciando backup das configurações...');
  
  const config = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    backup_type: 'automatic',
    files_included: [
      'package.json',
      'drizzle.config.ts',
      'tailwind.config.ts',
      'vite.config.ts',
      'theme.json'
    ]
  };
  
  // Copiar arquivos de configuração importantes
  const configDir = path.join(BACKUP_DIR, `config_${timestamp}`);
  fs.mkdirSync(configDir, { recursive: true });
  
  const importantFiles = [
    'package.json',
    'drizzle.config.ts',
    'tailwind.config.ts',
    'vite.config.ts',
    'theme.json',
    'replit.md'
  ];
  
  for (const file of importantFiles) {
    const sourcePath = path.join(process.cwd(), file);
    const destPath = path.join(configDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`📋 Copiado: ${file}`);
    }
  }
  
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  console.log(`✅ Backup de configurações concluído: ${configFile}`);
  
  return configFile;
}

/**
 * Remove backups antigos (mantém apenas os últimos 7 dias)
 */
function cleanOldBackups() {
  console.log('🧹 Limpando backups antigos...');
  
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
  
  let removedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
      removedCount++;
      console.log(`🗑️ Removido: ${file}`);
    }
  });
  
  if (removedCount === 0) {
    console.log('✅ Nenhum backup antigo para remover');
  } else {
    console.log(`✅ ${removedCount} backup(s) antigo(s) removido(s)`);
  }
}

/**
 * Função principal de backup
 */
async function runBackup() {
  const startTime = Date.now();
  console.log('🚀 Iniciando backup automático do Portal Conecta CESURG');
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log('=' .repeat(60));
  
  try {
    const results = [];
    
    // Backup do banco de dados
    const dbBackup = await backupDatabase();
    results.push(dbBackup);
    
    // Backup dos arquivos
    const filesBackup = await backupFiles();
    if (filesBackup) results.push(filesBackup);
    
    // Backup das configurações
    const configBackup = await backupConfig();
    results.push(configBackup);
    
    // Limpar backups antigos
    cleanOldBackups();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('=' .repeat(60));
    console.log('🎉 Backup concluído com sucesso!');
    console.log(`⏱️ Tempo total: ${duration}s`);
    console.log(`📦 Arquivos criados: ${results.length}`);
    results.forEach((file, index) => {
      if (file) {
        const stats = fs.statSync(file);
        console.log(`   ${index + 1}. ${path.basename(file)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Erro durante o backup:', error.message);
    process.exit(1);
  }
}

// Executar backup se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup();
}

export { runBackup, backupDatabase, backupFiles, backupConfig };