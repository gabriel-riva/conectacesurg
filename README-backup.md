# 🔒 Sistema de Backup Automático - Portal Conecta CESURG

## ✅ Configuração Atual: 2 Backups Diários

O sistema está configurado para executar **2 backups automáticos por dia**:

- 🌅 **Backup Matutino**: 02:00 (madrugada)
- 🌞 **Backup Vespertino**: 14:00 (tarde)

## 🚀 Como Iniciar o Serviço de Backup

### Opção 1: Comando Simples (Recomendado para Replit)
```bash
# Executar backup manual imediato
node scripts/backup.js

# Testar o serviço (executa backup e mostra configuração)
node scripts/start-backup-service.js --immediate
```

### Opção 2: Como Daemon (Para servidores dedicados)
```bash
# Iniciar serviço em segundo plano
./start-backup-daemon.sh

# Parar serviço
./stop-backup-daemon.sh

# Ver logs em tempo real
tail -f logs/backup-service.log
```

## 📋 O que é incluído nos backups:

✅ **Banco de Dados PostgreSQL**
- Todas as tabelas (usuários, materiais, configurações, etc.)
- Dados completos exportados via pg_dump
- Formato: `database_YYYY-MM-DD_HH-MM-SS.sql`

✅ **Arquivos de Usuários** 
- Materiais enviados (`/uploads/materials/`)
- Imagens e documentos
- Compactado: `uploads_YYYY-MM-DD_HH-MM-SS.tar.gz`

✅ **Configurações do Sistema**
- package.json, configs do Tailwind, Vite, etc.
- Arquivo: `config_YYYY-MM-DD_HH-MM-SS.json`

## 🛡️ Recursos de Segurança:

- **Retenção automática**: Mantém backups por 7 dias
- **Limpeza automática**: Remove backups antigos
- **Logs detalhados**: Registra sucesso/erro de cada backup
- **Timezone brasileiro**: Horários em America/Sao_Paulo
- **Verificação de integridade**: Confirma que arquivos foram criados

## 📊 Status dos Backups:

```bash
# Ver backups existentes
ls -la backups/

# Verificar tamanho total dos backups  
du -sh backups/

# Ver último backup
ls -la backups/ | tail -1
```

## 🔄 Como Restaurar Dados:

```bash
# Iniciar assistente de restauração
node scripts/restore.js

# Seguir instruções no terminal:
# 1. Escolher tipo de restauração
# 2. Selecionar arquivo de backup
# 3. Confirmar operação
```

## ⚙️ Configurações Avançadas:

Para alterar horários ou frequência, editar:
- `scripts/start-backup-service.js`
- Linha com `cron.schedule('0 2 * * *', ...)` (02:00)  
- Linha com `cron.schedule('0 14 * * *', ...)` (14:00)

### Exemplos de horários cron:
- `0 */6 * * *` = A cada 6 horas
- `0 2,14,20 * * *` = Às 02:00, 14:00 e 20:00
- `30 1 * * *` = 01:30 da manhã

## 🚨 Em caso de problema:

1. **Backup não está rodando?**
   ```bash
   ps aux | grep backup
   ```

2. **Erro de permissão?**
   ```bash
   chmod +x *.sh
   mkdir -p backups logs
   ```

3. **Erro de banco?**
   - Verificar se `DATABASE_URL` está configurada
   - Testar conexão: `node -e "console.log(process.env.DATABASE_URL ? 'OK' : 'NOT SET')"`

4. **Sem espaço em disco?**
   ```bash
   df -h
   rm backups/database_*  # Remove backups antigos manualmente
   ```

## 📈 Monitoramento:

O sistema gera logs JSON estruturados para monitoramento:

```json
{
  "timestamp": "2025-07-25T05:38:09.074Z",
  "schedule": "vespertino", 
  "time": "14:00",
  "status": "success",
  "duration": "15.40s",
  "message": "Backup completed successfully"
}
```

---

**✅ Sistema configurado e funcionando!**

Próximos backups automáticos: **02:00** e **14:00** todos os dias.