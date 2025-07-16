import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { UtilityLinks } from "@/components/UtilityLinks";
import { CalendarCard } from "@/components/CalendarCard";
import { ChallengesCard } from "@/components/ChallengesCard";
import { AnnouncementsCard } from "@/components/AnnouncementsCard";
import LatestNewsCard from "@/components/LatestNewsCard";
import { RankingCard } from "@/components/RankingCard";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8 relative">
        {/* Background Pattern Element */}
        <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
          <div className="absolute -right-80 -top-40 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -left-80 top-60 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl"></div>
        </div>
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
            {/* Área de gamificação */}
            <ChallengesCard />
            
            {/* Notícias ocupando toda a largura da segunda fileira */}
            <LatestNewsCard limit={3} />
          </div>
          
          {/* Coluna 3: Ranking e Avisos (3/11 da largura) */}
          <div className="lg:col-span-3 space-y-6 order-first lg:order-last">
            <RankingCard />
            <AnnouncementsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
