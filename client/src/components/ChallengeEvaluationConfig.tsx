import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, QrCode, FileText, Brain } from 'lucide-react';
import QRCode from 'qrcode';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface FileRequirement {
  id: string;
  name: string;
  description: string;
  points: number;
  acceptedTypes: string[];
  maxSize: number;
}

interface EvaluationConfig {
  quiz?: {
    questions: QuizQuestion[];
    minScore: number;
    allowMultipleAttempts: boolean;
    maxAttempts: number;
    scoreReductionPerAttempt: number;
  };
  text?: {
    placeholder: string;
    maxLength: number;
  };
  file?: {
    fileRequirements: FileRequirement[];
    maxFiles: number;
  };
  qrcode?: {
    qrCodeData: string;
    qrCodeImage: string;
    instructions: string;
  };
}

interface ChallengeEvaluationConfigProps {
  evaluationType: 'none' | 'quiz' | 'text' | 'file' | 'qrcode';
  evaluationConfig: EvaluationConfig;
  onEvaluationTypeChange: (type: 'none' | 'quiz' | 'text' | 'file' | 'qrcode') => void;
  onConfigChange: (config: EvaluationConfig) => void;
}

export const ChallengeEvaluationConfig: React.FC<ChallengeEvaluationConfigProps> = ({
  evaluationType,
  evaluationConfig,
  onEvaluationTypeChange,
  onConfigChange
}) => {
  const [config, setConfig] = useState<EvaluationConfig>(evaluationConfig);
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const generateQRCode = async (data: string) => {
    try {
      const qrDataURL = await QRCode.toDataURL(data, { 
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodePreview(qrDataURL);
      setConfig(prev => ({
        ...prev,
        qrcode: {
          ...prev.qrcode,
          qrCodeData: data,
          qrCodeImage: qrDataURL
        }
      }));
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o QR Code",
        variant: "destructive"
      });
    }
  };

  const addQuizQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    };

    setConfig(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: [...(prev.quiz?.questions || []), newQuestion],
        minScore: prev.quiz?.minScore || 70,
        allowMultipleAttempts: prev.quiz?.allowMultipleAttempts || false,
        maxAttempts: prev.quiz?.maxAttempts || 1,
        scoreReductionPerAttempt: prev.quiz?.scoreReductionPerAttempt || 0
      }
    }));
  };

  const updateQuizQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setConfig(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: prev.quiz?.questions?.map(q => 
          q.id === questionId ? { ...q, ...updates } : q
        ) || []
      }
    }));
  };

  const removeQuizQuestion = (questionId: string) => {
    setConfig(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: prev.quiz?.questions?.filter(q => q.id !== questionId) || []
      }
    }));
  };

  const addFileRequirement = () => {
    const newRequirement: FileRequirement = {
      id: Date.now().toString(),
      name: '',
      description: '',
      points: 10,
      acceptedTypes: ['pdf'],
      maxSize: 5 * 1024 * 1024 // 5MB
    };

    setConfig(prev => ({
      ...prev,
      file: {
        ...prev.file,
        fileRequirements: [...(prev.file?.fileRequirements || []), newRequirement],
        maxFiles: prev.file?.maxFiles || 5
      }
    }));
  };

  const removeFileRequirement = (requirementId: string) => {
    setConfig(prev => ({
      ...prev,
      file: {
        ...prev.file,
        fileRequirements: prev.file?.fileRequirements?.filter(req => req.id !== requirementId) || []
      }
    }));
  };

  const updateFileRequirement = (requirementId: string, updates: Partial<FileRequirement>) => {
    setConfig(prev => ({
      ...prev,
      file: {
        ...prev.file,
        fileRequirements: prev.file?.fileRequirements?.map(req =>
          req.id === requirementId ? { ...req, ...updates } : req
        ) || []
      }
    }));
  };

  const updateQuizOption = (questionId: string, optionIndex: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: prev.quiz?.questions?.map(q => 
          q.id === questionId 
            ? { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) }
            : q
        ) || []
      }
    }));
  };

  const renderConfigForm = () => {
    switch (evaluationType) {
      case 'none':
        return (
          <div className="text-center text-gray-500 py-8">
            Selecione um tipo de avaliação para configurar
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Configuração do Quiz</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minScore">Pontuação Mínima (%)</Label>
                <Input
                  id="minScore"
                  type="number"
                  min="0"
                  max="100"
                  value={config.quiz?.minScore || 70}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    quiz: { ...prev.quiz, minScore: parseInt(e.target.value) || 70 }
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="maxAttempts">Máximo de Tentativas</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min="1"
                  max="10"
                  value={config.quiz?.maxAttempts || 1}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    quiz: { ...prev.quiz, maxAttempts: parseInt(e.target.value) || 1 }
                  }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allowMultipleAttempts"
                  checked={config.quiz?.allowMultipleAttempts || false}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    quiz: { ...prev.quiz, allowMultipleAttempts: checked }
                  }))}
                />
                <Label htmlFor="allowMultipleAttempts">Permitir Múltiplas Tentativas</Label>
              </div>

              <div>
                <Label htmlFor="scoreReduction">Redução de Pontos por Tentativa (%)</Label>
                <Input
                  id="scoreReduction"
                  type="number"
                  min="0"
                  max="100"
                  value={config.quiz?.scoreReductionPerAttempt || 0}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    quiz: { ...prev.quiz, scoreReductionPerAttempt: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold">Questões</h4>
                <Button type="button" onClick={addQuizQuestion} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Questão
                </Button>
              </div>

              {config.quiz?.questions?.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Questão {index + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuizQuestion(question.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`question-${question.id}`}>Pergunta</Label>
                        <Textarea
                          id={`question-${question.id}`}
                          value={question.question}
                          onChange={(e) => updateQuizQuestion(question.id, { question: e.target.value })}
                          placeholder="Digite a pergunta..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Opções de Resposta</Label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <Input
                              value={option}
                              onChange={(e) => updateQuizOption(question.id, optionIndex, e.target.value)}
                              placeholder={`Opção ${optionIndex + 1}`}
                            />
                            <Button
                              type="button"
                              variant={question.correctAnswer === optionIndex ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateQuizQuestion(question.id, { correctAnswer: optionIndex })}
                            >
                              {question.correctAnswer === optionIndex ? "Correta" : "Marcar"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Configuração de Texto</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="placeholder">Texto de Orientação</Label>
                <Textarea
                  id="placeholder"
                  value={config.text?.placeholder || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    text: { ...prev.text, placeholder: e.target.value }
                  }))}
                  placeholder="Digite as instruções para o usuário..."
                />
              </div>

              <div>
                <Label htmlFor="maxLength">Limite de Caracteres</Label>
                <Input
                  id="maxLength"
                  type="number"
                  min="100"
                  max="10000"
                  value={config.text?.maxLength || 1000}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    text: { ...prev.text, maxLength: parseInt(e.target.value) || 1000 }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Configuração de Arquivos</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="maxFiles">Máximo Total de Arquivos</Label>
                <Input
                  id="maxFiles"
                  type="number"
                  min="1"
                  max="20"
                  value={config.file?.maxFiles || 5}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    file: { ...prev.file, maxFiles: parseInt(e.target.value) || 5 }
                  }))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Limite total de arquivos que podem ser enviados em todas as categorias
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold">Requisitos de Arquivo</h4>
                  <Button type="button" onClick={addFileRequirement} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Requisito
                  </Button>
                </div>

                {config.file?.fileRequirements?.map((requirement, index) => (
                  <Card key={requirement.id} className="border-l-4 border-l-purple-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Requisito {index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFileRequirement(requirement.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`name-${requirement.id}`}>Nome do Requisito</Label>
                            <Input
                              id={`name-${requirement.id}`}
                              value={requirement.name}
                              onChange={(e) => updateFileRequirement(requirement.id, { name: e.target.value })}
                              placeholder="Ex: Relatório Final"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`points-${requirement.id}`}>Pontos</Label>
                            <Input
                              id={`points-${requirement.id}`}
                              type="number"
                              min="0"
                              max="100"
                              value={requirement.points}
                              onChange={(e) => updateFileRequirement(requirement.id, { points: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`description-${requirement.id}`}>Descrição</Label>
                          <Textarea
                            id={`description-${requirement.id}`}
                            value={requirement.description}
                            onChange={(e) => updateFileRequirement(requirement.id, { description: e.target.value })}
                            placeholder="Descreva o que deve ser enviado..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`types-${requirement.id}`}>Tipos Permitidos</Label>
                            <Input
                              id={`types-${requirement.id}`}
                              value={requirement.acceptedTypes.join(', ')}
                              onChange={(e) => updateFileRequirement(requirement.id, { 
                                acceptedTypes: e.target.value.split(',').map(type => type.trim()).filter(Boolean)
                              })}
                              placeholder="pdf, doc, docx, jpg, png"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Separe por vírgula
                            </p>
                          </div>
                          <div>
                            <Label htmlFor={`size-${requirement.id}`}>Tamanho Máximo (MB)</Label>
                            <Input
                              id={`size-${requirement.id}`}
                              type="number"
                              min="1"
                              max="100"
                              value={Math.round(requirement.maxSize / 1024 / 1024)}
                              onChange={(e) => updateFileRequirement(requirement.id, { 
                                maxSize: (parseInt(e.target.value) || 5) * 1024 * 1024 
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!config.file?.fileRequirements || config.file.fileRequirements.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum requisito de arquivo configurado</p>
                    <p className="text-sm text-gray-400">Clique em "Adicionar Requisito" para começar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'qrcode':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Configuração do QR Code</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="qrData">Dados do QR Code</Label>
                <Textarea
                  id="qrData"
                  value={config.qrcode?.qrCodeData || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfig(prev => ({
                      ...prev,
                      qrcode: { ...prev.qrcode, qrCodeData: value }
                    }));
                    if (value.trim()) {
                      generateQRCode(value);
                    }
                  }}
                  placeholder="Digite o texto ou URL que será codificado no QR Code..."
                />
              </div>

              <div>
                <Label htmlFor="qrInstructions">Instruções para o Usuário</Label>
                <Textarea
                  id="qrInstructions"
                  value={config.qrcode?.instructions || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    qrcode: { ...prev.qrcode, instructions: e.target.value }
                  }))}
                  placeholder="Explique onde encontrar ou como usar este QR Code..."
                />
              </div>

              {qrCodePreview && (
                <div className="text-center">
                  <Label>Prévia do QR Code</Label>
                  <div className="mt-2">
                    <img 
                      src={qrCodePreview} 
                      alt="QR Code Preview" 
                      className="mx-auto border rounded"
                    />
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = qrCodePreview;
                        link.download = `qrcode-${Date.now()}.png`;
                        link.click();
                      }}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Salvar QR Code
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Avaliação</CardTitle>
        <CardDescription>
          Configure como os usuários serão avaliados neste desafio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label htmlFor="evaluationType">Tipo de Avaliação</Label>
            <Select value={evaluationType} onValueChange={onEvaluationTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma avaliação</SelectItem>
                <SelectItem value="quiz">Quiz (Múltipla escolha)</SelectItem>
                <SelectItem value="text">Resposta em texto</SelectItem>
                <SelectItem value="file">Upload de arquivo</SelectItem>
                <SelectItem value="qrcode">Escaneamento de QR Code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {evaluationType !== 'none' && (
            <>
              <Separator />
              {renderConfigForm()}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};