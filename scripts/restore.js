#!/usr/bin/env node

/**
 * Sistema de Restauração para Portal Conecta CESURG
 * 
 * Este script restaura backups completos dos dados:
 * - Banco de dados PostgreSQL (import SQL)
 * - Arquivos uploaded pelos usuários
 * - Configurações do sistema
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DATABASE_URL = process.env.DATABASE_URL;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Faz uma pergunta ao usuário
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Executa comando e retorna Promise
 */
function executeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Executando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

/**
 * Lista backups disponíveis
 */
function listAvailableBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('❌ Diretório de backup não encontrado');
    return { databases: [], uploads: [], configs: [] };
  }

  const files = fs.readdirSync(BACKUP_DIR);
  
  const databases = files.filter(f => f.startsWith('database_') && f.endsWith('.sql'));
  const uploads = files.filter(f => f.startsWith('uploads_') && f.endsWith('.tar.gz'));
  const configs = files.filter(f => f.startsWith('config_') && f.endsWith('.json'));

  return { databases, uploads, configs };
}

/**
 * Mostra backups disponíveis
 */
function displayBackups(backups) {
  console.log('\n📋 Backups disponíveis:\n');
  
  if (backups.databases.length > 0) {
    console.log('🗄️ Banco de Dados:');
    backups.databases.forEach((file, index) => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const date = stats.mtime.toLocaleString('pt-BR');
      console.log(`   ${index + 1}. ${file} (${size} MB - ${date})`);
    });
  }
  
  if (backups.uploads.length > 0) {
    console.log('\n📁 Arquivos:');
    backups.uploads.forEach((file, index) => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const date = stats.mtime.toLocaleString('pt-BR');
      console.log(`   ${index + 1}. ${file} (${size} MB - ${date})`);
    });
  }
  
  if (backups.configs.length > 0) {
    console.log('\n⚙️ Configurações:');
    backups.configs.forEach((file, index) => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      const date = stats.mtime.toLocaleString('pt-BR');
      console.log(`   ${index + 1}. ${file} (${size} KB - ${date})`);
    });
  }
}

/**
 * Restaura banco de dados
 */
async function restoreDatabase(backupFile) {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada');
  }

  const filePath = path.join(BACKUP_DIR, backupFile);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de backup não encontrado: ${filePath}`);
  }

  console.log(`🗄️ Restaurando banco de dados do arquivo: ${backupFile}`);
  
  // Aviso importante
  console.log('⚠️  ATENÇÃO: Esta operação irá substituir todos os dados atuais do banco!');
  const confirm = await askQuestion('Digite "CONFIRMAR" para continuar: ');
  
  if (confirm !== 'CONFIRMAR') {
    console.log('❌ Operação cancelada pelo usuário');
    return false;
  }

  try {
    // Restaurar banco usando psql
    await executeCommand('psql', [DATABASE_URL, '-f', filePath]);
    
    console.log('✅ Banco de dados restaurado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao restaurar banco:', error.message);
    throw error;
  }
}

/**
 * Restaura arquivos
 */
async function restoreFiles(backupFile) {
  const filePath = path.join(BACKUP_DIR, backupFile);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de backup não encontrado: ${filePath}`);
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  
  console.log(`📁 Restaurando arquivos do backup: ${backupFile}`);
  
  // Aviso importante
  if (fs.existsSync(uploadsDir)) {
    console.log('⚠️  ATENÇÃO: Esta operação irá substituir todos os arquivos atuais!');
    const confirm = await askQuestion('Digite "CONFIRMAR" para continuar: ');
    
    if (confirm !== 'CONFIRMAR') {
      console.log('❌ Operação cancelada pelo usuário');
      return false;
    }
    
    // Fazer backup dos arquivos atuais
    const backupCurrent = path.join(BACKUP_DIR, `uploads_current_backup_${Date.now()}.tar.gz`);
    try {
      await executeCommand('tar', ['-czf', backupCurrent, '-C', path.join(process.cwd(), 'public'), 'uploads']);
      console.log(`📦 Backup dos arquivos atuais criado: ${path.basename(backupCurrent)}`);
    } catch (error) {
      console.log('⚠️  Não foi possível fazer backup dos arquivos atuais');
    }
    
    // Remover diretório atual
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  }

  try {
    // Restaurar arquivos
    await executeCommand('tar', ['-xzf', filePath, '-C', path.join(process.cwd(), 'public')]);
    
    console.log('✅ Arquivos restaurados com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao restaurar arquivos:', error.message);
    throw error;
  }
}

/**
 * Função principal de restauração
 */
async function runRestore() {
  console.log('🔄 Sistema de Restauração - Portal Conecta CESURG');
  console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log('=' .repeat(60));

  try {
    const backups = listAvailableBackups();
    
    if (backups.databases.length === 0 && backups.uploads.length === 0 && backups.configs.length === 0) {
      console.log('❌ Nenhum backup encontrado');
      rl.close();
      return;
    }

    displayBackups(backups);
    
    console.log('\n🔧 Opções de restauração:');
    console.log('1. Restaurar banco de dados');
    console.log('2. Restaurar arquivos');
    console.log('3. Restaurar tudo (banco + arquivos)');
    console.log('4. Sair');
    
    const choice = await askQuestion('\nEscolha uma opção (1-4): ');
    
    switch (choice) {
      case '1':
        if (backups.databases.length === 0) {
          console.log('❌ Nenhum backup de banco encontrado');
          break;
        }
        
        const dbChoice = await askQuestion(`Escolha o backup do banco (1-${backups.databases.length}): `);
        const dbIndex = parseInt(dbChoice) - 1;
        
        if (dbIndex >= 0 && dbIndex < backups.databases.length) {
          await restoreDatabase(backups.databases[dbIndex]);
        } else {
          console.log('❌ Opção inválida');
        }
        break;
        
      case '2':
        if (backups.uploads.length === 0) {
          console.log('❌ Nenhum backup de arquivos encontrado');
          break;
        }
        
        const fileChoice = await askQuestion(`Escolha o backup de arquivos (1-${backups.uploads.length}): `);
        const fileIndex = parseInt(fileChoice) - 1;
        
        if (fileIndex >= 0 && fileIndex < backups.uploads.length) {
          await restoreFiles(backups.uploads[fileIndex]);
        } else {
          console.log('❌ Opção inválida');
        }
        break;
        
      case '3':
        if (backups.databases.length === 0 || backups.uploads.length === 0) {
          console.log('❌ Backups completos não disponíveis');
          break;
        }
        
        console.log('\nRestauração completa:');
        const dbFullChoice = await askQuestion(`Escolha o backup do banco (1-${backups.databases.length}): `);
        const dbFullIndex = parseInt(dbFullChoice) - 1;
        
        const fileFullChoice = await askQuestion(`Escolha o backup de arquivos (1-${backups.uploads.length}): `);
        const fileFullIndex = parseInt(fileFullChoice) - 1;
        
        if (dbFullIndex >= 0 && dbFullIndex < backups.databases.length &&
            fileFullIndex >= 0 && fileFullIndex < backups.uploads.length) {
          
          await restoreDatabase(backups.databases[dbFullIndex]);
          await restoreFiles(backups.uploads[fileFullIndex]);
          
          console.log('🎉 Restauração completa finalizada!');
        } else {
          console.log('❌ Opção inválida');
        }
        break;
        
      case '4':
        console.log('👋 Saindo...');
        break;
        
      default:
        console.log('❌ Opção inválida');
        break;
    }
    
  } catch (error) {
    console.error('❌ Erro durante a restauração:', error.message);
  } finally {
    rl.close();
  }
}

// Executar restauração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runRestore();
}

export { runRestore, restoreDatabase, restoreFiles };