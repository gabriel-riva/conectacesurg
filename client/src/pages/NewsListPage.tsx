import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Search, ArrowRight, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatImageUrl } from "@/lib/imageUtils";

const NewsListPage: React.FC = () => {
  const [_, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Buscar todas as notícias
  const { data: news, isLoading: isLoadingNews } = useQuery({
    queryKey: ['/api/news'],
    queryFn: () => fetch('/api/news').then(res => res.json()),
  });

  // Buscar categorias
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/news/categories'],
    queryFn: () => fetch('/api/news/categories').then(res => res.json()),
  });

  // Filtragem das notícias com base nas pesquisas e filtros
  const filteredNews = React.useMemo(() => {
    if (!news) return [];

    return news.filter((item: any) => {
      // Filtro por categoria
      const matchesCategory = !selectedCategory || selectedCategory === "all" || String(item.categoryId) === selectedCategory;
      
      // Filtro por termo de pesquisa
      const matchesSearch = !searchTerm || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [news, searchTerm, selectedCategory]);

  // Função para navegar para a página de detalhes
  const handleNewsClick = (newsId: number) => {
    navigate(`/noticias/${newsId}`);
  };

  // Formatação da data
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Renderização condicional para estado de carregamento
  if (isLoadingNews || isLoadingCategories) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-6">Últimas Notícias</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-[200px] w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6 flex items-center">
            <Newspaper className="mr-2 h-8 w-8" />
            Notícias
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Pesquisar notícias..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories?.map((category: any) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {filteredNews.length === 0 ? (
            <Card className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Nenhuma notícia encontrada</h2>
              <p className="text-muted-foreground mb-4">
                Não encontramos notícias que correspondam aos seus critérios de busca.
              </p>
              <Button onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}>
                Limpar filtros
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredNews.map((item: any) => {
                const category = categories?.find((c: any) => c.id === item.categoryId);
                
                return (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden transition-all hover:shadow-md cursor-pointer"
                    onClick={() => handleNewsClick(item.id)}
                  >
                    {item.imageUrl && (
                      <div className="relative h-[200px] overflow-hidden">
                        <img 
                          src={formatImageUrl(item.imageUrl)} 
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                        />
                      </div>
                    )}
                    
                    <CardContent className="p-4">
                      {category && (
                        <div className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium mb-2">
                          {category.name}
                        </div>
                      )}
                      
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">{item.title}</h3>
                      
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>
                          {item.createdAt ? formatDate(item.createdAt) : "Data não disponível"}
                        </span>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-4 pt-0">
                      <Button variant="ghost" size="sm" className="ml-auto gap-1 font-medium">
                        Ler mais <ArrowRight className="h-3 w-3" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewsListPage;