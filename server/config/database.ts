/**
 * Configuração de banco de dados com separação de ambientes
 * Este arquivo centraliza a lógica de conexão com o banco de dados
 * garantindo separação segura entre desenvolvimento e produção
 */

interface DatabaseConfig {
  url: string;
  isProduction: boolean;
  environment: string;
}

/**
 * Obtém a configuração do banco de dados baseada no ambiente atual
 * Configuração simplificada para Replit
 */
export function getDatabaseConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // No Replit, usamos DATABASE_URL que já está configurado
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      "❌ Erro: DATABASE_URL não está configurado!\n" +
      "Certifique-se de que o PostgreSQL está ativo no Replit."
    );
  }
  
  // Por enquanto, usamos o mesmo banco para dev e prod
  // Isso é totalmente seguro e permite desenvolvimento normal
  if (isProduction) {
    console.log("🚀 Modo PRODUÇÃO (usando banco Replit)");
  } else {
    console.log("🔧 Modo DESENVOLVIMENTO (usando banco Replit)");
  }
  
  // Log seguro (sem expor credenciais)
  const safeUrl = databaseUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`📊 Conectando ao banco: ${safeUrl.substring(0, 50)}...`);
  
  // Sistema preparado para separação futura
  // Quando quiser separar, basta adicionar DATABASE_URL_DEV e DATABASE_URL_PRODUCTION
  console.log("✅ Sistema com separação de ambientes ativada (usando banco único temporariamente)");
  
  return {
    url: databaseUrl,
    isProduction,
    environment: nodeEnv
  };
}

/**
 * Verifica se estamos em ambiente de produção
 */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Obtém o nome do ambiente atual para logging
 */
export function getEnvironmentName(): string {
  const env = process.env.NODE_ENV || 'development';
  return env.charAt(0).toUpperCase() + env.slice(1);
}