import { useState, useEffect } from "react";
import { X, MessageSquare, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SurveyQuestion {
  id: number;
  question: string;
  type: string;
  order: number;
  isRequired: boolean;
  options: {
    choices?: string[];
    scale?: {
      min: number;
      max: number;
      minLabel: string;
      maxLabel: string;
      step?: number;
    };
    textConfig?: {
      placeholder?: string;
      maxLength?: number;
      multiline?: boolean;
    };
  };
}

interface Survey {
  survey: {
    id: number;
    title: string;
    description: string;
    instructions?: string;
  };
  questions: SurveyQuestion[];
}

interface SurveyWidgetSettings {
  isEnabled: boolean;
  displayStyle: string;
  position: string;
  showCloseButton: boolean;
  autoShowDelay: number;
  primaryColor: string;
}

export default function SurveyWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSurveyIndex, setCurrentSurveyIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const queryClient = useQueryClient();

  // Buscar configurações do widget
  const { data: settings } = useQuery({
    queryKey: ['/api/surveys/public/widget/settings'],
    enabled: true
  });

  // Buscar pesquisas ativas
  const { data: surveys, isLoading } = useQuery({
    queryKey: ['/api/surveys/public/active'],
    enabled: true
  });

  // Mutation para submeter resposta
  const submitResponseMutation = useMutation({
    mutationFn: async (data: { surveyId: number; responses: Record<string, any>; isAnonymous: boolean }) => {
      return apiRequest(`/api/surveys/public/${data.surveyId}/respond`, {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      setShowThankYou(true);
      queryClient.invalidateQueries({ queryKey: ['/api/surveys/public/active'] });
      
      // Após 3 segundos, passar para próxima pesquisa ou esconder widget
      setTimeout(() => {
        if (currentSurveyIndex < ((surveys as Survey[])?.length || 0) - 1) {
          setCurrentSurveyIndex(prev => prev + 1);
          setResponses({});
          setShowThankYou(false);
        } else {
          setIsVisible(false);
          setShowThankYou(false);
          setCurrentSurveyIndex(0);
          setResponses({});
        }
      }, 3000);
    }
  });

  // Auto-show logic
  useEffect(() => {
    if (!(settings as SurveyWidgetSettings)?.isEnabled || !(surveys as Survey[])?.length || isLoading) return;
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, (settings as SurveyWidgetSettings)?.autoShowDelay || 3000);

    return () => clearTimeout(timer);
  }, [settings, surveys, isLoading]);

  const currentSurvey = (surveys as Survey[])?.[currentSurveyIndex];

  const handleResponseChange = (questionId: number, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!currentSurvey) return;

    // Validar campos obrigatórios
    const requiredQuestions = currentSurvey.questions.filter((q: SurveyQuestion) => q.isRequired);
    const missingResponses = requiredQuestions.filter((q: SurveyQuestion) => !responses[q.id]);
    
    if (missingResponses.length > 0) {
      alert('Por favor, responda todas as perguntas obrigatórias.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await submitResponseMutation.mutateAsync({
        surveyId: currentSurvey.survey.id,
        responses: responses,
        isAnonymous: false
      });
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      alert('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const questionValue = responses[question.id] || '';

    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options.choices?.map((choice, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={choice}
                  checked={questionValue === choice}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{choice}</span>
              </label>
            ))}
          </div>
        );

      case 'likert_scale':
        const scale = question.options.scale;
        if (!scale) return null;
        
        const scaleValues = [];
        for (let i = scale.min; i <= scale.max; i += (scale.step || 1)) {
          scaleValues.push(i);
        }

        return (
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{scale.minLabel}</span>
              <span>{scale.maxLabel}</span>
            </div>
            <div className="flex justify-between">
              {scaleValues.map((value) => (
                <label key={value} className="flex flex-col items-center cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={value}
                    checked={questionValue === value}
                    onChange={(e) => handleResponseChange(question.id, parseInt(e.target.value))}
                    className="w-4 h-4 text-blue-600 mb-1"
                  />
                  <span className="text-xs">{value}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'text_free':
        const textConfig = question.options.textConfig;
        return textConfig?.multiline ? (
          <textarea
            value={questionValue}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={textConfig.placeholder}
            maxLength={textConfig.maxLength}
            rows={3}
            className="w-full p-2 border border-gray-200 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <input
            type="text"
            value={questionValue}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder={textConfig?.placeholder}
            maxLength={textConfig?.maxLength}
            className="w-full p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'yes_no':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="yes"
                checked={questionValue === 'yes'}
                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">Sim</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="no"
                checked={questionValue === 'no'}
                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">Não</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  // Se não há pesquisas ou widget está desabilitado, não renderizar
  if (!(settings as SurveyWidgetSettings)?.isEnabled || !(surveys as Survey[])?.length || !isVisible) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div 
      className={`fixed z-50 ${positionClasses[(settings as SurveyWidgetSettings)?.position as keyof typeof positionClasses] || 'bottom-4 right-4'}`}
      style={{ maxWidth: '400px', width: '90vw' }}
    >
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare 
                className="w-5 h-5" 
                style={{ color: (settings as SurveyWidgetSettings)?.primaryColor }}
              />
              <CardTitle className="text-lg">
                {showThankYou ? 'Obrigado!' : currentSurvey?.survey.title}
              </CardTitle>
              {(surveys as Survey[])?.length > 1 && !showThankYou && (
                <Badge variant="secondary" className="text-xs">
                  {currentSurveyIndex + 1}/{(surveys as Survey[]).length}
                </Badge>
              )}
            </div>
            {(settings as SurveyWidgetSettings)?.showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {showThankYou ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Sua resposta foi enviada com sucesso!
              </p>
            </div>
          ) : currentSurvey ? (
            <div className="space-y-4">
              {currentSurvey.survey.description && (
                <p className="text-sm text-gray-600">
                  {currentSurvey.survey.description}
                </p>
              )}
              
              {currentSurvey.survey.instructions && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-xs text-blue-800">
                    {currentSurvey.survey.instructions}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {currentSurvey.questions
                  .sort((a: SurveyQuestion, b: SurveyQuestion) => a.order - b.order)
                  .map((question: SurveyQuestion) => (
                    <div key={question.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {question.question}
                        {question.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {renderQuestion(question)}
                    </div>
                  ))}
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                  style={{ backgroundColor: (settings as SurveyWidgetSettings)?.primaryColor }}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}