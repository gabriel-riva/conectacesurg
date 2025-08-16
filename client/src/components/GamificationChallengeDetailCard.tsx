import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Trophy, Clock, User, Target } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { GamificationChallenge } from "@/shared/schema";
import ChallengeComments from "./ChallengeComments";
import { ChallengeEvaluationForm } from "./ChallengeEvaluationForm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GamificationChallengeDetailCardProps {
  challenge: GamificationChallenge;
  onBackClick: () => void;
}

export function GamificationChallengeDetailCard({ challenge, onBackClick }: GamificationChallengeDetailCardProps) {
  const startDate = new Date(challenge.startDate);
  const endDate = new Date(challenge.endDate);
  const now = new Date();
  
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = isFuture(startDate);
  const isExpired = isPast(endDate);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar submissão existente do usuário
  const { data: existingSubmission, isLoading: submissionLoading } = useQuery({
    queryKey: ['/api/gamification/challenges', challenge.id, 'my-submission'],
    queryFn: () => apiRequest(`/api/gamification/challenges/${challenge.id}/my-submission`),
    enabled: challenge.evaluationType !== 'none',
  });

  // Mutação para submeter o desafio
  const submitChallengeMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      return apiRequest(`/api/gamification/challenges/${challenge.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(submissionData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Sua submissão foi enviada com sucesso!",
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/gamification/challenges', challenge.id, 'my-submission']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/gamification/my-submissions']
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar submissão",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = () => {
    if (isUpcoming) {
      return <Badge variant="secondary">Em breve</Badge>;
    }
    if (isActive) {
      return <Badge variant="default">Ativo</Badge>;
    }
    if (isExpired) {
      return <Badge variant="outline">Encerrado</Badge>;
    }
  };

  const getStatusColor = () => {
    if (isUpcoming) return "border-blue-200 bg-blue-50";
    if (isActive) return "border-green-200 bg-green-50";
    if (isExpired) return "border-gray-200 bg-gray-50";
    return "border-gray-200";
  };

  return (
    <div className="space-y-6">
      <Card className={`shadow-md hover:shadow-lg transition-shadow duration-300 border-none ${getStatusColor()}`}>
        <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackClick}
              className="text-primary/70 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            {getStatusBadge()}
          </div>
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            {challenge.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Imagem do desafio */}
          {challenge.imageUrl && (
            <div className="w-full">
              <img 
                src={challenge.imageUrl} 
                alt={challenge.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-gray-600">Pontuação</p>
                <p className="font-semibold">{challenge.points} pontos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-gray-600">Período</p>
                <p className="font-semibold text-sm">
                  {format(startDate, "dd/MM/yyyy", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-semibold">{challenge.type === 'periodic' ? 'Período' : 'Anual'}</p>
              </div>
            </div>
          </div>

          {/* Descrição curta */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Descrição</h3>
            <p className="text-gray-700">{challenge.description}</p>
          </div>

          {/* Conteúdo detalhado */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Detalhes do Desafio</h3>
            <div 
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: challenge.detailedDescription }}
            />
          </div>

          {/* Informações do criador */}
          {challenge.createdAt && (
            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Criado pelo Sistema</span>
                <span>•</span>
                <span>{format(new Date(challenge.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          )}

          {/* Status do desafio */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Status do Desafio</h4>
                <p className="text-sm text-gray-600">
                  {isUpcoming && "Este desafio ainda não começou."}
                  {isActive && "Este desafio está ativo! Você pode participar agora."}
                  {isExpired && "Este desafio já foi encerrado."}
                </p>
              </div>
              {getStatusBadge()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de avaliação */}
      {challenge.evaluationType && challenge.evaluationType !== 'none' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Avaliação do Desafio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isActive ? (
              <ChallengeEvaluationForm
                challengeId={challenge.id}
                evaluationType={challenge.evaluationType as 'quiz' | 'text' | 'file' | 'qrcode'}
                evaluationConfig={challenge.evaluationConfig || {}}
                onSubmit={submitChallengeMutation.mutate}
                isLoading={submitChallengeMutation.isPending}
                existingSubmission={existingSubmission}
              />
            ) : (
              <div className="text-center py-8">
                <div className="mb-4">
                  <Badge variant="outline" className="px-4 py-2">
                    {challenge.evaluationType === 'quiz' && 'Quiz'}
                    {challenge.evaluationType === 'text' && 'Texto Livre'}
                    {challenge.evaluationType === 'file' && 'Upload de Arquivo'}
                    {challenge.evaluationType === 'qrcode' && 'QR Code'}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">Avaliação Disponível</h3>
                <p className="text-gray-600 mb-4">
                  Este desafio possui uma avaliação que será liberada quando o período estiver ativo.
                </p>
                {isUpcoming && (
                  <p className="text-sm text-blue-600">
                    A avaliação estará disponível a partir de {format(new Date(challenge.startDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {isExpired && (
                  <p className="text-sm text-red-600">
                    A avaliação não está mais disponível. O desafio foi encerrado em {format(new Date(challenge.endDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seção de comentários */}
      <ChallengeComments challengeId={challenge.id} />
    </div>
  );
}