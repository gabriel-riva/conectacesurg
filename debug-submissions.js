// Script para debug das submissões
const { db } = require('./server/db.js');
const { challengeSubmissions, users, gamificationChallenges } = require('./shared/schema.js');
const { eq, desc } = require('drizzle-orm');

async function checkSubmissions() {
  try {
    console.log('🔍 Verificando submissões no banco...');
    
    const submissions = await db
      .select({
        id: challengeSubmissions.id,
        challengeId: challengeSubmissions.challengeId,
        userId: challengeSubmissions.userId,
        submissionType: challengeSubmissions.submissionType,
        status: challengeSubmissions.status,
        points: challengeSubmissions.points,
        createdAt: challengeSubmissions.createdAt,
        userName: users.name,
        challengeTitle: gamificationChallenges.title,
      })
      .from(challengeSubmissions)
      .leftJoin(users, eq(challengeSubmissions.userId, users.id))
      .leftJoin(gamificationChallenges, eq(challengeSubmissions.challengeId, gamificationChallenges.id))
      .orderBy(desc(challengeSubmissions.createdAt));
    
    console.log('📊 Resultado da query:', JSON.stringify(submissions, null, 2));
    
    if (submissions.length === 0) {
      console.log('❌ Nenhuma submissão encontrada!');
    } else {
      console.log(`✅ Encontradas ${submissions.length} submissões`);
      submissions.forEach((s, i) => {
        console.log(`${i+1}. ID: ${s.id}, Status: ${s.status}, Pontos: ${s.points}, Usuário: ${s.userName}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkSubmissions();