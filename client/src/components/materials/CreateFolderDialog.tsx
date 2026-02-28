import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  imageUrl: z.string().url('URL deve ser válida').optional().or(z.literal('')),
  targetUserCategories: z.array(z.number()).default([])
});

type CreateFolderData = z.infer<typeof createFolderSchema>;

interface UserCategory {
  id: number;
  name: string;
  color: string;
}

interface CreateFolderDialogProps {
  parentId?: number | null;
  onSuccess: () => void;
}

export default function CreateFolderDialog({ parentId, onSuccess }: CreateFolderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: userCategories = [] } = useQuery<UserCategory[]>({
    queryKey: ['/api/user-categories'],
    queryFn: async () => {
      const response = await fetch('/api/user-categories');
      if (!response.ok) throw new Error('Failed to fetch user categories');
      return response.json();
    }
  });

  const form = useForm<CreateFolderData>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      targetUserCategories: []
    }
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: CreateFolderData) => {
      return apiRequest('/api/materials/folders', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          parentId,
          imageUrl: data.imageUrl || null,
          description: data.description || null
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/folders'] });
      toast({
        title: 'Pasta criada',
        description: 'Pasta criada com sucesso!'
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar pasta',
        description: error.message || 'Ocorreu um erro ao criar a pasta',
        variant: 'destructive'
      });
    }
  });

  const onSubmit = async (data: CreateFolderData) => {
    setIsSubmitting(true);
    try {
      await createFolderMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Nova Pasta</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Pasta</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome da pasta" {...field} />
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
                    placeholder="Descreva o conteúdo da pasta"
                    {...field}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Imagem (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://exemplo.com/imagem.jpg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="targetUserCategories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibilidade por Categoria</FormLabel>
                <div className="text-sm text-muted-foreground mb-2">
                  Se nenhuma categoria for selecionada, a pasta será visível para todos os usuários.
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {userCategories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-folder-category-${category.id}`}
                        checked={field.value.includes(category.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...field.value, category.id]);
                          } else {
                            field.onChange(field.value.filter((id: number) => id !== category.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`create-folder-category-${category.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Pasta'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
