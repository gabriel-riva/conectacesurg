import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Users, Settings as SettingsIcon, FileText } from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
}

export default function AdminToolPage() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const toolId = parseInt(params.id || "0");
  const [activeTab, setActiveTab] = useState("projects");

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
      'enviado': { label: 'Enviado', variant: 'default' as const },
      'em_analise': { label: 'Em Análise', variant: 'default' as const },
      'aprovado': { label: 'Aprovado', variant: 'default' as const },
      'rejeitado': { label: 'Rejeitado', variant: 'destructive' as const },
      'em_execucao': { label: 'Em Execução', variant: 'default' as const },
      'concluido': { label: 'Concluído', variant: 'default' as const },
    };
    
    const statusConfig = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="projects" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Projetos
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>

              {/* Tab: Projetos */}
              <TabsContent value="projects" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Projetos da Ferramenta</h2>
                    <div className="text-sm text-gray-600">
                      Total: {projects.length} projeto{projects.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {projectsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">Carregando projetos...</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
                        <p className="text-gray-600">
                          Ainda não há projetos criados para esta ferramenta.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {projects.map((project) => (
                        <Card key={project.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg mb-1">
                                  Projeto #{project.id}
                                </CardTitle>
                                <CardDescription>
                                  {project.tipoAtividade.replace('_', ' ').charAt(0).toUpperCase() + 
                                   project.tipoAtividade.replace('_', ' ').slice(1)}
                                </CardDescription>
                              </div>
                              {getStatusBadge(project.status)}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Data de Realização</p>
                                <p className="text-sm text-gray-600">{formatDate(project.dataRealizacao)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Local</p>
                                <p className="text-sm text-gray-600">{project.local}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium text-gray-700">Profissionais</p>
                                <p className="text-sm text-gray-600">{project.nomeProfissionais}</p>
                              </div>
                              {project.observacoes && (
                                <div className="md:col-span-2">
                                  <p className="text-sm font-medium text-gray-700">Observações</p>
                                  <p className="text-sm text-gray-600">{project.observacoes}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-700">Criado em</p>
                                <p className="text-sm text-gray-600">{formatDate(project.createdAt)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Atualizado em</p>
                                <p className="text-sm text-gray-600">{formatDate(project.updatedAt)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Usuários com Acesso */}
              <TabsContent value="users" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Controle de Acesso</CardTitle>
                    <CardDescription>
                      Gerencie quais categorias de usuários podem acessar esta ferramenta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tool.allowedUserCategories.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Liberado</h3>
                        <p className="text-gray-600">
                          Esta ferramenta está disponível para todos os usuários do sistema.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-medium mb-4">Categorias com Acesso:</h4>
                        <div className="flex flex-wrap gap-2">
                          {tool.allowedUserCategories.map((categoryId) => (
                            <Badge key={categoryId} variant="outline">
                              Categoria ID: {categoryId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
          </div>
        </div>
      </div>
    </div>
  );
}