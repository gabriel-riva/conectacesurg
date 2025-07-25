#!/usr/bin/env node

/**
 * Agendador de Backups Automáticos para Portal Conecta CESURG
 * 
 * Este script configura e executa backups automáticos em intervalos programados
 */

import cron from 'node-cron';
import { runBackup } from './backup.js';

/**
 * Configurações de agendamento
 */
const BACKUP_SCHEDULES = {
  // Backup diário às 2:00 AM
  daily: {
    schedule: '0 2 * * *',
    description: 'Backup diário às 02:00'
  },
  
  // Backup a cada 6 horas
  sixHourly: {
    schedule: '0 */6 * * *', 
    description: 'Backup a cada 6 horas'
  },
  
  // Backup a cada 12 horas
  twelveHourly: {
    schedule: '0 */12 * * *',
    description: 'Backup a cada 12 horas'
  },
  
  // Backup semanal domingo às 3:00 AM
  weekly: {
    schedule: '0 3 * * 0',
    description: 'Backup semanal domingos às 03:00'
  }
};

/**
 * Executa backup com tratamento de erros
 */
async function executeBackupSafely(scheduleName) {
  try {
    console.log(`\n🕐 Iniciando backup agendado: ${scheduleName}`);
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}`);
    
    await runBackup();
    
    console.log(`✅ Backup agendado '${scheduleName}' concluído com sucesso`);
    
    // Log para monitoramento
    const logEntry = {
      timestamp: new Date().toISOString(),
      schedule: scheduleName,
      status: 'success',
      message: 'Backup completed successfully'
    };
    
    console.log('📊 Log:', JSON.stringify(logEntry));
    
  } catch (error) {
    console.error(`❌ Erro no backup agendado '${scheduleName}':`, error.message);
    
    // Log de erro para monitoramento
    const errorLog = {
      timestamp: new Date().toISOString(),
      schedule: scheduleName,
      status: 'error',
      error: error.message
    };
    
    console.error('📊 Error Log:', JSON.stringify(errorLog));
  }
}

/**
 * Inicia o agendador de backups
 */
function startBackupScheduler(scheduleType = 'daily') {
  const config = BACKUP_SCHEDULES[scheduleType];
  
  if (!config) {
    console.error(`❌ Tipo de agendamento inválido: ${scheduleType}`);
    console.log('Tipos disponíveis:', Object.keys(BACKUP_SCHEDULES).join(', '));
    process.exit(1);
  }
  
  console.log('🤖 Iniciando Agendador de Backups Automáticos');
  console.log('=' .repeat(60));
  console.log(`📋 Configuração: ${config.description}`);
  console.log(`⏰ Cron: ${config.schedule}`);
  console.log(`🚀 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  console.log('=' .repeat(60));
  
  // Agendar backup
  const task = cron.schedule(config.schedule, () => {
    executeBackupSafely(scheduleType);
  }, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });
  
  console.log('✅ Agendador ativo e funcionando');
  console.log('📌 Para parar o agendador, pressione Ctrl+C');
  
  // Backup imediato se solicitado
  if (process.argv.includes('--immediate')) {
    console.log('\n🚀 Executando backup imediato...');
    executeBackupSafely('immediate');
  }
  
  // Manter o processo ativo
  process.on('SIGINT', () => {
    console.log('\n🛑 Parando agendador de backups...');
    task.stop();
    console.log('✅ Agendador parado');
    process.exit(0);
  });
  
  return task;
}

/**
 * Mostra status dos agendamentos
 */
function showScheduleInfo() {
  console.log('📋 Opções de Agendamento de Backup Disponíveis:\n');
  
  Object.entries(BACKUP_SCHEDULES).forEach(([key, config]) => {
    console.log(`🔸 ${key}:`);
    console.log(`   Descrição: ${config.description}`);
    console.log(`   Cron: ${config.schedule}`);
    console.log('');
  });
  
  console.log('💡 Uso:');
  console.log('   node scripts/backup-scheduler.js [tipo]');
  console.log('   node scripts/backup-scheduler.js daily --immediate');
  console.log('');
}

// Processar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showScheduleInfo();
  process.exit(0);
}

if (args.includes('--info')) {
  showScheduleInfo();
  process.exit(0);
}

// Executar agendador se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const scheduleType = args[0] || 'daily';
  startBackupScheduler(scheduleType);
}

export { startBackupScheduler, executeBackupSafely, BACKUP_SCHEDULES };