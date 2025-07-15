import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

const uploadFileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  file: z.any().refine((file) => file && file.length > 0, 'Arquivo é obrigatório')
});

type UploadFileData = z.infer<typeof uploadFileSchema>;

interface UploadFileDialogProps {
  folderId?: number | null;
  onSuccess: () => void;
}

export default function UploadFileDialog({ folderId, onSuccess }: UploadFileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<UploadFileData>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: {
      name: '',
      description: '',
      file: null
    }
  });

  const selectedFile = form.watch('file')?.[0];

  const uploadFileMutation = useMutation({
    mutationFn: async (data: UploadFileData) => {
      const formData = new FormData();
      formData.append('file', data.file[0]);
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (folderId) formData.append('folderId', folderId.toString());

      const response = await fetch('/api/materials/files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao fazer upload');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/files'] });
      toast({
        title: 'Arquivo enviado',
        description: 'Arquivo enviado com sucesso!'
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro no upload',
        description: error.message || 'Ocorreu um erro ao enviar o arquivo',
        variant: 'destructive'
      });
    }
  });

  const onSubmit = async (data: UploadFileData) => {
    setIsSubmitting(true);
    try {
      await uploadFileMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      form.setValue('file', e.dataTransfer.files);
      if (!form.getValues('name')) {
        form.setValue('name', file.name.split('.')[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      form.setValue('file', e.target.files);
      if (!form.getValues('name')) {
        form.setValue('name', file.name.split('.')[0]);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Upload de Arquivo</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arquivo</FormLabel>
                <FormControl>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="*/*"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-6 h-6 text-blue-600" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue('file', null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Arraste um arquivo aqui ou{' '}
                          <label
                            htmlFor="file-upload"
                            className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                          >
                            clique para selecionar
                          </label>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Todos os tipos de arquivo são aceitos
                        </p>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Arquivo</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome do arquivo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição (opcional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descreva o arquivo" 
                    {...field}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? 'Enviando...' : 'Enviar Arquivo'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}