import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, BarChart3, Users, Settings, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import SurveyQuestionEditor, { SurveyQuestion } from '@/components/SurveyQuestionEditor';

// Componente para exibir detalhes da pesquisa
function SurveyDetailsDialog({ survey }: { survey: Survey }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['/api/surveys', survey.survey.id, 'questions'],
    enabled: isOpen
  });
  
  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['/api/surveys', survey.survey.id, 'responses'],
    enabled: isOpen
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <BarChart3 className="w-4 h-4 mr-2" />
          Análises
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{survey.survey.title}</DialogTitle>
          <DialogDescription>
            Perguntas e respostas da pesquisa
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Perguntas */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Perguntas ({survey.questionCount})</h3>
            {questionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(questions as any[])?.map((question: any, index: number) => (
                  <Card key={question.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {index + 1}. {question.question}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {question.type}
                        </Badge>
                        {question.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Obrigatória
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {question.options?.choices && (
                        <div className="text-sm text-gray-600">
                          <strong>Opções:</strong> {question.options.choices.join(', ')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Respostas */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Respostas ({survey.responseCount})</h3>
            {responsesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(responses as any[])?.map((response: any) => (
                  <Card key={response.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          {response.userName || 'Usuário Anônimo'}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {new Date(response.completedAt).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {Object.entries(response.responseData || {}).map(([questionId, answer]: [string, any]) => {
                          const question = (questions as any[])?.find(q => q.id === parseInt(questionId));
                          return (
                            <div key={questionId} className="text-sm">
                              <span className="font-medium">{question?.question}:</span>
                              <span className="ml-2 text-gray-600">{String(answer)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!(responses as any[])?.length && (
                  <p className="text-gray-500 text-center py-8">Nenhuma resposta ainda</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Survey {
  survey: {
    id: number;
    title: string;
    description: string;
    instructions?: string;
    isActive: boolean;
    allowMultipleResponses: boolean;
    allowAnonymousResponses?: boolean;
    targetUserCategories: number[];
    startDate?: string;
    endDate?: string;
    createdAt: string;
  };
  questionCount: number;
  responseCount: number;
}

interface UserCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
}

export default function SurveyManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar pesquisas
  const { data: surveys, isLoading } = useQuery({
    queryKey: ['/api/surveys'],
    enabled: true
  });

  // Buscar categorias de usuário
  const { data: userCategories } = useQuery({
    queryKey: ['/api/user-categories'],
    enabled: true
  });

  // Buscar configurações do widget
  const { data: widgetSettings } = useQuery({
    queryKey: ['/api/surveys/widget/settings'],
    enabled: true
  });

  // Mutation para criar pesquisa
  const createSurveyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/surveys', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Pesquisa criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar pesquisa", variant: "destructive" });
    }
  });

  // Mutation para atualizar pesquisa
  const updateSurveyMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest(`/api/surveys/${id}`, {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      setEditingSurvey(null);
      toast({ title: "Pesquisa atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar pesquisa", variant: "destructive" });
    }
  });

  // Mutation para deletar pesquisa
  const deleteSurveyMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/surveys/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
      toast({ title: "Pesquisa deletada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao deletar pesquisa", variant: "destructive" });
    }
  });

  // Mutation para atualizar configurações do widget
  const updateWidgetSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/surveys/widget/settings', {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys/widget/settings'] });
      toast({ title: "Configurações atualizadas com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar configurações", variant: "destructive" });
    }
  });

  const handleCreateSurvey = async (formData: FormData) => {
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      instructions: formData.get('instructions'),
      isActive: formData.get('isActive') === 'on',
      allowMultipleResponses: formData.get('allowMultipleResponses') === 'on',
      allowAnonymousResponses: formData.get('allowAnonymousResponses') === 'on',
      targetUserCategories: selectedCategories,
      startDate: startDate && startDate.trim() !== '' ? startDate : null,
      endDate: endDate && endDate.trim() !== '' ? endDate : null
    };

    // Create survey first
    const createdSurvey = await createSurveyMutation.mutateAsync(data);
    
    // Then create questions if any
    if (surveyQuestions.length > 0) {
      for (const question of surveyQuestions) {
        await apiRequest(`/api/surveys/${(createdSurvey as any).id}/questions`, {
          method: 'POST',
          body: {
            question: question.question,
            type: question.type,
            order: question.order,
            isRequired: question.isRequired,
            options: question.options
          }
        });
      }
    }
    
    // Reset questions after successful creation
    setSurveyQuestions([]);
  };

  const handleUpdateSurvey = async (formData: FormData) => {
    if (!editingSurvey) return;

    const data = {
      id: editingSurvey.survey.id,
      title: formData.get('title'),
      description: formData.get('description'),
      instructions: formData.get('instructions'),
      isActive: formData.get('isActive') === 'on',
      allowMultipleResponses: formData.get('allowMultipleResponses') === 'on',
      allowAnonymousResponses: formData.get('allowAnonymousResponses') === 'on',
      targetUserCategories: formData.getAll('targetUserCategories').map(Number),
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null
    };

    await updateSurveyMutation.mutateAsync(data);
  };

  const handleDeleteSurvey = async (id: number) => {
    if (confirm('Tem certeza que deseja deletar esta pesquisa?')) {
      await deleteSurveyMutation.mutateAsync(id);
    }
  };

  const SurveyForm = ({ survey, onSubmit }: { survey?: Survey; onSubmit: (formData: FormData) => Promise<void> }) => {
    const [formData, setFormData] = useState({
      title: survey?.survey.title || '',
      description: survey?.survey.description || '',
      instructions: survey?.survey.instructions || '',
      isActive: survey?.survey.isActive || false,
      allowMultipleResponses: survey?.survey.allowMultipleResponses || false,
      allowAnonymousResponses: survey?.survey.allowAnonymousResponses ?? true
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description);
      form.append('instructions', formData.instructions);
      if (formData.isActive) form.append('isActive', 'on');
      if (formData.allowMultipleResponses) form.append('allowMultipleResponses', 'on');
      if (formData.allowAnonymousResponses) form.append('allowAnonymousResponses', 'on');
      
      await onSubmit(form);
    };

    return (
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input 
              id="title" 
              name="title" 
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required 
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instruções</Label>
            <Textarea 
              id="instructions" 
              name="instructions" 
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={2}
              placeholder="Instruções opcionais para os usuários"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isActive" 
              name="isActive" 
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
            />
            <Label htmlFor="isActive">Pesquisa ativa</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="allowMultipleResponses" 
              name="allowMultipleResponses" 
              checked={formData.allowMultipleResponses}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowMultipleResponses: !!checked }))}
            />
            <Label htmlFor="allowMultipleResponses">Permitir múltiplas respostas</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="allowAnonymousResponses" 
              name="allowAnonymousResponses" 
              checked={formData.allowAnonymousResponses}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowAnonymousResponses: !!checked }))}
            />
            <Label htmlFor="allowAnonymousResponses">Permitir respostas anônimas</Label>
          </div>

        <div>
          <Label>Público-alvo (categorias)</Label>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsCategoryDialogOpen(true)}
            >
              <span>
                {selectedCategories.length > 0 
                  ? `${selectedCategories.length} categoria(s) selecionada(s)`
                  : 'Selecionar categorias (opcional)'
                }
              </span>
              <Settings className="w-4 h-4" />
            </Button>
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map(categoryId => {
                  const category = (userCategories as UserCategory[])?.find((c: UserCategory) => c.id === categoryId);
                  return category ? (
                    <span 
                      key={categoryId}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                      style={{ 
                        backgroundColor: category.color + '20', 
                        color: category.color,
                        border: `1px solid ${category.color}40`
                      }}
                    >
                      {category.name}
                      <button
                        type="button"
                        onClick={() => setSelectedCategories(prev => prev.filter(id => id !== categoryId))}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Se nenhuma categoria for selecionada, a pesquisa será exibida para todos os usuários
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Data de início</Label>
            <Input 
              id="startDate" 
              name="startDate" 
              type="datetime-local"
              defaultValue={survey?.survey.startDate ? new Date(survey.survey.startDate).toISOString().slice(0, 16) : ''}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Data de término</Label>
            <Input 
              id="endDate" 
              name="endDate" 
              type="datetime-local"
              defaultValue={survey?.survey.endDate ? new Date(survey.survey.endDate).toISOString().slice(0, 16) : ''}
            />
          </div>
        </div>

        <SurveyQuestionEditor 
          questions={surveyQuestions}
          onChange={setSurveyQuestions}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => {
            setIsCreateDialogOpen(false);
            setEditingSurvey(null);
            setSurveyQuestions([]);
            setSelectedCategories([]);
          }}>
            Cancelar
          </Button>
          <Button type="submit">
            {survey ? 'Atualizar' : 'Criar'} Pesquisa
          </Button>
        </div>
        </div>
      </form>
    );
  };

  const CategorySelectionDialog = () => (
    <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Categorias de Usuário</DialogTitle>
          <DialogDescription>
            Escolha as categorias de usuários que poderão ver esta pesquisa
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {(userCategories as UserCategory[])?.map((category: UserCategory) => (
            <div key={category.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <Checkbox 
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedCategories(prev => [...prev, category.id]);
                  } else {
                    setSelectedCategories(prev => prev.filter(id => id !== category.id));
                  }
                }}
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`category-${category.id}`} 
                  className="font-medium cursor-pointer"
                  style={{ color: category.color || '#000' }}
                >
                  {category.name}
                </Label>
                {category.description && (
                  <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-gray-600">
            {selectedCategories.length} categoria(s) selecionada(s)
          </p>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setSelectedCategories([])}>
              Limpar Todas
            </Button>
            <Button onClick={() => setIsCategoryDialogOpen(false)}>
              Confirmar Seleção
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Gerenciamento de Pesquisas</h1>
              <p className="text-gray-600">Crie e gerencie pesquisas de opinião para os usuários</p>
            </div>
            <div className="flex space-x-2">
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configurações do Widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações do Widget</DialogTitle>
                <DialogDescription>
                  Configure como o widget de pesquisas será exibido
                </DialogDescription>
              </DialogHeader>
              {/* Widget settings form would go here */}
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Pesquisa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Pesquisa</DialogTitle>
                <DialogDescription>
                  Crie uma nova pesquisa de opinião para os usuários
                </DialogDescription>
              </DialogHeader>
              <SurveyForm onSubmit={handleCreateSurvey} />
            </DialogContent>
          </Dialog>
            </div>
          </div>

          <CategorySelectionDialog />

          {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(surveys as Survey[])?.map((survey: Survey) => (
            <Card key={survey.survey.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{survey.survey.title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant={survey.survey.isActive ? "default" : "secondary"}>
                        {survey.survey.isActive ? (
                          <><Eye className="w-3 h-3 mr-1" /> Ativa</>
                        ) : (
                          <><EyeOff className="w-3 h-3 mr-1" /> Inativa</>
                        )}
                      </Badge>
                      {survey.survey.allowMultipleResponses && (
                        <Badge variant="outline">Múltiplas respostas</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {survey.survey.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {survey.survey.description}
                  </p>
                )}
                
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {survey.questionCount} pergunta{survey.questionCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    {survey.responseCount} resposta{survey.responseCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditingSurvey(survey)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteSurvey(survey.survey.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <SurveyDetailsDialog survey={survey} />
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
          )}

          {/* Edit Survey Dialog */}
      <Dialog open={!!editingSurvey} onOpenChange={() => setEditingSurvey(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Pesquisa</DialogTitle>
            <DialogDescription>
              Atualize as informações da pesquisa
            </DialogDescription>
          </DialogHeader>
          {editingSurvey && (
            <SurveyForm survey={editingSurvey} onSubmit={handleUpdateSurvey} />
          )}
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}