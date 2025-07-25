# Sistema de Backup Automático - Portal Conecta CESURG

## Visão Geral

O Portal Conecta CESURG agora possui um sistema completo de backup automático que protege:

- **Banco de dados PostgreSQL** (todas as tabelas e dados)
- **Arquivos enviados pelos usuários** (materiais, imagens, documentos)
- **Configurações do sistema** (arquivos importantes do projeto)

## Componentes do Sistema

### 1. Script de Backup (`scripts/backup.js`)
Realiza backup completo do sistema:
- Exporta banco de dados usando `pg_dump`
- Compacta arquivos usando `tar.gz`
- Salva configurações importantes
- Remove backups antigos automaticamente (mantém 7 dias)

### 2. Script de Restauração (`scripts/restore.js`)
Permite restaurar backups de forma interativa:
- Lista backups disponíveis
- Permite escolher o que restaurar
- Confirma operações destrutivas
- Faz backup dos dados atuais antes da restauração

### 3. Agendador Automático (`scripts/backup-scheduler.js`)
Executa backups em horários programados:
- Backup diário às 02:00
- Backup a cada 6 ou 12 horas
- Backup semanal aos domingos
- Configuração de timezone para Brasil

## Como Usar

### Backup Manual
```bash
# Executar backup imediato
node scripts/backup.js

# Verificar logs no console
```

### Restauração
```bash
# Iniciar assistente de restauração
node scripts/restore.js

# Seguir as instruções no console
```

### Backup Automático
```bash
# Iniciar agendador diário (padrão)
node scripts/backup-scheduler.js daily

# Iniciar com backup imediato
node scripts/backup-scheduler.js daily --immediate

# Outras opções de agendamento
node scripts/backup-scheduler.js sixHourly
node scripts/backup-scheduler.js twelveHourly
node scripts/backup-scheduler.js weekly

# Ver informações dos agendamentos
node scripts/backup-scheduler.js --info
```

## Estrutura dos Backups

Os backups são salvos na pasta `backups/` com a seguinte estrutura:

```
backups/
├── database_2025-01-25_02-00-00.sql    # Banco de dados
├── uploads_2025-01-25_02-00-00.tar.gz  # Arquivos enviados
├── config_2025-01-25_02-00-00.json     # Metadados
└── config_2025-01-25_02-00-00/         # Arquivos de configuração
    ├── package.json
    ├── drizzle.config.ts
    ├── tailwind.config.ts
    ├── vite.config.ts
    ├── theme.json
    └── replit.md
```

## Recursos de Segurança

### Proteções Implementadas:
- **Confirmação Dupla**: Operações destrutivas exigem confirmação "CONFIRMAR"
- **Backup Preventivo**: Antes de restaurar, faz backup dos dados atuais
- **Validação de Arquivos**: Verifica se os arquivos de backup existem
- **Logs Detalhados**: Registra todas as operações para auditoria
- **Limpeza Automática**: Remove backups antigos para economizar espaço

### Variáveis de Ambiente Necessárias:
- `DATABASE_URL`: URL de conexão com o PostgreSQL (obrigatória)

### Dependências do Sistema:
- `pg_dump` e `psql`: Para backup/restauração do banco
- `tar`: Para compactação/descompactação de arquivos

## Monitoramento

### Logs de Backup
Todos os backups geram logs detalhados:
```
🚀 Iniciando backup automático do Portal Conecta CESURG
📅 Data/Hora: 25/01/2025 02:00:00
============================================================
🗄️ Iniciando backup do banco de dados...
✅ Backup do banco concluído: database_2025-01-25_02-00-00.sql (15.42 MB)
📁 Iniciando backup dos arquivos...
✅ Backup de arquivos concluído: uploads_2025-01-25_02-00-00.tar.gz (8.73 MB)
⚙️ Iniciando backup das configurações...
✅ Backup de configurações concluído: config_2025-01-25_02-00-00.json
🧹 Limpando backups antigos...
✅ 3 backup(s) antigo(s) removido(s)
============================================================
🎉 Backup concluído com sucesso!
⏱️ Tempo total: 12.34s
📦 Arquivos criados: 3
```

### Logs de Erro
Em caso de falhas, são registrados logs detalhados para diagnóstico:
```json
{
  "timestamp": "2025-01-25T02:00:00.000Z",
  "schedule": "daily",
  "status": "error",
  "error": "Connection to database failed"
}
```

## Configuração em Produção

### Para Replit:
1. O sistema funciona automaticamente com PostgreSQL do Neon
2. Não requer configuração adicional de permissões
3. Backups são salvos no storage persistente do Replit

### Para Servidor Próprio:
1. Instalar `postgresql-client` no sistema
2. Configurar `DATABASE_URL` corretamente
3. Dar permissões de escrita na pasta `backups/`
4. Configurar cron job para execução automática:

```bash
# Adicionar ao crontab para backup diário às 2:00
0 2 * * * cd /caminho/para/projeto && node scripts/backup.js
```

## Recuperação de Desastres

Em caso de perda completa de dados:

1. **Verificar Backups Disponíveis**:
   ```bash
   ls -la backups/
   ```

2. **Restaurar Banco de Dados**:
   ```bash
   node scripts/restore.js
   # Escolher opção 1 e selecionar backup mais recente
   ```

3. **Restaurar Arquivos**:
   ```bash
   node scripts/restore.js
   # Escolher opção 2 e selecionar backup correspondente
   ```

4. **Verificar Integridade**:
   - Testar login no sistema
   - Verificar se arquivos estão acessíveis
   - Confirmar dados recentes no banco

## Manutenção

### Tarefas Regulares:
- **Diário**: Verificar se backups automáticos estão funcionando
- **Semanal**: Testar processo de restauração com backup antigo
- **Mensal**: Limpar backups muito antigos manualmente se necessário
- **Trimestral**: Fazer backup adicional em storage externo

### Troubleshooting:
- **Erro de permissão**: Verificar permissões da pasta `backups/`
- **Erro de conexão**: Verificar `DATABASE_URL`
- **Falta de espaço**: Limpar backups antigos manualmente
- **Comando não encontrado**: Instalar `postgresql-client`

## Histórico de Versões

- **v1.0** (Janeiro 2025): Sistema inicial implementado
  - Backup automático completo
  - Restauração interativa
  - Agendamento com cron
  - Limpeza automática de backups antigos