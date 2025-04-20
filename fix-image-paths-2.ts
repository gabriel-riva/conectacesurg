import { db } from './server/db';
import { news } from './shared/schema';
import { eq, like } from 'drizzle-orm';

// Script para corrigir os caminhos das imagens das notícias
async function fixImagePaths() {
  console.log('Iniciando correção de caminhos de imagens...');

  try {
    // Buscar todas as notícias com imagens
    const newsToUpdate = await db.query.news.findMany({
      where: like(news.imageUrl, '%uploads/news/%'),
    });

    console.log(`Encontradas ${newsToUpdate.length} notícias para atualizar.`);

    // Atualizar cada notícia
    for (const item of newsToUpdate) {
      if (item.imageUrl) {
        // Extrair apenas o nome do arquivo e construir o novo caminho
        const parts = item.imageUrl.split('/');
        const filename = parts[parts.length - 1];
        const newPath = `/uploads/news/${filename}`;
        
        console.log(`Atualizando notícia ${item.id}:`);
        console.log(`  - De: ${item.imageUrl}`);
        console.log(`  - Para: ${newPath}`);

        // Atualizar no banco de dados
        await db.update(news)
          .set({ imageUrl: newPath })
          .where(eq(news.id, item.id));
      }
    }

    console.log('Correção concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao corrigir caminhos de imagens:', error);
  }
}

// Executar o script
fixImagePaths()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro no script:', error);
    process.exit(1);
  });