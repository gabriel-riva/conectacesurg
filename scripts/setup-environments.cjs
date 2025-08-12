#!/usr/bin/env node
/**
 * Script de configuração de ambientes de desenvolvimento e produção
 * Este script ajuda a configurar as variáveis de ambiente necessárias
 * para separação segura entre desenvolvimento e produção
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║      CONFIGURAÇÃO DE AMBIENTES - Portal Conecta CESURG        ║
╚════════════════════════════════════════════════════════════════╝

Este script ajudará a configurar a separação de ambientes entre
desenvolvimento e produção de forma segura.

`);

// Verificar variáveis atuais
function checkCurrentConfig() {
  console.log("📊 Verificando configuração atual...\n");
  
  const vars = {
    'DATABASE_URL': process.env.DATABASE_URL,
    'DATABASE_URL_DEV': process.env.DATABASE_URL_DEV,
    'DATABASE_URL_PRODUCTION': process.env.DATABASE_URL_PRODUCTION,
    'NODE_ENV': process.env.NODE_ENV
  };
  
  console.log("Variáveis de ambiente detectadas:");
  console.log("─────────────────────────────────");
  
  for (const [key, value] of Object.entries(vars)) {
    if (value) {
      // Ocultar credenciais sensíveis
      if (key.includes('DATABASE_URL')) {
        const safeValue = value.replace(/:[^:@]*@/, ':****@').substring(0, 50) + '...';
        console.log(`✅ ${key}: ${safeValue}`);
      } else {
        console.log(`✅ ${key}: ${value}`);
      }
    } else {
      console.log(`❌ ${key}: não configurado`);
    }
  }
  
  console.log("\n");
  return vars;
}

// Gerar arquivo de exemplo .env
function createEnvExample() {
  const envExample = `# Configuração de Ambientes - Portal Conecta CESURG
# ================================================
# Este arquivo contém um exemplo de configuração de variáveis de ambiente
# NÃO commite este arquivo com credenciais reais!

# Ambiente atual (development ou production)
NODE_ENV=development

# Banco de dados de DESENVOLVIMENTO
# Use esta variável para apontar para um banco separado de desenvolvimento
DATABASE_URL_DEV=postgresql://user:password@host/database_dev?sslmode=require

# Banco de dados de PRODUÇÃO
# Use esta variável para apontar para o banco de produção
DATABASE_URL_PRODUCTION=postgresql://user:password@host/database_prod?sslmode=require

# Fallback - mantido para compatibilidade
# Se DATABASE_URL_DEV ou DATABASE_URL_PRODUCTION não estiverem definidos,
# o sistema usará DATABASE_URL como fallback
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Google OAuth (necessário para autenticação)
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui

# Outras configurações opcionais
SESSION_SECRET=sua_chave_secreta_aqui
`;

  const filePath = path.join(process.cwd(), '.env.example');
  fs.writeFileSync(filePath, envExample);
  console.log("✅ Arquivo .env.example criado com sucesso!");
}

// Criar documentação
function createDocumentation() {
  const docs = `# Separação de Ambientes - Guia de Configuração

## Visão Geral
O sistema agora suporta separação completa entre ambientes de desenvolvimento e produção,
permitindo usar bancos de dados diferentes para cada ambiente.

## Como Configurar

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no Replit Secrets:

#### Para Desenvolvimento:
- \`DATABASE_URL_DEV\`: URL do banco de dados de desenvolvimento
- \`NODE_ENV\`: Defina como "development" (padrão)

#### Para Produção:
- \`DATABASE_URL_PRODUCTION\`: URL do banco de dados de produção
- \`NODE_ENV\`: Defina como "production" ao fazer deploy

### 2. Fallback e Compatibilidade

Se as variáveis específicas não estiverem definidas, o sistema usará \`DATABASE_URL\`
como fallback, garantindo compatibilidade total com o código existente.

### 3. Prioridade de Configuração

**Em Desenvolvimento (NODE_ENV=development):**
1. Primeiro tenta usar \`DATABASE_URL_DEV\`
2. Se não existir, usa \`DATABASE_URL\`

**Em Produção (NODE_ENV=production):**
1. Primeiro tenta usar \`DATABASE_URL_PRODUCTION\`
2. Se não existir, usa \`DATABASE_URL\`

## Boas Práticas

1. **Nunca use o mesmo banco para dev e produção**
   - Crie bancos separados no Neon ou outro provedor
   - Use nomes descritivos: \`conecta_dev\` e \`conecta_prod\`

2. **Backup antes de migrar**
   - Sempre faça backup do banco de produção antes de mudanças
   - Use o comando: \`pg_dump DATABASE_URL > backup.sql\`

3. **Teste em desenvolvimento primeiro**
   - Todas as mudanças devem ser testadas em dev
   - Só aplique em produção após validação completa

4. **Monitore os logs**
   - O sistema mostra qual banco está usando no startup
   - Verifique sempre: "🚀 Usando banco de PRODUÇÃO" ou "🔧 Usando banco de DESENVOLVIMENTO"

## Comandos Úteis

\`\`\`bash
# Verificar configuração atual
node scripts/setup-environments.js

# Aplicar migrações em desenvolvimento
NODE_ENV=development npm run db:push

# Aplicar migrações em produção (cuidado!)
NODE_ENV=production npm run db:push

# Verificar qual banco está sendo usado
npm run dev
# Observe os logs no início
\`\`\`

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
`;

  const filePath = path.join(process.cwd(), 'docs', 'ENVIRONMENT_SETUP.md');
  
  // Criar diretório docs se não existir
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }
  
  fs.writeFileSync(filePath, docs);
  console.log("✅ Documentação criada em docs/ENVIRONMENT_SETUP.md");
}

// Executar verificações e criar arquivos
function main() {
  const config = checkCurrentConfig();
  
  // Análise da configuração
  console.log("📋 Análise da Configuração:");
  console.log("──────────────────────────");
  
  if (config.DATABASE_URL_DEV || config.DATABASE_URL_PRODUCTION) {
    console.log("✅ Separação de ambientes está configurada!");
    
    if (config.DATABASE_URL_DEV) {
      console.log("   ✓ Banco de desenvolvimento configurado");
    } else {
      console.log("   ⚠️  Banco de desenvolvimento não configurado (usando fallback)");
    }
    
    if (config.DATABASE_URL_PRODUCTION) {
      console.log("   ✓ Banco de produção configurado");
    } else {
      console.log("   ⚠️  Banco de produção não configurado (usando fallback)");
    }
  } else if (config.DATABASE_URL) {
    console.log("⚠️  Sistema usando configuração de banco único (DATABASE_URL)");
    console.log("   Recomendado: Configure DATABASE_URL_DEV e DATABASE_URL_PRODUCTION");
  } else {
    console.log("❌ Nenhuma configuração de banco de dados encontrada!");
    console.log("   Configure pelo menos DATABASE_URL");
  }
  
  console.log("\n📝 Criando arquivos de apoio...\n");
  
  createEnvExample();
  createDocumentation();
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                     CONFIGURAÇÃO CONCLUÍDA                    ║
╚════════════════════════════════════════════════════════════════╝

✅ Arquivos criados:
   - .env.example (exemplo de configuração)
   - docs/ENVIRONMENT_SETUP.md (documentação completa)

📌 Próximos passos:
   1. Configure as variáveis em Replit Secrets
   2. Teste a conexão reiniciando o servidor
   3. Verifique os logs para confirmar o ambiente

💡 Dica: Execute 'npm run dev' e observe os logs iniciais
         para confirmar qual banco está sendo usado.
`);
}

// Executar
main();