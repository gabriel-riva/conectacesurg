import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Header } from "@/components/Header";
import { GamificationChallengeDetailCard } from "@/components/GamificationChallengeDetailCard";
import { GamificationPointsHistoryCard } from "@/components/GamificationPointsHistoryCard";
import { GamificationPeriodCard } from "@/components/GamificationPeriodCard";
import { FeatureGuard } from "@/components/FeatureGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { GamificationChallenge } from "@/shared/schema";

function ChallengeDetailPageContent() {
  const [, navigate] = useLocation();
  const params = useParams();
  const challengeId = parseInt(params.id || '0');

  // Buscar o desafio específico
  const { data: challenge, isLoading: challengeLoading, error } = useQuery({
    queryKey: ["/api/gamification/challenges", challengeId],
    queryFn: async () => {
      const response = await fetch(`/api/gamification/challenges/${challengeId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Desafio não encontrado");
        }
        throw new Error("Erro ao carregar desafio");
      }
      return response.json() as Promise<GamificationChallenge>;
    },
    enabled: challengeId > 0,
  });

  // Buscar configurações e extrato de pontos para as cards laterais
  const { data: settings } = useQuery({
    queryKey: ["/api/gamification/settings"],
  });

  const { data: pointsExtract } = useQuery({
    queryKey: ["/api/gamification/points/extract"],
  });

  const handleBackClick = () => {
    navigate("/gamificacao");
  };

  if (challengeLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando desafio...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Desafio não encontrado</h1>
              <p className="text-gray-600 mb-6">O desafio que você está procurando não existe ou foi removido.</p>
              <Button onClick={handleBackClick} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Gamificação
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8 relative">
        {/* Background Pattern Element */}
        <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
          <div className="absolute -right-80 -top-40 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -left-80 top-60 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl"></div>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna esquerda - Ciclo atual e pontos */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <GamificationPeriodCard settings={settings} />
            <GamificationPointsHistoryCard pointsExtract={pointsExtract} />
          </div>

          {/* Coluna central - Detalhes do desafio */}
          <div className="lg:col-span-9">
            <GamificationChallengeDetailCard 
              challenge={challenge} 
              onBackClick={handleBackClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChallengeDetailPage() {
  return (
    <FeatureGuard 
      featureName="gamificacao" 
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Funcionalidade Desabilitada</h1>
              <p className="text-gray-600">A gamificação está temporariamente desabilitada.</p>
            </div>
          </main>
        </div>
      }
    >
      <ChallengeDetailPageContent />
    </FeatureGuard>
  );
}