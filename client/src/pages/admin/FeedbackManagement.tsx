import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bug, Lightbulb, MessageCircle, User, Calendar, Eye, Edit, Trash2, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Feedback {
  id: number;
  title: string | null;
  description: string;
  type: 'bug' | 'suggestion' | 'general';
  isAnonymous: boolean;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: number | null;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

const FeedbackManagement: React.FC = () => {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbacks, isLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback'],
    queryFn: () => apiRequest('/api/feedback'),
  });

  const { data: users } = useQuery<Array<{id: number, name: string, email: string}>>({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/api/users'),
  });

  const { data: feedbackWidgetSettings } = useQuery<{isEnabled: boolean, disabledMessage: string | null}>({
    queryKey: ['/api/feature-settings/check/feedback-widget'],
    queryFn: () => apiRequest('/api/feature-settings/check/feedback-widget'),
  });

  const toggleWidgetMutation = useMutation({
    mutationFn: (isEnabled: boolean) =>
      apiRequest('/api/feature-settings/feedback-widget', {
        method: 'PUT',
        body: JSON.stringify({ 
          isEnabled,
          disabledMessage: 'Widget de feedback desabilitado pelo administrador' 
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-settings/check/feedback-widget'] });
      toast({
        title: 'Widget de feedback atualizado',
        description: `O widget de feedback foi ${feedbackWidgetSettings?.isEnabled ? 'desabilitado' : 'habilitado'} com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar a configuração do widget.',
        variant: 'destructive',
      });
    },
  });

  const getUserName = (userId: number | null, isAnonymous: boolean) => {
    if (isAnonymous) return 'Anônimo';
    if (!userId) return 'Usuário desconhecido';
    
    const user = users?.find((u: any) => u.id === userId);
    return user ? user.name : `Usuário ${userId}`;
  };

  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/feedback/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      toast({
        title: 'Feedback atualizado',
        description: 'O feedback foi atualizado com sucesso.',
      });
      setSelectedFeedback(null);
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o feedback.',
        variant: 'destructive',
      });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/feedback/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      toast({
        title: 'Feedback excluído',
        description: 'O feedback foi excluído com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o feedback.',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateFeedback = () => {
    if (!selectedFeedback) return;

    updateFeedbackMutation.mutate({
      id: selectedFeedback.id,
      data: {
        status,
        adminNotes,
        resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
      },
    });
  };

  const handleDeleteFeedback = (feedbackId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita.')) {
      deleteFeedbackMutation.mutate(feedbackId);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-4 h-4 text-red-500" />;
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'general':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Aberto', className: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Em Andamento', className: 'bg-yellow-100 text-yellow-800' },
      resolved: { label: 'Resolvido', className: 'bg-green-100 text-green-800' },
      closed: { label: 'Fechado', className: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      bug: { label: 'Bug', className: 'bg-red-100 text-red-800' },
      suggestion: { label: 'Sugestão', className: 'bg-yellow-100 text-yellow-800' },
      general: { label: 'Geral', className: 'bg-blue-100 text-blue-800' },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.general;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <div className="flex flex-1">
          <AdminSidebar />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-primary">Gerenciamento de Feedbacks</h1>
              <div className="text-center py-8">Carregando feedbacks...</div>
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
              <h1 className="text-2xl font-bold text-primary">Gerenciamento de Feedbacks</h1>
              <div className="text-sm text-gray-600">
                Total: {feedbacks?.length || 0} feedbacks
              </div>
            </div>

            {/* Widget Toggle Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações do Widget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Widget de Feedback</Label>
                    <p className="text-sm text-gray-600">
                      Controla se o widget de feedback aparece na plataforma para os usuários
                    </p>
                  </div>
                  <Switch
                    checked={feedbackWidgetSettings?.isEnabled || false}
                    onCheckedChange={(checked) => toggleWidgetMutation.mutate(checked)}
                    disabled={toggleWidgetMutation.isPending}
                  />
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Status atual: {feedbackWidgetSettings?.isEnabled ? 'Habilitado' : 'Desabilitado'}
                </div>
              </CardContent>
            </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['open', 'in_progress', 'resolved', 'closed'].map((statusType) => {
          const count = feedbacks?.filter(f => f.status === statusType).length || 0;
          return (
            <Card key={statusType}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {statusType === 'open' ? 'Abertos' : 
                       statusType === 'in_progress' ? 'Em Andamento' :
                       statusType === 'resolved' ? 'Resolvidos' : 'Fechados'}
                    </p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  {getStatusBadge(statusType)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Feedbacks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks?.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(feedback.type)}
                      {getTypeBadge(feedback.type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium truncate">
                        {feedback.title || 'Sem título'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {feedback.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(feedback.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {getUserName(feedback.userId, feedback.isAnonymous)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(feedback.createdAt), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFeedback(feedback);
                              setAdminNotes(feedback.adminNotes || '');
                              setStatus(feedback.status);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Gerenciar
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Gerenciar Feedback #{feedback.id}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(feedback.type)}
                              {getTypeBadge(feedback.type)}
                            </div>
                            {getStatusBadge(feedback.status)}
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Título</Label>
                            <p className="mt-1">{feedback.title || 'Sem título'}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Descrição</Label>
                            <p className="mt-1 text-sm text-gray-600">{feedback.description}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Usuário</Label>
                            <p className="mt-1">
                              {getUserName(feedback.userId, feedback.isAnonymous)}
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">Data de Criação</Label>
                            <p className="mt-1">{format(new Date(feedback.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                          </div>

                          <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Aberto</SelectItem>
                                <SelectItem value="in_progress">Em Andamento</SelectItem>
                                <SelectItem value="resolved">Resolvido</SelectItem>
                                <SelectItem value="closed">Fechado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="adminNotes">Notas Administrativas</Label>
                            <Textarea
                              id="adminNotes"
                              placeholder="Adicione notas sobre o feedback..."
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={handleUpdateFeedback}
                              disabled={updateFeedbackMutation.isPending}
                            >
                              {updateFeedbackMutation.isPending ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFeedback(feedback.id)}
                      disabled={deleteFeedbackMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!feedbacks || feedbacks.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              Nenhum feedback encontrado.
            </div>
          )}
        </CardContent>
      </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeedbackManagement;