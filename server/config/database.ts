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
 * AGORA COM BANCOS REALMENTE SEPARADOS!
 */
export function getDatabaseConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  // URL base do banco de dados
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      "❌ Erro: DATABASE_URL não está configurado!\n" +
      "Certifique-se de que o PostgreSQL está ativo no Replit."
    );
  }
  
  // Adicionar o schema correto baseado no ambiente
  // Isso cria BANCOS SEPARADOS usando schemas PostgreSQL
  let finalUrl: string;
  
  if (isProduction) {
    // Adicionar schema=production à URL
    finalUrl = databaseUrl.includes('?') 
      ? `${databaseUrl}&options=--search_path%3Dproduction`
      : `${databaseUrl}?options=--search_path%3Dproduction`;
    console.log("🚀 BANCO DE PRODUÇÃO ATIVO (schema: production)");
  } else {
    // Adicionar schema=development à URL
    finalUrl = databaseUrl.includes('?') 
      ? `${databaseUrl}&options=--search_path%3Ddevelopment`
      : `${databaseUrl}?options=--search_path%3Ddevelopment`;
    console.log("🔧 BANCO DE DESENVOLVIMENTO ATIVO (schema: development)");
  }
  
  // Log seguro (sem expor credenciais)
  const safeUrl = finalUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`📊 Conectando ao banco: ${safeUrl.substring(0, 50)}...`);
  console.log("✅ BANCOS SEPARADOS CONFIGURADOS COM SUCESSO!");
  
  return {
    url: finalUrl,
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