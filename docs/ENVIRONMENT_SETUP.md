# Separação de Ambientes - Guia de Configuração

## Visão Geral
O sistema agora suporta separação completa entre ambientes de desenvolvimento e produção,
permitindo usar bancos de dados diferentes para cada ambiente.

## Como Configurar

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no Replit Secrets:

#### Para Desenvolvimento:
- `DATABASE_URL_DEV`: URL do banco de dados de desenvolvimento
- `NODE_ENV`: Defina como "development" (padrão)

#### Para Produção:
- `DATABASE_URL_PRODUCTION`: URL do banco de dados de produção
- `NODE_ENV`: Defina como "production" ao fazer deploy

### 2. Fallback e Compatibilidade

Se as variáveis específicas não estiverem definidas, o sistema usará `DATABASE_URL`
como fallback, garantindo compatibilidade total com o código existente.

### 3. Prioridade de Configuração

**Em Desenvolvimento (NODE_ENV=development):**
1. Primeiro tenta usar `DATABASE_URL_DEV`
2. Se não existir, usa `DATABASE_URL`

**Em Produção (NODE_ENV=production):**
1. Primeiro tenta usar `DATABASE_URL_PRODUCTION`
2. Se não existir, usa `DATABASE_URL`

## Boas Práticas

1. **Nunca use o mesmo banco para dev e produção**
   - Crie bancos separados no Neon ou outro provedor
   - Use nomes descritivos: `conecta_dev` e `conecta_prod`

2. **Backup antes de migrar**
   - Sempre faça backup do banco de produção antes de mudanças
   - Use o comando: `pg_dump DATABASE_URL > backup.sql`

3. **Teste em desenvolvimento primeiro**
   - Todas as mudanças devem ser testadas em dev
   - Só aplique em produção após validação completa

4. **Monitore os logs**
   - O sistema mostra qual banco está usando no startup
   - Verifique sempre: "🚀 Usando banco de PRODUÇÃO" ou "🔧 Usando banco de DESENVOLVIMENTO"

## Comandos Úteis

```bash
# Verificar configuração atual
node scripts/setup-environments.js

# Aplicar migrações em desenvolvimento
NODE_ENV=development npm run db:push

# Aplicar migrações em produção (cuidado!)
NODE_ENV=production npm run db:push

# Verificar qual banco está sendo usado
npm run dev
# Observe os logs no início
```

## Segurança

- **Nunca commite credenciais**: Use sempre Replit Secrets
- **Restrinja acesso**: Apenas admins devem ter acesso ao banco de produção
- **Auditoria**: Mantenha logs de todas as mudanças em produção

## Troubleshooting

### Erro: "DATABASE_URL_DEV não está configurado"
**Solução**: Adicione a variável em Replit Secrets com a URL do banco de desenvolvimento

### Erro: "DATABASE_URL_PRODUCTION não está configurado"
**Solução**: Adicione a variável em Replit Secrets com a URL do banco de produção

### Sistema usando banco errado
**Verificar**:
1. Valor de NODE_ENV
2. Logs de inicialização
3. Configuração das variáveis de ambiente

## Suporte

Em caso de dúvidas ou problemas, verifique:
1. Os logs de inicialização do servidor
2. As variáveis de ambiente configuradas
3. A conectividade com os bancos de dados
