import React, { useState, useRef } from 'react';
import { ChevronLeft, MessageCircle, Bug, Lightbulb, Heart, X, Upload, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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

interface AttachedImage {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isScreenshot: boolean;
  previewUrl?: string;
}

export default function FeedbackPanel({ isOpen, onClose, user }: FeedbackPanelProps) {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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

  // Function to handle file uploads
  const handleFileUpload = async (files: FileList | null, isScreenshot: boolean = false) => {
    if (!files || files.length === 0) return;

    // Check if we've reached the maximum number of images
    if (attachedImages.length + files.length > 5) {
      toast({
        title: "Limite de imagens",
        description: "Você pode anexar no máximo 5 imagens por feedback.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });
      formData.append('isScreenshot', isScreenshot.toString());

      const response = await apiRequest('/api/upload/feedback-images', {
        method: 'POST',
        body: formData
      }) as { success: boolean; images: AttachedImage[] };

      if (response.success) {
        // Add preview URLs for the uploaded images
        const newImages = response.images.map((img: AttachedImage, index: number) => ({
          ...img,
          previewUrl: URL.createObjectURL(Array.from(files)[index] || files[0])
        }));

        setAttachedImages(prev => [...prev, ...newImages]);
        
        toast({
          title: "Imagens carregadas",
          description: `${files.length} imagem(ns) anexada(s) com sucesso.`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar as imagens. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Function to handle screenshot capture
  const handleScreenshot = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast({
          title: "Não suportado",
          description: "Captura de tela não é suportada neste navegador.",
          variant: "destructive"
        });
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        // Stop the screen capture
        stream.getTracks().forEach(track => track.stop());

        // Convert to blob and upload
        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const file = new File([blob], `screenshot-${Date.now()}.png`, {
            type: 'image/png'
          });

          const dt = new DataTransfer();
          dt.items.add(file);

          await handleFileUpload(dt.files, true);
        }, 'image/png');
      };
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast({
        title: "Erro na captura",
        description: "Não foi possível capturar a tela. Verifique as permissões.",
        variant: "destructive"
      });
    }
  };

  // Function to remove attached image
  const removeImage = (index: number) => {
    setAttachedImages(prev => {
      const updated = [...prev];
      // Revoke the preview URL to free memory
      if (updated[index].previewUrl) {
        URL.revokeObjectURL(updated[index].previewUrl!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  // Function to trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
            images: attachedImages
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

      // Reset form
      setTitle('');
      setContent('');
      setIsAnonymous(false);
      // Clean up attached images
      attachedImages.forEach(img => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
      setAttachedImages([]);
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

                  {/* Image Upload Section */}
                  <div className="space-y-3">
                    <Label>Anexos (opcional)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={triggerFileInput}
                        disabled={isUploading || attachedImages.length >= 5}
                        className="flex items-center space-x-1"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Carregar Imagem</span>
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleScreenshot}
                        disabled={isUploading || attachedImages.length >= 5}
                        className="flex items-center space-x-1"
                      >
                        <Camera className="h-4 w-4" />
                        <span>Capturar Tela</span>
                      </Button>
                    </div>
                    
                    {isUploading && (
                      <div className="text-sm text-gray-500">
                        Carregando imagem...
                      </div>
                    )}

                    {attachedImages.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          Imagens anexadas ({attachedImages.length}/5):
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {attachedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <div className="border rounded-lg p-2 bg-gray-50">
                                {image.previewUrl ? (
                                  <img
                                    src={image.previewUrl}
                                    alt={`Anexo ${index + 1}`}
                                    className="w-full h-20 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                  {image.isScreenshot ? '📷 Screenshot' : image.fileName}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileUpload(e.target.files)}
                      accept="image/*"
                      multiple
                      className="hidden"
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