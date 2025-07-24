import { Header } from "@/components/Header";
import { FeatureGuard } from "@/components/FeatureGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/StarRating";
import { BookOpen, Clock, Users, CheckCircle, PlayCircle, Lock, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";

interface TrailCategory {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
}

interface Trail {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  category?: TrailCategory;
  creator: {
    id: number;
    name: string;
    email: string;
  };
  contentCount: number;
  viewCount: number;
  isPublished: boolean;
  isActive: boolean;
  order: number;
  averageRating?: number;
  ratingCount?: number;
  userProgress?: {
    completionPercentage: number;
    completedContents: number;
  } | null;
}

export default function TrilhasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: trails = [], isLoading: isLoadingTrails } = useQuery<Trail[]>({
    queryKey: ['/api/trails'],
  });

  const { data: categories = [] } = useQuery<TrailCategory[]>({
    queryKey: ['/api/trails/categories/list'],
  });

  const filteredTrails = trails.filter(trail => {
    const matchesSearch = trail.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trail.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || trail.category?.id.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getBadgeColor = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
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

  if (isLoadingTrails) {
    return (
      <FeatureGuard featureName="trilhas">
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando trilhas...</p>
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
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold text-primary">Portal de Trilhas de Aprendizado</h1>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explore nossos cursos e trilhas de aprendizado para desenvolver suas habilidades
                e conhecimentos em diversas áreas.
              </p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{trails.length}</p>
                      <p className="text-sm text-muted-foreground">Trilhas Disponíveis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{categories.length}</p>
                      <p className="text-sm text-muted-foreground">Categorias</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">{trails.reduce((acc, trail) => acc + trail.contentCount, 0)}</p>
                      <p className="text-sm text-muted-foreground">Conteúdos Totais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar trilhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={selectedCategory === "" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedCategory("")}
                >
                  Todos
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id.toString())}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Grid de Trilhas */}
            {filteredTrails.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma trilha encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory
                    ? "Tente ajustar os filtros ou termo de busca."
                    : "Não há trilhas disponíveis no momento."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrails.map((trail) => (
                  <Card key={trail.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg mb-4 flex items-center justify-center">
                        {trail.imageUrl ? (
                          <img
                            src={trail.imageUrl}
                            alt={trail.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <BookOpen className="w-12 h-12 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getBadgeColor(trail.category?.name || '')}>
                          {trail.category?.name || 'Sem categoria'}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {trail.viewCount}
                        </div>
                      </div>
                      
                      <CardTitle className="text-lg">{trail.title}</CardTitle>
                      <CardDescription>{trail.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {trail.contentCount} conteúdos
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Estimado
                        </div>
                      </div>

                      {/* Average Rating */}
                      {trail.averageRating !== undefined && trail.ratingCount !== undefined && (
                        <div className="flex items-center gap-2 mb-3">
                          <StarRating 
                            rating={trail.averageRating} 
                            readonly={true} 
                            size="sm" 
                          />
                          <span className="text-xs text-muted-foreground">
                            {trail.averageRating > 0 
                              ? `${trail.averageRating.toFixed(1)} (${trail.ratingCount} ${trail.ratingCount === 1 ? 'avaliação' : 'avaliações'})`
                              : 'Sem avaliações'
                            }
                          </span>
                        </div>
                      )}

                      {/* Progress Bar */}
                      {trail.userProgress && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">Seu Progresso</span>
                            <span className="text-xs text-muted-foreground">
                              {trail.userProgress.completionPercentage}%
                            </span>
                          </div>
                          <Progress value={trail.userProgress.completionPercentage} className="h-1.5" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {trail.userProgress.completedContents} de {trail.contentCount} concluídos
                          </p>
                        </div>
                      )}
                      
                      <Link href={`/trilhas/${trail.id}`}>
                        <Button className="w-full">
                          <PlayCircle className="w-4 h-4 mr-2" />
                          {trail.userProgress && trail.userProgress.completionPercentage > 0 
                            ? 'Continuar Trilha' 
                            : 'Começar Trilha'
                          }
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </FeatureGuard>
  );
}