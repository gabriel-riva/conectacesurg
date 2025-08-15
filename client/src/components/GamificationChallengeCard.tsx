import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Clock, CheckCircle, AlertCircle, XCircle, Star } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { GamificationChallenge } from "@/shared/schema";

interface ChallengeSubmission {
  id: number;
  challengeId: number;
  status: string;
  points: number;
}

interface GamificationChallengeCardProps {
  challenge: GamificationChallenge;
  onClick: () => void;
  submission?: ChallengeSubmission | null;
}

export function GamificationChallengeCard({ challenge, onClick, submission }: GamificationChallengeCardProps) {
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

  // Definir status e cores baseados na submissão
  const getSubmissionStatus = () => {
    if (!submission) return null;
    
    switch (submission.status) {
      case 'completed':
      case 'approved':
        return {
          label: 'Concluído',
          icon: <CheckCircle className="h-3 w-3" />,
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-300'
        };
      case 'pending':
        return {
          label: 'Em revisão',
          icon: <AlertCircle className="h-3 w-3" />,
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
      case 'rejected':
        return {
          label: 'Rejeitado',
          icon: <XCircle className="h-3 w-3" />,
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-300'
        };
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    const submissionStatus = getSubmissionStatus();
    if (submissionStatus) {
      return (
        <Badge variant={submissionStatus.variant} className={`text-xs flex items-center gap-1 ${submissionStatus.className}`}>
          {submissionStatus.icon}
          {submissionStatus.label}
        </Badge>
      );
    }

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
    // Priorizar cores da submissão
    if (submission) {
      switch (submission.status) {
        case 'completed':
        case 'approved':
          return "border-green-300 bg-green-50";
        case 'pending':
          return "border-yellow-300 bg-yellow-50";
        case 'rejected':
          return "border-red-300 bg-red-50";
        default:
          break;
      }
    }

    // Cores padrão baseadas na data
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
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-primary/10 px-3 py-1 rounded-full">
              <Trophy className="h-4 w-4 mr-1 text-primary" />
              <span className="text-sm font-bold text-primary">{challenge.points} pontos</span>
            </div>
            
            {/* Pontos conquistados */}
            {submission && (
              <div className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                <Star className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-xs font-bold text-green-700">
                  {submission.points > 0 ? `+${submission.points}` : submission.points}
                </span>
              </div>
            )}
          </div>

          {/* Período compacto */}
          <div className="flex items-center justify-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>
              {isValidStartDate && isValidEndDate ? 
                `${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM", { locale: ptBR })}` :
                "Datas não disponíveis"
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}