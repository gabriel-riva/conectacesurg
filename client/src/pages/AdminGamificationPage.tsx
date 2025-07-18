import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Settings, Trophy, Users, Calendar, Target, Award } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const addPointsSchema = z.object({
  userId: z.string(),
  points: z.number(),
  description: z.string().min(1, "Descrição é obrigatória"),
});

const settingsSchema = z.object({
  generalCategoryId: z.string().optional(),
  enabledCategoryIds: z.array(z.string()).default([]),
  cycleStartDate: z.string().optional(),
  cycleEndDate: z.string().optional(),
  annualStartDate: z.string().optional(),
  annualEndDate: z.string().optional(),
});

const challengeSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  detailedDescription: z.string().min(1, "Descrição detalhada é obrigatória"),
  imageUrl: z.string().url("URL da imagem deve ser válida").optional().or(z.literal("")),
  points: z.number().min(1, "Pontos devem ser maior que 0"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
  type: z.enum(["periodic", "annual"]),
  isActive: z.boolean().default(true),
});

type AddPointsForm = z.infer<typeof addPointsSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;
type ChallengeForm = z.infer<typeof challengeSchema>;

export default function AdminGamificationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddPointsDialogOpen, setIsAddPointsDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);
  const [quillValue, setQuillValue] = useState("");

  // Queries
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/gamification/settings"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/gamification/categories"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: pointsHistory, isLoading: pointsLoading } = useQuery({
    queryKey: ["/api/gamification/points"],
  });

  const { data: ranking, isLoading: rankingLoading } = useQuery({
    queryKey: ["/api/gamification/ranking"],
  });

  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["/api/gamification/challenges"],
  });

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const response = await fetch("/api/gamification/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generalCategoryId: data.generalCategoryId ? parseInt(data.generalCategoryId) : null,
          enabledCategoryIds: data.enabledCategoryIds.map(id => parseInt(id)),
          cycleStartDate: data.cycleStartDate || null,
          cycleEndDate: data.cycleEndDate || null,
          annualStartDate: data.annualStartDate || null,
          annualEndDate: data.annualEndDate || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar configurações");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas",
        description: "As configurações de gamificação foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/settings"] });
      setIsSettingsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar as configurações.",
        variant: "destructive",
      });
    },
  });

  const addPointsMutation = useMutation({
    mutationFn: async (data: AddPointsForm) => {
      const response = await fetch("/api/gamification/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(data.userId),
          points: data.points,
          description: data.description,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao adicionar pontos");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pontos adicionados",
        description: "Os pontos foram adicionados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/ranking"] });
      setIsAddPointsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao adicionar pontos.",
        variant: "destructive",
      });
    },
  });

  const removePointsMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/gamification/points/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao remover pontos");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pontos removidos",
        description: "Os pontos foram removidos com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/ranking"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover pontos.",
        variant: "destructive",
      });
    },
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: ChallengeForm) => {
      const response = await fetch("/api/gamification/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao criar desafio");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Desafio criado",
        description: "O desafio foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/challenges"] });
      setIsChallengeDialogOpen(false);
      setEditingChallenge(null);
      setQuillValue("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar desafio.",
        variant: "destructive",
      });
    },
  });

  const updateChallengeMutation = useMutation({
    mutationFn: async (data: ChallengeForm & { id: number }) => {
      const response = await fetch(`/api/gamification/challenges/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar desafio");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Desafio atualizado",
        description: "O desafio foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/challenges"] });
      setIsChallengeDialogOpen(false);
      setEditingChallenge(null);
      setQuillValue("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar desafio.",
        variant: "destructive",
      });
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/gamification/challenges/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao deletar desafio");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Desafio deletado",
        description: "O desafio foi deletado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/challenges"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao deletar desafio.",
        variant: "destructive",
      });
    },
  });

  // Forms
  const addPointsForm = useForm<AddPointsForm>({
    resolver: zodResolver(addPointsSchema),
    defaultValues: {
      userId: undefined,
      points: 0,
      description: "",
    },
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      generalCategoryId: undefined,
      enabledCategoryIds: [],
      cycleStartDate: "",
      cycleEndDate: "",
      annualStartDate: "",
      annualEndDate: "",
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      settingsForm.reset({
        generalCategoryId: settings.generalCategoryId?.toString() || "",
        enabledCategoryIds: settings.enabledCategoryIds?.map((id: number) => id.toString()) || [],
        cycleStartDate: settings.cycleStartDate || "",
        cycleEndDate: settings.cycleEndDate || "",
        annualStartDate: settings.annualStartDate || "",
        annualEndDate: settings.annualEndDate || "",
      });
    }
  }, [settings, settingsForm]);

  const challengeForm = useForm<ChallengeForm>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: "",
      description: "",
      detailedDescription: "",
      imageUrl: "",
      points: 0,
      startDate: "",
      endDate: "",
      type: "periodic",
      isActive: true,
    },
  });

  const onAddPoints = (data: AddPointsForm) => {
    addPointsMutation.mutate(data);
  };

  const onUpdateSettings = (data: SettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  const onRemovePoints = (id: number) => {
    if (confirm("Tem certeza que deseja remover estes pontos?")) {
      removePointsMutation.mutate(id);
    }
  };

  const onChallengeSubmit = (data: ChallengeForm) => {
    const formData = {
      ...data,
      detailedDescription: quillValue,
    };
    
    if (editingChallenge) {
      updateChallengeMutation.mutate({ ...formData, id: editingChallenge.id });
    } else {
      createChallengeMutation.mutate(formData);
    }
  };

  const onEditChallenge = (challenge: any) => {
    setEditingChallenge(challenge);
    setQuillValue(challenge.detailedDescription || "");
    challengeForm.reset({
      title: challenge.title,
      description: challenge.description,
      detailedDescription: challenge.detailedDescription,
      imageUrl: challenge.imageUrl || "",
      points: challenge.points,
      startDate: challenge.startDate ? new Date(challenge.startDate).toISOString().split('T')[0] : "",
      endDate: challenge.endDate ? new Date(challenge.endDate).toISOString().split('T')[0] : "",
      type: challenge.type,
      isActive: challenge.isActive,
    });
    setIsChallengeDialogOpen(true);
  };

  const onDeleteChallenge = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este desafio?")) {
      deleteChallengeMutation.mutate(id);
    }
  };

  const openCreateChallengeDialog = () => {
    setEditingChallenge(null);
    setQuillValue("");
    challengeForm.reset();
    setIsChallengeDialogOpen(true);
  };

  if (settingsLoading || categoriesLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <div className="flex flex-1">
          <AdminSidebar />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center min-h-screen">Carregando...</div>
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
                <h1 className="text-2xl font-bold text-primary">Administração de Gamificação</h1>
                <p className="text-muted-foreground mt-2">Gerencie pontos, rankings e configurações do sistema de gamificação</p>
              </div>
              <div className="flex space-x-4">
                <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Configurações de Gamificação</DialogTitle>
                    </DialogHeader>
                    <Form {...settingsForm}>
                      <form onSubmit={settingsForm.handleSubmit(onUpdateSettings)} className="space-y-6">
                        <FormField
                          control={settingsForm.control}
                          name="generalCategoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria para Classificação Geral</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma categoria" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.map((category: any) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Categoria de usuários que será considerada para a classificação geral
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
                          name="enabledCategoryIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categorias Habilitadas para Filtros</FormLabel>
                              <div className="grid grid-cols-2 gap-4">
                                {categories?.map((category: any) => (
                                  <div key={category.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={category.id.toString()}
                                      checked={field.value.includes(category.id.toString())}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, category.id.toString()]);
                                        } else {
                                          field.onChange(field.value.filter((id) => id !== category.id.toString()));
                                        }
                                      }}
                                    />
                                    <label htmlFor={category.id.toString()} className="text-sm font-medium">
                                      {category.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              <FormDescription>
                                Categorias que aparecerão como opções de filtro no ranking
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={settingsForm.control}
                            name="cycleStartDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Início do Ciclo</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={settingsForm.control}
                            name="cycleEndDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Fim do Ciclo</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={settingsForm.control}
                            name="annualStartDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Início Anual</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={settingsForm.control}
                            name="annualEndDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Fim Anual</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-4">
                          <Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={updateSettingsMutation.isPending}>
                            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddPointsDialogOpen} onOpenChange={setIsAddPointsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Pontos
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Pontos</DialogTitle>
                    </DialogHeader>
                    <Form {...addPointsForm}>
                      <form onSubmit={addPointsForm.handleSubmit(onAddPoints)} className="space-y-4">
                        <FormField
                          control={addPointsForm.control}
                          name="userId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Usuário</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um usuário" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map((user: any) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.name} ({user.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addPointsForm.control}
                          name="points"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pontos</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Digite os pontos (use valores negativos para remover)"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addPointsForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Descreva o motivo da pontuação"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-4">
                          <Button type="button" variant="outline" onClick={() => setIsAddPointsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={addPointsMutation.isPending}>
                            {addPointsMutation.isPending ? "Adicionando..." : "Adicionar Pontos"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Tabs defaultValue="ranking" className="space-y-6">
              <TabsList>
                <TabsTrigger value="ranking">
                  <Trophy className="h-4 w-4 mr-2" />
                  Ranking
                </TabsTrigger>
                <TabsTrigger value="points">
                  <Users className="h-4 w-4 mr-2" />
                  Histórico de Pontos
                </TabsTrigger>
                <TabsTrigger value="challenges">
                  <Target className="h-4 w-4 mr-2" />
                  Desafios
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ranking">
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking Geral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rankingLoading ? (
                      <div className="text-center py-8">Carregando ranking...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Posição</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Pontos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ranking?.map((user: any) => (
                            <TableRow key={user.userId}>
                              <TableCell>
                                <Badge variant={user.position <= 3 ? "default" : "secondary"}>
                                  {user.position}º
                                </Badge>
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
                                <Badge variant="outline">{user.categoryName}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {user.totalPoints} pts
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="points">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Pontos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pointsLoading ? (
                      <div className="text-center py-8">Carregando histórico...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Pontos</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Criado por</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pointsHistory?.map((point: any) => (
                            <TableRow key={point.id}>
                              <TableCell>
                                {format(new Date(point.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{point.userName}</div>
                                  <div className="text-sm text-gray-500">{point.userEmail}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={point.points >= 0 ? "default" : "destructive"}>
                                  {point.points >= 0 ? "+" : ""}{point.points} pts
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{point.description}</TableCell>
                              <TableCell>{point.createdBy}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemovePoints(point.id)}
                                  disabled={removePointsMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="challenges">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Gerenciar Desafios</CardTitle>
                      <Button onClick={openCreateChallengeDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Desafio
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {challengesLoading ? (
                      <div className="text-center py-8">Carregando desafios...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Pontos</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {challenges?.map((challenge: any) => (
                            <TableRow key={challenge.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{challenge.title}</div>
                                  <div className="text-sm text-gray-500 line-clamp-2">{challenge.description}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={challenge.type === 'periodic' ? 'default' : 'secondary'}>
                                  {challenge.type === 'periodic' ? 'Período' : 'Anual'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{challenge.points} pts</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {format(new Date(challenge.startDate), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(challenge.endDate), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={challenge.isActive ? 'default' : 'secondary'}>
                                  {challenge.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEditChallenge(challenge)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteChallenge(challenge.id)}
                                    disabled={deleteChallengeMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Dialog para criar/editar desafio */}
                <Dialog open={isChallengeDialogOpen} onOpenChange={setIsChallengeDialogOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingChallenge ? 'Editar Desafio' : 'Novo Desafio'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...challengeForm}>
                      <form onSubmit={challengeForm.handleSubmit(onChallengeSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={challengeForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                  <Input placeholder="Título do desafio" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={challengeForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="periodic">Período</SelectItem>
                                    <SelectItem value="annual">Anual</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={challengeForm.control}
                            name="points"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pontos</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Pontos do desafio"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={challengeForm.control}
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

                          <FormField
                            control={challengeForm.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Início</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={challengeForm.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Fim</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={challengeForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Descrição curta do desafio"
                                  {...field}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div>
                          <Label>Descrição Detalhada</Label>
                          <div className="mt-2">
                            <ReactQuill
                              value={quillValue}
                              onChange={setQuillValue}
                              modules={{
                                toolbar: [
                                  [{ 'header': [1, 2, 3, false] }],
                                  ['bold', 'italic', 'underline', 'strike'],
                                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                  ['link', 'image'],
                                  ['clean']
                                ],
                              }}
                              formats={[
                                'header',
                                'bold', 'italic', 'underline', 'strike',
                                'list', 'bullet',
                                'link', 'image'
                              ]}
                              placeholder="Descreva detalhadamente o desafio..."
                              className="bg-white"
                            />
                          </div>
                        </div>

                        <FormField
                          control={challengeForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Ativo</FormLabel>
                                <FormDescription>
                                  Desafio estará disponível para os usuários
                                </FormDescription>
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

                        <div className="flex justify-end space-x-4">
                          <Button type="button" variant="outline" onClick={() => setIsChallengeDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={createChallengeMutation.isPending || updateChallengeMutation.isPending}>
                            {editingChallenge ? 'Atualizar' : 'Criar'} Desafio
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}