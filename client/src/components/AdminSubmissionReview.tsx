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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { Eye, CheckCircle, XCircle, Clock, User, FileText, Download, Play, ChevronDown, Filter, Search } from 'lucide-react';

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
}

interface AdminSubmissionReviewProps {
  challengeId: number;
  challengeTitle: string;
}

export const AdminSubmissionReview: React.FC<AdminSubmissionReviewProps> = ({
  challengeId,
  challengeTitle
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewPoints, setReviewPoints] = useState<number>(0);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading, error } = useQuery<Submission[]>({
    queryKey: ['/api/gamification/challenges', challengeId, 'submissions'],
    queryFn: () => apiRequest(`/api/gamification/challenges/${challengeId}/submissions`),
  });

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
        queryKey: ['/api/gamification/challenges', challengeId, 'submissions']
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
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

  // Filtrar submissões baseado nos filtros
  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    
    return submissions.filter((submission: Submission) => {
      // Filtro de status
      if (statusFilter !== 'all' && submission.status !== statusFilter) return false;
      
      // Filtro de tipo
      if (typeFilter !== 'all' && submission.submissionType !== typeFilter) return false;
      
      // Filtro de busca (nome ou email)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!submission.userName.toLowerCase().includes(search) && 
            !submission.userEmail.toLowerCase().includes(search)) {
          return false;
        }
      }
      
      return true;
    });
  }, [submissions, statusFilter, typeFilter, searchTerm]);

  const getSubmissionTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz':
        return <Badge variant="secondary" className="text-xs">Quiz</Badge>;
      case 'text':
        return <Badge variant="secondary" className="text-xs">Texto</Badge>;
      case 'file':
        return <Badge variant="secondary" className="text-xs">Arquivo</Badge>;
      case 'qrcode':
        return <Badge variant="secondary" className="text-xs">QR Code</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{type}</Badge>;
    }
  };

  const getSubmissionSummary = (submission: Submission) => {
    const data = submission.submissionData;
    
    switch (submission.submissionType) {
      case 'quiz':
        return `Pontuação: ${data.quiz?.score || 0}% - ${data.quiz?.totalQuestions || 0} questões`;
      case 'text':
        const text = data.text?.content || '';
        return text.length > 50 ? text.substring(0, 50) + '...' : text || 'Sem conteúdo';
      case 'file':
        const fileCount = data.file?.files?.length || 0;
        return `${fileCount} arquivo(s) enviado(s)`;
      case 'qrcode':
        return data.qrcode?.scannedData || 'QR Code escaneado';
      default:
        return 'Submissão';
    }
  };

  const renderSubmissionPreview = (submission: Submission) => {
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

  return (
    <div className="space-y-4">
      {/* Cabeçalho com título e contadores */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{challengeTitle}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filteredSubmissions.length} submissões</Badge>
          {filteredSubmissions.filter(s => s.status === 'pending').length > 0 && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              {filteredSubmissions.filter(s => s.status === 'pending').length} pendentes
            </Badge>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
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
      </Card>

      {/* Lista de submissões */}
      {filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Nenhuma submissão encontrada com os filtros aplicados'
                : 'Nenhuma submissão encontrada para este desafio'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Usuário</TableHead>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[80px]">Pontos</TableHead>
                <TableHead className="w-[150px]">Data</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission: Submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {submission.userPhotoUrl ? (
                        <img 
                          src={submission.userPhotoUrl} 
                          alt={submission.userName}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium">{submission.userName}</div>
                        <div className="text-xs text-gray-500">{submission.userEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSubmissionTypeBadge(submission.submissionType)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {getSubmissionSummary(submission)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(submission.status)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {submission.points} pts
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-500">
                      {format(new Date(submission.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openReviewDialog(submission)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Detalhes da Submissão</DialogTitle>
                          <DialogDescription>
                            Submissão de {selectedSubmission?.userName} para o desafio {challengeTitle}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedSubmission && (
                          <div className="space-y-4">
                            {/* Informações do usuário */}
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              {selectedSubmission.userPhotoUrl ? (
                                <img 
                                  src={selectedSubmission.userPhotoUrl} 
                                  alt={selectedSubmission.userName}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{selectedSubmission.userName}</p>
                                <p className="text-sm text-gray-500">{selectedSubmission.userEmail}</p>
                              </div>
                            </div>

                            {/* Detalhes da submissão */}
                            <div className="border rounded-lg p-4">
                              {renderSubmissionPreview(selectedSubmission)}
                            </div>

                            {/* Informações de tempo */}
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>
                                Enviado: {format(new Date(selectedSubmission.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                              {selectedSubmission.reviewedAt && (
                                <span>
                                  Revisado: {format(new Date(selectedSubmission.reviewedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </span>
                              )}
                            </div>

                            {/* Feedback existente */}
                            {selectedSubmission.adminFeedback && (
                              <div className="bg-blue-50 p-3 rounded">
                                <p className="text-sm font-medium text-blue-800">Feedback do Admin:</p>
                                <p className="text-sm text-blue-700">{selectedSubmission.adminFeedback}</p>
                              </div>
                            )}

                            {/* Formulário de revisão (apenas para submissões pendentes que precisam revisão manual) */}
                            {(selectedSubmission.submissionType === 'text' || selectedSubmission.submissionType === 'file') && 
                             selectedSubmission.status === 'pending' && (
                              <div className="border-t pt-4 space-y-4">
                                <h4 className="font-medium">Revisar Submissão</h4>
                                
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
                                    rows={3}
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
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};