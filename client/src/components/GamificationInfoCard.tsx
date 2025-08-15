import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Calendar, Target, TrendingUp, Plus, Minus } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GamificationSettings {
  cycleStartDate: string;
  cycleEndDate: string;
  annualStartDate: string;
  annualEndDate: string;
}

interface PointsEntry {
  id: number;
  points: number;
  description: string;
  createdAt: string;
  type: string;
}

interface PointsExtract {
  totalPoints: number;
  history: PointsEntry[];
}

interface Challenge {
  id: number;
  title: string;
  type: string;
  status?: string;
  hasSubmission?: boolean;
}

interface GamificationInfoCardProps {
  settings: GamificationSettings | null | undefined;
  pointsExtract: PointsExtract | null | undefined;
  periodicChallenges: Challenge[];
  annualChallenges: Challenge[];
}

export function GamificationInfoCard({ 
  settings, 
  pointsExtract, 
  periodicChallenges = [], 
  annualChallenges = [] 
}: GamificationInfoCardProps) {
  const cycleStart = settings?.cycleStartDate ? new Date(settings.cycleStartDate) : null;
  const cycleEnd = settings?.cycleEndDate ? new Date(settings.cycleEndDate) : null;
  const now = new Date();

  const daysRemaining = cycleEnd ? Math.max(0, differenceInDays(cycleEnd, now)) : 0;
  const totalDays = cycleStart && cycleEnd ? differenceInDays(cycleEnd, cycleStart) : 1;
  const elapsedDays = cycleStart ? Math.max(0, differenceInDays(now, cycleStart)) : 0;
  const progressPercentage = Math.min(100, (elapsedDays / totalDays) * 100);

  // Calculate challenge statistics
  const completedCycleChallenges = periodicChallenges.filter(c => c.hasSubmission && c.status === 'completed').length;
  const openCycleChallenges = periodicChallenges.length - completedCycleChallenges;
  
  const completedAnnualChallenges = annualChallenges.filter(c => c.hasSubmission && c.status === 'completed').length;
  const openAnnualChallenges = annualChallenges.length - completedAnnualChallenges;

  const getPointsBadgeStyle = (type: string, points: number) => {
    switch (type) {
      case 'provisional':
        return { 
          variant: 'secondary' as const, 
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300' 
        };
      case 'approved':
        return { 
          variant: 'default' as const, 
          className: 'bg-green-100 text-green-800 border-green-300' 
        };
      case 'rejected':
        return { 
          variant: 'destructive' as const, 
          className: 'bg-red-100 text-red-800 border-red-300' 
        };
      default:
        return { 
          variant: points > 0 ? 'default' as const : 'destructive' as const, 
          className: '' 
        };
    }
  };

  const getPointsIcon = (type: string, points: number) => {
    switch (type) {
      case 'provisional':
        return <Plus className="h-3 w-3" />;
      case 'rejected':
        return <Minus className="h-3 w-3" />;
      default:
        return points > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />;
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-none h-full">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          <Info className="h-5 w-5 mr-2" />
          Informações
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-6 flex-grow flex flex-col justify-between">
        {/* Ciclo Atual */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            Ciclo Atual
          </h4>
          
          {cycleStart && cycleEnd ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Período:</span>
                <span className="font-medium">
                  {format(cycleStart, "dd/MM/yyyy", { locale: ptBR })} - {format(cycleEnd, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Dias restantes:</span>
                <span className="font-medium text-primary">
                  {daysRemaining} dias
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progresso do ciclo</span>
                  <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Início</span>
                  <span>Fim</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum ciclo configurado</p>
            </div>
          )}
        </div>

        {/* Meus Desafios */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
            <Target className="h-4 w-4 mr-2 text-primary" />
            Meus Desafios
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-700">{completedCycleChallenges}</div>
                <div className="text-xs text-blue-600">Concluídos</div>
                <div className="text-xs text-gray-500">Ciclo</div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-orange-700">{openCycleChallenges}</div>
                <div className="text-xs text-orange-600">Em aberto</div>
                <div className="text-xs text-gray-500">Ciclo</div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">{completedAnnualChallenges}</div>
                <div className="text-xs text-green-600">Concluídos</div>
                <div className="text-xs text-gray-500">Anual</div>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-red-700">{openAnnualChallenges}</div>
                <div className="text-xs text-red-600">Em aberto</div>
                <div className="text-xs text-gray-500">Anual</div>
              </div>
            </div>
          </div>
        </div>

        {/* Meus Pontos */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-primary" />
            Meus Pontos
          </h4>
          
          {pointsExtract ? (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">{pointsExtract.totalPoints}</div>
                <div className="text-sm text-gray-600">Total de pontos</div>
              </div>

              {pointsExtract.history && pointsExtract.history.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Histórico recente</div>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {pointsExtract.history.slice(0, 5).map((entry) => {
                        const badgeStyle = getPointsBadgeStyle(entry.type, entry.points);
                        return (
                          <div key={entry.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {entry.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(entry.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <Badge 
                              variant={badgeStyle.variant} 
                              className={`ml-2 text-xs flex items-center ${badgeStyle.className}`}
                            >
                              {getPointsIcon(entry.type, entry.points)}
                              <span className="ml-1">{entry.points > 0 ? '+' : ''}{entry.points}</span>
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Carregando pontos...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}