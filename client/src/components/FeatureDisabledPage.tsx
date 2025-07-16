import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Construction } from "lucide-react";

interface FeatureDisabledPageProps {
  featureName: string;
  message: string;
  showBackButton?: boolean;
}

const featureLabels: Record<string, string> = {
  community: "Comunidade",
  ideas: "Ideias",
  gamification: "Gamificação",
};

export function FeatureDisabledPage({ 
  featureName, 
  message, 
  showBackButton = true 
}: FeatureDisabledPageProps) {
  const [, setLocation] = useLocation();

  const handleGoBack = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Construction className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl mb-2">
            {featureLabels[featureName] || featureName}
          </CardTitle>
          <Badge variant="secondary" className="w-fit mx-auto">
            <Clock className="h-3 w-3 mr-1" />
            Em desenvolvimento
          </Badge>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            {message}
          </p>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Estamos trabalhando para trazer esta funcionalidade o mais breve possível. 
              Fique atento às novidades!
            </p>
          </div>

          {showBackButton && (
            <Button 
              onClick={handleGoBack}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}