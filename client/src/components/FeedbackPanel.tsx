import React, { useState, useRef } from 'react';
import { ChevronLeft, MessageCircle, Bug, Lightbulb, Heart, X, Camera, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';

interface FeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

type FeedbackType = 'bug' | 'improvement' | 'general';

interface AttachmentImage {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isScreenshot: boolean;
  preview?: string;
}

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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentImage[]>([]);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleTypeSelect = (type: FeedbackType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedType(null);
  };

  const handleScreenshot = async () => {
    setIsCapturingScreenshot(true);
    try {
      // Capture screenshot using ignoreElements to skip feedback panel
      const canvas = await html2canvas(document.body, {
        height: window.innerHeight,
        width: window.innerWidth,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          // Ignore feedback panel and any feedback-related elements
          return element.id === 'feedback-panel' || 
                 element.className?.includes?.('feedback') || 
                 element.getAttribute?.('data-feedback') === 'true' ||
                 element.closest?.('#feedback-panel') !== null ||
                 element.closest?.('[data-feedback="true"]') !== null;
        }
      });
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `screenshot-${Date.now()}.png`;
          const previewUrl = URL.createObjectURL(blob);
          
          const newAttachment: AttachmentImage = {
            id: Date.now().toString(),
            fileName,
            fileUrl: '', // Will be set after upload
            fileSize: blob.size,
            mimeType: 'image/png',
            isScreenshot: true,
            preview: previewUrl,
          };
          
          setAttachments(prev => [...prev, newAttachment]);
          
          toast({
            title: "Screenshot capturada!",
            description: "A captura de tela foi adicionada ao seu feedback.",
            variant: "default"
          });
        }
        setIsCapturingScreenshot(false);
      }, 'image/png');
      
    } catch (error) {
      console.error('Erro ao capturar screenshot:', error);
      toast({
        title: "Erro",
        description: "Não foi possível capturar a tela. Tente novamente.",
        variant: "destructive"
      });
      setIsCapturingScreenshot(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive"
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Arquivo muito grande",
          description: "Por favor, selecione uma imagem menor que 5MB.",
          variant: "destructive"
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      
      const newAttachment: AttachmentImage = {
        id: Date.now().toString() + Math.random().toString(),
        fileName: file.name,
        fileUrl: '', // Will be set after upload
        fileSize: file.size,
        mimeType: file.type,
        isScreenshot: false,
        preview: previewUrl,
      };
      
      setAttachments(prev => [...prev, newAttachment]);
    });

    // Reset input
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const uploadAttachments = async (): Promise<AttachmentImage[]> => {
    const uploadPromises = attachments.map(async (attachment) => {
      if (attachment.fileUrl) return attachment; // Already uploaded

      try {
        // Convert preview URL to blob if it's a screenshot
        let blob: Blob;
        if (attachment.preview) {
          const response = await fetch(attachment.preview);
          blob = await response.blob();
        } else {
          throw new Error('No preview available');
        }

        // Create form data for upload
        const formData = new FormData();
        formData.append('file', blob, attachment.fileName);

        // Upload to server
        const uploadResponse = await fetch('/api/feedback/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        const uploadResult = await uploadResponse.json();
        
        return {
          ...attachment,
          fileUrl: uploadResult.url,
        };
      } catch (error) {
        console.error('Error uploading attachment:', error);
        toast({
          title: "Erro no upload",
          description: `Não foi possível enviar a imagem ${attachment.fileName}`,
          variant: "destructive"
        });
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(Boolean) as AttachmentImage[];
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
      // Upload attachments first if any exist
      let uploadedAttachments: AttachmentImage[] = [];
      if (attachments.length > 0) {
        uploadedAttachments = await uploadAttachments();
      }

      // Gerar título automaticamente se não fornecido
      const finalTitle = title.trim() || currentType?.label || selectedType;
      
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type: selectedType,
          title: finalTitle,
          description: content.trim(),
          isAnonymous: isAnonymous,
          attachments: {
            images: uploadedAttachments.map(att => ({
              id: att.id,
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              fileSize: att.fileSize,
              mimeType: att.mimeType,
              isScreenshot: att.isScreenshot,
            }))
          }
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

      // Clean up previews
      attachments.forEach(attachment => {
        if (attachment.preview) {
          URL.revokeObjectURL(attachment.preview);
        }
      });

      // Reset form
      setTitle('');
      setContent('');
      setIsAnonymous(false);
      setAttachments([]);
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
          className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl border-l border-gray-200 z-50"
          id="feedback-panel"
          data-feedback="true"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-4 px-3 border-b border-gray-200">
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
                <h2 className="text-lg sm:text-lg text-base font-semibold">
                  {step === 'select' ? 'Feedback' : currentType?.label}
                </h2>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-4 px-3">
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
                    <Label htmlFor="title">Título (opcional)</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Um título breve para seu feedback"
                      className="w-full"
                    />
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

                  {/* Attachments Section */}
                  <div className="space-y-2">
                    <Label>Anexos (opcional)</Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleScreenshot}
                        disabled={isCapturingScreenshot}
                        className="flex items-center space-x-1"
                      >
                        <Camera className="h-4 w-4" />
                        <span>{isCapturingScreenshot ? 'Capturando...' : 'Screenshot'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-1"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Enviar Imagem</span>
                      </Button>
                    </div>
                    
                    {/* File input hidden */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">Imagens anexadas:</Label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-2">
                                {attachment.preview && (
                                  <img
                                    src={attachment.preview}
                                    alt="Preview"
                                    className="h-8 w-8 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {attachment.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                    {attachment.isScreenshot && ' • Screenshot'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(attachment.id)}
                                className="p-1"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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