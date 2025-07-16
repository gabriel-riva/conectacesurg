import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Eye, Calendar, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";

interface RankingUser {
  userId: number;
  userName: string;
  userEmail: string;
  photoUrl: string | null;
  totalPoints: string;
  position: number;
  categoryId: number | null;
  categoryName: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
}

export function RankingCard() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<'cycle' | 'annual'>('cycle');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Buscar categorias
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/gamification/categories'],
    enabled: true,
  });

  // Buscar ranking
  const { data: ranking = [], isLoading } = useQuery<RankingUser[]>({
    queryKey: ['/api/gamification/ranking', period, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('period', period);
      if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory);
      }
      
      const response = await fetch(`/api/gamification/ranking?${params}`);
      if (!response.ok) throw new Error('Failed to fetch ranking');
      return response.json();
    },
    enabled: true,
  });

  // Limitar a 20 registros
  const topUsers = ranking.slice(0, 20);

  const handleViewAll = () => {
    navigate('/gamification');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center justify-between">
          <div className="flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            Ranking
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-primary/70 hover:text-primary"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver tudo
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 flex flex-col" style={{ height: "calc(280px - 54px)" }}>
        {/* Filtros */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <Button
              variant={period === 'cycle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('cycle')}
              className="w-full text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Ciclo
            </Button>
          </div>
          <div className="flex-1">
            <Button
              variant={period === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('annual')}
              className="w-full text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Anual
            </Button>
          </div>
        </div>

        <div className="mb-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center">
                  <Users className="h-3 w-3 mr-2" />
                  Todas as categorias
                </div>
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de usuários */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-500">Carregando...</div>
            </div>
          ) : topUsers.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário no ranking</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {topUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Badge 
                          variant={user.position <= 3 ? "default" : "secondary"}
                          className="w-6 h-6 p-0 rounded-full flex items-center justify-center text-xs"
                        >
                          {user.position}
                        </Badge>
                      </div>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={user.photoUrl || undefined} alt={user.userName} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.userName}</p>
                        {user.categoryName && (
                          <p className="text-xs text-gray-500 truncate">{user.categoryName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-primary">
                        {user.totalPoints} pts
                      </p>
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