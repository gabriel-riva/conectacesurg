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
  // Tratamento das datas - agora chegam como strings no formato YYYY-MM-DD
  const startDate = new Date(challenge.startDate + 'T00:00:00');
  const endDate = new Date(challenge.endDate + 'T23:59:59');
  const now = new Date();
  
  // Verificar se as datas são válidas
  const isValidStartDate = !isNaN(startDate.getTime());
  const isValidEndDate = !isNaN(endDate.getTime());
  
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
              className="w-full h-12 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary/40" />
            </div>
          )}
        </div>

        {/* Título e informações */}
        <div className="flex-1 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-2">
            {challenge.title}
          </h3>
          
          {/* Pontos e período em linha */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center bg-primary/10 px-2 py-1 rounded-full">
              <Trophy className="h-3 w-3 mr-1 text-primary" />
              <span className="font-bold text-primary">{challenge.points} pts</span>
            </div>
            <div className="flex items-center text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>
                {isValidStartDate && isValidEndDate ? 
                  `${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM", { locale: ptBR })}` :
                  "Datas não disponíveis"
                }
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}