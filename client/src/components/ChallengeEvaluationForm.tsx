import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Upload, FileText, Brain, CheckCircle, Camera, Link, Plus, X } from 'lucide-react';
import jsQR from 'jsqr';

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
  submissionType?: 'file' | 'link';
  fileCategory?: 'image' | 'video' | 'audio' | 'document' | 'any';
  allowMultiple?: boolean;
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

interface ChallengeEvaluationFormProps {
  challengeId: number;
  evaluationType: 'quiz' | 'text' | 'file' | 'qrcode';
  evaluationConfig: EvaluationConfig;
  onSubmit: (submissionData: any) => void;
  isLoading?: boolean;
  existingSubmission?: any;
}

export const ChallengeEvaluationForm: React.FC<ChallengeEvaluationFormProps> = ({
  challengeId,
  evaluationType,
  evaluationConfig,
  onSubmit,
  isLoading = false,
  existingSubmission
}) => {
  const [formData, setFormData] = useState<any>({});
  const [selectedFiles, setSelectedFiles] = useState<{[requirementId: string]: File[]}>({});
  const [linkInputs, setLinkInputs] = useState<{[requirementId: string]: string[]}>({});
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanningActive, setScanningActive] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState<'scanning' | 'found' | 'processing'>('scanning');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Funções auxiliares para categorias de arquivo
  const getAcceptString = (fileCategory?: string) => {
    switch (fileCategory) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'audio':
        return 'audio/*';
      case 'document':
        return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt';
      default:
        return '*/*'; // Aceita todos os tipos
    }
  };

  const getCategoryDescription = (fileCategory?: string) => {
    switch (fileCategory) {
      case 'image':
        return 'Sugestão: imagens (jpg, png, gif, etc.) - mas qualquer arquivo é aceito';
      case 'video':
        return 'Sugestão: vídeos (mp4, avi, mov, etc.) - mas qualquer arquivo é aceito';
      case 'audio':
        return 'Sugestão: áudios (mp3, wav, ogg, etc.) - mas qualquer arquivo é aceito';
      case 'document':
        return 'Sugestão: documentos (pdf, doc, xls, etc.) - mas qualquer arquivo é aceito';
      default:
        return 'Todos os tipos de arquivo são aceitos';
    }
  };

  // Cleanup da câmera quando o componente desmontar
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [cameraStream]);

  const handleQuizSubmit = () => {
    const config = evaluationConfig.quiz;
    if (!config) return;

    const answers = config.questions.map(q => ({
      questionId: q.id,
      answer: formData[q.id] || 0
    }));

    const submission = {
      quiz: {
        answers,
        submittedAt: new Date().toISOString()
      }
    };

    onSubmit(submission);
  };

  const handleTextSubmit = () => {
    const submission = {
      text: {
        content: formData.textContent || '',
        submittedAt: new Date().toISOString()
      }
    };

    onSubmit(submission);
  };

  const handleFileSubmit = async () => {
    const config = evaluationConfig.file;
    if (!config?.fileRequirements) return;

    try {
      setIsUploading(true); // Mostrar loading durante upload
      const submissionData = [];
      let hasData = false;
      
      // Para cada requisito
      for (const requirement of config.fileRequirements) {
        const requirementId = requirement.id;
        const submissionType = requirement.submissionType || 'file';
        
        if (submissionType === 'file') {
          // Processar arquivos
          const files = selectedFiles[requirementId] || [];
          
          for (const file of files) {
            try {
              // Criar FormData para envio do arquivo
              const formData = new FormData();
              formData.append('file', file);
              formData.append('challengeId', challengeId.toString());
              formData.append('requirementId', requirementId);

              // Enviar arquivo para o servidor com credenciais
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include', // Incluir cookies de sessão
                headers: {
                  // Não definir Content-Type - deixar o navegador definir automaticamente para multipart/form-data
                }
              });

              if (!response.ok) {
                let errorMessage = `Erro ao enviar ${file.name}`;
                try {
                  const errorData = await response.json();
                  errorMessage = errorData.error || errorData.message || errorMessage;
                  console.error('Erro do servidor:', errorData);
                } catch {
                  const errorText = await response.text();
                  errorMessage = errorText || `Status ${response.status}`;
                }
                throw new Error(errorMessage);
              }

              const uploadResult = await response.json();
              
              submissionData.push({
                requirementId,
                type: 'file',
                fileName: file.name,
                fileUrl: uploadResult.url || uploadResult.fileUrl,
                fileSize: file.size,
                mimeType: file.type
              });
              hasData = true;
            } catch (fileError: any) {
              toast({
                title: "Erro no Upload",
                description: `Falha ao enviar ${file.name}: ${fileError.message}`,
                variant: "destructive"
              });
              return;
            }
          }
        } else if (submissionType === 'link') {
          // Processar links
          const links = linkInputs[requirementId] || [];
          
          for (const link of links) {
            if (link && link.trim()) {
              submissionData.push({
                requirementId,
                type: 'link',
                linkUrl: link.trim()
              });
              hasData = true;
            }
          }
        }
      }

      if (!hasData) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um arquivo ou link.",
          variant: "destructive"
        });
        return;
      }

      const submission = {
        file: {
          files: submissionData
        }
      };

      onSubmit(submission);
      
      // Mostrar feedback de sucesso local também
      toast({
        title: "✅ Arquivos enviados!",
        description: "Processando sua submissão...",
      });
    } catch (error: any) {
      console.error('Erro geral no upload:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar submissão",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false); // Remover loading
    }
  };

  const handleQRCodeSubmit = () => {
    if (!scannedData) {
      toast({
        title: "Erro",
        description: "Escaneie o QR Code primeiro.",
        variant: "destructive"
      });
      return;
    }

    const submission = {
      qrcode: {
        scannedData,
        submittedAt: new Date().toISOString()
      }
    };

    onSubmit(submission);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      // Usar tamanho fixo para melhor performance
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar frame atual
      context.drawImage(video, 0, 0, width, height);
      
      // Obter dados da imagem
      const imageData = context.getImageData(0, 0, width, height);
      
      // Tentar detectar QR code com configurações otimizadas
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth"
      });

      if (code && code.data) {
        console.log('✅ QR Code detectado:', code.data);
        setDetectionStatus('found');
        
        // Breve pausa para mostrar feedback visual
        setTimeout(() => {
          setDetectionStatus('processing');
          setScannedData(code.data);
          setQrScannerActive(false);
          setScanningActive(false);
          stopQRScanner();
          toast({
            title: "QR Code encontrado!",
            description: `Código detectado automaticamente: ${code.data}`,
          });
        }, 200);
        return;
      }

      // Incrementar tentativas para debug
      setScanAttempts(prev => prev + 1);
      
    } catch (error) {
      console.error('Erro durante escaneamento:', error);
    }
  };

  const startQRScanner = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }

      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Erro",
          description: "Seu navegador não suporta acesso à câmera.",
          variant: "destructive"
        });
        return;
      }

      // Ativar a interface da câmera primeiro
      setQrScannerActive(true);
      
      // Aguardar um pouco para o elemento ser renderizado
      setTimeout(async () => {
        try {
          if (!videoRef.current) {
            toast({
              title: "Erro",
              description: "Elemento de vídeo não encontrado.",
              variant: "destructive"
            });
            setQrScannerActive(false);
            return;
          }

          // Solicitar acesso à câmera
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });

          videoRef.current.srcObject = stream;
          setCameraStream(stream);
          setScanAttempts(0);
          
          // Aguardar o vídeo carregar completamente
          videoRef.current.onloadedmetadata = () => {
            setTimeout(() => {
              setScanningActive(true);
              setDetectionStatus('scanning');
              // Iniciar escaneamento automático com alta frequência
              scanIntervalRef.current = setInterval(scanQRCode, 100);
              
              toast({
                title: "Scanner ativo",
                description: "Posicione o QR Code na frente da câmera. Detecção automática ativada!",
              });
            }, 1000); // Aguardar 1 segundo para garantir que o vídeo está completamente pronto
          };
          
        } catch (error) {
          console.error('Erro ao inicializar câmera:', error);
          setQrScannerActive(false);
          toast({
            title: "Erro",
            description: "Não foi possível acessar a câmera. Verifique as permissões.",
            variant: "destructive"
          });
        }
      }, 100);
      
    } catch (error) {
      console.error('Erro ao inicializar scanner:', error);
      setQrScannerActive(false);
      toast({
        title: "Erro",
        description: "Erro inesperado ao inicializar câmera.",
        variant: "destructive"
      });
    }
  };

  const stopQRScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanningActive(false);
    setQrScannerActive(false);
    setScanAttempts(0);
  };



  // Função para adicionar link
  const handleAddLink = (requirementId: string) => {
    const requirement = evaluationConfig.file?.fileRequirements?.find(r => r.id === requirementId);
    const maxLinks = requirement?.allowMultiple ? 5 : 1;
    const currentLinks = linkInputs[requirementId] || [];
    
    if (currentLinks.length < maxLinks) {
      setLinkInputs(prev => ({
        ...prev,
        [requirementId]: [...currentLinks, '']
      }));
    }
  };

  // Função para remover link
  const handleRemoveLink = (requirementId: string, index: number) => {
    setLinkInputs(prev => ({
      ...prev,
      [requirementId]: (prev[requirementId] || []).filter((_, i) => i !== index)
    }));
  };

  // Função para atualizar link
  const handleUpdateLink = (requirementId: string, index: number, value: string) => {
    setLinkInputs(prev => ({
      ...prev,
      [requirementId]: (prev[requirementId] || []).map((link, i) => i === index ? value : link)
    }));
  };

  const handleFileChange = (requirementId: string, requirement: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (!requirement) return;

    // Validar apenas tamanho
    const sizeValidFiles = files.filter(file => file.size <= requirement.maxSize);

    if (sizeValidFiles.length !== files.length) {
      toast({
        title: "Atenção",
        description: "Alguns arquivos foram removidos por excederem o tamanho máximo permitido.",
        variant: "destructive"
      });
    }

    setSelectedFiles(prev => ({
      ...prev,
      [requirementId]: sizeValidFiles
    }));
  };

  // Renderizar formulário baseado no tipo de avaliação
  const renderEvaluationForm = () => {
    switch (evaluationType) {
      case 'quiz':
        const quizConfig = evaluationConfig.quiz;
        if (!quizConfig) return null;

        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Quiz</h3>
              <Badge variant="secondary">
                {quizConfig.questions.length} questões
              </Badge>
            </div>

            <div className="space-y-4">
              {quizConfig.questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {index + 1}. {question.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={formData[question.id]?.toString()}
                      onValueChange={(value) => 
                        setFormData((prev: any) => ({ ...prev, [question.id]: parseInt(value) }))
                      }
                    >
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <RadioGroupItem value={optionIndex.toString()} id={`${question.id}-${optionIndex}`} />
                          <Label htmlFor={`${question.id}-${optionIndex}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Pontuação mínima:</strong> {quizConfig.minScore}%
              </p>
              {quizConfig.allowMultipleAttempts && (
                <p className="text-sm text-blue-800">
                  <strong>Tentativas permitidas:</strong> {quizConfig.maxAttempts}
                </p>
              )}
            </div>

            <Button 
              onClick={handleQuizSubmit} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar Quiz'}
            </Button>
          </div>
        );

      case 'text':
        const textConfig = evaluationConfig.text;
        if (!textConfig) return null;

        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Resposta em Texto</h3>
            </div>

            <div className="space-y-4">
              <Label htmlFor="textContent">Sua resposta</Label>
              <Textarea
                id="textContent"
                placeholder={textConfig.placeholder}
                maxLength={textConfig.maxLength}
                value={formData.textContent || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, textContent: e.target.value }))}
                className="min-h-32"
              />
              <p className="text-sm text-gray-500">
                {(formData.textContent || '').length}/{textConfig.maxLength} caracteres
              </p>
            </div>

            <Button 
              onClick={handleTextSubmit} 
              className="w-full"
              disabled={isLoading || !formData.textContent?.trim()}
            >
              {isLoading ? 'Enviando...' : 'Enviar Resposta'}
            </Button>
          </div>
        );

      case 'file':
        const fileConfig = evaluationConfig.file;
        if (!fileConfig?.fileRequirements || !Array.isArray(fileConfig.fileRequirements) || fileConfig.fileRequirements.length === 0) {
          return (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Upload de Arquivos</h3>
              </div>
              
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <Upload className="w-12 h-12 text-orange-500 mx-auto" />
                    <h4 className="font-semibold text-orange-800">Configuração Incompleta</h4>
                    <p className="text-sm text-orange-700">
                      Este desafio ainda não possui requisitos de arquivo configurados.
                    </p>
                    <div className="bg-orange-100 p-3 rounded-lg text-left">
                      <p className="text-xs text-orange-800 font-medium mb-2">Para resolver:</p>
                      <ol className="text-xs text-orange-700 space-y-1">
                        <li>1. Vá ao painel administrativo</li>
                        <li>2. Edite este desafio</li>
                        <li>3. Configure os requisitos de arquivo</li>
                        <li>4. Salve as alterações</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        const totalSelectedFiles = Object.values(selectedFiles).flat().length;
        const totalSelectedLinks = Object.values(linkInputs).flat().filter(link => link.trim()).length;
        const totalSubmissions = totalSelectedFiles + totalSelectedLinks;

        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Requisitos do Desafio</h3>
            </div>

            <div className="space-y-6">
              {fileConfig.fileRequirements.map((requirement) => {
                const submissionType = requirement.submissionType || 'file';
                const allowMultiple = requirement.allowMultiple || false;
                const currentLinks = linkInputs[requirement.id] || [];
                const currentFiles = selectedFiles[requirement.id] || [];
                
                return (
                  <Card key={requirement.id} className={`border-l-4 ${
                    submissionType === 'link' ? 'border-l-blue-500' : 'border-l-purple-500'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {submissionType === 'link' ? (
                            <Link className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Upload className="w-4 h-4 text-purple-600" />
                          )}
                          <CardTitle className={`text-sm font-semibold ${
                            submissionType === 'link' ? 'text-blue-700' : 'text-purple-700'
                          }`}>
                            {requirement.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {requirement.points} pontos
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {submissionType === 'link' ? 'Link' : 'Arquivo'}
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
                      {submissionType === 'file' ? (
                        // Formulário de arquivo
                        <div className="space-y-2">
                          <Label htmlFor={`fileInput-${requirement.id}`}>Selecione os arquivos</Label>
                          <Input
                            id={`fileInput-${requirement.id}`}
                            type="file"
                            multiple={allowMultiple}
                            accept={getAcceptString(requirement.fileCategory)}
                            onChange={handleFileChange(requirement.id, requirement)}
                          />
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>{getCategoryDescription(requirement.fileCategory)}</p>
                            <p>Tamanho máximo: {(requirement.maxSize / 1024 / 1024).toFixed(1)}MB por arquivo</p>
                            {allowMultiple && <p>Múltiplos arquivos permitidos</p>}
                          </div>
                          
                          {currentFiles.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-green-700">Arquivos selecionados:</Label>
                              <div className="space-y-1">
                                {currentFiles.map((file, index) => (
                                  <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded border">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    <span className="text-xs">{file.name}</span>
                                    <span className="text-xs text-gray-500">
                                      ({file.size && !isNaN(file.size) ? (file.size / 1024 / 1024).toFixed(1) + 'MB' : 'Tamanho não disponível'})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Formulário de link
                        <div className="space-y-4">
                          {currentLinks.length === 0 ? (
                            <div className="text-center py-4">
                              <Button
                                type="button"
                                onClick={() => handleAddLink(requirement.id)}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Adicionar Link
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-blue-700">
                                Links ({currentLinks.length}/{allowMultiple ? '5' : '1'}):
                              </Label>
                              {currentLinks.map((link, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Input
                                    type="url"
                                    placeholder="https://exemplo.com"
                                    value={link}
                                    onChange={(e) => handleUpdateLink(requirement.id, index, e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => handleRemoveLink(requirement.id, index)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              
                              {allowMultiple && currentLinks.length < 5 && (
                                <Button
                                  type="button"
                                  onClick={() => handleAddLink(requirement.id)}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2 w-full mt-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  Adicionar Outro Link
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-700">
                      <strong>Arquivos:</strong> {totalSelectedFiles}
                    </p>
                    <p className="text-gray-700">
                      <strong>Links:</strong> {totalSelectedLinks}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700">
                      <strong>Total de submissões:</strong> {totalSubmissions}
                    </p>
                    <p className="text-gray-700">
                      <strong>Máximo permitido:</strong> {fileConfig.maxFiles}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleFileSubmit} 
              className="w-full"
              disabled={isUploading || isLoading || totalSubmissions === 0 || totalSubmissions > fileConfig.maxFiles}
            >
              {isUploading ? '📤 Enviando arquivos...' : 
               isLoading ? '⏳ Processando submissão...' : 
               `Enviar ${totalSubmissions} submiss${totalSubmissions !== 1 ? 'ões' : 'ão'}`}
            </Button>
          </div>
        );

      case 'qrcode':
        const qrConfig = evaluationConfig.qrcode;
        if (!qrConfig) return null;

        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Escanear QR Code</h3>
            </div>

            <div className="space-y-4">
              <div className="text-center bg-orange-50 p-4 rounded-lg">
                <QrCode className="w-12 h-12 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-orange-800 mb-2">
                  Para completar este desafio, você precisa escanear o QR Code fornecido no evento.
                </p>
                <p className="text-xs text-orange-700">
                  A câmera irá detectar automaticamente o código QR quando você posicioná-lo na frente dela.
                </p>
              </div>

              {!qrScannerActive && !scannedData && (
                <div className="text-center space-y-4">
                  <Button 
                    onClick={startQRScanner} 
                    className="px-8 py-3"
                    variant="default"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Iniciar Scanner QR
                  </Button>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-800">
                      🔍 Para testar: Abra <a href="/test-qr.html" target="_blank" className="underline font-medium">esta página</a> em uma nova aba para ver um QR code de teste
                    </p>
                  </div>
                  

                </div>
              )}

              {qrScannerActive && (
                <div className="space-y-4">
                  <div className="relative">
                    <video 
                      ref={videoRef}
                      className="w-full h-64 bg-black rounded-lg object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                    <canvas 
                      ref={canvasRef}
                      className="hidden"
                    />
                    {scanningActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <div className="text-white text-center">
                          {detectionStatus === 'scanning' && (
                            <div className="animate-pulse">
                              <QrCode className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-sm">Procurando QR Code...</p>
                              <p className="text-xs opacity-75">Posicione o código na frente da câmera</p>
                              <p className="text-xs opacity-50 mt-1">Tentativas: {scanAttempts}</p>
                            </div>
                          )}
                          {detectionStatus === 'found' && (
                            <div className="animate-bounce">
                              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                              <p className="text-sm text-green-400">QR Code Detectado!</p>
                            </div>
                          )}
                          {detectionStatus === 'processing' && (
                            <div className="animate-spin">
                              <QrCode className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-sm">Processando...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={stopQRScanner} 
                      variant="outline"
                    >
                      Parar Scanner
                    </Button>
                    <Button 
                      onClick={() => {
                        console.log('Debug info:', {
                          videoReady: videoRef.current?.videoWidth && videoRef.current.videoWidth > 0,
                          streamActive: !!cameraStream,
                          scanningActive,
                          attempts: scanAttempts
                        });
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Debug Info
                    </Button>
                  </div>
                </div>
              )}

              {scannedData && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">
                      QR Code escaneado: <strong>{scannedData}</strong>
                    </span>
                  </div>
                  
                  <Button 
                    onClick={handleQRCodeSubmit} 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enviando...' : 'Confirmar Escaneamento'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500">
            Tipo de avaliação não suportado
          </div>
        );
    }
  };

  // Verificar se já existe submissão
  if (existingSubmission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Desafio já enviado</span>
          </CardTitle>
          <CardDescription>
            Você já enviou uma resposta para este desafio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Status:</strong> {existingSubmission.status === 'pending' ? 'Aguardando revisão' : 
                existingSubmission.status === 'approved' ? 'Aprovado' : 
                existingSubmission.status === 'completed' ? 'Concluído' :
                existingSubmission.status === 'rejected' ? 'Rejeitado' : 'Desconhecido'}
            </p>
            <p className="text-sm">
              <strong>Pontos:</strong> {existingSubmission.points}
            </p>
            {existingSubmission.adminFeedback && (
              <p className="text-sm">
                <strong>Feedback:</strong> {existingSubmission.adminFeedback}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliação do Desafio</CardTitle>
        <CardDescription>
          Complete a avaliação para ganhar pontos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderEvaluationForm()}
      </CardContent>
    </Card>
  );
};