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
        {/* Layout em grid: 3 colunas para desktop, 1 coluna para mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Calendário e Links Úteis */}
          <div className="space-y-6">
            <CalendarCard />
            <UtilityLinks />
          </div>
          
          {/* Coluna 2: Desafios, Avisos e Últimas Notícias */}
          <div className="space-y-6">
            <ChallengesCard />
            <AnnouncementsCard />
            <NewsCard />
          </div>
          
          {/* Coluna 3: Perfil e Ranking */}
          <div className="space-y-6 order-first lg:order-last">
            <HomeProfile />
            <RankingCard />
          </div>
        </div>
      </div>
    </div>
  );
}
