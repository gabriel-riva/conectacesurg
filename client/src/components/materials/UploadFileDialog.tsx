import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, Youtube, File, Folder, Eye } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { UserCategory } from '@shared/schema';

interface MaterialFolder {
  id: number;
  name: string;
  description: string | null;
  creatorId: number;
  parentId: number | null;
  imageUrl: string | null;
  isPublic: boolean;
  groupIds: number[];
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: number;
    name: string;
    email: string;
    photoUrl: string | null;
  };
  children?: MaterialFolder[];
  files?: MaterialFile[];
}

interface MaterialFile {
  id: number;
  name: string;
  description: string | null;
  folderId: number | null;
  uploaderId: number;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string;
  fileSize: number;
  downloadCount: number;
  contentType?: string;
  youtubeUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  uploader: {
    id: number;
    name: string;
    email: string;
    photoUrl: string | null;
  };
  folder?: {
    id: number;
    name: string;
  };
}

const uploadFileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  folderId: z.number().optional(),
  file: z.any().refine((file) => file && file.length > 0, 'Arquivo é obrigatório')
});

const youtubeVideoSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  folderId: z.number().optional(),
  youtubeUrl: z.string().url('URL inválida').refine((url) => 
    url.includes('youtube.com') || url.includes('youtu.be'), 
    'URL deve ser do YouTube'
  )
});

type UploadFileData = z.infer<typeof uploadFileSchema>;
type YoutubeVideoData = z.infer<typeof youtubeVideoSchema>;

interface UploadFileDialogProps {
  folderId?: number | null;
  onSuccess: () => void;
}

export default function UploadFileDialog({ folderId, onSuccess }: UploadFileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedYoutubeCategories, setSelectedYoutubeCategories] = useState<number[]>([]);
  const queryClient = useQueryClient();

  // Query para buscar categorias de usuário
  const { data: userCategories = [] } = useQuery<UserCategory[]>({
    queryKey: ['/api/user-categories'],
  });

  // Query para buscar pastas
  const { data: folders = [], isLoading: foldersLoading } = useQuery<MaterialFolder[]>({
    queryKey: ['/api/materials/folders'],
    queryFn: async () => {
      const response = await fetch('/api/materials/folders');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    }
  });

  const fileForm = useForm<UploadFileData>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: {
      name: '',
      description: '',
      folderId: folderId || undefined,
      file: null
    }
  });

  const youtubeForm = useForm<YoutubeVideoData>({
    resolver: zodResolver(youtubeVideoSchema),
    defaultValues: {
      name: '',
      description: '',
      folderId: folderId || undefined,
      youtubeUrl: ''
    }
  });

  const selectedFile = fileForm.watch('file')?.[0];

  const uploadFileMutation = useMutation({
    mutationFn: async (data: UploadFileData) => {
      const formData = new FormData();
      formData.append('file', data.file[0]);
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.folderId) formData.append('folderId', data.folderId.toString());
      if (selectedCategories.length > 0) {
        formData.append('targetUserCategories', JSON.stringify(selectedCategories));
      }

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

  const addYoutubeVideoMutation = useMutation({
    mutationFn: async (data: YoutubeVideoData) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      formData.append('youtubeUrl', data.youtubeUrl);
      formData.append('contentType', 'youtube');
      if (data.folderId) formData.append('folderId', data.folderId.toString());
      if (selectedYoutubeCategories.length > 0) {
        formData.append('targetUserCategories', JSON.stringify(selectedYoutubeCategories));
      }

      const response = await fetch('/api/materials/files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao adicionar vídeo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/files'] });
      toast({
        title: 'Vídeo adicionado',
        description: 'Vídeo do YouTube adicionado com sucesso!'
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar vídeo',
        description: error.message || 'Ocorreu um erro ao adicionar o vídeo',
        variant: 'destructive'
      });
    }
  });

  const onFileSubmit = async (data: UploadFileData) => {
    setIsSubmitting(true);
    try {
      await uploadFileMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onYoutubeSubmit = async (data: YoutubeVideoData) => {
    setIsSubmitting(true);
    try {
      await addYoutubeVideoMutation.mutateAsync(data);
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
      fileForm.setValue('file', e.dataTransfer.files);
      if (!fileForm.getValues('name')) {
        fileForm.setValue('name', file.name.split('.')[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      fileForm.setValue('file', e.target.files);
      if (!fileForm.getValues('name')) {
        fileForm.setValue('name', file.name.split('.')[0]);
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
        <DialogTitle>Adicionar Conteúdo</DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="file" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <File className="w-4 h-4" />
            Arquivo
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="w-4 h-4" />
            YouTube
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="file">
          <Form {...fileForm}>
            <form onSubmit={fileForm.handleSubmit(onFileSubmit)} className="space-y-4 mt-4">
              <FormField
                control={fileForm.control}
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
                          onClick={() => fileForm.setValue('file', null)}
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
                control={fileForm.control}
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
                control={fileForm.control}
                name="folderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasta</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "root" ? undefined : parseInt(value))} value={field.value?.toString() || "root"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma pasta (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="root">Raiz (sem pasta)</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Folder className="w-4 h-4" />
                              {folder.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={fileForm.control}
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

              <div>
                <label className="text-sm font-medium">Visibilidade por Categoria</label>
                <div className="text-xs text-muted-foreground mb-2">
                  Se nenhuma categoria for selecionada, o arquivo será visível para todos.
                </div>
                {userCategories.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {userCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`file-category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, category.id]);
                            } else {
                              setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`file-category-${category.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || undefined }} />
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-3 h-3" /> Visível para todos
                  </div>
                )}
              </div>

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
        </TabsContent>

        <TabsContent value="youtube">
          <Form {...youtubeForm}>
            <form onSubmit={youtubeForm.handleSubmit(onYoutubeSubmit)} className="space-y-4 mt-4">
              <FormField
                control={youtubeForm.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do YouTube</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={youtubeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Vídeo</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do vídeo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={youtubeForm.control}
                name="folderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasta</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "root" ? undefined : parseInt(value))} value={field.value?.toString() || "root"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma pasta (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="root">Raiz (sem pasta)</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Folder className="w-4 h-4" />
                              {folder.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={youtubeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o vídeo" 
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <label className="text-sm font-medium">Visibilidade por Categoria</label>
                <div className="text-xs text-muted-foreground mb-2">
                  Se nenhuma categoria for selecionada, o vídeo será visível para todos.
                </div>
                {userCategories.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {userCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`yt-category-${category.id}`}
                          checked={selectedYoutubeCategories.includes(category.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedYoutubeCategories([...selectedYoutubeCategories, category.id]);
                            } else {
                              setSelectedYoutubeCategories(selectedYoutubeCategories.filter((id) => id !== category.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`yt-category-${category.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || undefined }} />
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-3 h-3" /> Visível para todos
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onSuccess}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adicionando...' : 'Adicionar Vídeo'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}