// Configuração simples de banco de dados com node-postgres
import pkg from 'pg';
const { Pool } = pkg;

async function setupDatabase() {
  console.log('Inicializando configuração do banco de dados...');
  
  // Conectar ao banco de dados
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Criar tabelas necessárias
    console.log('Criando tabela de usuários...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        password TEXT,
        google_id TEXT UNIQUE,
        photo_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Criando tabela de grupos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        creator_id INTEGER NOT NULL REFERENCES users(id),
        is_private BOOLEAN NOT NULL DEFAULT FALSE,
        requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Criando tabela de usuários-grupos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'approved',
        joined_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, group_id)
      );
    `);
    
    console.log('Criando tabela de posts...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        media_urls TEXT[],
        media_types TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Criando tabela de comentários...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        media_urls TEXT[],
        media_types TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Criando tabela de curtidas...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Criando tabela de conversas...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_message_at TIMESTAMP DEFAULT NOW(),
        last_message_text TEXT,
        UNIQUE(user1_id, user2_id)
      );
    `);
    
    console.log('Criando tabela de mensagens...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Tabelas criadas com sucesso!');
    
    // Verificar se existe pelo menos um usuário admin
    const { rows } = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['superadmin']);
    
    if (parseInt(rows[0].count) === 0) {
      console.log('Criando usuário superadmin padrão...');
      await pool.query(`
        INSERT INTO users (name, email, role) 
        VALUES ('Admin Conecta', 'conecta@cesurg.com', 'superadmin')
        ON CONFLICT (email) DO NOTHING
      `);
      console.log('Usuário superadmin criado com sucesso!');
    } else {
      console.log('Usuário superadmin já existe, pulando criação.');
    }

    console.log('Configuração do banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar o banco de dados:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch(err => {
  console.error('Falha na configuração do banco de dados:', err);
  process.exit(1);
});