import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, ExternalLink, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { GamificationSettings } from "@/shared/schema";

interface GamificationPeriodCardProps {
  settings: GamificationSettings | null | undefined;
}

export function GamificationPeriodCard({ settings }: GamificationPeriodCardProps) {
  if (!settings) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
        <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            <Calendar className="h-5 w-5 mr-2" />
            Período Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Configurações não encontradas</p>
            <p className="text-xs">Configure os períodos na área administrativa</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cycleStart = settings.cycleStartDate ? new Date(settings.cycleStartDate) : null;
  const cycleEnd = settings.cycleEndDate ? new Date(settings.cycleEndDate) : null;
  const now = new Date();

  // Calcular progresso do período
  let progressPercentage = 0;
  let daysRemaining = 0;
  let totalDays = 0;

  if (cycleStart && cycleEnd) {
    totalDays = differenceInDays(cycleEnd, cycleStart);
    const daysPassed = differenceInDays(now, cycleStart);
    daysRemaining = Math.max(0, differenceInDays(cycleEnd, now));
    progressPercentage = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          <Calendar className="h-5 w-5 mr-2" />
          Período Atual
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Informações do período */}
        <div className="space-y-2">
          {cycleStart && cycleEnd && (
            <>
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
            </>
          )}
        </div>

        {/* Barra de progresso */}
        {cycleStart && cycleEnd && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Progresso do período</span>
              <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Início</span>
              <span>Fim</span>
            </div>
          </div>
        )}

        {/* Links para regulamentos */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium text-gray-800">Regulamentos</h4>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs h-8"
              onClick={() => window.open('#', '_blank')}
            >
              <FileText className="h-3 w-3 mr-2" />
              Regulamento do Período
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-xs h-8"
              onClick={() => window.open('#', '_blank')}
            >
              <FileText className="h-3 w-3 mr-2" />
              Regulamento Anual
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}