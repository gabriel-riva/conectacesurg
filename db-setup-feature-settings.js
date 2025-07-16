import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function setupFeatureSettings() {
  try {
    console.log('Configurando configurações de funcionalidades...');
    
    // Verificar se já existem configurações
    const existingSettings = await sql`SELECT * FROM feature_settings`;
    
    if (existingSettings.length === 0) {
      // Inserir configurações iniciais
      await sql`
        INSERT INTO feature_settings (feature_name, is_enabled, disabled_message, updated_at)
        VALUES 
          ('community', true, 'Em breve, novidades!', NOW()),
          ('ideas', true, 'Em breve, novidades!', NOW()),
          ('gamification', false, 'Em breve, novidades!', NOW())
      `;
      
      console.log('✅ Configurações de funcionalidades criadas com sucesso!');
    } else {
      console.log('✅ Configurações de funcionalidades já existem.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao configurar configurações de funcionalidades:', error);
  }
}

setupFeatureSettings().catch(console.error);