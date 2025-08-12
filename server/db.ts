import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseConfig, getEnvironmentName } from "./config/database";

// Configure WebSocket para o Neon PostgreSQL
neonConfig.webSocketConstructor = ws;

// Obter configuração do banco de dados baseada no ambiente
const dbConfig = getDatabaseConfig();

// Log do ambiente atual
console.log(`🌍 Ambiente: ${getEnvironmentName()}`);
console.log(`📊 Modo: ${dbConfig.isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);

// Criar pool de conexão e instância Drizzle com a URL apropriada
export const pool = new Pool({ connectionString: dbConfig.url });
export const db = drizzle({ client: pool, schema });

// Exportar informações do ambiente para uso em outros módulos
export const isDatabaseProduction = dbConfig.isProduction;
export const databaseEnvironment = dbConfig.environment;
