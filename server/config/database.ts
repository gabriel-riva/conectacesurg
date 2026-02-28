/**
 * Configuração de banco de dados com separação de ambientes
 * - Desenvolvimento: usa schema public (padrão Replit, visível na aba Database)
 * - Produção: usa schema production (dados reais dos 99+ usuários)
 */

interface DatabaseConfig {
  url: string;
  isProduction: boolean;
  environment: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      "❌ Erro: DATABASE_URL não está configurado!\n" +
      "Certifique-se de que o PostgreSQL está ativo no Replit."
    );
  }
  
  let finalUrl: string;
  
  if (isProduction) {
    finalUrl = databaseUrl.includes('?') 
      ? `${databaseUrl}&options=--search_path%3Dproduction`
      : `${databaseUrl}?options=--search_path%3Dproduction`;
    console.log("🚀 BANCO DE PRODUÇÃO ATIVO (schema: production)");
  } else {
    finalUrl = databaseUrl;
    console.log("🔧 BANCO DE DESENVOLVIMENTO ATIVO (schema: public)");
  }
  
  const safeUrl = finalUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`📊 Conectando ao banco: ${safeUrl.substring(0, 50)}...`);
  
  return {
    url: finalUrl,
    isProduction,
    environment: nodeEnv
  };
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getEnvironmentName(): string {
  const env = process.env.NODE_ENV || 'development';
  return env.charAt(0).toUpperCase() + env.slice(1);
}
