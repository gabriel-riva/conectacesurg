import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Header } from '@/components/Header';
import { AdminSidebar } from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye, CheckCircle, XCircle, Clock, FileText, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ToolProject {
  id: number;
  creator_id: number;
  creator_name: string;
  tipo_atividade: string;
  data_realizacao: string;
  local: string;
  nome_profissionais: string;
  status: string;
  created_at: string;
  updated_at: string;
  observacoes?: string;
  dados_ia?: any;
}

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
}

const statusOptions = [
  { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-500' },
  { value: 'enviado', label: 'Enviado', color: 'bg-blue-500' },
  { value: 'em_analise', label: 'Em Análise', color: 'bg-yellow-500' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-green-500' },
  { value: 'rejeitado', label: 'Rejeitado', color: 'bg-red-500' },
  { value: 'em_execucao', label: 'Em Execução', color: 'bg-purple-500' },
  { value: 'concluido', label: 'Concluído', color: 'bg-emerald-500' },
];

const typeLabels = {
  'aula_convidado': 'Aula com Convidado',
  'visita_tecnica': 'Visita Técnica',
  'outro_evento': 'Outro Evento',
};

export default function AdminFerramentasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState<ToolProject | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: 'Portal Conecta CESURG',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar projetos
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/admin/tool-projects'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/tool-projects');
      return response;
    },
  });

  // Buscar configurações de email
  const { data: currentEmailSettings } = useQuery({
    queryKey: ['/api/admin/email-settings'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/email-settings');
      return response;
    },
  });

  // Update email settings when data is loaded
  React.useEffect(() => {
    if (currentEmailSettings) {
      setEmailSettings(currentEmailSettings);
    }
  }, [currentEmailSettings]);

  // Mutation para alterar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status, comment }: { projectId: number; status: string; comment: string }) => {
      return apiRequest(`/api/admin/tool-projects/${projectId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tool-projects'] });
      setSelectedProject(null);
      setNewStatus('');
      setStatusComment('');
      toast({
        title: 'Status atualizado',
        description: 'O status do projeto foi atualizado com sucesso.',
      });
    },
  });

  // Mutation para salvar configurações de email
  const saveEmailSettingsMutation = useMutation({
    mutationFn: async (settings: EmailSettings) => {
      return apiRequest('/api/admin/email-settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de email foram salvas com sucesso.',
      });
    },
  });

  // Filtrar projetos
  const filteredProjects = projects.filter((project: ToolProject) => {
    const matchesSearch = project.nome_profissionais.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.creator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         typeLabels[project.tipo_atividade as keyof typeof typeLabels]?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = statusOptions.find(s => s.value === status);
    return (
      <Badge className={`${statusInfo?.color || 'bg-gray-500'} text-white`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const handleStatusUpdate = () => {
    if (!selectedProject || !newStatus) return;
    
    updateStatusMutation.mutate({
      projectId: selectedProject.id,
      status: newStatus,
      comment: statusComment,
    });
  };

  const handleEmailSettingsSave = () => {
    saveEmailSettingsMutation.mutate(emailSettings);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-6">
            <div className="text-center">Carregando...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-6">
          <Tabs defaultValue="projects" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Administração - Ferramentas</h1>
                <p className="text-gray-600 mt-2">Gerencie projetos de atividades externas e configurações</p>
              </div>
              <TabsList>
                <TabsTrigger value="projects">Projetos</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="projects" className="space-y-6">
              {/* Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="search"
                          placeholder="Buscar por nome, profissional ou tipo..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Projetos */}
              <div className="grid gap-4">
                {filteredProjects.map((project: ToolProject) => (
                  <Card key={project.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">
                              {typeLabels[project.tipo_atividade as keyof typeof typeLabels]}
                            </h3>
                            {getStatusBadge(project.status)}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><strong>Profissional(s):</strong> {project.nome_profissionais}</p>
                            <p><strong>Data:</strong> {new Date(project.data_realizacao).toLocaleDateString('pt-BR')}</p>
                            <p><strong>Local:</strong> {project.local}</p>
                            <p><strong>Criado por:</strong> {project.creator_name}</p>
                            <p><strong>Criado em:</strong> {new Date(project.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Projeto</DialogTitle>
                                <DialogDescription>
                                  Informações completas do projeto
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Tipo</Label>
                                    <p className="text-sm">{typeLabels[project.tipo_atividade as keyof typeof typeLabels]}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <div className="mt-1">{getStatusBadge(project.status)}</div>
                                  </div>
                                </div>
                                <div>
                                  <Label>Profissional(s)</Label>
                                  <p className="text-sm">{project.nome_profissionais}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Data</Label>
                                    <p className="text-sm">{new Date(project.data_realizacao).toLocaleDateString('pt-BR')}</p>
                                  </div>
                                  <div>
                                    <Label>Local</Label>
                                    <p className="text-sm">{project.local}</p>
                                  </div>
                                </div>
                                {project.observacoes && (
                                  <div>
                                    <Label>Observações</Label>
                                    <p className="text-sm">{project.observacoes}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedProject(project)}
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Alterar Status
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Alterar Status do Projeto</DialogTitle>
                                <DialogDescription>
                                  Altere o status e adicione comentários se necessário
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Novo Status</Label>
                                  <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o novo status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statusOptions.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                          {status.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Comentário (opcional)</Label>
                                  <Textarea
                                    placeholder="Adicione um comentário sobre a mudança de status..."
                                    value={statusComment}
                                    onChange={(e) => setStatusComment(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <DialogTrigger asChild>
                                    <Button variant="outline">Cancelar</Button>
                                  </DialogTrigger>
                                  <Button 
                                    onClick={handleStatusUpdate}
                                    disabled={!newStatus || updateStatusMutation.isPending}
                                  >
                                    {updateStatusMutation.isPending ? 'Salvando...' : 'Salvar'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredProjects.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      Nenhum projeto encontrado com os filtros aplicados.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Email</CardTitle>
                  <CardDescription>
                    Configure o servidor SMTP para envio de notificações automáticas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp_host">Servidor SMTP</Label>
                      <Input
                        id="smtp_host"
                        value={emailSettings.smtp_host}
                        onChange={(e) => setEmailSettings({...emailSettings, smtp_host: e.target.value})}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp_port">Porta</Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        value={emailSettings.smtp_port}
                        onChange={(e) => setEmailSettings({...emailSettings, smtp_port: parseInt(e.target.value)})}
                        placeholder="587"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp_user">Usuário SMTP</Label>
                      <Input
                        id="smtp_user"
                        value={emailSettings.smtp_user}
                        onChange={(e) => setEmailSettings({...emailSettings, smtp_user: e.target.value})}
                        placeholder="seu-email@gmail.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp_password">Senha SMTP</Label>
                      <Input
                        id="smtp_password"
                        type="password"
                        value={emailSettings.smtp_password}
                        onChange={(e) => setEmailSettings({...emailSettings, smtp_password: e.target.value})}
                        placeholder="senha-do-app"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from_email">Email Remetente</Label>
                      <Input
                        id="from_email"
                        value={emailSettings.from_email}
                        onChange={(e) => setEmailSettings({...emailSettings, from_email: e.target.value})}
                        placeholder="noreply@cesurg.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="from_name">Nome Remetente</Label>
                      <Input
                        id="from_name"
                        value={emailSettings.from_name}
                        onChange={(e) => setEmailSettings({...emailSettings, from_name: e.target.value})}
                        placeholder="Portal Conecta CESURG"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleEmailSettingsSave}
                      disabled={saveEmailSettingsMutation.isPending}
                    >
                      {saveEmailSettingsMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}