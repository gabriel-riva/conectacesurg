import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { HomeProfile } from "@/components/HomeProfile";
import { UtilityLinks } from "@/components/UtilityLinks";
import { CalendarCard } from "@/components/CalendarCard";
import { ChallengesCard } from "@/components/ChallengesCard";
import { AnnouncementsCard } from "@/components/AnnouncementsCard";
import { NewsCard } from "@/components/NewsCard";
import { RankingCard } from "@/components/RankingCard";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Layout conforme design fornecido */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-6">
          {/* Coluna 1: Calendário e Links Úteis (3/11 da largura) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <CalendarCard />
              <UtilityLinks />
            </div>
          </div>
          
          {/* Coluna 2: Área central (5/11 da largura) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Área de desafios */}
            <ChallengesCard />
            
            {/* Grid de 2 colunas para Avisos e Notícias */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnnouncementsCard />
              <NewsCard />
            </div>
          </div>
          
          {/* Coluna 3: Perfil e Ranking (3/11 da largura) */}
          <div className="lg:col-span-3 space-y-6 order-first lg:order-last">
            <HomeProfile />
            <RankingCard />
          </div>
        </div>
      </div>
    </div>
  );
}
