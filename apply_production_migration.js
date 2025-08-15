import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL + '?options=--search_path%3Dproduction';
console.log('Aplicando migração ao schema de produção...');

const sql = postgres(dbUrl);
const db = drizzle(sql);

// Aplicar a migração manualmente
try {
  await sql`ALTER TABLE messages ADD COLUMN receiver_id INTEGER REFERENCES users(id)`;
  console.log('✅ Coluna receiver_id adicionada com sucesso ao schema de produção!');
} catch (error) {
  console.log('❌ Erro ao aplicar migração:', error.message);
} finally {
  await sql.end();
}
