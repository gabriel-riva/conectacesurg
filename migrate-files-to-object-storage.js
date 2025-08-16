/**
 * Script de Migração Completa para Object Storage
 * 
 * Este script migra TODOS os arquivos de uploads/ para Object Storage
 * e atualiza o banco de dados para usar as novas URLs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from './server/db.js';
import { challengeSubmissions } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { ObjectStorageService } from './server/objectStorage.js';
import { setObjectAclPolicy } from './server/objectAcl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const objectStorageService = new ObjectStorageService();

// Função para obter tipo MIME baseado na extensão
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Função para criar buffer a partir do arquivo
async function fileToBuffer(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// Função para fazer upload para Object Storage
async function uploadToObjectStorage(buffer, filename, mimeType) {
  const privateObjectDir = objectStorageService.getPrivateObjectDir();
  const objectId = `challenges/${Date.now()}-${filename}`;
  const fullPath = `${privateObjectDir}/${objectId}`;

  try {
    // Parse the object path
    const pathParts = fullPath.split('/');
    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join('/');

    // Get bucket and file reference
    const bucket = objectStorageService.objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    // Upload the file
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    console.log(`✅ Uploaded ${filename} to Object Storage: ${fullPath}`);
    return `/objects/challenges/${objectId}`;
  } catch (error) {
    console.error(`❌ Failed to upload ${filename}:`, error);
    throw error;
  }
}

// Função principal de migração
async function migrateFiles() {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Diretório uploads/ não encontrado. Nada para migrar.');
    return;
  }

  const files = fs.readdirSync(uploadsDir).filter(file => {
    const filePath = path.join(uploadsDir, file);
    return fs.statSync(filePath).isFile();
  });

  if (files.length === 0) {
    console.log('📁 Nenhum arquivo encontrado em uploads/');
    return;
  }

  console.log(`🚀 Iniciando migração de ${files.length} arquivos para Object Storage...`);

  // Buscar todas as submissões que podem ter arquivos
  const submissions = await db
    .select()
    .from(challengeSubmissions)
    .where(eq(challengeSubmissions.submissionType, 'file'));

  console.log(`📋 Encontradas ${submissions.length} submissões de arquivo no banco de dados`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(uploadsDir, file);
      const fileStats = fs.statSync(filePath);
      const mimeType = getMimeType(file);
      
      console.log(`\n📄 Processando: ${file} (${(fileStats.size / 1024 / 1024).toFixed(2)}MB)`);

      // Ler arquivo como buffer
      const buffer = await fileToBuffer(filePath);
      
      // Upload para Object Storage
      const newUrl = await uploadToObjectStorage(buffer, file, mimeType);
      
      // Buscar submissões que referenciam este arquivo
      const oldUrl = `/uploads/${file}`;
      let updatedSubmissions = 0;

      for (const submission of submissions) {
        if (submission.submissionData && typeof submission.submissionData === 'object') {
          const data = submission.submissionData;
          let hasChanges = false;

          // Verificar se há arquivos no submissionData
          if (data.file && data.file.files && Array.isArray(data.file.files)) {
            for (const fileData of data.file.files) {
              if (fileData.fileUrl === oldUrl || fileData.fileUrl?.includes(file)) {
                console.log(`  🔄 Atualizando URL na submissão ${submission.id}`);
                fileData.fileUrl = newUrl;
                hasChanges = true;
              }
            }
          }

          // Salvar alterações se houver
          if (hasChanges) {
            await db
              .update(challengeSubmissions)
              .set({
                submissionData: data,
                updatedAt: new Date()
              })
              .where(eq(challengeSubmissions.id, submission.id));
            
            updatedSubmissions++;
          }
        }
      }

      console.log(`  ✅ Arquivo migrado com sucesso!`);
      console.log(`  📊 ${updatedSubmissions} submissões atualizadas`);
      migratedCount++;

    } catch (error) {
      console.error(`  ❌ Erro ao migrar ${file}:`, error);
      errorCount++;
    }
  }

  console.log(`\n🎉 MIGRAÇÃO CONCLUÍDA!`);
  console.log(`✅ Arquivos migrados: ${migratedCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📊 Total processado: ${files.length}`);
  
  if (migratedCount > 0) {
    console.log(`\n💡 PRÓXIMOS PASSOS:`);
    console.log(`1. Verificar se todos os arquivos estão acessíveis no sistema`);
    console.log(`2. Remover pasta uploads/ após confirmar que tudo funciona`);
    console.log(`3. Arquivos agora estão no Object Storage permanentemente`);
  }
}

// Executar migração
migrateFiles()
  .then(() => {
    console.log('\n🏁 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });