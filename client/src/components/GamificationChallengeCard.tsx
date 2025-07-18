import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Clock } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { GamificationChallenge } from "@/shared/schema";

interface GamificationChallengeCardProps {
  challenge: GamificationChallenge;
  onClick: () => void;
}

export function GamificationChallengeCard({ challenge, onClick }: GamificationChallengeCardProps) {
  // Garantir que as datas sejam tratadas corretamente sem problemas de timezone
  const startDateStr = typeof challenge.startDate === 'string' ? challenge.startDate : challenge.startDate.toISOString().split('T')[0];
  const endDateStr = typeof challenge.endDate === 'string' ? challenge.endDate : challenge.endDate.toISOString().split('T')[0];
  
  const startDate = new Date(startDateStr + 'T00:00:00');
  const endDate = new Date(endDateStr + 'T23:59:59');
  const now = new Date();
  
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = isFuture(startDate);
  const isExpired = isPast(endDate);

  const getStatusBadge = () => {
    if (isUpcoming) {
      return <Badge variant="secondary" className="text-xs">Em breve</Badge>;
    }
    if (isActive) {
      return <Badge variant="default" className="text-xs">Ativo</Badge>;
    }
    if (isExpired) {
      return <Badge variant="outline" className="text-xs">Encerrado</Badge>;
    }
  };

  const getStatusColor = () => {
    if (isUpcoming) return "border-blue-200 bg-blue-50";
    if (isActive) return "border-green-200 bg-green-50";
    if (isExpired) return "border-gray-200 bg-gray-50";
    return "border-gray-200";
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${getStatusColor()} h-full flex flex-col`}
      onClick={onClick}
    >
      <CardContent className="p-3 flex-1 flex flex-col">
        {/* Imagem do desafio */}
        <div className="mb-3">
          {challenge.imageUrl ? (
            <img 
              src={challenge.imageUrl} 
              alt={challenge.title}
              className="w-full h-16 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary/40" />
            </div>
          )}
        </div>

        {/* Título e status */}
        <div className="mb-3 flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex-1 leading-tight">
              {challenge.title}
            </h3>
            {getStatusBadge()}
          </div>
        </div>

        {/* Informações do desafio */}
        <div className="space-y-2 mt-auto">
          {/* Pontos com destaque */}
          <div className="flex items-center justify-center">
            <div className="flex items-center bg-primary/10 px-3 py-1 rounded-full">
              <Trophy className="h-4 w-4 mr-1 text-primary" />
              <span className="text-sm font-bold text-primary">{challenge.points} pontos</span>
            </div>
          </div>

          {/* Período compacto */}
          <div className="flex items-center justify-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>
              {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}