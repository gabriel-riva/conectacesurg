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
 * Prioridade:
 * 1. DATABASE_URL_PRODUCTION para produção
 * 2. DATABASE_URL_DEV para desenvolvimento
 * 3. DATABASE_URL como fallback (compatibilidade com código existente)
 */
export function getDatabaseConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  let databaseUrl: string | undefined;
  
  if (isProduction) {
    // Em produção, usar DATABASE_URL_PRODUCTION se disponível
    // Fallback para DATABASE_URL para manter compatibilidade
    databaseUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error(
        "❌ Erro: Nenhuma URL de banco de dados configurada para produção!\n" +
        "Configure DATABASE_URL_PRODUCTION ou DATABASE_URL nas variáveis de ambiente."
      );
    }
    
    console.log("🚀 Usando banco de dados de PRODUÇÃO");
  } else {
    // Em desenvolvimento, usar DATABASE_URL_DEV se disponível
    // Fallback para DATABASE_URL para manter compatibilidade
    databaseUrl = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error(
        "❌ Erro: Nenhuma URL de banco de dados configurada para desenvolvimento!\n" +
        "Configure DATABASE_URL_DEV ou DATABASE_URL nas variáveis de ambiente."
      );
    }
    
    console.log("🔧 Usando banco de dados de DESENVOLVIMENTO");
  }
  
  // Log seguro (sem expor credenciais)
  const safeUrl = databaseUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`📊 Conectando ao banco: ${safeUrl.substring(0, 50)}...`);
  
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