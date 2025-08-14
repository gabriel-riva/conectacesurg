import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  Download, 
  ChevronDown, 
  ChevronRight,
  Filter,
  Search,
  Calendar
} from 'lucide-react';

interface Submission {
  id: number;
  challengeId: number;
  userId: number;
  submissionType: string;
  submissionData: any;
  status: string;
  points: number;
  adminFeedback?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  userPhotoUrl?: string;
  challengeTitle: string;
  challengeType: string;
  challengeEvaluationType: string;
}

interface GroupedSubmissions {
  challengeId: number;
  challengeTitle: string;
  challengeType: string;
  challengeEvaluationType: string;
  submissions: Submission[];
}

export const AdminSubmissionsOverview: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewPoints, setReviewPoints] = useState<number>(0);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [expandedChallenges, setExpandedChallenges] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: ['/api/gamification/submissions/all'],
    queryFn: () => apiRequest('/api/gamification/submissions/all'),
  }) as { data: Submission[], isLoading: boolean, error: any };

  const reviewMutation = useMutation({
    mutationFn: async (data: { submissionId: number; status: string; points: number; adminFeedback: string }) => {
      return apiRequest(`/api/gamification/submissions/${data.submissionId}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          status: data.status,
          points: data.points,
          adminFeedback: data.adminFeedback
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/gamification/submissions/all']
      });
      toast({
        title: "Sucesso",
        description: "Submissão revisada com sucesso!",
      });
      setSelectedSubmission(null);
      setReviewStatus('');
      setReviewPoints(0);
      setReviewFeedback('');
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao revisar submissão",
        variant: "destructive"
      });
    }
  });

  const handleReviewSubmit = () => {
    if (!selectedSubmission || !reviewStatus) return;

    reviewMutation.mutate({
      submissionId: selectedSubmission.id,
      status: reviewStatus,
      points: reviewPoints,
      adminFeedback: reviewFeedback
    });
  };

  const openReviewDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setReviewStatus(submission.status);
    setReviewPoints(submission.points);
    setReviewFeedback(submission.adminFeedback || '');
  };

  const toggleChallenge = (challengeId: number) => {
    const newExpanded = new Set(expandedChallenges);
    if (newExpanded.has(challengeId)) {
      newExpanded.delete(challengeId);
    } else {
      newExpanded.add(challengeId);
    }
    setExpandedChallenges(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-300"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubmissionTypeIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'quiz':
        return <CheckCircle className="w-4 h-4" />;
      case 'qrcode':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getSubmissionPreview = (submission: Submission): string => {
    const data = submission.submissionData;
    
    switch (submission.submissionType) {
      case 'quiz':
        return `Quiz: ${data.quiz?.score || 0}% (${data.quiz?.totalQuestions || 0} questões)`;
      case 'text':
        return `Texto: ${data.text?.content?.substring(0, 50) || 'Sem conteúdo'}...`;
      case 'file':
        return `${data.file?.files?.length || 0} arquivo(s) enviado(s)`;
      case 'qrcode':
        return `QR Code: ${data.qrcode?.scannedData?.substring(0, 30) || 'Sem dados'}...`;
      default:
        return 'Tipo não suportado';
    }
  };

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = Array.isArray(submissions) ? submissions : [];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(sub => sub.submissionType === typeFilter);
    }

    // Search filter
    if (searchFilter) {
      filtered = filtered.filter(sub => 
        sub.userName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        sub.userEmail.toLowerCase().includes(searchFilter.toLowerCase()) ||
        sub.challengeTitle.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(sub => new Date(sub.createdAt) >= startDate);
      }
    }

    return filtered;
  }, [submissions, statusFilter, typeFilter, searchFilter, dateFilter]);

  // Group submissions by challenge
  const groupedSubmissions: GroupedSubmissions[] = useMemo(() => {
    const groups: { [challengeId: number]: GroupedSubmissions } = {};
    
    filteredSubmissions.forEach(submission => {
      if (!groups[submission.challengeId]) {
        groups[submission.challengeId] = {
          challengeId: submission.challengeId,
          challengeTitle: submission.challengeTitle,
          challengeType: submission.challengeType,
          challengeEvaluationType: submission.challengeEvaluationType,
          submissions: []
        };
      }
      groups[submission.challengeId].submissions.push(submission);
    });

    return Object.values(groups).sort((a, b) => a.challengeTitle.localeCompare(b.challengeTitle));
  }, [filteredSubmissions]);

  const renderSubmissionDetailDialog = (submission: Submission) => {
    const data = submission.submissionData;
    
    switch (submission.submissionType) {
      case 'quiz':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium">Respostas do Quiz:</p>
            <div className="space-y-1">
              <p className="text-sm">Pontuação: {data.quiz?.score || 0}%</p>
              <p className="text-sm">Tentativa: {data.quiz?.attemptNumber || 1}</p>
              <p className="text-sm">Questões: {data.quiz?.totalQuestions || 0}</p>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium">Resposta em Texto:</p>
            <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
              {data.text?.content || 'Sem conteúdo'}
            </div>
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium">Arquivos enviados ({data.file?.files?.length || 0}):</p>
            <div className="space-y-2">
              {data.file?.files?.map((file: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">{file.fileName}</p>
                        {file.requirementId && (
                          <p className="text-xs text-gray-500">Requisito: {file.requirementId}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {((file.fileSize || 0) / 1024 / 1024).toFixed(1)}MB
                      </span>
                      {file.fileUrl && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!data.file?.files || data.file.files.length === 0) && (
                <p className="text-sm text-gray-500 italic">Nenhum arquivo enviado</p>
              )}
            </div>
          </div>
        );
      
      case 'qrcode':
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium">QR Code escaneado:</p>
            <div className="bg-gray-50 p-3 rounded text-sm">
              {data.qrcode?.scannedData || 'Sem dados'}
            </div>
          </div>
        );
      
      default:
        return <p className="text-sm text-gray-500">Tipo não suportado</p>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Erro ao carregar submissões
      </div>
    );
  }

  const totalSubmissions = filteredSubmissions.length;
  const pendingCount = filteredSubmissions.filter(s => s.status === 'pending').length;
  const approvedCount = filteredSubmissions.filter(s => s.status === 'approved').length;
  const rejectedCount = filteredSubmissions.filter(s => s.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Submissões de Desafios</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie todas as submissões organizadas por desafio
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{totalSubmissions} total</Badge>
          <Badge variant="outline" className="text-orange-600">{pendingCount} pendente</Badge>
          <Badge variant="default" className="bg-green-600">{approvedCount} aprovado</Badge>
          <Badge variant="destructive">{rejectedCount} rejeitado</Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Usuário, email ou desafio..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="file">Arquivo</SelectItem>
                  <SelectItem value="qrcode">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-filter">Período</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Submissions */}
      {groupedSubmissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhuma submissão encontrada com os filtros aplicados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedSubmissions.map((group) => (
            <Card key={group.challengeId}>
              <Collapsible
                open={expandedChallenges.has(group.challengeId)}
                onOpenChange={() => toggleChallenge(group.challengeId)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedChallenges.has(group.challengeId) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                        <div>
                          <CardTitle className="text-base">{group.challengeTitle}</CardTitle>
                          <CardDescription>
                            Tipo: {group.challengeType} • Avaliação: {group.challengeEvaluationType}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{group.submissions.length} submissões</Badge>
                        <Badge variant="outline" className="text-orange-600">
                          {group.submissions.filter(s => s.status === 'pending').length} pendente
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {group.submissions.map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              {submission.userPhotoUrl ? (
                                <img 
                                  src={submission.userPhotoUrl} 
                                  alt={submission.userName}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium truncate">{submission.userName}</p>
                                <span className="text-xs text-gray-500">{submission.userEmail}</span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                {getSubmissionTypeIcon(submission.submissionType)}
                                <p className="text-xs text-gray-600 truncate">
                                  {getSubmissionPreview(submission)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {format(new Date(submission.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                                </span>
                              </div>
                              
                              {getStatusBadge(submission.status)}
                              
                              <Badge variant="outline">{submission.points} pts</Badge>

                              {(submission.submissionType === 'text' || submission.submissionType === 'file') && submission.status === 'pending' ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openReviewDialog(submission)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Revisar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Revisar Submissão</DialogTitle>
                                      <DialogDescription>
                                        Revisar submissão de {selectedSubmission?.userName} para "{group.challengeTitle}"
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    {selectedSubmission && (
                                      <div className="space-y-4">
                                        <div className="border-b pb-4">
                                          {renderSubmissionDetailDialog(selectedSubmission)}
                                        </div>
                                        
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label htmlFor="status">Status</Label>
                                              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Selecione o status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="pending">Pendente</SelectItem>
                                                  <SelectItem value="approved">Aprovado</SelectItem>
                                                  <SelectItem value="rejected">Rejeitado</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            
                                            <div>
                                              <Label htmlFor="points">Pontos</Label>
                                              <Input
                                                id="points"
                                                type="number"
                                                value={reviewPoints}
                                                onChange={(e) => setReviewPoints(parseInt(e.target.value) || 0)}
                                                min="0"
                                              />
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <Label htmlFor="feedback">Feedback (opcional)</Label>
                                            <Textarea
                                              id="feedback"
                                              value={reviewFeedback}
                                              onChange={(e) => setReviewFeedback(e.target.value)}
                                              placeholder="Deixe um feedback para o usuário..."
                                            />
                                          </div>
                                          
                                          <div className="flex justify-end space-x-2">
                                            <Button
                                              variant="outline"
                                              onClick={() => setSelectedSubmission(null)}
                                            >
                                              Cancelar
                                            </Button>
                                            <Button
                                              onClick={handleReviewSubmit}
                                              disabled={reviewMutation.isPending}
                                            >
                                              {reviewMutation.isPending ? 'Salvando...' : 'Salvar Revisão'}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  {submission.status === 'approved' && (submission.submissionType === 'quiz' || submission.submissionType === 'qrcode') 
                                    ? 'Auto' 
                                    : submission.status === 'approved' 
                                      ? 'Revisado' 
                                      : submission.status === 'rejected'
                                        ? 'Rejeitado'
                                        : 'Aguardando'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};