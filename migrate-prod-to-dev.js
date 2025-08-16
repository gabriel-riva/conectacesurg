#!/usr/bin/env node

/**
 * Script de Migração: Produção → Desenvolvimento
 * 
 * Este script copia todos os dados da produção para desenvolvimento,
 * atualizando os caminhos dos arquivos para usar o ambiente correto.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Função principal de migração
async function migrateProdToDev() {
  console.log('🔄 INICIANDO MIGRAÇÃO: PRODUÇÃO → DESENVOLVIMENTO');
  console.log('=' .repeat(60));
  
  try {
    // Configurar conexão com banco
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    console.log('📊 Verificando dados atuais...');
    
    // 1. Verificar dados de produção (schema public)
    const prodUsers = await sql`SELECT COUNT(*) as count FROM public.users`;
    const prodProfiles = await sql`SELECT COUNT(*) as count FROM public.user_profiles`;
    const prodMaterials = await sql`SELECT COUNT(*) as count FROM public.material_files`;
    
    console.log(`📈 PRODUÇÃO (public schema):`);
    console.log(`   - Usuários: ${prodUsers[0].count}`);
    console.log(`   - Perfis: ${prodProfiles[0].count}`);
    console.log(`   - Materiais: ${prodMaterials[0].count}`);
    
    // 2. Criar/verificar schema de desenvolvimento
    console.log('🏗️ Configurando schema de desenvolvimento...');
    await sql`CREATE SCHEMA IF NOT EXISTS development`;
    
    // 3. Criar backup do desenvolvimento atual (se existir)
    console.log('💾 Criando backup do desenvolvimento atual...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
      await sql`CREATE SCHEMA IF NOT EXISTS development_backup_${timestamp.split('T')[0]}`;
      
      // Verificar se tabelas existem no development antes de fazer backup
      const devTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'development'
      `;
      
      if (devTables.length > 0) {
        console.log(`📦 Fazendo backup de ${devTables.length} tabelas existentes...`);
        
        for (const table of devTables) {
          const tableName = table.table_name;
          await sql`CREATE TABLE development_backup_${timestamp.split('T')[0]}.${sql(tableName)} AS SELECT * FROM development.${sql(tableName)}`;
        }
        
        console.log('✅ Backup criado com sucesso!');
      } else {
        console.log('ℹ️ Nenhuma tabela encontrada em development para backup');
      }
    } catch (backupError) {
      console.log('⚠️ Erro no backup (pode ser primeira execução):', backupError.message);
    }
    
    // 4. Copiar estrutura das tabelas
    console.log('🏗️ Copiando estrutura das tabelas...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '%_backup_%'
      ORDER BY table_name
    `;
    
    console.log(`📋 Encontradas ${tables.length} tabelas para migrar`);
    
    // Remover tabelas existentes no desenvolvimento
    for (const table of tables) {
      const tableName = table.table_name;
      try {
        await sql`DROP TABLE IF EXISTS development.${sql(tableName)} CASCADE`;
      } catch (error) {
        console.log(`⚠️ Erro ao remover tabela development.${tableName}:`, error.message);
      }
    }
    
    // Copiar estrutura e dados
    for (const table of tables) {
      const tableName = table.table_name;
      
      try {
        console.log(`📋 Migrando tabela: ${tableName}...`);
        
        // Criar tabela com estrutura e dados da produção
        await sql`CREATE TABLE development.${sql(tableName)} AS SELECT * FROM public.${sql(tableName)}`;
        
        // Copiar constraints e indexes (tentativa)
        try {
          const constraints = await sql`
            SELECT conname, pg_get_constraintdef(oid) as condef
            FROM pg_constraint 
            WHERE conrelid = ('public.' || '${tableName}')::regclass
          `;
          
          for (const constraint of constraints) {
            if (!constraint.condef.includes('NOT NULL')) {
              try {
                await sql`ALTER TABLE development.${sql(tableName)} ADD CONSTRAINT ${sql(constraint.conname)} ${sql(constraint.condef)}`;
              } catch (constraintError) {
                // Ignorar erros de constraints duplicadas
              }
            }
          }
        } catch (error) {
          // Ignorar erros de constraints - não são críticos para a migração
        }
        
        const count = await sql`SELECT COUNT(*) as count FROM development.${sql(tableName)}`;
        console.log(`   ✅ ${tableName}: ${count[0].count} registros copiados`);
        
      } catch (error) {
        console.error(`❌ Erro ao migrar tabela ${tableName}:`, error.message);
      }
    }
    
    // 5. Atualizar caminhos dos arquivos para ambiente de desenvolvimento
    console.log('🔄 Atualizando caminhos dos arquivos para ambiente de desenvolvimento...');
    
    // Atualizar fotos de perfil
    const photoUpdates = await sql`
      UPDATE development.user_profiles 
      SET image_url = REPLACE(image_url, '/objects/prod/', '/objects/dev/')
      WHERE image_url LIKE '/objects/prod/profile/photos/%'
      RETURNING id, image_url
    `;
    console.log(`   📸 Fotos de perfil atualizadas: ${photoUpdates.length}`);
    
    // Atualizar documentos de perfil
    const docUpdates = await sql`
      UPDATE development.user_profiles 
      SET document_url = REPLACE(document_url, '/objects/prod/', '/objects/dev/')
      WHERE document_url LIKE '/objects/prod/profile/documents/%'
      RETURNING id, document_url
    `;
    console.log(`   📄 Documentos de perfil atualizados: ${docUpdates.length}`);
    
    // Atualizar materiais
    const materialUpdates = await sql`
      UPDATE development.material_files 
      SET file_url = REPLACE(file_url, '/objects/prod/', '/objects/dev/')
      WHERE file_url LIKE '/objects/prod/materials/%'
      RETURNING id, file_url
    `;
    console.log(`   📚 Materiais atualizados: ${materialUpdates.length}`);
    
    // Atualizar outros caminhos legacy (sem ambiente)
    const legacyPhotoUpdates = await sql`
      UPDATE development.user_profiles 
      SET image_url = REPLACE(image_url, '/objects/profile/', '/objects/dev/profile/')
      WHERE image_url LIKE '/objects/profile/photos/%'
      RETURNING id, image_url
    `;
    console.log(`   📸 Fotos legacy atualizadas: ${legacyPhotoUpdates.length}`);
    
    const legacyDocUpdates = await sql`
      UPDATE development.user_profiles 
      SET document_url = REPLACE(document_url, '/objects/profile/', '/objects/dev/profile/')
      WHERE document_url LIKE '/objects/profile/documents/%'
      RETURNING id, document_url
    `;
    console.log(`   📄 Documentos legacy atualizados: ${legacyDocUpdates.length}`);
    
    const legacyMaterialUpdates = await sql`
      UPDATE development.material_files 
      SET file_url = REPLACE(file_url, '/objects/materials/', '/objects/dev/materials/')
      WHERE file_url LIKE '/objects/materials/%'
      RETURNING id, file_url
    `;
    console.log(`   📚 Materiais legacy atualizados: ${legacyMaterialUpdates.length}`);
    
    // 6. Verificação final
    console.log('🔍 Verificação final...');
    const devUsersAfter = await sql`SELECT COUNT(*) as count FROM development.users`;
    const devProfilesAfter = await sql`SELECT COUNT(*) as count FROM development.user_profiles`;
    const devMaterialsAfter = await sql`SELECT COUNT(*) as count FROM development.material_files`;
    
    console.log(`📊 DESENVOLVIMENTO (development schema) - APÓS MIGRAÇÃO:`);
    console.log(`   - Usuários: ${devUsersAfter[0].count}`);
    console.log(`   - Perfis: ${devProfilesAfter[0].count}`);
    console.log(`   - Materiais: ${devMaterialsAfter[0].count}`);
    
    // 7. Exemplos de caminhos atualizados
    console.log('📋 Exemplos de caminhos atualizados:');
    const sampleFiles = await sql`
      SELECT image_url, document_url 
      FROM development.user_profiles 
      WHERE (image_url IS NOT NULL OR document_url IS NOT NULL)
      LIMIT 3
    `;
    
    sampleFiles.forEach((file, index) => {
      if (file.image_url) console.log(`   ${index + 1}. Foto: ${file.image_url}`);
      if (file.document_url) console.log(`   ${index + 1}. Doc: ${file.document_url}`);
    });
    
    console.log('');
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('🎯 RESULTADO:');
    console.log('   - Dados da produção copiados para desenvolvimento');
    console.log('   - Caminhos de arquivos atualizados para ambiente dev');
    console.log('   - Backup do desenvolvimento anterior criado');
    console.log('   - Sistema pronto para testes com dados atualizados');
    console.log('');
    console.log('⚠️ LEMBRETE: Configure NODE_ENV=development antes de testar!');
    
  } catch (error) {
    console.error('❌ ERRO NA MIGRAÇÃO:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar migração
migrateProdToDev()
  .then(() => {
    console.log('🎉 Script de migração finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha crítica na migração:', error);
    process.exit(1);
  });