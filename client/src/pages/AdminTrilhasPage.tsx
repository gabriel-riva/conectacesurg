import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Users, Plus, Edit, Trash2, Eye, EyeOff, FileText, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  createdAt: string;
  updatedAt: string;
}

const trailSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  imageUrl: z.string().optional(),
  isPublished: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
});

type TrailFormData = z.infer<typeof trailSchema>;

export default function AdminTrilhasPage() {
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trails = [], isLoading: isLoadingTrails } = useQuery<Trail[]>({
    queryKey: ['/api/trails'],
  });

  const { data: categories = [] } = useQuery<TrailCategory[]>({
    queryKey: ['/api/trails/categories/list'],
  });

  const createTrailMutation = useMutation({
    mutationFn: async (data: TrailFormData) => {
      return await apiRequest('/api/trails', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          categoryId: parseInt(data.categoryId)
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trails'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Trilha criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar trilha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTrailMutation = useMutation({
    mutationFn: async (data: TrailFormData & { id: number }) => {
      return await apiRequest(`/api/trails/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          categoryId: parseInt(data.categoryId)
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trails'] });
      setIsEditDialogOpen(false);
      setSelectedTrail(null);
      toast({
        title: "Sucesso",
        description: "Trilha atualizada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar trilha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTrailMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/trails/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trails'] });
      toast({
        title: "Sucesso",
        description: "Trilha excluída com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir trilha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<TrailFormData>({
    resolver: zodResolver(trailSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      imageUrl: "",
      isPublished: false,
      isActive: true,
      order: 0,
    },
  });

  const editForm = useForm<TrailFormData>({
    resolver: zodResolver(trailSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      imageUrl: "",
      isPublished: false,
      isActive: true,
      order: 0,
    },
  });

  const handleEdit = (trail: Trail) => {
    setSelectedTrail(trail);
    editForm.reset({
      title: trail.title,
      description: trail.description,
      categoryId: trail.category?.id.toString() || "",
      imageUrl: trail.imageUrl || "",
      isPublished: trail.isPublished,
      isActive: trail.isActive,
      order: trail.order,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta trilha?")) {
      deleteTrailMutation.mutate(id);
    }
  };

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

  const onCreateSubmit = (data: TrailFormData) => {
    createTrailMutation.mutate(data);
  };

  const onEditSubmit = (data: TrailFormData) => {
    if (selectedTrail) {
      updateTrailMutation.mutate({ ...data, id: selectedTrail.id });
    }
  };

  if (isLoadingTrails) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando trilhas...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <AdminSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">Gerenciar Trilhas</h1>
                <p className="text-muted-foreground">
                  Administre as trilhas de aprendizado disponíveis na plataforma
                </p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Trilha
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Trilha</DialogTitle>
                  </DialogHeader>
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite o título da trilha" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Descreva a trilha" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL da Imagem (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center space-x-4">
                        <FormField
                          control={createForm.control}
                          name="isPublished"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Publicada</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Ativa</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createTrailMutation.isPending}>
                          {createTrailMutation.isPending ? "Criando..." : "Criar Trilha"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{trails.length}</p>
                      <p className="text-sm text-muted-foreground">Total de Trilhas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{trails.filter(t => t.isActive).length}</p>
                      <p className="text-sm text-muted-foreground">Trilhas Ativas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{trails.filter(t => t.isPublished).length}</p>
                      <p className="text-sm text-muted-foreground">Trilhas Publicadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">{trails.reduce((sum, t) => sum + t.contentCount, 0)}</p>
                      <p className="text-sm text-muted-foreground">Total de Conteúdos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trilhas Table */}
            <Card>
              <CardHeader>
                <CardTitle>Trilhas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trails.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma trilha cadastrada</h3>
                      <p className="text-muted-foreground">Comece criando sua primeira trilha de aprendizado.</p>
                    </div>
                  ) : (
                    trails.map((trail) => (
                      <div key={trail.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{trail.title}</h3>
                            <Badge className={getBadgeColor(trail.category?.name || '')}>
                              {trail.category?.name || 'Sem categoria'}
                            </Badge>
                            <Badge variant={trail.isActive ? "default" : "secondary"}>
                              {trail.isActive ? "Ativa" : "Inativa"}
                            </Badge>
                            <Badge variant={trail.isPublished ? "outline" : "destructive"}>
                              {trail.isPublished ? "Publicada" : "Rascunho"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{trail.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {trail.contentCount} conteúdos
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {trail.viewCount} visualizações
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {trail.creator.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/trilhas/${trail.id}/conteudos`}>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Gerenciar Conteúdos"
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(trail)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(trail.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Trilha</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o título da trilha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva a trilha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-4">
                <FormField
                  control={editForm.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Publicada</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Ativa</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateTrailMutation.isPending}>
                  {updateTrailMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}