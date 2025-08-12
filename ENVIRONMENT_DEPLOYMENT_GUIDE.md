# 🚀 Guia de Implantação - Separação de Ambientes

## Status Atual ✅
O sistema agora suporta **separação completa** entre desenvolvimento e produção, mantendo **100% de compatibilidade** com o código existente.

## Como Configurar no Replit

### 1️⃣ Configurar Banco de Desenvolvimento

1. Vá para **Secrets** no Replit (ícone de cadeado)
2. Adicione uma nova secret:
   - **Nome**: `DATABASE_URL_DEV`
   - **Valor**: URL do seu banco de desenvolvimento
   
   Exemplo: `postgresql://user:pass@host/conecta_dev?sslmode=require`

### 2️⃣ Configurar Banco de Produção

1. Ainda em **Secrets**, adicione:
   - **Nome**: `DATABASE_URL_PRODUCTION`
   - **Valor**: URL do seu banco de produção
   
   Exemplo: `postgresql://user:pass@host/conecta_prod?sslmode=require`

### 3️⃣ Como o Sistema Funciona

#### Em Desenvolvimento (padrão):
```
NODE_ENV=development (automático)
↓
Sistema procura DATABASE_URL_DEV
↓
Se não encontrar, usa DATABASE_URL (compatibilidade)
↓
Log: "🔧 Usando banco de dados de DESENVOLVIMENTO"
```

#### Em Produção (ao fazer deploy):
```
NODE_ENV=production (configurado no deploy)
↓
Sistema procura DATABASE_URL_PRODUCTION
↓
Se não encontrar, usa DATABASE_URL (compatibilidade)
↓
Log: "🚀 Usando banco de dados de PRODUÇÃO"
```

## Verificar Configuração

Execute no Shell do Replit:
```bash
node scripts/setup-environments.cjs
```

Você verá:
- ✅ Variáveis configuradas
- ❌ Variáveis faltando
- 📋 Análise da configuração

## Compatibilidade Total ✅

### Cenário 1: Você não faz nada
- Sistema continua usando `DATABASE_URL` como sempre
- Tudo funciona normalmente
- Sem quebras!

### Cenário 2: Você configura apenas DEV
- Desenvolvimento usa `DATABASE_URL_DEV`
- Produção continua com `DATABASE_URL`
- Separação parcial funcionando

### Cenário 3: Configuração completa
- Dev usa `DATABASE_URL_DEV`
- Prod usa `DATABASE_URL_PRODUCTION`
- Separação total! 🎉

## Boas Práticas Recomendadas

### 1. Criar Bancos Separados no Neon

1. Acesse [Neon Console](https://console.neon.tech)
2. Crie dois bancos:
   - `conecta_dev` - para desenvolvimento
   - `conecta_prod` - para produção
3. Copie as URLs de conexão

### 2. Backup Antes de Separar

```bash
# Fazer backup do banco atual
pg_dump $DATABASE_URL > backup_antes_separacao.sql
```

### 3. Migrar Dados (se necessário)

```bash
# Copiar dados para o novo banco de produção
pg_dump $DATABASE_URL | psql $DATABASE_URL_PRODUCTION

# Aplicar schema no banco de desenvolvimento
npm run db:push
```

## Monitoramento

### Logs de Inicialização
Sempre verifique os logs ao iniciar:

```
🔧 Usando banco de dados de DESENVOLVIMENTO
📊 Conectando ao banco: postgresql://...
🌍 Ambiente: Development
```

### Comandos Úteis

```bash
# Ver configuração atual
node scripts/setup-environments.cjs

# Testar conexão de desenvolvimento
npm run dev

# Testar em modo produção local
NODE_ENV=production npm start
```

## FAQ

### "Posso manter tudo como está?"
**Sim!** O sistema é 100% compatível. Se você não configurar as novas variáveis, continuará usando `DATABASE_URL` normalmente.

### "Preciso migrar agora?"
**Não!** A migração é opcional. Faça quando estiver confortável.

### "E se eu configurar errado?"
O sistema tem fallback automático. Se as novas variáveis não funcionarem, ele usa `DATABASE_URL`.

### "Como saber qual banco está sendo usado?"
Verifique os logs de inicialização. Eles sempre mostram:
- 🔧 = Desenvolvimento
- 🚀 = Produção

## Segurança 🔒

1. **Nunca commite credenciais** - Use sempre Secrets do Replit
2. **Diferentes senhas** - Use senhas diferentes para cada banco
3. **Backups regulares** - Faça backup do banco de produção
4. **Teste primeiro** - Sempre teste mudanças em dev

## Suporte

### Arquivos de Referência:
- `.env.example` - Exemplo de configuração
- `docs/ENVIRONMENT_SETUP.md` - Documentação técnica
- `server/config/database.ts` - Lógica de seleção de ambiente

### Em caso de problemas:
1. Execute `node scripts/setup-environments.cjs`
2. Verifique os logs de inicialização
3. Confirme as variáveis em Secrets
4. Teste a conexão com o banco

---

✨ **Lembre-se**: A separação de ambientes é uma boa prática que protege seus dados de produção e permite desenvolvimento seguro!