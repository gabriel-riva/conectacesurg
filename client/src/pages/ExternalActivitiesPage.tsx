import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { ToolProjectForm } from "@/components/ToolProjectForm";
import { Link } from "wouter";
import { PlusIcon, FileTextIcon, CalendarIcon, UserIcon, ArrowLeftIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";

export interface ToolProject {
  id: number;
  title: string;
  description: string;
  type: 'aula' | 'visita_tecnica' | 'evento';
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';
  startDate: string;
  endDate?: string;
  location?: string;
  participants?: string;
  objectives?: string;
  resources?: string;
  observations?: string;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ToolProjectWithCreator {
  project: ToolProject;
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

export default function ExternalActivitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/tool-projects'],
    queryFn: () => apiRequest<ToolProjectWithCreator[]>('/api/tool-projects'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/tool-projects/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tool-projects'] });
      toast({
        title: "Projeto excluído",
        description: "O projeto foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o projeto.",
        variant: "destructive",
      });
    },
  });

  const filteredProjects = projects?.filter(item => 
    selectedType === 'all' || item.project.type === selectedType
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-conecta-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando projetos...</p>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/ferramentas">
          <Button variant="outline" size="sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Ferramentas
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Atividades com Convidados Externos</h1>
          <p className="text-gray-600">
            Gerencie aulas com convidados externos, visitas técnicas e eventos acadêmicos
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-conecta-blue hover:bg-conecta-blue/90">
              <PlusIcon className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Atividade</DialogTitle>
              <DialogDescription>
                Crie uma nova atividade com convidados externos, visita técnica ou evento acadêmico
              </DialogDescription>
            </DialogHeader>
            <ToolProjectForm 
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/tool-projects'] });
                toast({
                  title: "Atividade criada",
                  description: "A atividade foi criada com sucesso.",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedType('all')}
            size="sm"
          >
            Todas
          </Button>
          <Button
            variant={selectedType === 'aula' ? 'default' : 'outline'}
            onClick={() => setSelectedType('aula')}
            size="sm"
          >
            Aulas com Convidados
          </Button>
          <Button
            variant={selectedType === 'visita_tecnica' ? 'default' : 'outline'}
            onClick={() => setSelectedType('visita_tecnica')}
            size="sm"
          >
            Visitas Técnicas
          </Button>
          <Button
            variant={selectedType === 'evento' ? 'default' : 'outline'}
            onClick={() => setSelectedType('evento')}
            size="sm"
          >
            Eventos Acadêmicos
          </Button>
        </div>
      </div>

      {/* Lista de Projetos */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileTextIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma atividade encontrada
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {selectedType === 'all' 
                ? 'Você ainda não possui atividades. Crie sua primeira atividade para começar.'
                : `Não há atividades do tipo "${typeLabels[selectedType as keyof typeof typeLabels]}" ainda.`
              }
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Criar Primeira Atividade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map(({ project, creator }) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline">
                        {typeLabels[project.type]}
                      </Badge>
                      <Badge className={statusColors[project.status]}>
                        {statusLabels[project.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {new Date(project.startDate).toLocaleDateString('pt-BR')}
                      {project.endDate && project.endDate !== project.startDate && (
                        <> - {new Date(project.endDate).toLocaleDateString('pt-BR')}</>
                      )}
                    </span>
                  </div>
                  {project.location && (
                    <div className="flex items-center gap-2">
                      <span>📍 {project.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>{creator.name}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/ferramentas/atividades-externas/${project.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Detalhes
                    </Button>
                  </Link>
                  {(isAdmin || project.creatorId === user?.id) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProjectMutation.mutate(project.id)}
                      disabled={deleteProjectMutation.isPending}
                    >
                      {deleteProjectMutation.isPending ? '...' : 'Excluir'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}