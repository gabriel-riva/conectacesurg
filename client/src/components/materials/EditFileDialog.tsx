import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder, Eye } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  targetUserCategories?: number[];
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
  const [selectedCategories, setSelectedCategories] = useState<number[]>(file.targetUserCategories || []);
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
        body: JSON.stringify({
          ...data,
          targetUserCategories: selectedCategories,
        }),
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
                      id={`edit-file-category-${category.id}`}
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
                      htmlFor={`edit-file-category-${category.id}`}
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
              {isSubmitting ? 'Atualizando...' : 'Atualizar Arquivo'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}