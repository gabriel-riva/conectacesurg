#!/bin/bash

# Script para iniciar o serviço de backup como daemon
# Portal Conecta CESURG - Backup Automático

echo "🚀 Iniciando Serviço de Backup Automático..."
echo "📅 $(date)"

# Verificar se o Node.js está disponível
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se o arquivo de backup existe
if [ ! -f "scripts/start-backup-service.js" ]; then
    echo "❌ Arquivo scripts/start-backup-service.js não encontrado."
    exit 1
fi

# Criar diretório de logs se não existir
mkdir -p logs

# Arquivo de log
LOG_FILE="logs/backup-service.log"

echo "📝 Logs serão salvos em: $LOG_FILE"

# Iniciar o serviço em segundo plano
nohup node scripts/start-backup-service.js >> "$LOG_FILE" 2>&1 &

# Capturar o PID do processo
BACKUP_PID=$!

# Salvar PID em arquivo para controle
echo $BACKUP_PID > backup-service.pid

echo "✅ Serviço de backup iniciado!"
echo "🆔 PID do processo: $BACKUP_PID"
echo "📝 Logs em tempo real: tail -f $LOG_FILE"
echo ""
echo "🛑 Para parar o serviço:"
echo "   kill $BACKUP_PID"
echo "   ou execute: ./stop-backup-daemon.sh"
echo ""
echo "📋 Configuração:"
echo "   🌅 Backup Matutino: 02:00"
echo "   🌞 Backup Vespertino: 14:00"
echo "   🕰️ Timezone: America/Sao_Paulo"

# Verificar se o processo está rodando
sleep 2
if ps -p $BACKUP_PID > /dev/null; then
    echo "✅ Serviço está rodando normalmente"
else
    echo "❌ Erro ao iniciar o serviço. Verifique os logs:"
    echo "   cat $LOG_FILE"
    exit 1
fi