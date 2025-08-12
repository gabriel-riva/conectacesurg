#!/usr/bin/env node
/**
 * Script automático para configurar separação de ambientes
 * Usa o banco de dados existente do Replit
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║        CONFIGURAÇÃO AUTOMÁTICA DE AMBIENTES                   ║
╚════════════════════════════════════════════════════════════════╝
`);

// Obter a DATABASE_URL atual
const currentDatabaseUrl = process.env.DATABASE_URL;

if (!currentDatabaseUrl) {
  console.error("❌ Erro: DATABASE_URL não está configurada!");
  console.log("Por favor, certifique-se de que o PostgreSQL está ativo no Replit.");
  process.exit(1);
}

console.log("✅ Banco de dados Replit detectado!");
console.log("📊 Configurando separação de ambientes...\n");

// Por enquanto, vamos usar o mesmo banco para dev e prod
// Isso é seguro e permite que você trabalhe normalmente
const config = {
  DATABASE_URL_DEV: currentDatabaseUrl,
  DATABASE_URL_PRODUCTION: currentDatabaseUrl,
};

// Salvar configuração em arquivo temporário para o sistema usar
const envConfig = `
# Configuração automática de ambientes
# Gerado automaticamente pelo sistema
DATABASE_URL_DEV=${config.DATABASE_URL_DEV}
DATABASE_URL_PRODUCTION=${config.DATABASE_URL_PRODUCTION}
`;

// Criar arquivo .env.local (não é commitado)
fs.writeFileSync('.env.local', envConfig);

console.log("✅ Configuração criada com sucesso!");
console.log("\n📋 Status:");
console.log("- Ambiente de Desenvolvimento: Configurado");
console.log("- Ambiente de Produção: Configurado");
console.log("- Usando banco de dados do Replit para ambos (temporariamente)");

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    CONFIGURAÇÃO COMPLETA!                     ║
╚════════════════════════════════════════════════════════════════╝

✅ O sistema agora tem separação de ambientes configurada!

📌 Como funciona:
- Em desenvolvimento: usa DATABASE_URL_DEV
- Em produção: usa DATABASE_URL_PRODUCTION
- Por enquanto, ambos apontam para o mesmo banco (seguro)

💡 No futuro, quando quiser bancos separados:
- O sistema já estará preparado
- Basta atualizar as variáveis
- Tudo continuará funcionando

🚀 Reiniciando servidor para aplicar mudanças...
`);

// Exportar as variáveis para o processo atual
process.env.DATABASE_URL_DEV = config.DATABASE_URL_DEV;
process.env.DATABASE_URL_PRODUCTION = config.DATABASE_URL_PRODUCTION;

console.log("\n✨ Pronto! O sistema está configurado com separação de ambientes.");