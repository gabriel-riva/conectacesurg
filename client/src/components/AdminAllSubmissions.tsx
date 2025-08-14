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
import { Eye, CheckCircle, XCircle, Clock, User, FileText, Download, Search, Filter, AlertCircle } from 'lucide-react';

interface Submission {
  id: number;
  challengeId: number;
  challengeTitle: string;
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

interface Challenge {
  id: number;
  title: string;
  type: string;
  evaluationType: string;
  isActive: boolean;
}

export const AdminAllSubmissions: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewPoints, setReviewPoints] = useState<number>(0);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [challengeFilter, setChallengeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedChallenges, setExpandedChallenges] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os desafios
  const { data: challenges = [], isLoading: challengesLoading } = useQuery<Challenge[]>({
    queryKey: ['/api/gamification/challenges'],
  });

  // Buscar todas as submissões de todos os desafios
  const { data: allSubmissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ['/api/gamification/all-submissions'],
    queryFn: async () => {
      // Buscar submissões de cada desafio que tem avaliação
      const challengesWithEval = challenges.filter(c => c.evaluationType !== 'none');
      const submissionsPromises = challengesWithEval.map(challenge => 
        apiRequest(`/api/gamification/challenges/${challenge.id}/submissions`)
          .then((submissions: any[]) => 
            submissions.map(sub => ({
              ...sub,
              challengeTitle: challenge.title,
              challengeId: challenge.id
            }))
          )
          .catch(() => [])
      );
      
      const allSubmissionsArrays = await Promise.all(submissionsPromises);
      return allSubmissionsArrays.flat();
    },
    enabled: challenges.length > 0,
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
        queryKey: ['/api/gamification/all-submissions']
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

  // Filtrar submissões baseado nos filtros globais
  const filteredSubmissions = useMemo(() => {
    if (!allSubmissions) return [];
    
    return allSubmissions.filter((submission: Submission) => {
      // Filtro de status
      if (statusFilter !== 'all' && submission.status !== statusFilter) return false;
      
      // Filtro de tipo
      if (typeFilter !== 'all' && submission.submissionType !== typeFilter) return false;
      
      // Filtro de desafio
      if (challengeFilter !== 'all' && submission.challengeId.toString() !== challengeFilter) return false;
      
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
  }, [allSubmissions, statusFilter, typeFilter, challengeFilter, searchTerm]);

  // Agrupar submissões por desafio
  const submissionsByChallenge = useMemo(() => {
    const grouped: Record<string, Submission[]> = {};
    filteredSubmissions.forEach((submission) => {
      const key = submission.challengeTitle;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(submission);
    });
    return grouped;
  }, [filteredSubmissions]);

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
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
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

  // Contadores para o resumo
  const totalPending = allSubmissions.filter(s => s.status === 'pending').length;
  const totalApproved = allSubmissions.filter(s => s.status === 'approved').length;
  const totalRejected = allSubmissions.filter(s => s.status === 'rejected').length;

  if (challengesLoading || submissionsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Submissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allSubmissions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalRejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros globais */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre as submissões de todos os desafios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
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
            
            <Select value={challengeFilter} onValueChange={setChallengeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os desafios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os desafios</SelectItem>
                {challenges.filter(c => c.evaluationType !== 'none').map(challenge => (
                  <SelectItem key={challenge.id} value={challenge.id.toString()}>
                    {challenge.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
          
          {totalPending > 0 && statusFilter !== 'pending' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-700">
                Você tem {totalPending} submissão(ões) pendente(s) aguardando revisão
              </span>
              <Button
                variant="link"
                size="sm"
                className="text-orange-700 ml-auto"
                onClick={() => setStatusFilter('pending')}
              >
                Ver pendentes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de submissões agrupadas por desafio */}
      {filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || challengeFilter !== 'all'
                ? 'Nenhuma submissão encontrada com os filtros aplicados'
                : 'Nenhuma submissão encontrada'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion 
          type="multiple" 
          value={expandedChallenges}
          onValueChange={setExpandedChallenges}
          className="w-full space-y-4"
        >
          {Object.entries(submissionsByChallenge).map(([challengeTitle, submissions]) => (
            <AccordionItem key={challengeTitle} value={challengeTitle} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{challengeTitle}</span>
                    <Badge variant="secondary" className="text-xs">
                      {submissions.length} submissão(ões)
                    </Badge>
                    {submissions.filter(s => s.status === 'pending').length > 0 && (
                      <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">
                        {submissions.filter(s => s.status === 'pending').length} pendente(s)
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
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
                    {submissions.map((submission: Submission) => (
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
                                  Submissão de {selectedSubmission?.userName} para o desafio {selectedSubmission?.challengeTitle}
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};