import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface GamificationPointsHistoryCardProps {
  pointsExtract: PointsExtract | null | undefined;
}

export function GamificationPointsHistoryCard({ pointsExtract }: GamificationPointsHistoryCardProps) {
  if (!pointsExtract) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
        <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            <TrendingUp className="h-5 w-5 mr-2" />
            Meus Pontos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Carregando histórico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { totalPoints, history } = pointsExtract;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center justify-between">
          <div className="flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            <TrendingUp className="h-5 w-5 mr-2" />
            Meus Pontos
          </div>
          <Badge variant="default" className="bg-primary text-primary-foreground">
            {totalPoints} pts
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="h-64 overflow-hidden">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Nenhuma pontuação ainda</p>
                <p className="text-xs">Participe dos desafios para ganhar pontos!</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-1">
                        {entry.points > 0 ? (
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <Plus className="h-3 w-3 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                            <Minus className="h-3 w-3 text-red-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {entry.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <Badge
                        variant={entry.points > 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {entry.points > 0 ? '+' : ''}{entry.points}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}