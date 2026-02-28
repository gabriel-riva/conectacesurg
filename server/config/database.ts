/**
 * Configuração de banco de dados
 * Usa o banco PostgreSQL padrão do Replit (schema public)
 * O Replit gerencia automaticamente a separação dev/produção
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
  
  const safeUrl = databaseUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`📊 Conectando ao banco: ${safeUrl.substring(0, 50)}...`);
  
  return {
    url: databaseUrl,
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
