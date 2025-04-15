import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket para o Neon PostgreSQL
neonConfig.webSocketConstructor = ws;

// Função para verificar e registrar informações sobre variáveis de ambiente
function checkDatabaseEnv() {
  // Em ambiente de desenvolvimento, registra um aviso, mas não falha
  if (process.env.NODE_ENV === 'development') {
    if (!process.env.DATABASE_URL) {
      console.warn(
        "⚠️ Aviso: DATABASE_URL não está definido. " +
        "Isto pode causar problemas na conexão com o banco de dados."
      );
      
      // Ainda permite a operação em desenvolvimento para facilitar os testes
      console.warn(
        "🔍 Em produção, certifique-se de configurar DATABASE_URL como uma variável de ambiente secreta."
      );
      return false;
    }
    return true;
  } 
  
  // Em produção, é crítico ter a variável
  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ Erro: DATABASE_URL não está definido no ambiente de produção!\n" +
      "Por favor, adicione DATABASE_URL como um segredo na configuração de implantação em:\n" +
      "Secrets > Adicionar novo segredo > Nome: DATABASE_URL"
    );
    return false;
  }
  
  return true;
}

// Verificar ambiente
const envOk = checkDatabaseEnv();

// Se não houver DATABASE_URL em produção, essa condição será verdadeira
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL deve ser configurado. " +
    "Você esqueceu de provisionar um banco de dados ou adicionar a variável de ambiente?"
  );
}

// Criar pool de conexão e instância Drizzle
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
