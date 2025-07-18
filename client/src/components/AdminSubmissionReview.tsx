import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { Eye, CheckCircle, XCircle, Clock, User, FileText, Download, Play } from 'lucide-react';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading, error } = useQuery({
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
            <p className="text-sm font-medium">Arquivos enviados:</p>
            <div className="space-y-1">
              {data.file?.files?.map((file: any, index: number) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{file.name}</span>
                  <Button size="sm" variant="ghost">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              ))}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Submissões - {challengeTitle}</h2>
        <Badge variant="secondary">{submissions.length} submissões</Badge>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Nenhuma submissão encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission: Submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
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
                    <div>
                      <CardTitle className="text-sm">{submission.userName}</CardTitle>
                      <CardDescription className="text-xs">{submission.userEmail}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(submission.status)}
                    <Badge variant="outline">{submission.points} pts</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {renderSubmissionPreview(submission)}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Enviado em {format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                    {submission.reviewedAt && (
                      <span>
                        Revisado em {format(new Date(submission.reviewedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </div>

                  {submission.adminFeedback && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm font-medium text-blue-800">Feedback do Admin:</p>
                      <p className="text-sm text-blue-700">{submission.adminFeedback}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openReviewDialog(submission)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Revisar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Revisar Submissão</DialogTitle>
                          <DialogDescription>
                            Revisar submissão de {selectedSubmission?.userName}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedSubmission && (
                          <div className="space-y-4">
                            <div className="border-b pb-4">
                              {renderSubmissionPreview(selectedSubmission)}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};