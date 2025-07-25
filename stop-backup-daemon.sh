#!/bin/bash

# Script para parar o serviço de backup
# Portal Conecta CESURG - Backup Automático

echo "🛑 Parando Serviço de Backup Automático..."
echo "📅 $(date)"

# Verificar se existe arquivo PID
if [ ! -f "backup-service.pid" ]; then
    echo "❌ Arquivo backup-service.pid não encontrado."
    echo "💡 O serviço pode não estar rodando ou foi iniciado manualmente."
    
    # Tentar encontrar processo pelo nome
    BACKUP_PIDS=$(ps aux | grep 'start-backup-service.js' | grep -v grep | awk '{print $2}')
    
    if [ -n "$BACKUP_PIDS" ]; then
        echo "🔍 Processos de backup encontrados: $BACKUP_PIDS"
        echo "🛑 Tentando parar..."
        
        for pid in $BACKUP_PIDS; do
            kill $pid
            echo "✅ Processo $pid finalizado"
        done
    else
        echo "❌ Nenhum processo de backup encontrado"
    fi
    
    exit 1
fi

# Ler PID do arquivo
BACKUP_PID=$(cat backup-service.pid)

echo "🆔 PID do serviço: $BACKUP_PID"

# Verificar se o processo está rodando
if ps -p $BACKUP_PID > /dev/null; then
    echo "🛑 Parando processo $BACKUP_PID..."
    
    # Tentar parar graciosamente
    kill $BACKUP_PID
    
    # Aguardar um pouco
    sleep 3
    
    # Verificar se parou
    if ps -p $BACKUP_PID > /dev/null; then
        echo "⚠️ Processo não parou graciosamente, forçando..."
        kill -9 $BACKUP_PID
        sleep 1
    fi
    
    # Verificar novamente
    if ps -p $BACKUP_PID > /dev/null; then
        echo "❌ Erro: Não foi possível parar o processo $BACKUP_PID"
        exit 1
    else
        echo "✅ Serviço de backup parado com sucesso"
    fi
else
    echo "⚠️ Processo $BACKUP_PID não está rodando"
fi

# Remover arquivo PID
rm -f backup-service.pid

echo "🧹 Arquivo PID removido"
echo "✅ Finalização completa"
echo ""
echo "💡 Para iniciar novamente: ./start-backup-daemon.sh"