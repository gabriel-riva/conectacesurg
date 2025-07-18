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
  // Garantir que as datas sejam tratadas corretamente no timezone local
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
        <div className="mb-2">
          {challenge.imageUrl ? (
            <img 
              src={challenge.imageUrl} 
              alt={challenge.title}
              className="w-full h-20 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary/40" />
            </div>
          )}
        </div>

        {/* Título e status */}
        <div className="mb-2 flex-1">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
              {challenge.title}
            </h3>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-gray-600 line-clamp-1">
            {challenge.description}
          </p>
        </div>

        {/* Informações do desafio */}
        <div className="space-y-1 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-500">
              <Trophy className="h-3 w-3 mr-1" />
              <span>{challenge.points} pts</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{format(endDate, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          {/* Período do desafio */}
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>
              {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}