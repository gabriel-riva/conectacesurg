import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, FileText, Link, Upload, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RequirementReview {
  requirementId: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
}

interface Challenge {
  id: number;
  title: string;
  type: string;
  evaluationType: string;
  evaluationConfig?: any;
  isActive: boolean;
}

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

interface GranularSubmissionReviewProps {
  submission: Submission;
  challenge: Challenge;
  onReviewCompleted: () => void;
  onCancel: () => void;
}

export const GranularSubmissionReview: React.FC<GranularSubmissionReviewProps> = ({
  submission,
  challenge,
  onReviewCompleted,
  onCancel
}) => {
  const { toast } = useToast();
  
  // Extrair requisitos da configuração do desafio
  const fileRequirements = challenge.evaluationConfig?.file?.fileRequirements || [];
  
  // Inicializar estados de revisão para cada requisito
  const [requirementReviews, setRequirementReviews] = useState<RequirementReview[]>(() => {
    return fileRequirements.map((req: any) => ({
      requirementId: req.id,
      status: submission.submissionData?.requirementReviews?.find((r: any) => r.requirementId === req.id)?.status || 'pending',
      feedback: submission.submissionData?.requirementReviews?.find((r: any) => r.requirementId === req.id)?.feedback || ''
    }));
  });
  
  const [adminFeedback, setAdminFeedback] = useState(submission.adminFeedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateRequirementReview = (requirementId: string, updates: Partial<RequirementReview>) => {
    setRequirementReviews(prev => 
      prev.map(review => 
        review.requirementId === requirementId 
          ? { ...review, ...updates }
          : review
      )
    );
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    
    try {
      await apiRequest(`/api/gamification/submissions/${submission.id}/review-granular`, {
        method: 'PUT',
        body: JSON.stringify({
          requirementReviews,
          adminFeedback
        })
      });

      toast({
        title: "Sucesso",
        description: "Revisão granular salva com sucesso!"
      });

      onReviewCompleted();
    } catch (error) {
      console.error('Error submitting granular review:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar revisão granular",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular estatísticas da revisão
  const approvedCount = requirementReviews.filter(r => r.status === 'approved').length;
  const rejectedCount = requirementReviews.filter(r => r.status === 'rejected').length;
  const pendingCount = requirementReviews.filter(r => r.status === 'pending').length;
  
  // Calcular pontuação total baseada nas aprovações
  const totalPossiblePoints = fileRequirements.reduce((sum: number, req: any) => sum + req.points, 0);
  const earnedPoints = requirementReviews.reduce((sum: number, review) => {
    if (review.status === 'approved') {
      const requirement = fileRequirements.find((req: any) => req.id === review.requirementId);
      return sum + (requirement?.points || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Revisão Granular por Requisito</h3>
          <p className="text-sm text-gray-600">
            Revise cada requisito individualmente para pontuação precisa
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Pontuação</div>
            <div className="font-semibold">
              {earnedPoints} / {totalPossiblePoints} pontos
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas da revisão */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{fileRequirements.length}</div>
            <div className="text-sm text-gray-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-sm text-gray-500">Aprovados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <div className="text-sm text-gray-500">Rejeitados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{pendingCount}</div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Lista de requisitos para revisão */}
      <div className="space-y-4">
        {fileRequirements.map((requirement: any) => {
          const review = requirementReviews.find(r => r.requirementId === requirement.id);
          const submissionType = requirement.submissionType || 'file';
          
          // Buscar submissões para este requisito
          const requirementSubmissions = submission.submissionData?.file?.files?.filter(
            (file: any) => file.requirementId === requirement.id
          ) || [];

          return (
            <Card key={requirement.id} className={`border-l-4 ${
              review?.status === 'approved' ? 'border-l-green-500 bg-green-50' :
              review?.status === 'rejected' ? 'border-l-red-500 bg-red-50' :
              'border-l-gray-300'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {submissionType === 'link' ? (
                      <Link className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-purple-600" />
                    )}
                    <CardTitle className="text-sm font-semibold">
                      {requirement.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {requirement.points} pontos
                    </Badge>
                    <Badge variant={
                      review?.status === 'approved' ? 'default' :
                      review?.status === 'rejected' ? 'destructive' :
                      'secondary'
                    } className="text-xs">
                      {review?.status === 'approved' ? 'Aprovado' :
                       review?.status === 'rejected' ? 'Rejeitado' :
                       'Pendente'}
                    </Badge>
                  </div>
                </div>
                {requirement.description && (
                  <CardDescription className="text-xs">
                    {requirement.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Mostrar submissões */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    {submissionType === 'link' ? 'Links enviados:' : 'Arquivos enviados:'}
                  </Label>
                  {requirementSubmissions.length > 0 ? (
                    <div className="space-y-1">
                      {requirementSubmissions.map((item: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border">
                          {submissionType === 'link' ? (
                            <>
                              <Link className="w-3 h-3 text-blue-500" />
                              <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" 
                                 className="text-xs text-blue-600 hover:underline flex-1">
                                {item.linkUrl}
                              </a>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3 text-purple-500" />
                              <span className="text-xs flex-1">{item.filename}</span>
                              <span className="text-xs text-gray-500">
                                ({(item.size && typeof item.size === 'number' && item.size > 0) ? 
                                 (item.size / 1024 / 1024).toFixed(1) + 'MB' : 
                                 (item.fileSize && typeof item.fileSize === 'number' && item.fileSize > 0) ?
                                 (item.fileSize / 1024 / 1024).toFixed(1) + 'MB' : 
                                 'Arquivo disponível'})
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs text-gray-500">
                      <AlertCircle className="w-3 h-3" />
                      Nenhum {submissionType === 'link' ? 'link' : 'arquivo'} enviado para este requisito
                    </div>
                  )}
                </div>

                {/* Controles de revisão */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={review?.status === 'approved' ? 'default' : 'outline'}
                      onClick={() => updateRequirementReview(requirement.id, { status: 'approved' })}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Aprovar ({requirement.points}pts)
                    </Button>
                    <Button
                      size="sm"
                      variant={review?.status === 'rejected' ? 'destructive' : 'outline'}
                      onClick={() => updateRequirementReview(requirement.id, { status: 'rejected' })}
                      className="flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      Rejeitar
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor={`feedback-${requirement.id}`} className="text-xs">
                      Feedback específico (opcional):
                    </Label>
                    <Textarea
                      id={`feedback-${requirement.id}`}
                      placeholder="Comentários sobre este requisito..."
                      value={review?.feedback || ''}
                      onChange={(e) => updateRequirementReview(requirement.id, { feedback: e.target.value })}
                      className="text-xs mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Feedback geral */}
      <div className="space-y-2">
        <Label htmlFor="adminFeedback">Feedback Geral da Submissão</Label>
        <Textarea
          id="adminFeedback"
          placeholder="Comentários gerais sobre a submissão completa..."
          value={adminFeedback}
          onChange={(e) => setAdminFeedback(e.target.value)}
          rows={3}
        />
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmitReview}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Revisão Granular'}
          <span className="text-xs">({earnedPoints}/{totalPossiblePoints} pts)</span>
        </Button>
      </div>
    </div>
  );
};