import React, { useState, useEffect } from 'react';
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
import { Bug, Lightbulb, MessageCircle, User, Calendar, Eye, Edit, Trash2, Settings, Image as ImageIcon, Camera, Download, X } from 'lucide-react';
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
  attachments?: {
    images: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      isScreenshot: boolean;
    }>;
  };
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('open');

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

  const filteredFeedbacks = feedbacks?.filter(feedback => {
    if (statusFilter === 'all') return true;
    return feedback.status === statusFilter;
  }) || [];

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

  const deleteImageMutation = useMutation({
    mutationFn: ({ feedbackId, imageId }: { feedbackId: number; imageId: string }) =>
      apiRequest(`/api/feedback/${feedbackId}/image/${imageId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      toast({
        title: 'Imagem excluída',
        description: 'A imagem foi excluída com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir a imagem.',
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

  const handleDeleteImage = (feedbackId: number, imageId: string, fileName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a imagem "${fileName}"? Esta ação não pode ser desfeita.`)) {
      deleteImageMutation.mutate({ feedbackId, imageId });
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
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Label className="text-xs text-gray-600">Filtrar por Status:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="open">Abertos</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvidos</SelectItem>
                      <SelectItem value="closed">Fechados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Label className="text-xs text-gray-600">Widget:</Label>
                  <Switch
                    checked={feedbackWidgetSettings?.isEnabled || false}
                    onCheckedChange={(checked) => toggleWidgetMutation.mutate(checked)}
                    disabled={toggleWidgetMutation.isPending}
                    className="scale-75"
                  />
                  <span className="text-xs text-gray-500">
                    {feedbackWidgetSettings?.isEnabled ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Exibindo: {filteredFeedbacks.length} de {feedbacks?.length || 0} feedbacks
                </div>
              </div>
            </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['open', 'in_progress', 'resolved', 'closed'].map((statusType) => {
          const count = feedbacks?.filter(f => f.status === statusType).length || 0;
          const isActive = statusFilter === statusType || statusFilter === 'all';
          return (
            <Card 
              key={statusType} 
              className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-80'}`}
              onClick={() => setStatusFilter(statusFilter === statusType ? 'all' : statusType)}
            >
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
              {filteredFeedbacks.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(feedback.type)}
                      {getTypeBadge(feedback.type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {feedback.title || 'Sem título'}
                        </p>
                        {feedback.attachments?.images && feedback.attachments.images.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-blue-500" />
                            <span className="text-xs text-blue-500 font-medium">
                              {feedback.attachments.images.length}
                            </span>
                          </div>
                        )}
                      </div>
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
                      <Dialog 
                        open={selectedFeedback?.id === feedback.id} 
                        onOpenChange={(open) => {
                          if (!open) {
                            setSelectedFeedback(null);
                          }
                        }}
                      >
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
                      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Gerenciar Feedback #{feedback.id}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pr-2">
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

                          {/* Attachments Section */}
                          {feedback.attachments?.images && feedback.attachments.images.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Imagens Anexadas ({feedback.attachments.images.length})
                              </Label>
                              <div className="mt-2 grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                                {feedback.attachments.images.map((image, index) => (
                                  <div key={image.id} className="relative group">
                                    <img
                                      src={image.fileUrl}
                                      alt={image.fileName}
                                      className="w-full h-24 object-cover rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImage(image.fileUrl);
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center pointer-events-none">
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Eye className="w-5 h-5 text-white" />
                                      </div>
                                    </div>
                                    <div className="absolute -top-2 -right-2 flex gap-1">
                                      {image.isScreenshot && (
                                        <div className="bg-blue-500 text-white rounded-full p-1" title="Screenshot">
                                          <Camera className="w-3 h-3" />
                                        </div>
                                      )}
                                      <button
                                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                                        title="Excluir imagem"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteImage(feedback.id, image.id, image.fileName);
                                        }}
                                        disabled={deleteImageMutation.isPending}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600 truncate">
                                      {image.fileName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {(image.fileSize / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

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

                          <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                              onClick={handleUpdateFeedback}
                              disabled={updateFeedbackMutation.isPending}
                              size="sm"
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

          {filteredFeedbacks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {feedbacks && feedbacks.length > 0 
                ? `Nenhum feedback encontrado com status "${statusFilter === 'all' ? 'todos' : 
                    statusFilter === 'open' ? 'aberto' : 
                    statusFilter === 'in_progress' ? 'em andamento' : 
                    statusFilter === 'resolved' ? 'resolvido' : 'fechado'}".`
                : 'Nenhum feedback encontrado.'}
            </div>
          )}
        </CardContent>
      </Card>
          </div>
        </main>
      </div>
      
      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Visualizar Imagem</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="p-6 pt-0">
              <img
                src={selectedImage}
                alt="Imagem anexada"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedImage, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
                <Button onClick={() => setSelectedImage(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackManagement;