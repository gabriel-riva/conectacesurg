#!/usr/bin/env node

/**
 * Serviço de Backup Automático - Portal Conecta CESURG
 * Configurado para executar backups 2 vezes por dia (02:00 e 14:00)
 */

import cron from 'node-cron';
import { runBackup } from './backup.js';

/**
 * Executa backup com tratamento de erros e logs detalhados
 */
async function executeScheduledBackup(scheduleName, time) {
  try {
    console.log(`\n🕐 Iniciando backup agendado: ${scheduleName}`);
    console.log(`⏰ Horário: ${time}`);
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}`);
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    await runBackup();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('=' .repeat(50));
    console.log(`✅ Backup agendado '${scheduleName}' concluído com sucesso`);
    console.log(`⏱️ Tempo de execução: ${duration}s`);
    
    // Log estruturado para monitoramento
    const logEntry = {
      timestamp: new Date().toISOString(),
      schedule: scheduleName,
      time: time,
      status: 'success',
      duration: `${duration}s`,
      message: 'Backup completed successfully'
    };
    
    console.log('📊 Log de Sucesso:', JSON.stringify(logEntry, null, 2));
    
  } catch (error) {
    console.error(`❌ Erro no backup agendado '${scheduleName}':`, error.message);
    
    // Log de erro estruturado
    const errorLog = {
      timestamp: new Date().toISOString(),
      schedule: scheduleName,
      time: time,
      status: 'error',
      error: error.message,
      stack: error.stack
    };
    
    console.error('📊 Log de Erro:', JSON.stringify(errorLog, null, 2));
  }
}

/**
 * Inicia o serviço de backup automático
 */
function startBackupService() {
  console.log('🤖 Iniciando Serviço de Backup Automático');
  console.log('🏥 Portal Conecta CESURG');
  console.log('=' .repeat(60));
  console.log('📋 Configuração: 2 backups diários');
  console.log('🌅 Backup Matutino: 02:00 (horário do servidor)');
  console.log('🌞 Backup Vespertino: 14:00 (horário do servidor)');
  console.log('🕰️ Timezone: America/Sao_Paulo');
  console.log(`🚀 Serviço iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  console.log('=' .repeat(60));
  
  // Backup às 02:00 (madrugada)
  const morningTask = cron.schedule('0 2 * * *', () => {
    executeScheduledBackup('matutino', '02:00');
  }, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });
  
  // Backup às 14:00 (tarde)
  const afternoonTask = cron.schedule('0 14 * * *', () => {
    executeScheduledBackup('vespertino', '14:00');
  }, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });
  
  console.log('✅ Agendamentos configurados:');
  console.log('   🌅 Backup Matutino: ATIVO (02:00)');
  console.log('   🌞 Backup Vespertino: ATIVO (14:00)');
  console.log('');
  console.log('📌 Serviço rodando em segundo plano');
  console.log('📌 Para parar o serviço, pressione Ctrl+C');
  console.log('📌 Para executar backup imediato: node scripts/backup.js');
  
  // Executar backup imediato se solicitado
  if (process.argv.includes('--immediate')) {
    console.log('\n🚀 Executando backup imediato...');
    executeScheduledBackup('imediato', 'agora');
  }
  
  // Status do próximo backup
  const now = new Date();
  const nextMorning = new Date();
  nextMorning.setHours(2, 0, 0, 0);
  if (nextMorning <= now) {
    nextMorning.setDate(nextMorning.getDate() + 1);
  }
  
  const nextAfternoon = new Date();
  nextAfternoon.setHours(14, 0, 0, 0);
  if (nextAfternoon <= now) {
    nextAfternoon.setDate(nextAfternoon.getDate() + 1);
  }
  
  const nextBackup = nextMorning < nextAfternoon ? nextMorning : nextAfternoon;
  const timeUntilNext = Math.round((nextBackup - now) / 1000 / 60 / 60 * 10) / 10;
  
  console.log(`⏳ Próximo backup em: ${timeUntilNext}h (${nextBackup.toLocaleString('pt-BR')})`);
  
  // Manter o processo ativo
  process.on('SIGINT', () => {
    console.log('\n🛑 Parando serviço de backup...');
    morningTask.stop();
    afternoonTask.stop();
    console.log('✅ Serviço de backup parado');
    console.log('👋 Até logo!');
    process.exit(0);
  });
  
  // Retornar as tasks para controle externo se necessário
  return { morningTask, afternoonTask };
}

// Executar serviço se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  startBackupService();
}

export { startBackupService, executeScheduledBackup };