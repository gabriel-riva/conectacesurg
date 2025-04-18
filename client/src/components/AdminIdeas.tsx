import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Trash2, ChevronDown, ChevronUp, Search, Filter, 
  MoreHorizontal, ArrowUpDown, Loader2, CheckCircle, 
  XCircle, AlertCircle, Edit, UserCheck, UserPlus
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Definição do formulário de delegação de ideias
const assignIdeaSchema = z.object({
  userId: z.string().min(1, "Selecione um usuário responsável"),
  groupName: z.string().min(3, "O nome do grupo deve ter pelo menos 3 caracteres"),
  groupDescription: z.string().optional(),
  userIds: z.array(z.string()).optional(),
});

type AssignIdeaFormValues = z.infer<typeof assignIdeaSchema>;

// Definição de cores para os status
const statusColors: Record<string, string> = {
  nova: "bg-blue-100 text-blue-800",
  em_avaliacao: "bg-purple-100 text-purple-800",
  priorizada: "bg-amber-100 text-amber-800",
  em_execucao: "bg-green-100 text-green-800",
  concluida: "bg-teal-100 text-teal-800",
  rejeitada: "bg-red-100 text-red-800",
};

// Tradução dos status
const statusTranslation: Record<string, string> = {
  nova: "Nova",
  em_avaliacao: "Em avaliação",
  priorizada: "Priorizada",
  em_execucao: "Em execução",
  concluida: "Concluída",
  rejeitada: "Rejeitada",
};

// Componente principal para gerenciamento de ideias
export function AdminIdeas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para controle de filtros, ordenação e paginação
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "votes">("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Estados para controle de modais
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [volunteersDialogOpen, setVolunteersDialogOpen] = useState(false);
  
  // Consultas
  const { 
    data: ideasData, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/ideas/admin', searchQuery, statusFilter, sortBy, sortOrder, page, limit],
    queryFn: async () => {
      let url = `/api/ideas?page=${page}&limit=${limit}`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (statusFilter) {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      
      url += `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      
      return apiRequest<any>(url);
    },
  });
  
  const { 
    data: users,
    isLoading: isLoadingUsers 
  } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      return apiRequest<any[]>('/api/users');
    },
  });
  
  // Mutações
  const changeStatusMutation = useMutation({
    mutationFn: async ({ ideaId, status }: { ideaId: number; status: string }) => {
      return apiRequest(`/api/ideas/${ideaId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      setChangeStatusDialogOpen(false);
      toast({
        title: "Status atualizado",
        description: "O status da ideia foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da ideia.",
        variant: "destructive",
      });
    },
  });
  
  const deleteIdeaMutation = useMutation({
    mutationFn: async (ideaId: number) => {
      return apiRequest(`/api/ideas/${ideaId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      setDeleteDialogOpen(false);
      toast({
        title: "Ideia excluída",
        description: "A ideia foi excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a ideia.",
        variant: "destructive",
      });
    },
  });
  
  const assignIdeaMutation = useMutation({
    mutationFn: async ({ ideaId, formData }: { ideaId: number; formData: AssignIdeaFormValues }) => {
      return apiRequest(`/api/ideas/${ideaId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(formData.userId),
          groupName: formData.groupName,
          groupDescription: formData.groupDescription,
          userIds: formData.userIds?.map(id => parseInt(id)),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      setAssignDialogOpen(false);
      toast({
        title: "Ideia delegada",
        description: "A ideia foi delegada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível delegar a ideia.",
        variant: "destructive",
      });
    },
  });
  
  const approveVolunteerMutation = useMutation({
    mutationFn: async ({ ideaId, volunteerId, groupName, groupDescription }: any) => {
      return apiRequest(`/api/ideas/${ideaId}/volunteer/${volunteerId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName, groupDescription }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      setVolunteersDialogOpen(false);
      toast({
        title: "Voluntário aprovado",
        description: "O voluntário foi aprovado e designado como responsável pela ideia.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o voluntário.",
        variant: "destructive",
      });
    },
  });
  
  const rejectVolunteerMutation = useMutation({
    mutationFn: async ({ ideaId, volunteerId }: any) => {
      return apiRequest(`/api/ideas/${ideaId}/volunteer/${volunteerId}/reject`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      toast({
        title: "Voluntário rejeitado",
        description: "O voluntário foi rejeitado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar o voluntário.",
        variant: "destructive",
      });
    },
  });
  
  // Formulário para delegação de ideias
  const assignForm = useForm<AssignIdeaFormValues>({
    resolver: zodResolver(assignIdeaSchema),
    defaultValues: {
      userId: "",
      groupName: "",
      groupDescription: "",
      userIds: [],
    },
  });
  
  // Efeito para atualizar valores do formulário quando uma ideia é selecionada
  useEffect(() => {
    if (selectedIdea) {
      assignForm.setValue("groupName", `Grupo de Implementação: ${selectedIdea.title}`);
      assignForm.setValue("groupDescription", `Grupo criado para implementação da ideia: ${selectedIdea.title}`);
    }
  }, [selectedIdea, assignForm]);
  
  // Detalhes da ideia
  const fetchIdeaDetails = async (ideaId: number) => {
    try {
      const idea = await apiRequest<any>(`/api/ideas/${ideaId}`);
      setSelectedIdea(idea);
      return idea;
    } catch (error) {
      console.error("Error fetching idea details:", error);
      toast({
        title: "Erro",
        description: "Não foi possível obter os detalhes da ideia.",
        variant: "destructive",
      });
      return null;
    }
  };
  
  const handleViewDetails = async (ideaId: number) => {
    setSelectedIdeaId(ideaId);
    const idea = await fetchIdeaDetails(ideaId);
    if (idea) {
      setDetailsDialogOpen(true);
    }
  };
  
  const handleChangeStatus = async (ideaId: number) => {
    setSelectedIdeaId(ideaId);
    const idea = await fetchIdeaDetails(ideaId);
    if (idea) {
      setChangeStatusDialogOpen(true);
    }
  };
  
  const handleDelete = async (ideaId: number) => {
    setSelectedIdeaId(ideaId);
    const idea = await fetchIdeaDetails(ideaId);
    if (idea) {
      setDeleteDialogOpen(true);
    }
  };
  
  const handleAssign = async (ideaId: number) => {
    setSelectedIdeaId(ideaId);
    const idea = await fetchIdeaDetails(ideaId);
    if (idea) {
      setAssignDialogOpen(true);
    }
  };
  
  const handleViewVolunteers = async (ideaId: number) => {
    setSelectedIdeaId(ideaId);
    const idea = await fetchIdeaDetails(ideaId);
    if (idea) {
      if (!idea.volunteers || idea.volunteers.length === 0) {
        toast({
          title: "Sem voluntários",
          description: "Esta ideia ainda não possui voluntários.",
        });
        return;
      }
      setVolunteersDialogOpen(true);
    }
  };
  
  const ideas = ideasData?.ideas || ideasData || [];
  const pagination = ideasData?.pagination;
  
  // Função para limpar filtros
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };
  
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  
  const handleApproveVolunteer = (volunteerId: number) => {
    if (!groupName) {
      toast({
        title: "Nome do grupo obrigatório",
        description: "Por favor, insira um nome para o grupo antes de aprovar o voluntário.",
        variant: "destructive",
      });
      return;
    }
    
    approveVolunteerMutation.mutate({
      ideaId: selectedIdeaId,
      volunteerId,
      groupName,
      groupDescription,
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Gerenciamento de Ideias</h2>
      </div>
      
      {/* Filtros e busca */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Pesquisar ideias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {statusFilter ? statusTranslation[statusFilter] : "Status"}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="nova">Nova</SelectItem>
              <SelectItem value="em_avaliacao">Em avaliação</SelectItem>
              <SelectItem value="priorizada">Priorizada</SelectItem>
              <SelectItem value="em_execucao">Em execução</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="rejeitada">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-');
              setSortBy(newSortBy as "createdAt" | "votes");
              setSortOrder(newSortOrder as "asc" | "desc");
            }}
          >
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Ordenar
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Mais recentes</SelectItem>
              <SelectItem value="createdAt-asc">Mais antigas</SelectItem>
              <SelectItem value="votes-desc">Mais votadas</SelectItem>
              <SelectItem value="votes-asc">Menos votadas</SelectItem>
            </SelectContent>
          </Select>
          
          {(searchQuery || statusFilter || sortBy !== "createdAt" || sortOrder !== "desc") && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Tabela de ideias */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-center py-10">
              <p className="text-destructive mb-2">Ocorreu um erro ao carregar as ideias.</p>
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/ideas/admin'] })}
              >
                Tentar novamente
              </Button>
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">Nenhuma ideia encontrada.</p>
              {(searchQuery || statusFilter) && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criador</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Votos</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ideas.map((idea: any) => (
                    <TableRow key={idea.id}>
                      <TableCell className="font-medium">{idea.title}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[idea.status]}>
                          {statusTranslation[idea.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={idea.creator.photoUrl || undefined} alt={idea.creator.name} />
                            <AvatarFallback>{idea.creator.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{idea.creator.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {idea.responsible ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={idea.responsible.photoUrl || undefined} alt={idea.responsible.name} />
                              <AvatarFallback>{idea.responsible.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{idea.responsible.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Não designado</span>
                        )}
                      </TableCell>
                      <TableCell>{idea.voteCount || 0}</TableCell>
                      <TableCell>{format(new Date(idea.createdAt), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => handleViewDetails(idea.id)}>
                                <SearchCircle className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeStatus(idea.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Alterar status
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAssign(idea.id)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Delegar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewVolunteers(idea.id)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Voluntários
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(idea.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {/* Paginação */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page => Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page => Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
              >
                Próxima
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Diálogo de detalhes da ideia */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          {selectedIdea ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedIdea.title}</DialogTitle>
                  <Badge className={statusColors[selectedIdea.status]}>
                    {statusTranslation[selectedIdea.status]}
                  </Badge>
                </div>
                <DialogDescription>
                  Criada por {selectedIdea.creator.name} em {format(new Date(selectedIdea.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Descrição</h3>
                  <p className="mt-2 whitespace-pre-wrap">{selectedIdea.description}</p>
                </div>
                
                {/* Responsável e detalhes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Responsável</h3>
                    {selectedIdea.responsible ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedIdea.responsible.photoUrl || undefined} alt={selectedIdea.responsible.name} />
                          <AvatarFallback>{selectedIdea.responsible.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedIdea.responsible.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedIdea.responsible.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Nenhum responsável designado</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Detalhes</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Votos</p>
                        <p className="font-medium">{selectedIdea.voteCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Comentários</p>
                        <p className="font-medium">{selectedIdea.commentCount || 0}</p>
                      </div>
                      {selectedIdea.group && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Grupo</p>
                          <p className="font-medium">{selectedIdea.group.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Anexos */}
                {selectedIdea.attachments && selectedIdea.attachments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Anexos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedIdea.attachments.map((attachment: any, index: number) => (
                        <a 
                          key={index} 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50"
                        >
                          {attachment.type.includes('image') ? (
                            <Image className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-orange-500" />
                          )}
                          <span className="text-sm truncate">{attachment.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Comentários */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Comentários</h3>
                  <div className="space-y-4">
                    {selectedIdea.comments && selectedIdea.comments.length > 0 ? (
                      selectedIdea.comments.map((comment: any) => (
                        <div key={comment.id} className="border p-3 rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={comment.user.photoUrl || undefined} alt={comment.user.name} />
                              <AvatarFallback>{comment.user.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{comment.content}</p>
                          
                          {/* Respostas */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="pl-4 mt-2 border-l-2 space-y-2">
                              {comment.replies.map((reply: any) => (
                                <div key={reply.id} className="border p-2 rounded-md bg-gray-50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={reply.user.photoUrl || undefined} alt={reply.user.name} />
                                      <AvatarFallback>{reply.user.name.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">{reply.user.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(reply.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                  <p className="text-sm">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        Nenhum comentário ainda.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setDetailsDialogOpen(false)}
                >
                  Fechar
                </Button>
                <Button onClick={() => {
                  setDetailsDialogOpen(false);
                  setChangeStatusDialogOpen(true);
                }}>
                  Alterar Status
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de alteração de status */}
      <Dialog open={changeStatusDialogOpen} onOpenChange={setChangeStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status da Ideia</DialogTitle>
            <DialogDescription>
              Selecione o novo status para esta ideia.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Ideia</Label>
              <p className="font-medium">{selectedIdea?.title}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Status Atual</Label>
              <Badge className={statusColors[selectedIdea?.status || "nova"]}>
                {statusTranslation[selectedIdea?.status || "nova"]}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select
                defaultValue={selectedIdea?.status}
                onValueChange={(status) => {
                  if (selectedIdeaId) {
                    changeStatusMutation.mutate({ ideaId: selectedIdeaId, status });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova">Nova</SelectItem>
                  <SelectItem value="em_avaliacao">Em avaliação</SelectItem>
                  <SelectItem value="priorizada">Priorizada</SelectItem>
                  <SelectItem value="em_execucao">Em execução</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setChangeStatusDialogOpen(false)}
              disabled={changeStatusMutation.isPending}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de exclusão de ideia */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Ideia</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir esta ideia? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <Label>Ideia</Label>
              <p className="font-medium">{selectedIdea?.title}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteIdeaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedIdeaId && deleteIdeaMutation.mutate(selectedIdeaId)}
              disabled={deleteIdeaMutation.isPending}
            >
              {deleteIdeaMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para delegação de ideia */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Delegar Ideia</DialogTitle>
            <DialogDescription>
              Designe um responsável pela implementação desta ideia e crie um grupo para colaboração.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...assignForm}>
            <form onSubmit={assignForm.handleSubmit((values) => {
              if (selectedIdeaId) {
                assignIdeaMutation.mutate({ ideaId: selectedIdeaId, formData: values });
              }
            })} className="space-y-4 py-4">
              <FormField
                control={assignForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingUsers ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : users && users.length > 0 ? (
                          users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm">
                            Nenhum usuário encontrado
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      O usuário que será responsável por implementar esta ideia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={assignForm.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Grupo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do grupo para implementação" {...field} />
                    </FormControl>
                    <FormDescription>
                      Um nome para o grupo que será criado para implementar esta ideia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={assignForm.control}
                name="groupDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Grupo (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição do grupo..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Uma breve descrição do propósito deste grupo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={assignForm.control}
                name="userIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membros Adicionais (opcional)</FormLabel>
                    <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : users && users.length > 0 ? (
                        users.map((user: any) => (
                          <div key={user.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={field.value?.includes(user.id.toString())}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                const userId = user.id.toString();
                                
                                if (checked) {
                                  assignForm.setValue("userIds", [...currentValue, userId]);
                                } else {
                                  assignForm.setValue(
                                    "userIds",
                                    currentValue.filter((id) => id !== userId)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`user-${user.id}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.photoUrl || undefined} alt={user.name} />
                                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              {user.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-center text-sm">
                          Nenhum usuário encontrado
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      Outros usuários que farão parte do grupo de implementação (não serão administradores).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={assignIdeaMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={assignIdeaMutation.isPending}
                >
                  {assignIdeaMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Delegar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para gerenciar voluntários */}
      <Dialog open={volunteersDialogOpen} onOpenChange={setVolunteersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Voluntários para a Ideia</DialogTitle>
            <DialogDescription>
              Aprove ou rejeite os voluntários que querem implementar esta ideia.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Ideia</Label>
              <p className="font-medium">{selectedIdea?.title}</p>
            </div>
            
            {selectedIdea?.volunteers && selectedIdea.volunteers.length > 0 ? (
              <div className="space-y-4">
                {selectedIdea.volunteers
                  .filter((v: any) => v.status === 'pendente')
                  .map((volunteer: any) => (
                    <Card key={volunteer.userId} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={volunteer.photoUrl || undefined} alt={volunteer.name} />
                            <AvatarFallback>{volunteer.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{volunteer.name}</p>
                            <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Voluntariou-se em: {format(new Date(volunteer.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Badge>Pendente</Badge>
                      </div>
                      
                      {volunteer.message && (
                        <div className="mt-2 text-sm border-l-2 pl-2">
                          <p className="italic">{volunteer.message}</p>
                        </div>
                      )}
                      
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="groupName">Nome do Grupo</Label>
                            <Input 
                              id="groupName"
                              placeholder="Nome do grupo para implementação"
                              value={groupName}
                              onChange={(e) => setGroupName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="groupDescription">Descrição (opcional)</Label>
                            <Input
                              id="groupDescription"
                              placeholder="Descrição do grupo"
                              value={groupDescription}
                              onChange={(e) => setGroupDescription(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => rejectVolunteerMutation.mutate({
                            ideaId: selectedIdeaId,
                            volunteerId: volunteer.userId,
                          })}
                          disabled={rejectVolunteerMutation.isPending}
                        >
                          {rejectVolunteerMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveVolunteer(volunteer.userId)}
                          disabled={approveVolunteerMutation.isPending || !groupName}
                        >
                          {approveVolunteerMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          Aprovar
                        </Button>
                      </div>
                    </Card>
                  ))}
                
                {selectedIdea.volunteers.filter((v: any) => v.status === 'pendente').length === 0 && (
                  <div className="text-center py-2">
                    <p className="text-muted-foreground">Não há voluntários pendentes para esta ideia.</p>
                  </div>
                )}
                
                {/* Voluntários aprovados ou rejeitados */}
                {selectedIdea.volunteers.some((v: any) => v.status !== 'pendente') && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-medium mb-2">Histórico de Voluntários</h3>
                    <div className="space-y-2">
                      {selectedIdea.volunteers
                        .filter((v: any) => v.status !== 'pendente')
                        .map((volunteer: any) => (
                          <div key={volunteer.userId} className="flex justify-between items-center p-2 border rounded-md">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={volunteer.photoUrl || undefined} alt={volunteer.name} />
                                <AvatarFallback>{volunteer.name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{volunteer.name}</span>
                            </div>
                            <Badge variant={volunteer.status === 'aprovado' ? 'default' : 'destructive'}>
                              {volunteer.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Nenhum voluntário para esta ideia.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setVolunteersDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componentes extras
const Image = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const SearchCircle = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);