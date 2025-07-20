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
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Mostrar automaticamente o widget após carregar (apenas ícone)
  useEffect(() => {
    if (surveys && (surveys as Survey[])?.length > 0 && (settings as SurveyWidgetSettings)?.isEnabled) {
      const timer = setTimeout(() => {
        // Não expande automaticamente, apenas mostra o ícone
      }, (settings as SurveyWidgetSettings)?.autoShowDelay || 3000);
      
      return () => clearTimeout(timer);
    }
  }, [surveys, settings]);

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
          setIsExpanded(false);
          setShowThankYou(false);
          setCurrentSurveyIndex(0);
          setResponses({});
        }
      }, 3000);
    }
  });

  // Não precisamos mais de auto-show logic pois o ícone sempre fica visível

  const handleResponseChange = (questionId: number, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    const currentSurvey = (surveys as Survey[])?.[currentSurveyIndex];
    if (!currentSurvey) return;

    // Validar campos obrigatórios
    const requiredQuestions = (currentSurvey.questions || []).filter((q: SurveyQuestion) => q.isRequired);
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
  if (!(settings as SurveyWidgetSettings)?.isEnabled || !(surveys as Survey[])?.length) {
    return null;
  }

  const currentSurvey = (surveys as Survey[])[currentSurveyIndex];

  // Ícone flutuante pequeno (sempre visível quando há pesquisas)
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        {/* Tooltip */}
        <div className="absolute -top-12 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-90 pointer-events-none">
          Nova pesquisa disponível
        </div>
        
        {/* Ícone principal */}
        <div 
          onClick={() => setIsExpanded(true)}
          className="w-14 h-14 rounded-full cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center relative"
          style={{ backgroundColor: (settings as SurveyWidgetSettings)?.primaryColor || '#3B82F6' }}
        >
          {/* Ícone similar ao anexo - smiley com segmentos coloridos */}
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-full h-full">
              {/* Círculo base branco */}
              <circle cx="16" cy="16" r="14" fill="white"/>
              
              {/* Segmentos coloridos ao redor */}
              <path d="M 16 4 A 12 12 0 0 1 25.86 10" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 25.86 10 A 12 12 0 0 1 25.86 22" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M 25.86 22 A 12 12 0 0 1 16 28" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
              
              {/* Rosto sorridente */}
              <circle cx="13" cy="13" r="1.5" fill="#6B7280"/>
              <circle cx="19" cy="13" r="1.5" fill="#6B7280"/>
              <path d="M 12 19 Q 16 22 20 19" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          
          {/* Contador de pesquisas se houver mais de uma */}
          {(surveys as Survey[]).length > 1 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {(surveys as Survey[]).length}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modal expandido - tela cheia no mobile, card no desktop
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={() => setIsExpanded(false)}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
        <div className="w-full h-full md:w-auto md:h-auto md:max-w-2xl md:max-h-[90vh] bg-white rounded-none md:rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: (settings as SurveyWidgetSettings)?.primaryColor }}
              />
              <h2 className="text-lg font-semibold">
                {showThankYou ? 'Obrigado!' : currentSurvey?.survey.title}
              </h2>
              {(surveys as Survey[]).length > 1 && !showThankYou && (
                <Badge variant="secondary" className="text-xs">
                  {currentSurveyIndex + 1}/{(surveys as Survey[]).length}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {showThankYou ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Obrigado!</h3>
                <p className="text-gray-600">
                  Sua resposta foi enviada com sucesso!
                </p>
              </div>
            ) : currentSurvey ? (
              <div className="space-y-6">
                {currentSurvey.survey.description && (
                  <p className="text-gray-600 leading-relaxed">
                    {currentSurvey.survey.description}
                  </p>
                )}
                
                {currentSurvey.survey.instructions && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {currentSurvey.survey.instructions}
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  {(currentSurvey.questions || [])
                    .sort((a: SurveyQuestion, b: SurveyQuestion) => a.order - b.order)
                    .map((question: SurveyQuestion) => (
                      <div key={question.id} className="space-y-3">
                        <label className="block text-base font-medium text-gray-900">
                          {question.question}
                          {question.isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        {renderQuestion(question)}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
          
          {/* Footer com botões */}
          {!showThankYou && currentSurvey && (
            <div className="border-t bg-gray-50 p-4">
              <div className="flex space-x-3">
                {(surveys as Survey[]).length > 1 && currentSurveyIndex < (surveys as Survey[]).length - 1 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentSurveyIndex(prev => prev + 1);
                      setResponses({});
                    }}
                    className="flex-1"
                  >
                    Próxima Pesquisa
                  </Button>
                )}
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
          )}
        </div>
      </div>
    </>
  );
}