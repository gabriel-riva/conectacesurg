import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ArrowRight, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LatestNewsCardProps {
  limit?: number;
}

const LatestNewsCard: React.FC<LatestNewsCardProps> = ({ limit = 3 }) => {
  const [_, navigate] = useLocation();

  // Buscar as últimas notícias
  const { data: latestNews, isLoading } = useQuery({
    queryKey: ['/api/news/latest', limit],
    queryFn: () => fetch(`/api/news/latest/${limit}`).then(res => res.json()),
  });

  // Função para navegar para a página de detalhes
  const handleNewsClick = (newsId: number) => {
    navigate(`/noticias/${newsId}`);
  };

  // Função para navegar para a página de listagem
  const handleSeeAllClick = () => {
    navigate('/noticias');
  };

  // Formatação da data
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <Newspaper className="h-5 w-5 mr-2" />
          Últimas Notícias
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : latestNews?.length > 0 ? (
          <div className="space-y-4">
            {latestNews.map((news: any) => (
              <div 
                key={news.id} 
                className="flex gap-3 cursor-pointer hover:bg-accent p-2 rounded-md transition-colors"
                onClick={() => handleNewsClick(news.id)}
              >
                {news.imageUrl ? (
                  <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={news.imageUrl} 
                      alt={news.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Newspaper className="h-6 w-6 text-primary" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="font-medium line-clamp-2 text-sm">{news.title}</h3>
                  <p className="text-muted-foreground text-xs line-clamp-1 mt-1">{news.description}</p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{news.createdAt ? formatDate(news.createdAt) : "Data não disponível"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>Nenhuma notícia disponível no momento.</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleSeeAllClick}>
          Ver todas as notícias <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LatestNewsCard;