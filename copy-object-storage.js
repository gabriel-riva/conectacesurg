import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

async function copyMaterialsTodev() {
  console.log('🚀 Copiando materiais para development no Object Storage...\n');
  
  try {
    // Usar o bucket correto do PRIVATE_OBJECT_DIR
    const bucketName = 'replit-objstore-5b76e1bd-68bc-4930-858a-2cd2f8ef34d4';
    const bucket = storage.bucket(bucketName);
    
    // Base path do PRIVATE_OBJECT_DIR
    const basePath = '.private/';
    
    // Listar arquivos em .private/materials/ (legacy)
    console.log('📁 Buscando arquivos em .private/materials/...');
    const [legacyFiles] = await bucket.getFiles({
      prefix: `${basePath}materials/`
    });
    
    console.log(`   Encontrados ${legacyFiles.length} arquivos`);
    
    // Copiar cada arquivo de materials/ para dev/materials/
    let copied = 0;
    for (const file of legacyFiles) {
      const fileName = file.name;
      // Extrair apenas o ID do arquivo (UUID)
      const fileId = fileName.replace(`${basePath}materials/`, '');
      const newName = `${basePath}dev/materials/${fileId}`;
      
      console.log(`📋 Copiando: ${fileName.substring(basePath.length)} → dev/materials/${fileId}`);
      
      try {
        await file.copy(bucket.file(newName));
        console.log(`   ✅ Copiado com sucesso!`);
        copied++;
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⏭️ Arquivo já existe, pulando...`);
        } else {
          console.log(`   ⚠️ Erro ao copiar: ${error.message}`);
        }
      }
    }
    
    // Listar arquivos em .private/prod/materials/
    console.log('\n📁 Buscando arquivos em .private/prod/materials/...');
    const [prodFiles] = await bucket.getFiles({
      prefix: `${basePath}prod/materials/`
    });
    
    console.log(`   Encontrados ${prodFiles.length} arquivos`);
    
    // Copiar cada arquivo de prod/materials/ para dev/materials/
    for (const file of prodFiles) {
      const fileName = file.name;
      // Extrair apenas o ID do arquivo (UUID)
      const fileId = fileName.replace(`${basePath}prod/materials/`, '');
      const newName = `${basePath}dev/materials/${fileId}`;
      
      console.log(`📋 Copiando: prod/materials/${fileId} → dev/materials/${fileId}`);
      
      try {
        await file.copy(bucket.file(newName));
        console.log(`   ✅ Copiado com sucesso!`);
        copied++;
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⏭️ Arquivo já existe, pulando...`);
        } else {
          console.log(`   ⚠️ Erro ao copiar: ${error.message}`);
        }
      }
    }
    
    // Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    const [devFiles] = await bucket.getFiles({
      prefix: `${basePath}dev/materials/`
    });
    
    console.log(`\n✅ CÓPIA CONCLUÍDA!`);
    console.log(`📊 Total de arquivos copiados: ${copied}`);
    console.log(`📊 Total de arquivos em dev/materials/: ${devFiles.length}`);
    
    if (devFiles.length > 0) {
      console.log('\n📋 Alguns arquivos disponíveis em development:');
      devFiles.slice(0, 10).forEach(file => {
        const shortName = file.name.replace(`${basePath}dev/materials/`, '');
        console.log(`   - ${shortName}`);
      });
      if (devFiles.length > 10) {
        console.log(`   ... e mais ${devFiles.length - 10} arquivos`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

copyMaterialsTodev();
