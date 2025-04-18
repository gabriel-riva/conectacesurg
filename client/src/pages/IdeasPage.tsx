import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { Idea } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ThumbsUp, ThumbsDown, MessageSquare, UserPlus, Filter, Search, ArrowUpDown, Loader2, FileText, FileImage, Paperclip } from "lucide-react";

// Definição do formulário de criação de ideias
const createIdeaSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres"),
  description: z.string().min(20, "A descrição deve ter pelo menos 20 caracteres"),
  takeResponsibility: z.boolean().default(false),
  attachments: z.instanceof(FileList).optional(),
});

type CreateIdeaFormValues = z.infer<typeof createIdeaSchema>;

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

// Componente para exibir detalhes de uma ideia
const IdeaDetailsDialog = ({ ideaId, onClose }: { ideaId: number; onClose: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Buscar detalhes da ideia
  const { data: idea, isLoading } = useQuery({
    queryKey: ['/api/ideas', ideaId],
    queryFn: () => apiRequest<any>(`/api/ideas/${ideaId}`),
  });
  
  // Mutação para votar em uma ideia
  const voteMutation = useMutation({
    mutationFn: async ({ vote }: { vote: 1 | -1 }) => {
      return apiRequest(`/api/ideas/${ideaId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível registrar seu voto.",
        variant: "destructive",
      });
    },
  });
  
  // Mutação para se voluntariar para uma ideia
  const volunteerMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      return apiRequest(`/api/ideas/${ideaId}/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas', ideaId] });
      setVolunteerDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Você se voluntariou para esta ideia com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível se voluntariar para esta ideia.",
        variant: "destructive",
      });
    },
  });
  
  // Estados para controle de diálogos e formulários
  const [volunteerDialogOpen, setVolunteerDialogOpen] = useState(false);
  const [volunteerMessage, setVolunteerMessage] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  
  // Mutação para adicionar comentário
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: number }) => {
      return apiRequest(`/api/ideas/${ideaId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas', ideaId] });
      setCommentContent("");
      setReplyingTo(null);
      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
    },
  });
  
  if (isLoading) {
    return (
      <DialogContent className="sm:max-w-[800px]">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DialogContent>
    );
  }
  
  if (!idea) {
    return (
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Erro</DialogTitle>
          <DialogDescription>
            Não foi possível carregar os detalhes desta ideia.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    );
  }
  
  // Verifica se o usuário já se voluntariou
  const hasVolunteered = idea.userVolunteered !== null;
  
  // Renderiza a interface de detalhes da ideia
  return (
    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <DialogTitle>{idea.title}</DialogTitle>
          <Badge className={statusColors[idea.status]}>
            {statusTranslation[idea.status]}
          </Badge>
        </div>
        <DialogDescription>
          Criada por {idea.creator.name} em {format(new Date(idea.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Descrição</h3>
          <p className="mt-2 whitespace-pre-wrap">{idea.description}</p>
        </div>
        
        {/* Responsável e detalhes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Responsável</h3>
            {idea.responsible ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={idea.responsible.photoUrl || undefined} alt={idea.responsible.name} />
                  <AvatarFallback>{idea.responsible.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{idea.responsible.name}</p>
                  <p className="text-sm text-muted-foreground">{idea.responsible.email}</p>
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
                <p className="font-medium">{idea.voteCount || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comentários</p>
                <p className="font-medium">{idea.commentCount || 0}</p>
              </div>
              {idea.group && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Grupo</p>
                  <p className="font-medium">{idea.group.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Anexos */}
        {idea.attachments && idea.attachments.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Anexos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {idea.attachments.map((attachment: any, index: number) => (
                <a 
                  key={index} 
                  href={attachment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50"
                >
                  {attachment.type.includes('image') ? (
                    <FileImage className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-orange-500" />
                  )}
                  <span className="text-sm truncate">{attachment.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={idea.userVote === 1 ? "default" : "outline"}
            size="sm"
            onClick={() => voteMutation.mutate({ vote: 1 })}
            disabled={voteMutation.isPending}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            {idea.userVote === 1 ? "Votado" : "Apoiar"}
          </Button>
          <Button
            variant={idea.userVote === -1 ? "destructive" : "outline"}
            size="sm"
            onClick={() => voteMutation.mutate({ vote: -1 })}
            disabled={voteMutation.isPending}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            {idea.userVote === -1 ? "Votado" : "Não Apoiar"}
          </Button>
          
          {!idea.responsible && !hasVolunteered && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVolunteerDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Voluntariar-se
            </Button>
          )}
          
          {hasVolunteered && (
            <Badge variant="outline" className="py-1 px-2">
              {idea.userVolunteered === 'pendente' ? 'Voluntário (pendente)' : 
               idea.userVolunteered === 'aprovado' ? 'Voluntário (aprovado)' : 
               'Voluntário (rejeitado)'}
            </Badge>
          )}
        </div>
        
        {/* Seção de comentários */}
        <div>
          <h3 className="text-lg font-medium mb-2">Comentários</h3>
          
          {/* Formulário de comentário */}
          <div className="mb-4">
            <div className="flex flex-col gap-2">
              {replyingTo !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Respondendo a um comentário</span>
                  <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancelar</Button>
                </div>
              )}
              <Textarea
                placeholder="Escreva seu comentário..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => commentMutation.mutate({ 
                    content: commentContent,
                    parentId: replyingTo || undefined
                  })}
                  disabled={commentMutation.isPending || !commentContent.trim()}
                  size="sm"
                >
                  {commentMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Comentar
                </Button>
              </div>
            </div>
          </div>
          
          {/* Lista de comentários */}
          <div className="space-y-4">
            {idea.comments && idea.comments.length > 0 ? (
              idea.comments.map((comment: any) => (
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
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      Responder
                    </Button>
                  </div>
                  
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
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </p>
            )}
          </div>
        </div>
      </div>
      
      <DialogFooter>
        <Button onClick={onClose}>Fechar</Button>
      </DialogFooter>
      
      {/* Diálogo para se voluntariar */}
      <Dialog open={volunteerDialogOpen} onOpenChange={setVolunteerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voluntariar-se para esta ideia</DialogTitle>
            <DialogDescription>
              Informe por que você gostaria de ser responsável por implementar esta ideia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <FormLabel>Mensagem (opcional)</FormLabel>
              <Textarea
                placeholder="Explique por que você seria a pessoa ideal para implementar esta ideia..."
                value={volunteerMessage}
                onChange={(e) => setVolunteerMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVolunteerDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => volunteerMutation.mutate({ message: volunteerMessage })}
              disabled={volunteerMutation.isPending}
            >
              {volunteerMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContent>
  );
};

// Componente de card para uma ideia
const IdeaCard = ({ idea, onClick }: { idea: any; onClick: () => void }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-1">{idea.title}</CardTitle>
          <Badge className={statusColors[idea.status] || "bg-gray-100"}>
            {statusTranslation[idea.status] || idea.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Avatar className="h-5 w-5">
            <AvatarImage src={idea.creator.photoUrl || undefined} alt={idea.creator.name} />
            <AvatarFallback>{idea.creator.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="text-xs">{idea.creator.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm line-clamp-3">{idea.description}</p>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between items-center">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ThumbsUp className={`h-4 w-4 ${idea.userVote === 1 ? 'text-primary' : ''}`} />
            <span>{idea.voteCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{idea.commentCount || 0}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClick}>
          Ver detalhes
        </Button>
      </CardFooter>
    </Card>
  );
};

// Componente para criação de ideias
const CreateIdeaDialog = ({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<CreateIdeaFormValues>({
    resolver: zodResolver(createIdeaSchema),
    defaultValues: {
      title: "",
      description: "",
      takeResponsibility: false,
    },
  });
  
  const createIdeaMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Usando a assinatura correta: apiRequest(método, url, data)
      return apiRequest('POST', '/api/ideas', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      form.reset();
      onCreated();
      toast({
        title: "Sucesso",
        description: "Sua ideia foi criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a ideia. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: CreateIdeaFormValues) {
    // Criar FormData aqui para envio
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('description', values.description);
    formData.append('takeResponsibility', values.takeResponsibility ? 'true' : 'false');
    
    if (values.attachments) {
      Array.from(values.attachments).forEach((file) => {
        formData.append('attachments', file);
      });
    }
    
    // Precisamos passar o FormData para a mutação, não o values
    createIdeaMutation.mutate(formData as any);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Nova Ideia</DialogTitle>
          <DialogDescription>
            Compartilhe sua ideia com a comunidade. Seja claro e específico para que outros possam entender e apoiar sua proposta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite um título para sua ideia" {...field} />
                  </FormControl>
                  <FormDescription>
                    Um título conciso que descreva sua ideia.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva sua ideia em detalhes..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Descreva sua ideia em detalhes, explicando seu objetivo, benefícios e como poderia ser implementada.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="attachments"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Anexos (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      id="attachments"
                      type="file"
                      multiple
                      onChange={(e) => onChange(e.target.files)}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Você pode adicionar imagens, documentos ou outros arquivos relevantes para sua ideia.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="takeResponsibility"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4 border-t">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Quero ser responsável pela implementação desta ideia
                    </FormLabel>
                    <FormDescription>
                      Marque esta opção se você deseja liderar a implementação da sua ideia. Você será o ponto focal para coordenar o trabalho.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={createIdeaMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createIdeaMutation.isPending}
              >
                {createIdeaMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Criar Ideia
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default function IdeasPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados para controle de filtros, ordenação e paginação
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "votes">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const [createIdeaDialogOpen, setCreateIdeaDialogOpen] = useState(false);
  
  // Consulta para buscar as ideias
  const { 
    data: ideasData, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/ideas', activeTab, searchQuery, statusFilter, sortBy, sortOrder, page],
    queryFn: async () => {
      const endpoint = activeTab === "my" 
        ? `/api/ideas/my` 
        : `/api/ideas?page=${page}&limit=12`;
        
      let url = endpoint;
      
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
  
  // Buscar as ideias responsáveis na aba "Minhas Ideias"
  const { 
    data: responsibleIdeas,
    isLoading: isLoadingResponsible,
  } = useQuery({
    queryKey: ['/api/ideas/my', 'responsible'],
    queryFn: async () => {
      return apiRequest<any>('/api/ideas/my?type=responsible');
    },
  });
  
  // Lógica para filtrar e ordenar as ideias
  const ideas = ideasData?.ideas || ideasData || [];
  const pagination = ideasData?.pagination;
  
  // Função para limpar filtros
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("todos");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };
  
  // Renderiza a página
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Conteúdo principal */}
          <div className="md:w-3/4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  Programa de Ideias
                </h1>
                <p className="text-muted-foreground">
                  Compartilhe suas ideias, vote nas melhores e colabore para implementá-las.
                </p>
              </div>
              
              <Button onClick={() => setCreateIdeaDialogOpen(true)}>
                Nova Ideia
              </Button>
            </div>
            
            {/* Barra de filtros e pesquisa */}
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
                    <SelectItem value="todos">Todos</SelectItem>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Tabs para todas as ideias ou minhas ideias */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Todas as Ideias</TabsTrigger>
                <TabsTrigger value="my">Minhas Ideias</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : isError ? (
                  <div className="text-center py-10">
                    <p className="text-destructive mb-2">Ocorreu um erro ao carregar as ideias.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
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
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ideas.map((idea: any) => (
                        <IdeaCard
                          key={idea.id}
                          idea={idea}
                          onClick={() => setSelectedIdeaId(idea.id)}
                        />
                      ))}
                    </div>
                    
                    {/* Paginação */}
                    {pagination && pagination.totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page => Math.max(1, page - 1))}
                            disabled={page === 1}
                          >
                            Anterior
                          </Button>
                          <div className="flex items-center mx-2">
                            <span className="text-sm">
                              Página {page} de {pagination.totalPages}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page => Math.min(pagination.totalPages, page + 1))}
                            disabled={page === pagination.totalPages}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="my" className="pt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : isError ? (
                  <div className="text-center py-10">
                    <p className="text-destructive mb-2">Ocorreu um erro ao carregar suas ideias.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : ideas.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">Você ainda não criou nenhuma ideia.</p>
                    <Button onClick={() => setCreateIdeaDialogOpen(true)}>
                      Criar sua primeira ideia
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ideas.map((idea: any) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onClick={() => setSelectedIdeaId(idea.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar - Minhas responsabilidades */}
          <div className="md:w-1/4">
            <Card>
              <CardHeader>
                <CardTitle>Minhas Responsabilidades</CardTitle>
                <CardDescription>
                  Ideias pelas quais você é responsável pela implementação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingResponsible ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !responsibleIdeas || responsibleIdeas.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      Você ainda não é responsável por nenhuma ideia.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {responsibleIdeas.map((idea: any) => (
                      <div
                        key={idea.id}
                        className="p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedIdeaId(idea.id)}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-medium text-sm line-clamp-1">{idea.title}</h4>
                          <Badge className={statusColors[idea.status]}>
                            {statusTranslation[idea.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {idea.description}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              <span>{idea.voteCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{idea.commentCount || 0}</span>
                            </div>
                          </div>
                          <div>
                            {idea.group && (
                              <span title={idea.group.name}>
                                {idea.group.name.length > 20 
                                  ? idea.group.name.substring(0, 20) + '...' 
                                  : idea.group.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Diálogo de detalhes da ideia */}
      {selectedIdeaId && (
        <Dialog open={selectedIdeaId !== null} onOpenChange={(open) => {
          if (!open) setSelectedIdeaId(null);
        }}>
          <IdeaDetailsDialog 
            ideaId={selectedIdeaId}
            onClose={() => setSelectedIdeaId(null)}
          />
        </Dialog>
      )}
      
      {/* Diálogo de criação de ideia */}
      <CreateIdeaDialog
        isOpen={createIdeaDialogOpen}
        onClose={() => setCreateIdeaDialogOpen(false)}
        onCreated={() => {
          setCreateIdeaDialogOpen(false);
          toast({
            title: "Ideia criada com sucesso!",
            description: "Sua ideia foi compartilhada com a comunidade.",
          });
        }}
      />
    </div>
  );
}