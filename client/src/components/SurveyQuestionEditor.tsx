import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface QuestionOption {
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
}

export interface SurveyQuestion {
  id?: number;
  question: string;
  type: 'multiple_choice' | 'likert_scale' | 'text_free' | 'yes_no' | 'rating' | 'date' | 'email';
  order: number;
  isRequired: boolean;
  options: QuestionOption;
}

interface SurveyQuestionEditorProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}

export default function SurveyQuestionEditor({ questions, onChange }: SurveyQuestionEditorProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const questionTypes = [
    { value: 'multiple_choice', label: 'Múltipla Escolha' },
    { value: 'likert_scale', label: 'Escala Likert' },
    { value: 'text_free', label: 'Texto Livre' },
    { value: 'yes_no', label: 'Sim/Não' },
    { value: 'rating', label: 'Avaliação (Estrelas)' },
    { value: 'date', label: 'Data' },
    { value: 'email', label: 'Email' }
  ];

  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      question: '',
      type: 'multiple_choice',
      order: questions.length,
      isRequired: true,
      options: { choices: [''] }
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof SurveyQuestion, value: any) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    onChange(updated);
  };

  const updateQuestionOptions = (index: number, options: QuestionOption) => {
    const updated = [...questions];
    updated[index].options = options;
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    // Reorder remaining questions
    updated.forEach((q, i) => q.order = i);
    onChange(updated);
  };

  const addChoice = (questionIndex: number) => {
    const question = questions[questionIndex];
    const choices = question.options.choices || [];
    updateQuestionOptions(questionIndex, {
      ...question.options,
      choices: [...choices, '']
    });
  };

  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    const question = questions[questionIndex];
    const choices = [...(question.options.choices || [])];
    choices[choiceIndex] = value;
    updateQuestionOptions(questionIndex, {
      ...question.options,
      choices
    });
  };

  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    const question = questions[questionIndex];
    const choices = (question.options.choices || []).filter((_, i) => i !== choiceIndex);
    updateQuestionOptions(questionIndex, {
      ...question.options,
      choices
    });
  };

  const renderQuestionOptions = (question: SurveyQuestion, index: number) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            <Label>Opções de resposta</Label>
            {(question.options.choices || []).map((choice, choiceIndex) => (
              <div key={choiceIndex} className="flex items-center space-x-2">
                <Input
                  placeholder={`Opção ${choiceIndex + 1}`}
                  value={choice}
                  onChange={(e) => updateChoice(index, choiceIndex, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeChoice(index, choiceIndex)}
                  disabled={question.options.choices!.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addChoice(index)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Opção
            </Button>
          </div>
        );

      case 'likert_scale':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Mínimo</Label>
                <Input
                  type="number"
                  value={question.options.scale?.min || 1}
                  onChange={(e) => updateQuestionOptions(index, {
                    ...question.options,
                    scale: {
                      ...question.options.scale,
                      min: parseInt(e.target.value),
                      max: question.options.scale?.max || 5,
                      minLabel: question.options.scale?.minLabel || '',
                      maxLabel: question.options.scale?.maxLabel || ''
                    }
                  })}
                />
              </div>
              <div>
                <Label>Valor Máximo</Label>
                <Input
                  type="number"
                  value={question.options.scale?.max || 5}
                  onChange={(e) => updateQuestionOptions(index, {
                    ...question.options,
                    scale: {
                      ...question.options.scale,
                      min: question.options.scale?.min || 1,
                      max: parseInt(e.target.value),
                      minLabel: question.options.scale?.minLabel || '',
                      maxLabel: question.options.scale?.maxLabel || ''
                    }
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rótulo Mínimo</Label>
                <Input
                  placeholder="ex: Discordo totalmente"
                  value={question.options.scale?.minLabel || ''}
                  onChange={(e) => updateQuestionOptions(index, {
                    ...question.options,
                    scale: {
                      ...question.options.scale,
                      min: question.options.scale?.min || 1,
                      max: question.options.scale?.max || 5,
                      minLabel: e.target.value,
                      maxLabel: question.options.scale?.maxLabel || ''
                    }
                  })}
                />
              </div>
              <div>
                <Label>Rótulo Máximo</Label>
                <Input
                  placeholder="ex: Concordo totalmente"
                  value={question.options.scale?.maxLabel || ''}
                  onChange={(e) => updateQuestionOptions(index, {
                    ...question.options,
                    scale: {
                      ...question.options.scale,
                      min: question.options.scale?.min || 1,
                      max: question.options.scale?.max || 5,
                      minLabel: question.options.scale?.minLabel || '',
                      maxLabel: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 'text_free':
        return (
          <div className="space-y-4">
            <div>
              <Label>Placeholder</Label>
              <Input
                placeholder="Texto de exemplo para o usuário"
                value={question.options.textConfig?.placeholder || ''}
                onChange={(e) => updateQuestionOptions(index, {
                  ...question.options,
                  textConfig: {
                    ...question.options.textConfig,
                    placeholder: e.target.value
                  }
                })}
              />
            </div>
            <div>
              <Label>Limite de caracteres (opcional)</Label>
              <Input
                type="number"
                placeholder="Ex: 500"
                value={question.options.textConfig?.maxLength || ''}
                onChange={(e) => updateQuestionOptions(index, {
                  ...question.options,
                  textConfig: {
                    ...question.options.textConfig,
                    maxLength: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`multiline-${index}`}
                checked={question.options.textConfig?.multiline || false}
                onCheckedChange={(checked) => updateQuestionOptions(index, {
                  ...question.options,
                  textConfig: {
                    ...question.options.textConfig,
                    multiline: !!checked
                  }
                })}
              />
              <Label htmlFor={`multiline-${index}`}>Permitir múltiplas linhas</Label>
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-4">
            <div>
              <Label>Número de estrelas</Label>
              <Select
                value={question.options.scale?.max?.toString() || '5'}
                onValueChange={(value) => updateQuestionOptions(index, {
                  ...question.options,
                  scale: {
                    min: 1,
                    max: parseInt(value),
                    minLabel: '',
                    maxLabel: ''
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 estrelas</SelectItem>
                  <SelectItem value="5">5 estrelas</SelectItem>
                  <SelectItem value="10">10 estrelas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Perguntas da Pesquisa</h3>
        <Button type="button" onClick={addQuestion} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Pergunta
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Nenhuma pergunta adicionada. Clique em "Adicionar Pergunta" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        questions.map((question, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Pergunta {index + 1}</CardTitle>
                <div className="flex items-center space-x-2">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pergunta</Label>
                <Textarea
                  placeholder="Digite sua pergunta aqui..."
                  value={question.question}
                  onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                />
              </div>

              <div>
                <Label>Tipo de pergunta</Label>
                <Select
                  value={question.type}
                  onValueChange={(value: any) => {
                    updateQuestion(index, 'type', value);
                    // Reset options when type changes
                    let newOptions: QuestionOption = {};
                    if (value === 'multiple_choice') {
                      newOptions = { choices: [''] };
                    } else if (value === 'likert_scale' || value === 'rating') {
                      newOptions = { scale: { min: 1, max: 5, minLabel: '', maxLabel: '' } };
                    } else if (value === 'text_free') {
                      newOptions = { textConfig: { placeholder: '', multiline: false } };
                    }
                    updateQuestionOptions(index, newOptions);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {renderQuestionOptions(question, index)}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`required-${index}`}
                  checked={question.isRequired}
                  onCheckedChange={(checked) => updateQuestion(index, 'isRequired', !!checked)}
                />
                <Label htmlFor={`required-${index}`}>Pergunta obrigatória</Label>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}