import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus, Edit, Trash2, Eye, FileText, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useParams } from "wouter";
import { RichTextEditor } from "@/components/RichTextEditor";

interface TrailContent {
  id: number;
  title: string;
  content: string;
  order: number;
  isDraft: boolean;
  viewCount: number;
  estimatedMinutes: number;
  trailId: number;
  createdAt: string;
  updatedAt: string;
}

interface Trail {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  contentCount: number;
  viewCount: number;
  isPublished: boolean;
  isActive: boolean;
  order: number;
}

const contentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  estimatedMinutes: z.number().min(0, "Tempo estimado deve ser positivo").default(0),
  order: z.number().default(0),
  isDraft: z.boolean().default(false),
});

type ContentFormData = z.infer<typeof contentSchema>;

export default function AdminTrailContentsPage() {
  const { trailId } = useParams<{ trailId: string }>();
  const [selectedContent, setSelectedContent] = useState<TrailContent | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: trail, isLoading: isLoadingTrail } = useQuery<Trail>({
    queryKey: ['/api/trails', trailId],
  });

  const { data: contents = [], isLoading: isLoadingContents } = useQuery<TrailContent[]>({
    queryKey: ['/api/trails', trailId, 'contents'],
  });

  const createContentMutation = useMutation({
    mutationFn: async (data: ContentFormData) => {
      return await apiRequest(`/api/trails/${trailId}/contents`, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trails', trailId, 'contents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trails'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Conteúdo criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar conteúdo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: async (data: ContentFormData & { id: number }) => {
      return await apiRequest(`/api/trails/content/${data.id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trails', trailId, 'contents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trails'] });
      setIsEditDialogOpen(false);
      setSelectedContent(null);
      toast({
        title: "Sucesso",
        description: "Conteúdo atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar conteúdo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/trails/content/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trails', trailId, 'contents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trails'] });
      toast({
        title: "Sucesso",
        description: "Conteúdo excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir conteúdo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: "",
      content: "",
      estimatedMinutes: 0,
      order: 0,
      isDraft: false,
    },
  });

  const editForm = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: "",
      content: "",
      estimatedMinutes: 0,
      order: 0,
      isDraft: false,
    },
  });

  const handleEdit = (content: TrailContent) => {
    setSelectedContent(content);
    editForm.reset({
      title: content.title,
      content: content.content,
      estimatedMinutes: content.estimatedMinutes,
      order: content.order,
      isDraft: content.isDraft,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este conteúdo?")) {
      deleteContentMutation.mutate(id);
    }
  };

  const onCreateSubmit = (data: ContentFormData) => {
    console.log('Dados do formulário de criação:', data);
    try {
      // Testar se o JSON é válido
      JSON.stringify(data);
      createContentMutation.mutate(data);
    } catch (error) {
      console.error('Erro ao serializar JSON:', error);
      toast({
        title: "Erro",
        description: "Erro nos dados do formulário. Verifique o conteúdo.",
        variant: "destructive",
      });
    }
  };

  const onEditSubmit = (data: ContentFormData) => {
    console.log('Dados do formulário de edição:', data);
    if (selectedContent) {
      try {
        const payload = { ...data, id: selectedContent.id };
        JSON.stringify(payload);
        updateContentMutation.mutate(payload);
      } catch (error) {
        console.error('Erro ao serializar JSON:', error);
        toast({
          title: "Erro",
          description: "Erro nos dados do formulário. Verifique o conteúdo.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoadingTrail || isLoadingContents) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando conteúdos...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Trilha não encontrada</h3>
              <p className="text-muted-foreground mb-4">
                A trilha que você está procurando não existe ou não está mais disponível.
              </p>
              <Link href="/admin/trilhas">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para trilhas
                </Button>
              </Link>
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
            {/* Navegação */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin/trilhas">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-primary">Conteúdos da Trilha</h1>
                  <p className="text-muted-foreground">
                    Gerenciar conteúdos da trilha: {trail.title}
                  </p>
                </div>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Conteúdo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Conteúdo</DialogTitle>
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
                              <Input placeholder="Digite o título do conteúdo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conteúdo</FormLabel>
                            <FormControl>
                              <RichTextEditor
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Digite o conteúdo da trilha..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={createForm.control}
                          name="estimatedMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tempo Estimado (minutos)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ordem</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={createForm.control}
                        name="isDraft"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Rascunho</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Conteúdo ainda não publicado
                              </div>
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
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createContentMutation.isPending}>
                          {createContentMutation.isPending ? "Criando..." : "Criar Conteúdo"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{contents.length}</p>
                      <p className="text-sm text-muted-foreground">Total de Conteúdos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{contents.filter(c => !c.isDraft).length}</p>
                      <p className="text-sm text-muted-foreground">Conteúdos Publicados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">{contents.filter(c => c.isDraft).length}</p>
                      <p className="text-sm text-muted-foreground">Rascunhos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contents List */}
            <Card>
              <CardHeader>
                <CardTitle>Conteúdos da Trilha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Nenhum conteúdo cadastrado</h3>
                      <p className="text-muted-foreground">Comece criando o primeiro conteúdo desta trilha.</p>
                    </div>
                  ) : (
                    contents.map((content) => (
                      <div key={content.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{content.title}</h3>
                            <Badge variant={content.isDraft ? "destructive" : "default"}>
                              {content.isDraft ? "Rascunho" : "Publicado"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Ordem: {content.order}</span>
                            <span>Visualizações: {content.viewCount}</span>
                            <span>Tempo estimado: {content.estimatedMinutes} min</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(content)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(content.id)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Conteúdo</DialogTitle>
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
                      <Input placeholder="Digite o título do conteúdo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Digite o conteúdo da trilha..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo Estimado (minutos)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="isDraft"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Rascunho</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Conteúdo ainda não publicado
                      </div>
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
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateContentMutation.isPending}>
                  {updateContentMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}