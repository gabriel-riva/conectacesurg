import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Users, Settings as SettingsIcon, FileText, MapPin, Filter, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Tool {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  allowedUserCategories: number[];
  settings?: any;
  category?: {
    id: number;
    name: string;
    color: string;
    icon: string;
  };
}

interface ToolProject {
  id: number;
  toolId: number;
  creatorId: number;
  tipoAtividade: string;
  dataRealizacao: string;
  local: string;
  nomeProfissionais: string;
  status: string;
  observacoes?: string;
  quantidadeEncontros?: number;
  transporteNecessario: boolean;
  demandasMarketing?: string[];
  publicoExclusivo: boolean;
  turmasEnv?: string;
  horarioSaida?: string;
  horarioRetorno?: string;
  cidade?: string;
  empresasVisitadas?: string;
  logisticaVisita?: string;
  tipoVeiculo?: string;
  custoAluno?: number;
  detalhesAdicionais?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

export default function AdminToolPage() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const toolId = parseInt(params.id || "0");
  const [activeTab, setActiveTab] = useState("projects");
  const [selectedProject, setSelectedProject] = useState<ToolProject | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();

  // Schema de validação para projeto
  const projectSchema = z.object({
    tipoAtividade: z.enum(['aula_convidado', 'visita_tecnica', 'outro_evento']),
    dataRealizacao: z.string().min(1, "Data é obrigatória"),
    local: z.string().min(1, "Local é obrigatório"),
    nomeProfissionais: z.string().min(1, "Nome dos profissionais é obrigatório"),
    status: z.string(),
    observacoes: z.string().optional(),
    quantidadeEncontros: z.number().optional(),
    transporteNecessario: z.boolean(),
    publicoExclusivo: z.boolean(),
    turmasEnv: z.string().optional(),
    horarioSaida: z.string().optional(),
    horarioRetorno: z.string().optional(),
    cidade: z.string().optional(),
    empresasVisitadas: z.string().optional(),
    logisticaVisita: z.string().optional(),
    tipoVeiculo: z.enum(['van', 'micro', 'onibus']).optional(),
    custoAluno: z.number().optional(),
    detalhesAdicionais: z.string().optional(),
  });

  type ProjectFormData = z.infer<typeof projectSchema>;

  // Form para edição de projeto
  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      tipoAtividade: 'aula_convidado',
      dataRealizacao: '',
      local: '',
      nomeProfissionais: '',
      status: 'rascunho',
      observacoes: '',
      transporteNecessario: false,
      publicoExclusivo: false,
      turmasEnv: '',
      horarioSaida: '',
      horarioRetorno: '',
      cidade: '',
      empresasVisitadas: '',
      logisticaVisita: '',
      custoAluno: 0,
      detalhesAdicionais: '',
    },
  });

  // Queries
  const { data: tool, isLoading: toolLoading } = useQuery<Tool>({
    queryKey: [`/api/admin/tools/${toolId}`],
    enabled: !!toolId,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ToolProject[]>({
    queryKey: [`/api/admin/tools/${toolId}/projects`],
    enabled: !!toolId,
  });

  if (toolLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-6">
            <div className="text-center py-8">
              <p className="text-gray-600">Carregando ferramenta...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Ferramenta não encontrada</h2>
              <p className="text-gray-600 mb-4">A ferramenta solicitada não existe ou foi removida.</p>
              <Button onClick={() => setLocation('/admin/ferramentas')}>
                Voltar para Ferramentas
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'rascunho': { label: 'Rascunho', variant: 'secondary' as const },
      'pendente': { label: 'Pendente', variant: 'default' as const },
      'aprovado': { label: 'Aprovado', variant: 'default' as const },
      'rejeitado': { label: 'Rejeitado', variant: 'destructive' as const },
      'realizado': { label: 'Realizado', variant: 'default' as const },
      'relatorio_pendente': { label: 'Relatório Pendente', variant: 'default' as const },
      'finalizado': { label: 'Finalizado', variant: 'default' as const },
    };
    
    const statusConfig = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Handlers
  const handleProjectClick = (project: ToolProject) => {
    setSelectedProject(project);
    setEditingProject(false);
    setProjectDialogOpen(true);
    
    // Reset form with project data
    projectForm.reset({
      tipoAtividade: project.tipoAtividade as any,
      dataRealizacao: project.dataRealizacao,
      local: project.local,
      nomeProfissionais: project.nomeProfissionais,
      status: project.status,
      observacoes: project.observacoes || '',
      quantidadeEncontros: project.quantidadeEncontros,
      transporteNecessario: project.transporteNecessario,
      publicoExclusivo: project.publicoExclusivo,
      turmasEnv: project.turmasEnv || '',
      horarioSaida: project.horarioSaida || '',
      horarioRetorno: project.horarioRetorno || '',
      cidade: project.cidade || '',
      empresasVisitadas: project.empresasVisitadas || '',
      logisticaVisita: project.logisticaVisita || '',
      tipoVeiculo: project.tipoVeiculo as any,
      custoAluno: project.custoAluno,
      detalhesAdicionais: project.detalhesAdicionais || '',
    });
  };

  const handleEditProject = () => {
    setEditingProject(true);
  };

  const handleSaveProject = async (data: ProjectFormData) => {
    if (!selectedProject) return;

    try {
      const response = await fetch(`/api/admin/tools/${toolId}/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dataRealizacao: new Date(data.dataRealizacao).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar projeto');
      }

      const updatedProject = await response.json();
      
      toast({
        title: "Projeto atualizado",
        description: "As informações do projeto foram atualizadas com sucesso.",
      });

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [`/api/admin/tools/${toolId}/projects`] });
      
      setEditingProject(false);
      setProjectDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Filtros
  const filteredProjects = projects.filter(project => {
    const statusMatch = statusFilter === "all" || project.status === statusFilter;
    const typeMatch = typeFilter === "all" || project.tipoAtividade === typeFilter;
    return statusMatch && typeMatch;
  });

  // Mapas de labels
  const typeLabels = {
    'aula_convidado': 'Aula com Convidados',
    'visita_tecnica': 'Visita Técnica', 
    'outro_evento': 'Outro Evento'
  };

  const statusLabels = {
    'rascunho': 'Rascunho',
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'rejeitado': 'Rejeitado',
    'realizado': 'Realizado',
    'relatorio_pendente': 'Relatório Pendente',
    'finalizado': 'Finalizado'
  };

  // Componente ProjectCard compacto para o Kanban
  const ProjectCard = ({ project }: { project: ToolProject }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => handleProjectClick(project)}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">#{project.id}</span>
            {getStatusBadge(project.status)}
          </div>
          <h4 className="font-medium text-sm leading-tight">
            {typeLabels[project.tipoAtividade as keyof typeof typeLabels] || project.tipoAtividade}
          </h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(project.dataRealizacao)}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{project.local}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="truncate">{project.nomeProfissionais}</span>
            </div>
            {project.creator && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="truncate">{project.creator.name}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation('/admin/ferramentas')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <div className="flex items-center gap-3">
                  {tool.category && (
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: tool.category.color }}
                    >
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{tool.name}</h1>
                    <p className="text-gray-600">{tool.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={tool.isActive ? "default" : "secondary"}>
                  {tool.isActive ? "Ativa" : "Inativa"}
                </Badge>
                {tool.category && (
                  <Badge variant="outline">{tool.category.name}</Badge>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="projects" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Projetos
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              {/* Tab: Projetos - Layout Kanban */}
              <TabsContent value="projects" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Projetos da Ferramenta</h2>
                    <div className="text-sm text-gray-600">
                      Total: {filteredProjects.length} de {projects.length} projeto{projects.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="flex gap-4 items-center bg-white p-4 rounded-lg border">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-700">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-700">Tipo de Atividade</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Tipos</SelectItem>
                            {Object.entries(typeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {projectsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">Carregando projetos...</p>
                    </div>
                  ) : filteredProjects.length === 0 && projects.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
                        <p className="text-gray-600">
                          Ainda não há projetos criados para esta ferramenta.
                        </p>
                      </CardContent>
                    </Card>
                  ) : filteredProjects.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
                        <p className="text-gray-600">
                          Não há projetos que correspondam aos filtros selecionados.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[600px]">
                      {/* Coluna: Planejado */}
                      <div className="space-y-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <h3 className="font-medium text-blue-900 flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            Planejado
                            <Badge variant="secondary" className="ml-auto">
                              {filteredProjects.filter(p => ['planejado', 'rascunho', 'pendente'].includes(p.status)).length}
                            </Badge>
                          </h3>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {filteredProjects
                            .filter(p => ['planejado', 'rascunho', 'pendente'].includes(p.status))
                            .map((project) => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                      </div>

                      {/* Coluna: Aprovado */}
                      <div className="space-y-3">
                        <div className="bg-green-100 p-3 rounded-lg">
                          <h3 className="font-medium text-green-900 flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            Aprovado
                            <Badge variant="secondary" className="ml-auto">
                              {filteredProjects.filter(p => p.status === 'aprovado').length}
                            </Badge>
                          </h3>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {filteredProjects
                            .filter(p => p.status === 'aprovado')
                            .map((project) => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                      </div>

                      {/* Coluna: Realizado */}
                      <div className="space-y-3">
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <h3 className="font-medium text-yellow-900 flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            Realizado
                            <Badge variant="secondary" className="ml-auto">
                              {filteredProjects.filter(p => ['realizado', 'relatorio_pendente'].includes(p.status)).length}
                            </Badge>
                          </h3>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {filteredProjects
                            .filter(p => ['realizado', 'relatorio_pendente'].includes(p.status))
                            .map((project) => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                      </div>

                      {/* Coluna: Finalizado */}
                      <div className="space-y-3">
                        <div className="bg-purple-100 p-3 rounded-lg">
                          <h3 className="font-medium text-purple-900 flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            Finalizado
                            <Badge variant="secondary" className="ml-auto">
                              {filteredProjects.filter(p => p.status === 'finalizado').length}
                            </Badge>
                          </h3>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {filteredProjects
                            .filter(p => p.status === 'finalizado')
                            .map((project) => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>



              {/* Tab: Configurações */}
              <TabsContent value="settings" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações da Ferramenta</CardTitle>
                    <CardDescription>
                      Configurações específicas e metadados da ferramenta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Informações Básicas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-700">ID da Ferramenta</p>
                            <p className="text-gray-600">{tool.id}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Status</p>
                            <p className="text-gray-600">{tool.isActive ? 'Ativa' : 'Inativa'}</p>
                          </div>
                          {tool.category && (
                            <div>
                              <p className="font-medium text-gray-700">Categoria</p>
                              <p className="text-gray-600">{tool.category.name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {tool.settings && Object.keys(tool.settings).length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Configurações Específicas</h4>
                          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                            {JSON.stringify(tool.settings, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Dialog de Detalhes/Edição do Projeto */}
            <Dialog open={projectDialogOpen} onOpenChange={(open) => {
              setProjectDialogOpen(open);
              if (!open) {
                setEditingProject(false);
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProject ? `Editando Projeto #${selectedProject?.id}` : `Detalhes do Projeto #${selectedProject?.id}`}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProject ? "Edite as informações do projeto" : "Visualize e gerencie os detalhes do projeto"}
                  </DialogDescription>
                </DialogHeader>
                
                {selectedProject && !editingProject && (
                  <div className="space-y-6">
                    {/* Header do Projeto */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {typeLabels[selectedProject.tipoAtividade as keyof typeof typeLabels] || selectedProject.tipoAtividade}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Criado em {formatDate(selectedProject.createdAt)}
                        </p>
                      </div>
                      {getStatusBadge(selectedProject.status)}
                    </div>

                    {/* Informações Principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Data de Realização</label>
                        <p className="text-sm text-gray-900 mt-1">{formatDate(selectedProject.dataRealizacao)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Local</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedProject.local}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Profissionais Envolvidos</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedProject.nomeProfissionais}</p>
                      </div>
                      {selectedProject.quantidadeEncontros && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Quantidade de Encontros</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedProject.quantidadeEncontros}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Transporte Necessário</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedProject.transporteNecessario ? 'Sim' : 'Não'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Público Exclusivo</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedProject.publicoExclusivo ? 'Sim' : 'Não'}</p>
                      </div>
                      {selectedProject.turmasEnv && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Turmas Envolvidas</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedProject.turmasEnv}</p>
                        </div>
                      )}
                      {selectedProject.horarioSaida && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Horário de Saída</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedProject.horarioSaida}</p>
                        </div>
                      )}
                      {selectedProject.horarioRetorno && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Horário de Retorno</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedProject.horarioRetorno}</p>
                        </div>
                      )}
                      {selectedProject.cidade && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Cidade</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedProject.cidade}</p>
                        </div>
                      )}
                      {selectedProject.empresasVisitadas && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Empresas Visitadas</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedProject.empresasVisitadas}</p>
                        </div>
                      )}
                      {selectedProject.logisticaVisita && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Logística da Visita</label>
                          <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">{selectedProject.logisticaVisita}</p>
                        </div>
                      )}
                      {selectedProject.tipoVeiculo && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Tipo de Veículo</label>
                          <p className="text-sm text-gray-900 mt-1 capitalize">{selectedProject.tipoVeiculo}</p>
                        </div>
                      )}
                      {selectedProject.custoAluno && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Custo por Aluno</label>
                          <p className="text-sm text-gray-900 mt-1">R$ {selectedProject.custoAluno}</p>
                        </div>
                      )}
                      {selectedProject.creator && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Criado por</label>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{selectedProject.creator.name}</span>
                            <span className="text-xs text-gray-500">({selectedProject.creator.email})</span>
                          </div>
                        </div>
                      )}
                      {selectedProject.observacoes && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Observações</label>
                          <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">{selectedProject.observacoes}</p>
                        </div>
                      )}
                      {selectedProject.detalhesAdicionais && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Detalhes Adicionais</label>
                          <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">{selectedProject.detalhesAdicionais}</p>
                        </div>
                      )}
                    </div>

                    {/* Informações de Sistema */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Informações do Sistema</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">ID do Projeto:</span>
                          <span className="ml-2 text-gray-900">#{selectedProject.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status Atual:</span>
                          <span className="ml-2 text-gray-900">{statusLabels[selectedProject.status as keyof typeof statusLabels] || selectedProject.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Criado em:</span>
                          <span className="ml-2 text-gray-900">{formatDate(selectedProject.createdAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Última atualização:</span>
                          <span className="ml-2 text-gray-900">{formatDate(selectedProject.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button 
                        variant="outline"
                        onClick={() => setProjectDialogOpen(false)}
                      >
                        Fechar
                      </Button>
                      <Button onClick={handleEditProject}>
                        Editar Projeto
                      </Button>
                    </div>
                  </div>
                )}

                {/* Formulário de Edição */}
                {selectedProject && editingProject && (
                  <Form {...projectForm}>
                    <form onSubmit={projectForm.handleSubmit(handleSaveProject)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo de Atividade */}
                        <FormField
                          control={projectForm.control}
                          name="tipoAtividade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Atividade</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="aula_convidado">Aula com Convidados</SelectItem>
                                  <SelectItem value="visita_tecnica">Visita Técnica</SelectItem>
                                  <SelectItem value="outro_evento">Outro Evento</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Status */}
                        <FormField
                          control={projectForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(statusLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Data de Realização */}
                        <FormField
                          control={projectForm.control}
                          name="dataRealizacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Realização</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Local */}
                        <FormField
                          control={projectForm.control}
                          name="local"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Local</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Profissionais */}
                        <FormField
                          control={projectForm.control}
                          name="nomeProfissionais"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Profissionais Envolvidos</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Quantidade de Encontros (apenas para aula_convidado) */}
                        <FormField
                          control={projectForm.control}
                          name="quantidadeEncontros"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade de Encontros</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Custo por Aluno */}
                        <FormField
                          control={projectForm.control}
                          name="custoAluno"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Custo por Aluno (R$)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  {...field} 
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Checkboxes */}
                        <div className="md:col-span-2 flex gap-6">
                          <FormField
                            control={projectForm.control}
                            name="transporteNecessario"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Transporte Necessário</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="publicoExclusivo"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Público Exclusivo</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Campos condicionais baseados no tipo */}
                        {projectForm.watch('publicoExclusivo') && (
                          <FormField
                            control={projectForm.control}
                            name="turmasEnv"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Turmas Envolvidas</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {projectForm.watch('tipoAtividade') === 'visita_tecnica' && (
                          <>
                            <FormField
                              control={projectForm.control}
                              name="horarioSaida"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Horário de Saída</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={projectForm.control}
                              name="horarioRetorno"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Horário de Retorno</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={projectForm.control}
                              name="cidade"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cidade</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={projectForm.control}
                              name="tipoVeiculo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo de Veículo</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="van">Van</SelectItem>
                                      <SelectItem value="micro">Micro-ônibus</SelectItem>
                                      <SelectItem value="onibus">Ônibus</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={projectForm.control}
                              name="empresasVisitadas"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Empresas Visitadas</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={projectForm.control}
                              name="logisticaVisita"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Logística da Visita</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {/* Observações */}
                        <FormField
                          control={projectForm.control}
                          name="observacoes"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Detalhes Adicionais */}
                        <FormField
                          control={projectForm.control}
                          name="detalhesAdicionais"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Detalhes Adicionais</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Ações do Formulário */}
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setEditingProject(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          Salvar Alterações
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}