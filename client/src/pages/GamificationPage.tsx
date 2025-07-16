import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Medal, Award, TrendingUp, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FeatureGuard } from "@/components/FeatureGuard";
import { Header } from "@/components/Header";

function GamificationPageContent() {
  const [rankingFilter, setRankingFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Queries
  const { data: ranking, isLoading: rankingLoading } = useQuery({
    queryKey: ["/api/gamification/ranking", { filter: rankingFilter, categoryId: categoryFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rankingFilter !== "all") params.append("filter", rankingFilter);
      if (categoryFilter && categoryFilter !== "all") params.append("categoryId", categoryFilter);
      
      const response = await fetch(`/api/gamification/ranking?${params}`);
      if (!response.ok) throw new Error("Failed to fetch ranking");
      return response.json();
    },
  });

  const { data: pointsExtract, isLoading: extractLoading } = useQuery({
    queryKey: ["/api/gamification/points/extract"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/gamification/categories"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/gamification/settings"],
  });

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-semibold text-gray-500">{position}</span>;
    }
  };

  const getPointsBadgeVariant = (points: number) => {
    if (points >= 0) return "default";
    return "destructive";
  };

  if (rankingLoading || extractLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando gamificação...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Gamificação</h1>
          <p className="text-gray-600">Acompanhe seu desempenho e veja o ranking da comunidade</p>
        </div>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList>
            <TabsTrigger value="ranking">
              <Trophy className="h-4 w-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="extract">
              <TrendingUp className="h-4 w-4 mr-2" />
              Meus Pontos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <div className="space-y-6">
              {/* Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Filter className="h-5 w-5 mr-2" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Período</label>
                      <Select value={rankingFilter} onValueChange={setRankingFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os tempos</SelectItem>
                          <SelectItem value="cycle">Ciclo atual</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                          <SelectItem value="general">Classificação geral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Categoria</label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as categorias</SelectItem>
                          {categories?.map((category: any) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ranking */}
              <Card>
                <CardHeader>
                  <CardTitle>Ranking de Pontos</CardTitle>
                </CardHeader>
                <CardContent>
                  {ranking?.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum dado de pontuação encontrado para os filtros selecionados.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ranking?.slice(0, 3).map((user: any) => (
                        <div key={user.userId} className="flex items-center p-4 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 mr-4">
                            {getRankingIcon(user.position)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              {user.photoUrl && (
                                <img
                                  src={user.photoUrl}
                                  alt={user.userName}
                                  className="w-10 h-10 rounded-full"
                                />
                              )}
                              <div>
                                <div className="font-semibold">{user.userName}</div>
                                <div className="text-sm text-gray-500">{user.userEmail}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{user.totalPoints} pts</div>
                            {user.categoryName && (
                              <Badge variant="outline" className="mt-1">
                                {user.categoryName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}

                      {ranking?.length > 3 && (
                        <div className="mt-6">
                          <h3 className="font-semibold mb-4">Demais posições</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Pos.</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead className="text-right">Pontos</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ranking.slice(3).map((user: any) => (
                                <TableRow key={user.userId}>
                                  <TableCell>
                                    <Badge variant="secondary">{user.position}º</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      {user.photoUrl && (
                                        <img
                                          src={user.photoUrl}
                                          alt={user.userName}
                                          className="w-8 h-8 rounded-full"
                                        />
                                      )}
                                      <div>
                                        <div className="font-medium">{user.userName}</div>
                                        <div className="text-sm text-gray-500">{user.userEmail}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {user.categoryName && (
                                      <Badge variant="outline">{user.categoryName}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {user.totalPoints} pts
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="extract">
            <div className="space-y-6">
              {/* Resumo dos pontos */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo dos Meus Pontos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {pointsExtract?.totalPoints || 0} pts
                    </div>
                    <p className="text-gray-600">Total de pontos acumulados</p>
                  </div>
                </CardContent>
              </Card>

              {/* Histórico de pontos */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Pontos</CardTitle>
                </CardHeader>
                <CardContent>
                  {pointsExtract?.history?.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Você ainda não possui histórico de pontos.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pointsExtract?.history?.map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{entry.description}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              {entry.createdBy && ` • Adicionado por ${entry.createdBy}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={getPointsBadgeVariant(entry.points)}>
                              {entry.points >= 0 ? "+" : ""}{entry.points} pts
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function GamificationPage() {
  return (
    <FeatureGuard featureName="gamificacao">
      <GamificationPageContent />
    </FeatureGuard>
  );
}