import { db } from './server/db';
import { news } from './shared/schema';
import { eq, like } from 'drizzle-orm';

// Script para corrigir os caminhos das imagens das notícias
async function fixImagePaths() {
  console.log('Iniciando correção de caminhos de imagens...');

  try {
    // Buscar notícias com caminhos antigos (/uploads/news/*)
    const newsToUpdate = await db.query.news.findMany({
      where: like(news.imageUrl, '/uploads/news/%'),
    });

    console.log(`Encontradas ${newsToUpdate.length} notícias para atualizar.`);

    // Atualizar cada notícia
    for (const item of newsToUpdate) {
      if (item.imageUrl) {
        // Transformar /uploads/news/* em /public/uploads/news/*
        const newPath = item.imageUrl.replace('/uploads/news/', '/public/uploads/news/');
        
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