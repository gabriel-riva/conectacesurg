import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

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

const editFileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  folderId: z.number().optional(),
});

type EditFileData = z.infer<typeof editFileSchema>;

interface EditFileDialogProps {
  file: MaterialFile;
  onSuccess: () => void;
}

export default function EditFileDialog({ file, onSuccess }: EditFileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Query para buscar pastas
  const { data: folders = [], isLoading: foldersLoading } = useQuery<MaterialFolder[]>({
    queryKey: ['/api/materials/folders'],
    queryFn: async () => {
      const response = await fetch('/api/materials/folders');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    }
  });

  const form = useForm<EditFileData>({
    resolver: zodResolver(editFileSchema),
    defaultValues: {
      name: file.name,
      description: file.description || '',
      folderId: file.folderId || undefined,
    }
  });

  const updateFileMutation = useMutation({
    mutationFn: async (data: EditFileData) => {
      const response = await fetch(`/api/materials/files/${file.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar arquivo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/files'] });
      toast({
        title: 'Arquivo atualizado',
        description: 'Arquivo atualizado com sucesso!'
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o arquivo',
        variant: 'destructive'
      });
    }
  });

  const onSubmit = async (data: EditFileData) => {
    setIsSubmitting(true);
    try {
      await updateFileMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Editar Arquivo</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Atualizando...' : 'Atualizar Arquivo'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}