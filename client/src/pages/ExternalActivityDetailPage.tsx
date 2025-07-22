import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { ToolProjectForm } from "@/components/ToolProjectForm";
import { ToolProjectReportForm } from "@/components/ToolProjectReportForm";
import { ArrowLeftIcon, EditIcon, PlusIcon, FileTextIcon, CalendarIcon, UserIcon, MapPinIcon, TargetIcon, PackageIcon, StickyNoteIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import type { ToolProject, ToolProjectWithCreator } from "./ExternalActivitiesPage";

interface ToolProjectReport {
  id: number;
  title: string;
  content: string;
  status: 'pendente' | 'em_revisao' | 'aprovado' | 'rejeitado';
  creatorId: number;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

interface ToolProjectReportWithCreator {
  report: ToolProjectReport;
  creator: {
    id: number;
    name: string;
    email: string;
  };
}

const typeLabels = {
  aula: 'Aula com Convidados',
  visita_tecnica: 'Visita Técnica',
  evento: 'Evento Acadêmico'
};

const statusLabels = {
  planejado: 'Planejado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const statusColors = {
  planejado: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-yellow-100 text-yellow-800',
  concluido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
};

const reportStatusLabels = {
  pendente: 'Pendente',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado'
};

const reportStatusColors = {
  pendente: 'bg-gray-100 text-gray-800',
  em_revisao: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-green-100 text-green-800',
  rejeitado: 'bg-red-100 text-red-800'
};

export default function ExternalActivityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const projectId = parseInt(id || '0');
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ['/api/tool-projects', projectId],
    queryFn: () => apiRequest<ToolProjectWithCreator>(`/api/tool-projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: reports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['/api/tool-projects', projectId, 'reports'],
    queryFn: () => apiRequest<ToolProjectReportWithCreator[]>(`/api/tool-projects/${projectId}/reports`),
    enabled: !!projectId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) => 
      apiRequest(`/api/tool-projects/${projectId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tool-projects', projectId] });
      toast({
        title: "Status atualizado",
        description: "O status da atividade foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-conecta-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando atividade...</p>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Atividade não encontrada</h2>
          <p className="text-gray-600 mb-6">A atividade que você está procurando não existe ou foi removida.</p>
          <Link href="/ferramentas/atividades-externas">
            <Button>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar para Atividades
            </Button>
          </Link>
        </div>
        </div>
      </div>
    );
  }

  const { project, creator } = projectData;
  const canEdit = isAdmin || project.creatorId === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/ferramentas/atividades-externas">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
          <p className="text-gray-600 mt-1">
            Criado por {creator.name} em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        {canEdit && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <EditIcon className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Atividade</DialogTitle>
                <DialogDescription>
                  Atualize as informações da atividade
                </DialogDescription>
              </DialogHeader>
              <ToolProjectForm 
                isEditing={true}
                projectId={project.id}
                initialData={{
                  title: project.title,
                  description: project.description,
                  type: project.type,
                  status: project.status,
                  startDate: project.startDate.split('T')[0],
                  endDate: project.endDate?.split('T')[0],
                  location: project.location,
                  participants: project.participants,
                  objectives: project.objectives,
                  resources: project.resources,
                  observations: project.observations,
                }}
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/tool-projects', projectId] });
                  toast({
                    title: "Atividade atualizada",
                    description: "A atividade foi atualizada com sucesso.",
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informações da Atividade */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informações da Atividade</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {typeLabels[project.type]}
                  </Badge>
                  <Badge className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                <p className="text-gray-700">{project.description}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Data de Início</p>
                    <p className="text-sm text-gray-600">
                      {new Date(project.startDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {project.endDate && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Data de Término</p>
                      <p className="text-sm text-gray-600">
                        {new Date(project.endDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}

                {project.location && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Local</p>
                      <p className="text-sm text-gray-600">{project.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Criador</p>
                    <p className="text-sm text-gray-600">{creator.name}</p>
                  </div>
                </div>
              </div>

              {project.participants && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Participantes
                    </h4>
                    <p className="text-gray-700">{project.participants}</p>
                  </div>
                </>
              )}

              {project.objectives && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <TargetIcon className="h-4 w-4" />
                      Objetivos
                    </h4>
                    <p className="text-gray-700">{project.objectives}</p>
                  </div>
                </>
              )}

              {project.resources && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <PackageIcon className="h-4 w-4" />
                      Recursos Necessários
                    </h4>
                    <p className="text-gray-700">{project.resources}</p>
                  </div>
                </>
              )}

              {project.observations && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <StickyNoteIcon className="h-4 w-4" />
                      Observações
                    </h4>
                    <p className="text-gray-700">{project.observations}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel Lateral */}
        <div className="space-y-6">
          {/* Ações de Admin */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações de Administrador</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Alterar Status</label>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ status: 'planejado' })}
                      disabled={updateStatusMutation.isPending || project.status === 'planejado'}
                      className="w-full justify-start"
                    >
                      Planejado
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ status: 'em_andamento' })}
                      disabled={updateStatusMutation.isPending || project.status === 'em_andamento'}
                      className="w-full justify-start"
                    >
                      Em Andamento
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ status: 'concluido' })}
                      disabled={updateStatusMutation.isPending || project.status === 'concluido'}
                      className="w-full justify-start"
                    >
                      Concluído
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ status: 'cancelado' })}
                      disabled={updateStatusMutation.isPending || project.status === 'cancelado'}
                      className="w-full justify-start"
                    >
                      Cancelado
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Relatórios */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Relatórios</CardTitle>
                {canEdit && (
                  <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Novo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Criar Relatório</DialogTitle>
                        <DialogDescription>
                          Crie um novo relatório para esta atividade
                        </DialogDescription>
                      </DialogHeader>
                      <ToolProjectReportForm 
                        projectId={project.id}
                        onSuccess={() => {
                          setIsReportDialogOpen(false);
                          queryClient.invalidateQueries({ 
                            queryKey: ['/api/tool-projects', projectId, 'reports'] 
                          });
                          toast({
                            title: "Relatório criado",
                            description: "O relatório foi criado com sucesso.",
                          });
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-conecta-blue mx-auto"></div>
                </div>
              ) : reports && reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map(({ report, creator }) => (
                    <div key={report.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{report.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={reportStatusColors[report.status]}
                        >
                          {reportStatusLabels[report.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Por {creator.name} em {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {report.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Nenhum relatório ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}