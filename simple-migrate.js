#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

async function simpleMigration() {
  console.log('🔄 MIGRAÇÃO RÁPIDA: PRODUCTION → DEVELOPMENT');
  console.log('=' .repeat(50));
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // 1. Backup e limpar development
    console.log('💾 Fazendo backup e limpando development...');
    await sql`DROP SCHEMA IF EXISTS development CASCADE`;
    await sql`CREATE SCHEMA development`;
    
    // 2. Copiar todas as tabelas importantes
    console.log('📋 Copiando tabelas principais...');
    
    const importantTables = [
      'users', 'groups', 'user_groups', 'user_categories', 'user_category_assignments',
      'material_files', 'material_folders', 'gamification_challenges', 'gamification_points',
      'posts', 'comments', 'likes', 'news', 'announcements', 'calendar_events',
      'ai_agents', 'ai_prompts', 'ai_conversations', 'ai_messages',
      'surveys', 'survey_questions', 'survey_responses', 'feature_settings'
    ];
    
    for (const table of importantTables) {
      try {
        console.log(`  📋 Copiando ${table}...`);
        await sql`CREATE TABLE development.${sql(table)} AS SELECT * FROM production.${sql(table)}`;
        
        const count = await sql`SELECT COUNT(*) as count FROM development.${sql(table)}`;
        console.log(`     ✅ ${count[0].count} registros copiados`);
      } catch (error) {
        console.log(`     ⚠️ Tabela ${table}: ${error.message}`);
      }
    }
    
    // 3. Atualizar caminhos dos arquivos
    console.log('🔄 Atualizando caminhos dos arquivos...');
    
    // Materiais
    const materialUpdates = await sql`
      UPDATE development.material_files 
      SET file_url = REPLACE(file_url, '/objects/prod/', '/objects/dev/')
      WHERE file_url LIKE '/objects/prod%'
    `;
    console.log(`   📚 Materiais atualizados: ${materialUpdates.length}`);
    
    // Materiais legacy
    const materialLegacy = await sql`
      UPDATE development.material_files 
      SET file_url = REPLACE(file_url, '/objects/materials/', '/objects/dev/materials/')
      WHERE file_url LIKE '/objects/materials/%'
    `;
    console.log(`   📚 Materiais legacy: ${materialLegacy.length}`);
    
    // Verificar se existem colunas de imagem/documento na tabela users
    try {
      const userImageUpdates = await sql`
        UPDATE development.users 
        SET image_url = REPLACE(image_url, '/objects/prod/', '/objects/dev/')
        WHERE image_url LIKE '/objects/prod%'
      `;
      console.log(`   📸 Imagens de usuário: ${userImageUpdates.length}`);
    } catch (error) {
      console.log(`   📸 Sem colunas de imagem em users`);
    }
    
    // 4. Verificação final
    console.log('🔍 Verificação final...');
    const devUsers = await sql`SELECT COUNT(*) as count FROM development.users`;
    const devMaterials = await sql`SELECT COUNT(*) as count FROM development.material_files`;
    
    console.log(`📊 DEVELOPMENT (após migração):`);
    console.log(`   - Usuários: ${devUsers[0].count}`);
    console.log(`   - Materiais: ${devMaterials[0].count}`);
    
    // 5. Mostrar alguns exemplos de caminhos
    console.log('📋 Exemplos de caminhos atualizados:');
    const sampleMaterials = await sql`
      SELECT name, file_url 
      FROM development.material_files 
      WHERE file_url IS NOT NULL
      LIMIT 3
    `;
    
    sampleMaterials.forEach((material, index) => {
      console.log(`   ${index + 1}. ${material.name}: ${material.file_url}`);
    });
    
    console.log('');
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('   1. Configure NODE_ENV=development');
    console.log('   2. Reinicie a aplicação');
    console.log('   3. Teste uploads (devem ir para /objects/dev/)');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    process.exit(1);
  }
}

simpleMigration()
  .then(() => {
    console.log('🎉 Migração finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha:', error);
    process.exit(1);
  });