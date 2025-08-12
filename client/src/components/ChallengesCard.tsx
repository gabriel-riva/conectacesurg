import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Trophy, Calendar, Clock } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface Challenge {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  points: number;
  startDate: string;
  endDate: string;
  type: 'periodic' | 'annual';
  evaluationType: 'quiz' | 'text' | 'file' | 'qrcode' | 'none';
}

interface ChallengeCardProps {
  challenge: Challenge;
}

function ChallengeItem({ challenge }: ChallengeCardProps) {
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = isFuture(startDate);
  const isExpired = isPast(endDate);

  const getStatusBadge = () => {
    if (isUpcoming) {
      return <Badge variant="secondary" className="text-xs">Em breve</Badge>;
    }
    if (isActive) {
      return <Badge variant="default" className="text-xs bg-green-600">Ativo</Badge>;
    }
    if (isExpired) {
      return <Badge variant="outline" className="text-xs">Encerrado</Badge>;
    }
  };

  return (
    <Link href={`/gamificacao/desafio/${challenge.id}`}>
      <div className="min-w-[260px] max-w-[260px] h-full flex flex-col rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:translate-y-[-2px] group cursor-pointer bg-white border">
        <div className="h-16 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden flex-shrink-0">
          {challenge.imageUrl ? (
            <img 
              src={challenge.imageUrl} 
              alt={challenge.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Trophy className="w-6 h-6 text-primary/60 mx-auto mb-1" />
              <div className="text-xs font-medium text-primary/80">DESAFIO</div>
            </div>
          )}
          <div className="absolute top-1 right-1">
            {getStatusBadge()}
          </div>
        </div>
        <div className="p-3 flex-1 flex flex-col min-h-0">
          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {challenge.title}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-3 flex-1 mb-2">
            {challenge.description}
          </p>
          
          <div className="space-y-1 mt-auto">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                <span>{format(endDate, "dd/MM", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center">
                <Trophy className="w-3 h-3 mr-1 text-primary" />
                <span className="text-primary font-medium">{challenge.points}pts</span>
              </div>
            </div>
            
            {challenge.evaluationType !== 'none' && (
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                <span>
                  {challenge.evaluationType === 'quiz' && 'Quiz'}
                  {challenge.evaluationType === 'text' && 'Texto'}
                  {challenge.evaluationType === 'file' && 'Arquivo'}
                  {challenge.evaluationType === 'qrcode' && 'QR Code'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ChallengesCard() {
  const { user } = useAuth();
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Buscar desafios ativos não completados pelo usuário
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['/api/gamification/challenges/active-for-user'],
    queryFn: () => apiRequest('/api/gamification/challenges/active-for-user'),
    enabled: !!user,
  });

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const newPosition = Math.max(0, scrollPosition - 300);
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
      const newPosition = Math.min(maxScroll, scrollPosition + 300);
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollContainerRef.current ? 
    scrollPosition < (scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth) : 
    challenges.length > 0;

  if (!user) {
    return (
      <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            Gamificação
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-base font-medium">Faça login</p>
            <p className="text-sm mt-1">Entre para ver seus desafios</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            Gamificação
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollLeft}
              disabled={!canScrollLeft || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollRight}
              disabled={!canScrollRight || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex space-x-4 h-full">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="min-w-[280px] h-full bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
            <Trophy className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-base font-medium">Nenhum desafio ativo</p>
            <p className="text-sm mt-1">Aguarde novos desafios serem publicados</p>
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="flex space-x-4 overflow-x-hidden scroll-smooth h-full"
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
          >
            {challenges.map((challenge: Challenge) => (
              <ChallengeItem key={challenge.id} challenge={challenge} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}