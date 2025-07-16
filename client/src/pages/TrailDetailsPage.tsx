import { Header } from "@/components/Header";
import { FeatureGuard } from "@/components/FeatureGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Clock, Users, CheckCircle, PlayCircle, ArrowLeft, Eye, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";

interface TrailCategory {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
}

interface TrailContent {
  id: number;
  title: string;
  content: string;
  order: number;
  isDraft: boolean;
  viewCount: number;
  estimatedMinutes: number;
  trailId: number;
}

interface Trail {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  category?: TrailCategory;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  contentCount: number;
  viewCount: number;
  isPublished: boolean;
  isActive: boolean;
  order: number;
  contents: TrailContent[];
}

export default function TrailDetailsPage() {
  const { trailId } = useParams<{ trailId: string }>();
  const [selectedContent, setSelectedContent] = useState<TrailContent | null>(null);

  const { data: trail, isLoading: isLoadingTrail } = useQuery<Trail>({
    queryKey: ['/api/trails', trailId],
  });

  // Selecionar o primeiro conteúdo automaticamente quando a trilha carrega
  useEffect(() => {
    if (trail && trail.contents && trail.contents.length > 0 && !selectedContent) {
      setSelectedContent(trail.contents[0]);
    }
  }, [trail, selectedContent]);

  const getBadgeColor = (categoryName?: string) => {
    if (!categoryName) return 'bg-gray-100 text-gray-800';
    
    switch (categoryName.toLowerCase()) {
      case 'básico':
        return 'bg-blue-100 text-blue-800';
      case 'intermediário':
        return 'bg-green-100 text-green-800';
      case 'avançado':
        return 'bg-red-100 text-red-800';
      case 'tutoriais':
        return 'bg-yellow-100 text-yellow-800';
      case 'recursos':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoadingTrail) {
    return (
      <FeatureGuard featureName="trilhas">
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando trilha...</p>
              </div>
            </div>
          </main>
        </div>
      </FeatureGuard>
    );
  }

  if (!trail) {
    return (
      <FeatureGuard featureName="trilhas">
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Trilha não encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  A trilha que você está procurando não existe ou não está mais disponível.
                </p>
                <Link href="/trilhas">
                  <Button>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para trilhas
                  </Button>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </FeatureGuard>
    );
  }

  return (
    <FeatureGuard featureName="trilhas">
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Navegação */}
            <div className="mb-6">
              <Link href="/trilhas">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para trilhas
                </Button>
              </Link>
            </div>

            {/* Cabeçalho da Trilha */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge className={getBadgeColor(trail.category?.name || '')}>
                  {trail.category?.name || 'Sem categoria'}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  {trail.viewCount} visualizações
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-4">{trail.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{trail.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {trail.creator?.name || 'Autor não identificado'}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {trail.contentCount || 0} conteúdos
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Lista de Conteúdos */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Conteúdos da Trilha</CardTitle>
                    <CardDescription>
                      {trail.contents?.length || 0} conteúdos disponíveis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(!trail.contents || trail.contents.length === 0) ? (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum conteúdo disponível ainda.
                      </p>
                    ) : (
                      trail.contents.map((content, index) => (
                        <div key={content.id}>
                          <Button
                            variant={selectedContent?.id === content.id ? "default" : "ghost"}
                            className="w-full justify-start text-left h-auto p-4"
                            onClick={() => setSelectedContent(content)}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-primary">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium line-clamp-2">{content.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  {content.estimatedMinutes > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {content.estimatedMinutes} min
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {content.viewCount}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Button>
                          {index < trail.contents.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Área de Conteúdo */}
              <div className="lg:col-span-2">
                {selectedContent ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">{selectedContent.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {selectedContent.estimatedMinutes > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {selectedContent.estimatedMinutes} minutos
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {selectedContent.viewCount} visualizações
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: selectedContent.content }}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          Selecione um conteúdo
                        </h3>
                        <p className="text-muted-foreground">
                          Escolha um item da lista ao lado para começar a aprender.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </FeatureGuard>
  );
}