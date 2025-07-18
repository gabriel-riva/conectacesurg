import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Calendar, ExternalLink, Trophy, Award, Target } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FeatureGuard } from "@/components/FeatureGuard";
import { Header } from "@/components/Header";
import { GamificationRankingCard } from "@/components/GamificationRankingCard";
import { GamificationChallengeCard } from "@/components/GamificationChallengeCard";
import { GamificationPeriodCard } from "@/components/GamificationPeriodCard";
import { GamificationPointsHistoryCard } from "@/components/GamificationPointsHistoryCard";
import { GamificationChallengeDetailCard } from "@/components/GamificationChallengeDetailCard";
import { useAuth } from "@/lib/auth";
import type { GamificationChallenge } from "@/shared/schema";

function NewGamificationPageContent() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedChallenge, setSelectedChallenge] = useState<GamificationChallenge | null>(null);

  // Queries
  const { data: periodicChallenges = [], isLoading: periodicLoading } = useQuery({
    queryKey: ["/api/gamification/challenges", { type: "periodic" }],
    queryFn: async () => {
      const response = await fetch("/api/gamification/challenges?type=periodic");
      if (!response.ok) throw new Error("Failed to fetch periodic challenges");
      return response.json();
    },
  });

  const { data: annualChallenges = [], isLoading: annualLoading } = useQuery({
    queryKey: ["/api/gamification/challenges", { type: "annual" }],
    queryFn: async () => {
      const response = await fetch("/api/gamification/challenges?type=annual");
      if (!response.ok) throw new Error("Failed to fetch annual challenges");
      return response.json();
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/gamification/settings"],
  });

  const { data: pointsExtract } = useQuery({
    queryKey: ["/api/gamification/points/extract"],
  });

  const handleChallengeClick = (challenge: GamificationChallenge) => {
    setSelectedChallenge(challenge);
  };

  const handleBackClick = () => {
    setSelectedChallenge(null);
  };

  if (periodicLoading || annualLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando gamificação...</p>
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Gamificação</h1>
          <p className="text-gray-600">Acompanhe seu desempenho, participe dos desafios e veja o ranking da comunidade</p>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna esquerda - Período atual e pontos */}
          <div className="lg:col-span-3 space-y-6">
            <GamificationPeriodCard settings={settings} />
            <GamificationPointsHistoryCard pointsExtract={pointsExtract} />
          </div>

          {/* Coluna central - Desafios ou detalhes do desafio */}
          <div className="lg:col-span-6 space-y-6">
            {selectedChallenge ? (
              <GamificationChallengeDetailCard 
                challenge={selectedChallenge} 
                onBackClick={handleBackClick}
              />
            ) : (
              <>
                {/* Desafios do período */}
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
                  <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="text-primary/90 flex items-center">
                      <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
                      <Target className="h-5 w-5 mr-2" />
                      Desafios do Período
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {periodicChallenges.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum desafio disponível no momento</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {periodicChallenges.map((challenge) => (
                          <GamificationChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            onClick={() => handleChallengeClick(challenge)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Desafios anuais */}
                <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
                  <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="text-primary/90 flex items-center">
                      <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
                      <Award className="h-5 w-5 mr-2" />
                      Desafios Anuais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {annualChallenges.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum desafio anual disponível</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {annualChallenges.map((challenge) => (
                          <GamificationChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            onClick={() => handleChallengeClick(challenge)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Coluna direita - Ranking */}
          <div className="lg:col-span-3 space-y-6">
            <GamificationRankingCard />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewGamificationPage() {
  return (
    <FeatureGuard featureName="gamificacao">
      <NewGamificationPageContent />
    </FeatureGuard>
  );
}