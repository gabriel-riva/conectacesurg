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

async function testStorage() {
  console.log('🔍 Testando Object Storage...\n');
  
  // Variáveis de ambiente
  console.log('📊 Variáveis de ambiente:');
  console.log('PRIVATE_OBJECT_DIR:', process.env.PRIVATE_OBJECT_DIR || 'NÃO DEFINIDO');
  console.log('PUBLIC_OBJECT_SEARCH_PATHS:', process.env.PUBLIC_OBJECT_SEARCH_PATHS || 'NÃO DEFINIDO');
  
  // Se PRIVATE_OBJECT_DIR existir, extrair o bucket
  if (process.env.PRIVATE_OBJECT_DIR) {
    const dir = process.env.PRIVATE_OBJECT_DIR;
    // Formato esperado: /bucket-name/path
    const parts = dir.split('/').filter(p => p);
    if (parts.length > 0) {
      const bucketName = parts[0];
      console.log('\n📦 Bucket identificado:', bucketName);
      
      try {
        const bucket = storage.bucket(bucketName);
        const [exists] = await bucket.exists();
        
        if (exists) {
          console.log('✅ Bucket existe e está acessível!');
          
          // Listar alguns arquivos
          const [files] = await bucket.getFiles({ maxResults: 10 });
          console.log(`\n📁 Primeiros ${files.length} arquivos no bucket:`);
          files.forEach(file => {
            console.log(`   - ${file.name}`);
          });
        } else {
          console.log('❌ Bucket não existe');
        }
      } catch (error) {
        console.log('❌ Erro ao acessar bucket:', error.message);
      }
    }
  } else {
    console.log('\n⚠️ PRIVATE_OBJECT_DIR não está configurado');
  }
}

testStorage();
