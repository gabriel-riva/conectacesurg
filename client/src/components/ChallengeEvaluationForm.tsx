import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Upload, FileText, Brain, CheckCircle, Camera } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
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
    allowedTypes: string[];
    maxSize: number;
    maxFiles: number;
  };
  qrcode?: {
    qrCodeData: string;
    qrCodeImage: string;
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Cleanup da câmera quando o componente desmontar
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
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

  const handleFileSubmit = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um arquivo.",
        variant: "destructive"
      });
      return;
    }

    const submission = {
      file: {
        files: selectedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          // Em uma implementação real, você enviaria o arquivo para o servidor
          // e receberia uma URL de volta
          url: URL.createObjectURL(file)
        })),
        submittedAt: new Date().toISOString()
      }
    };

    onSubmit(submission);
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

  const startQRScanner = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
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
          
          toast({
            title: "Câmera ativa",
            description: "Posicione o QR Code na frente da câmera e clique em 'Capturar'.",
          });
          
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
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setQrScannerActive(false);
  };

  const captureQRCode = () => {
    // Permitir entrada manual do código QR
    const userInput = prompt("Digite o código QR que você está vendo na tela:");
    if (userInput && userInput.trim()) {
      setScannedData(userInput.trim());
      setQrScannerActive(false);
      stopQRScanner();
      toast({
        title: "Sucesso",
        description: "Código QR registrado com sucesso!",
      });
    }
  };

  const submitManualCode = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Erro",
        description: "Digite o código QR primeiro.",
        variant: "destructive"
      });
      return;
    }
    
    setScannedData(manualCode.trim());
    setManualCode('');
    toast({
      title: "Sucesso",
      description: "Código QR registrado com sucesso!",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const config = evaluationConfig.file;
    
    if (!config) return;

    // Validar tipos de arquivo
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return config.allowedTypes.includes(extension || '');
    });

    // Validar tamanho
    const sizeValidFiles = validFiles.filter(file => file.size <= config.maxSize);

    // Validar quantidade
    const finalFiles = sizeValidFiles.slice(0, config.maxFiles);

    if (finalFiles.length !== files.length) {
      toast({
        title: "Atenção",
        description: "Alguns arquivos foram removidos por não atenderem aos critérios.",
        variant: "destructive"
      });
    }

    setSelectedFiles(finalFiles);
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
                        setFormData(prev => ({ ...prev, [question.id]: parseInt(value) }))
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
                onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
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
        if (!fileConfig) return null;

        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Upload de Arquivo</h3>
            </div>

            <div className="space-y-4">
              <Label htmlFor="fileInput">Selecione os arquivos</Label>
              <Input
                id="fileInput"
                type="file"
                multiple={fileConfig.maxFiles > 1}
                accept={fileConfig.allowedTypes.map(type => `.${type}`).join(',')}
                onChange={handleFileChange}
              />
              
              <div className="text-sm text-gray-500 space-y-1">
                <p>Tipos permitidos: {fileConfig.allowedTypes.join(', ')}</p>
                <p>Tamanho máximo: {(fileConfig.maxSize / 1024 / 1024).toFixed(1)}MB por arquivo</p>
                <p>Máximo de arquivos: {fileConfig.maxFiles}</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Arquivos selecionados:</Label>
                  <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(1)}MB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleFileSubmit} 
              className="w-full"
              disabled={isLoading || selectedFiles.length === 0}
            >
              {isLoading ? 'Enviando...' : 'Enviar Arquivos'}
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
                  O QR Code será disponibilizado pelos organizadores.
                </p>
              </div>

              {!qrScannerActive && !scannedData && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      onClick={startQRScanner} 
                      className="flex-1"
                      variant="outline"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Abrir Câmera
                    </Button>
                  </div>
                  
                  <div className="text-center text-sm text-gray-500">ou</div>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Digite o código QR manualmente"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={submitManualCode}
                      variant="default"
                      disabled={!manualCode.trim()}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Registrar
                    </Button>
                  </div>
                </div>
              )}

              {qrScannerActive && (
                <div className="space-y-4">
                  <div className="text-center">
                    <video 
                      ref={videoRef}
                      className="w-full max-w-md mx-auto border rounded"
                      autoPlay
                      muted
                      playsInline
                    />
                    <canvas 
                      ref={canvasRef}
                      className="hidden"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={captureQRCode} 
                      className="flex-1"
                      variant="default"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Capturar QR Code
                    </Button>
                    <Button 
                      onClick={stopQRScanner} 
                      className="flex-1"
                      variant="outline"
                    >
                      Parar
                    </Button>
                  </div>
                </div>
              )}

              {scannedData && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">
                      QR Code escaneado com sucesso!
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
                existingSubmission.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
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