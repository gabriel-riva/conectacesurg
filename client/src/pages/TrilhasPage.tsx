import { Header } from "@/components/Header";
import { FeatureGuard } from "@/components/FeatureGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Users, CheckCircle, PlayCircle, Lock } from "lucide-react";

const mockTrilhas = [
  {
    id: 1,
    title: "Introdução ao Portal CESURG",
    description: "Aprenda como navegar e usar todas as funcionalidades do Portal Conecta CESURG",
    category: "Básico",
    duration: "30 min",
    lessons: 5,
    completedLessons: 3,
    participants: 156,
    progress: 60,
    isCompleted: false,
    isLocked: false,
    thumbnail: "/api/placeholder/300/200"
  },
  {
    id: 2,
    title: "Comunidade e Colaboração",
    description: "Como participar ativamente da comunidade e contribuir com ideias e projetos",
    category: "Intermediário",
    duration: "45 min",
    lessons: 7,
    completedLessons: 0,
    participants: 89,
    progress: 0,
    isCompleted: false,
    isLocked: false,
    thumbnail: "/api/placeholder/300/200"
  },
  {
    id: 3,
    title: "Gestão de Projetos Avançada",
    description: "Técnicas avançadas para gerenciar projetos e liderar equipes dentro do CESURG",
    category: "Avançado",
    duration: "60 min",
    lessons: 10,
    completedLessons: 0,
    participants: 34,
    progress: 0,
    isCompleted: false,
    isLocked: true,
    thumbnail: "/api/placeholder/300/200"
  },
  {
    id: 4,
    title: "Inovação e Empreendedorismo",
    description: "Como transformar ideias em realidade e desenvolver o mindset empreendedor",
    category: "Especialização",
    duration: "90 min",
    lessons: 12,
    completedLessons: 12,
    participants: 67,
    progress: 100,
    isCompleted: true,
    isLocked: false,
    thumbnail: "/api/placeholder/300/200"
  }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Básico":
      return "bg-green-100 text-green-800";
    case "Intermediário":
      return "bg-blue-100 text-blue-800";
    case "Avançado":
      return "bg-orange-100 text-orange-800";
    case "Especialização":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function TrilhasPage() {
  return (
    <FeatureGuard featureName="trilhas">
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-primary">Trilhas de Aprendizado</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Desenvolva suas habilidades com trilhas de aprendizado personalizadas. 
                Cada trilha oferece um caminho estruturado para dominar diferentes aspectos 
                da vida profissional e pessoal no CESURG.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">4</p>
                      <p className="text-sm text-muted-foreground">Trilhas Disponíveis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">1</p>
                      <p className="text-sm text-muted-foreground">Trilhas Concluídas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">2</p>
                      <p className="text-sm text-muted-foreground">Em Progresso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trilhas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockTrilhas.map((trilha) => (
                <Card key={trilha.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative">
                    {trilha.isLocked ? (
                      <Lock className="h-12 w-12 text-gray-400" />
                    ) : (
                      <PlayCircle className="h-12 w-12 text-primary" />
                    )}
                    
                    <div className="absolute top-2 right-2">
                      <Badge className={getCategoryColor(trilha.category)}>
                        {trilha.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">{trilha.title}</CardTitle>
                      {trilha.isCompleted && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    <CardDescription className="line-clamp-3">
                      {trilha.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{trilha.progress}%</span>
                      </div>
                      <Progress value={trilha.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {trilha.completedLessons} de {trilha.lessons} aulas concluídas
                      </p>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{trilha.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{trilha.participants} participantes</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2">
                      {trilha.isLocked ? (
                        <Button className="w-full" disabled>
                          <Lock className="h-4 w-4 mr-2" />
                          Bloqueado
                        </Button>
                      ) : trilha.isCompleted ? (
                        <Button className="w-full" variant="outline">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Revisar
                        </Button>
                      ) : trilha.progress > 0 ? (
                        <Button className="w-full">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Continuar
                        </Button>
                      ) : (
                        <Button className="w-full">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Iniciar Trilha
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </FeatureGuard>
  );
}