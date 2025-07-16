import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash, Eye, EyeOff, Calendar, Globe, User, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { Switch } from "@/components/ui/switch";

interface News {
  id: number;
  title: string;
  description: string;
  content: string;
  sourceUrl?: string;
  imageUrl?: string;
  categoryId?: number;
  creatorId: number;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  category?: NewsCategory;
}

interface NewsCategory {
  id: number;
  name: string;
  createdAt: string;
}

function NewsImportTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importCategoryId, setImportCategoryId] = useState("");
  const [newsToDelete, setNewsToDelete] = useState<number | null>(null);

  // Queries
  const { data: news = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => apiRequest("/api/news?includeUnpublished=true"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/news/categories"],
    queryFn: () => apiRequest("/api/news/categories"),
  });

  // Mutations
  const importNews = useMutation({
    mutationFn: (data: { url: string; categoryId?: string }) => {
      return apiRequest('/api/news/import-cesurg', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Notícia importada com sucesso",
        description: "A notícia foi importada da CESURG e publicada.",
      });
      refetch();
      setIsImportDialogOpen(false);
      setImportUrl("");
      setImportCategoryId("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar notícia",
        description: error.message || "Ocorreu um erro ao importar a notícia.",
        variant: "destructive",
      });
    },
  });

  const importLatestNews = useMutation({
    mutationFn: () => {
      return apiRequest('/api/news/import-latest-cesurg', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Importação concluída",
        description: data.message || "Notícias importadas com sucesso.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar notícias",
        description: error.message || "Ocorreu um erro ao importar as notícias.",
        variant: "destructive",
      });
    },
  });

  const togglePublish = useMutation({
    mutationFn: (data: { id: number; isPublished: boolean }) => {
      const endpoint = data.isPublished ? 'unpublish' : 'publish';
      return apiRequest(`/api/news/${data.id}/${endpoint}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "O status da notícia foi atualizado com sucesso.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const deleteNews = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/news/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Notícia excluída",
        description: "A notícia foi excluída com sucesso.",
      });
      refetch();
      setIsDeleteDialogOpen(false);
      setNewsToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir notícia",
        description: error.message || "Ocorreu um erro ao excluir a notícia.",
        variant: "destructive",
      });
    },
  });

  const confirmImport = () => {
    if (!importUrl.trim()) return;
    
    importNews.mutate({
      url: importUrl,
      categoryId: importCategoryId && importCategoryId !== "none" ? importCategoryId : undefined,
    });
  };

  const confirmDelete = () => {
    if (newsToDelete) {
      deleteNews.mutate(newsToDelete);
    }
  };

  const filteredNews = news.filter((item: News) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notícias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => importLatestNews.mutate()}
            disabled={importLatestNews.isPending}
            className="flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            {importLatestNews.isPending ? "Importando..." : "Importar Últimas 10"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Importar por URL
          </Button>
        </div>
      </div>

      {/* Lista de notícias */}
      {isLoading ? (
        <div className="text-center py-8">Carregando notícias...</div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((item: News) => (
            <Card key={item.id} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge variant={item.isPublished ? "default" : "secondary"}>
                        {item.isPublished ? "Publicada" : "Não publicada"}
                      </Badge>
                      {item.sourceUrl && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          CESURG
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-20 h-20 object-cover rounded-md ml-4"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.category && (
                      <Badge variant="outline" className="text-xs">
                        {item.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.isPublished}
                        onCheckedChange={(checked) => 
                          togglePublish.mutate({ id: item.id, isPublished: item.isPublished })
                        }
                        disabled={togglePublish.isPending}
                      />
                      <span className="text-sm text-muted-foreground">
                        {item.isPublished ? "Publicada" : "Não publicada"}
                      </span>
                    </div>
                    {item.sourceUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(item.sourceUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        setNewsToDelete(item.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo de importação */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Notícia da CESURG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="importUrl">URL da Notícia</Label>
              <Input
                id="importUrl"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://cesurgmarau.com.br/noticia/..."
              />
              <p className="text-sm text-muted-foreground">
                Cole o link completo da notícia do site da CESURG
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="importCategory">Categoria (opcional)</Label>
              <Select value={importCategoryId} onValueChange={setImportCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories?.map((category: NewsCategory) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportUrl("");
                setImportCategoryId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmImport}
              disabled={!importUrl.trim() || importNews.isPending}
            >
              {importNews.isPending ? "Importando..." : "Importar Notícia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza que deseja excluir esta notícia? Esta ação não pode ser desfeita.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteNews.isPending}
            >
              {deleteNews.isPending ? "Excluindo..." : "Excluir Notícia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminNewsSimplified() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1 bg-gray-100">
        <AdminSidebar />
        
        <div className="flex-1 p-8">
          <AdminHeader
            title="Notícias CESURG"
            description="Importe e gerencie notícias da CESURG automaticamente."
          />
          
          <div className="mt-6">
            <NewsImportTab />
          </div>
        </div>
      </div>
    </div>
  );
}