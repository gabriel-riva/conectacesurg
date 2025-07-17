import React, { useState } from 'react';
import { ChevronLeft, MessageCircle, Bug, Lightbulb, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

type FeedbackType = 'bug' | 'improvement' | 'general';

const feedbackTypes = [
  {
    id: 'bug' as FeedbackType,
    label: 'Relatar Bug',
    icon: Bug,
    description: 'Reportar um problema ou erro',
    color: 'text-red-500'
  },
  {
    id: 'improvement' as FeedbackType,
    label: 'Sugerir Melhoria',
    icon: Lightbulb,
    description: 'Propor uma melhoria ou nova funcionalidade',
    color: 'text-yellow-500'
  },
  {
    id: 'general' as FeedbackType,
    label: 'Feedback Geral',
    icon: Heart,
    description: 'Comentários gerais sobre o sistema',
    color: 'text-blue-500'
  }
];

export default function FeedbackPanel({ isOpen, onClose, user }: FeedbackPanelProps) {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleTypeSelect = (type: FeedbackType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !content.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: selectedType,
          content: content.trim(),
          isAnonymous: isAnonymous
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      toast({
        title: "Feedback enviado!",
        description: "Obrigado pelo seu feedback. Ele será analisado pela nossa equipe.",
        variant: "default"
      });

      // Reset form
      setContent('');
      setIsAnonymous(false);
      setStep('select');
      setSelectedType(null);
      onClose();

    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o feedback. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentType = feedbackTypes.find(type => type.id === selectedType);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                {step === 'form' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="p-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <h2 className="text-lg font-semibold">
                  {step === 'select' ? 'Feedback' : currentType?.label}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {step === 'select' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <p className="text-gray-600 mb-6">
                    Como podemos ajudá-lo hoje?
                  </p>
                  
                  {feedbackTypes.map((type) => (
                    <Card
                      key={type.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <type.icon className={`h-5 w-5 ${type.color} mt-1`} />
                          <div>
                            <h3 className="font-medium">{type.label}</h3>
                            <p className="text-sm text-gray-600">{type.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}

              {step === 'form' && currentType && (
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <currentType.icon className={`h-5 w-5 ${currentType.color}`} />
                    <span className="text-sm text-gray-700">{currentType.description}</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Descreva seu feedback *</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Conte-nos mais detalhes sobre seu feedback..."
                      className="min-h-[120px]"
                      required
                    />
                  </div>

                  {user && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                      />
                      <Label htmlFor="anonymous" className="text-sm">
                        Enviar anonimamente
                      </Label>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !content.trim()}
                      className="flex-1"
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </motion.form>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}