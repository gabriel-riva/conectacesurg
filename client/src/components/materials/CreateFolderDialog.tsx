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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  imageUrl: z.string().url('URL deve ser válida').optional().or(z.literal('')),
  isPublic: z.boolean().default(false),
  groupIds: z.array(z.number()).default([])
});

type CreateFolderData = z.infer<typeof createFolderSchema>;

interface Group {
  id: number;
  name: string;
  description: string;
  isPrivate: boolean;
}

interface CreateFolderDialogProps {
  parentId?: number | null;
  onSuccess: () => void;
}

export default function CreateFolderDialog({ parentId, onSuccess }: CreateFolderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    queryFn: async () => {
      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Failed to fetch groups');
      return response.json();
    }
  });

  const form = useForm<CreateFolderData>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      isPublic: false,
      groupIds: []
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
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Pasta Pública</FormLabel>
                  <div className="text-sm text-gray-600">
                    Quando marcada, todos os usuários poderão ver esta pasta
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!form.watch('isPublic') && groups.length > 0 && (
            <FormField
              control={form.control}
              name="groupIds"
              render={() => (
                <FormItem>
                  <FormLabel>Grupos com Acesso</FormLabel>
                  <Card className="p-4">
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <FormField
                          key={group.id}
                          control={form.control}
                          name="groupIds"
                          render={({ field }) => (
                            <FormItem
                              key={group.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, group.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== group.id));
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  {group.name}
                                </FormLabel>
                                {group.description && (
                                  <p className="text-xs text-gray-600">
                                    {group.description}
                                  </p>
                                )}
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </Card>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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