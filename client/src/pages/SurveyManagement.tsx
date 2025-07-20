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

interface Survey {
  survey: {
    id: number;
    title: string;
    description: string;
    instructions?: string;
    isActive: boolean;
    allowMultipleResponses: boolean;
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
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar pesquisas
  const { data: surveys, isLoading } = useQuery({
    queryKey: ['/api/surveys'],
    enabled: true
  });

  // Buscar categorias de usuário
  const { data: userCategories } = useQuery({
    queryKey: ['/api/surveys/user-categories'],
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
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      instructions: formData.get('instructions'),
      isActive: formData.get('isActive') === 'on',
      allowMultipleResponses: formData.get('allowMultipleResponses') === 'on',
      targetUserCategories: formData.getAll('targetUserCategories').map(Number),
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null
    };

    await createSurveyMutation.mutateAsync(data);
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

  const SurveyForm = ({ survey, onSubmit }: { survey?: Survey; onSubmit: (formData: FormData) => Promise<void> }) => (
    <form>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input 
            id="title" 
            name="title" 
            defaultValue={survey?.survey.title}
            required 
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea 
            id="description" 
            name="description" 
            defaultValue={survey?.survey.description}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="instructions">Instruções</Label>
          <Textarea 
            id="instructions" 
            name="instructions" 
            defaultValue={survey?.survey.instructions}
            rows={2}
            placeholder="Instruções opcionais para os usuários"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="isActive" 
            name="isActive" 
            defaultChecked={survey?.survey.isActive}
          />
          <Label htmlFor="isActive">Pesquisa ativa</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="allowMultipleResponses" 
            name="allowMultipleResponses" 
            defaultChecked={survey?.survey.allowMultipleResponses}
          />
          <Label htmlFor="allowMultipleResponses">Permitir múltiplas respostas</Label>
        </div>

        <div>
          <Label>Público-alvo (categorias)</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(userCategories as UserCategory[])?.map((category: UserCategory) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`category-${category.id}`}
                  name="targetUserCategories"
                  value={category.id}
                  defaultChecked={survey?.survey.targetUserCategories.includes(category.id)}
                />
                <Label htmlFor={`category-${category.id}`} className="text-sm">
                  {category.name}
                </Label>
              </div>
            ))}
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => {
            setIsCreateDialogOpen(false);
            setEditingSurvey(null);
          }}>
            Cancelar
          </Button>
          <Button 
            type="button"
            onClick={async (e) => {
              const form = (e.target as HTMLElement).closest('form') as HTMLFormElement;
              const formData = new FormData(form);
              await onSubmit(formData);
            }}
          >
            {survey ? 'Atualizar' : 'Criar'} Pesquisa
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="container mx-auto p-6">
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
            <DialogContent className="max-w-2xl">
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
                  <Button size="sm" variant="default">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Análises
                  </Button>
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
  );
}