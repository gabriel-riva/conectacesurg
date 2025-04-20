import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatImageUrl } from "@/lib/imageUtils";

const NewsDetailPage: React.FC = () => {
  const params = useParams();
  const newsId = params?.id;

  // Buscar os dados da notícia
  const { data: news, isLoading, error } = useQuery({
    queryKey: ['/api/news', newsId],
    queryFn: () => fetch(`/api/news/${newsId}`).then(res => res.json()),
    enabled: !!newsId,
  });

  // Buscar dados da categoria, se existir
  const { data: category } = useQuery({
    queryKey: ['/api/news/categories', news?.categoryId],
    queryFn: () => fetch(`/api/news/categories/${news.categoryId}`).then(res => res.json()),
    enabled: !!news?.categoryId,
  });

  // Formatando a data
  const formattedDate = news?.createdAt 
    ? format(new Date(news.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  // Componente para mostrar durante o carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          <Skeleton className="h-[300px] w-full mb-8" />
          
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </main>
      </div>
    );
  }

  // Componente para mostrar em caso de erro
  if (error || !news) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Notícia não encontrada</h2>
            <p className="mb-6">A notícia que você está procurando não está disponível ou foi removida.</p>
            <Button asChild>
              <Link href="/noticias">Ver todas as notícias</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/noticias" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para notícias
            </Link>
          </Button>
          
          {category && (
            <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-3">
              {category.name}
            </div>
          )}
          
          <h1 className="text-3xl md:text-4xl font-bold">{news.title}</h1>
          
          <div className="flex items-center mt-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formattedDate}</span>
          </div>
        </div>
        
        {news.imageUrl && (
          <div className="mb-8">
            <img 
              src={news.imageUrl} 
              alt={news.title}
              className="w-full h-auto max-h-[500px] object-cover rounded-lg"
            />
          </div>
        )}
        
        {news.description && (
          <div className="mb-6">
            <p className="text-lg font-medium text-muted-foreground">{news.description}</p>
          </div>
        )}
        
        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: news.content }}
        />
      </main>
    </div>
  );
};

export default NewsDetailPage;