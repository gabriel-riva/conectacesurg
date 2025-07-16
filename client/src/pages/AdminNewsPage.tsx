import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { NewsCategory, News } from "@/shared/schema";
import { Edit, Trash, Plus, Search, Eye, FileImage } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { AdminHeader } from "@/components/AdminHeader";

// Componente para gerenciar categorias de notícias
function NewsCategoriesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<NewsCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  
  const { toast } = useToast();

  // Buscar todas as categorias
  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['/api/news/categories'],
    queryFn: () => fetch('/api/news/categories').then(res => res.json()),
  });

  // Filtrar categorias com base no termo de busca
  const filteredCategories = categories?.filter((category: NewsCategory) => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Mutação para criar categoria
  const createCategory = useMutation({
    mutationFn: (data: { name: string }) => {
      return apiRequest('/api/news/categories', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Categoria criada com sucesso",
        description: "A categoria foi adicionada ao sistema.",
      });
      refetch();
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar categoria",
        description: "Ocorreu um erro ao adicionar a categoria.",
        variant: "destructive",
      });
      console.error("Erro ao criar categoria:", error);
    },
  });

  // Mutação para atualizar categoria
  const updateCategory = useMutation({
    mutationFn: (data: { id: number, name: string }) => {
      return apiRequest(`/api/news/categories/${data.id}`, {
        method: 'PUT',
        body: { name: data.name },
      });
    },
    onSuccess: () => {
      toast({
        title: "Categoria atualizada com sucesso",
        description: "As alterações foram salvas.",
      });
      refetch();
      setIsModalOpen(false);
      setCategoryToEdit(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: "Ocorreu um erro ao atualizar a categoria.",
        variant: "destructive",
      });
      console.error("Erro ao atualizar categoria:", error);
    },
  });

  // Mutação para excluir categoria
  const deleteCategory = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/news/categories/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Categoria excluída com sucesso",
        description: "A categoria foi removida do sistema.",
      });
      refetch();
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: "Ocorreu um erro ao excluir a categoria. Verifique se não existem notícias associadas a ela.",
        variant: "destructive",
      });
      console.error("Erro ao excluir categoria:", error);
    },
  });

  // Reset do formulário
  const resetForm = () => {
    setFormData({
      name: "",
    });
    setIsEditMode(false);
    setCategoryToEdit(null);
  };

  // Abrir modal para edição
  const handleEdit = (category: NewsCategory) => {
    setCategoryToEdit(category);
    setFormData({
      name: category.name,
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Confirmar exclusão de categoria
  const handleDelete = (id: number) => {
    setCategoryToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirmar exclusão
  const confirmDelete = () => {
    if (categoryToDelete !== null) {
      deleteCategory.mutate(categoryToDelete);
    }
  };

  // Enviar formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro no formulário",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditMode && categoryToEdit) {
      updateCategory.mutate({
        id: categoryToEdit.id,
        name: formData.name,
      });
    } else {
      createCategory.mutate({
        name: formData.name,
      });
    }
  };

  return (
    <div>
      {/* Cabeçalho com busca e botão de adicionar */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-72">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar categorias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {/* Lista de categorias */}
      {isLoading ? (
        <div className="text-center py-8">Carregando categorias...</div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "Nenhuma categoria encontrada para a busca." : "Nenhuma categoria cadastrada. Crie a primeira!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category: NewsCategory) => (
            <Card key={category.id}>
              <CardHeader className="pb-2">
                <CardTitle>{category.name}</CardTitle>
              </CardHeader>
              <CardFooter className="pt-2 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(category)}
                >
                  <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash className="h-4 w-4 mr-1" /> Excluir
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para adicionar/editar categoria */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Digite o nome da categoria"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {isEditMode ? "Salvar Alterações" : "Criar Categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.</p>
            <p className="text-muted-foreground mt-2">
              Nota: Categorias associadas a notícias não podem ser excluídas.
            </p>
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
            >
              Excluir Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para gerenciar notícias
function NewsListTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<number | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importCategoryId, setImportCategoryId] = useState("");
  
  const { toast } = useToast();

  // Buscar todas as notícias incluindo as não publicadas
  const { data: newsList, isLoading, refetch } = useQuery({
    queryKey: ['/api/news'],
    queryFn: () => fetch('/api/news?includeUnpublished=true').then(res => res.json()),
  });

  // Buscar categorias para mostrar o nome em vez de ID
  const { data: categories } = useQuery({
    queryKey: ['/api/news/categories'],
    queryFn: () => fetch('/api/news/categories').then(res => res.json()),
  });

  // Filtrar notícias com base no termo de busca
  const filteredNews = newsList?.filter((news: News) => 
    news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    news.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Mutação para excluir notícia
  const deleteNews = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/news/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Notícia excluída com sucesso",
        description: "A notícia foi removida do sistema.",
      });
      refetch();
      setIsDeleteDialogOpen(false);
      setNewsToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir notícia",
        description: "Ocorreu um erro ao excluir a notícia.",
        variant: "destructive",
      });
      console.error("Erro ao excluir notícia:", error);
    },
  });

  // Mutação para publicar/despublicar notícia
  const togglePublishStatus = useMutation({
    mutationFn: ({ id, action }: { id: number, action: 'publish' | 'unpublish' }) => {
      return apiRequest(`/api/news/${id}/${action}`, {
        method: 'POST',
      });
    },
    onSuccess: (data, variables) => {
      const action = variables.action === 'publish' ? 'publicada' : 'despublicada';
      toast({
        title: `Notícia ${action} com sucesso`,
        description: `A notícia foi ${action}.`,
      });
      refetch();
    },
    onError: (error, variables) => {
      const action = variables.action === 'publish' ? 'publicar' : 'despublicar';
      toast({
        title: `Erro ao ${action} notícia`,
        description: `Ocorreu um erro ao ${action} a notícia.`,
        variant: "destructive",
      });
      console.error(`Erro ao ${action} notícia:`, error);
    },
  });

  // Mutação para importar notícia da CESURG
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
      console.error("Erro ao importar notícia:", error);
    },
  });

  // Confirmar exclusão
  const confirmDelete = () => {
    if (newsToDelete !== null) {
      deleteNews.mutate(newsToDelete);
    }
  };

  // Função para confirmar importação
  const confirmImport = () => {
    if (importUrl.trim()) {
      importNews.mutate({
        url: importUrl.trim(),
        categoryId: importCategoryId || undefined,
      });
    }
  };

  // Função para obter o nome da categoria a partir do ID
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId || !categories) return "Sem categoria";
    const category = categories.find((cat: NewsCategory) => cat.id === categoryId);
    return category ? category.name : "Sem categoria";
  };

  return (
    <div>
      {/* Cabeçalho com busca e botão de adicionar */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-72">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            onClick={() => setIsImportDialogOpen(true)}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" /> Importar da CESURG
          </Button>
          <Button
            onClick={() => window.location.href = '/admin/noticias/nova'}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Notícia
          </Button>
        </div>
      </div>

      {/* Lista de notícias */}
      {isLoading ? (
        <div className="text-center py-8">Carregando notícias...</div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "Nenhuma notícia encontrada para a busca." : "Nenhuma notícia cadastrada. Crie a primeira!"}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((news: News) => (
            <Card key={news.id}>
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/4">
                  {news.imageUrl ? (
                    <div className="h-40 w-full relative">
                      <img
                        src={news.imageUrl}
                        alt={news.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-muted flex items-center justify-center">
                      <FileImage className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="md:w-3/4 p-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{news.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{getCategoryName(news.categoryId)}</p>
                    </div>
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full ${news.isPublished ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {news.isPublished ? 'Publicada' : 'Rascunho'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm line-clamp-2 mb-4">{news.description}</p>
                  <div className="text-xs text-muted-foreground mb-4">
                    {news.publishedAt ? (
                      <p>Publicada em: {format(new Date(news.publishedAt!), 'dd/MM/yyyy HH:mm')}</p>
                    ) : (
                      <p>Criada em: {format(new Date(news.createdAt!), 'dd/MM/yyyy HH:mm')}</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`/noticias/${news.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Visualizar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.location.href = `/admin/noticias/editar/${news.id}`}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Editar
                    </Button>
                    {news.isPublished ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => togglePublishStatus.mutate({ id: news.id, action: 'unpublish' })}
                      >
                        Despublicar
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => togglePublishStatus.mutate({ id: news.id, action: 'publish' })}
                      >
                        Publicar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        setNewsToDelete(news.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="h-4 w-4 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo de importação da CESURG */}
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
                  <SelectItem value="">Sem categoria</SelectItem>
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
            >
              Excluir Notícia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminNewsPage() {
  const [activeTab, setActiveTab] = useState("noticias");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1 bg-gray-100">
        <AdminSidebar />
        
        <div className="flex-1 p-8">
          <AdminHeader
            title="Gerenciamento de Notícias"
            description="Crie e gerencie notícias e categorias para o portal."
          />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="mb-6">
              <TabsTrigger value="noticias">Notícias</TabsTrigger>
              <TabsTrigger value="categorias">Categorias</TabsTrigger>
            </TabsList>
            
            <TabsContent value="noticias">
              <NewsListTab />
            </TabsContent>
            
            <TabsContent value="categorias">
              <NewsCategoriesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}