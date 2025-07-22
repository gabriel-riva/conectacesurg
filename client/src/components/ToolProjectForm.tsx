import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

// Define the form schema based on the actual database schema
const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  type: z.enum(['aula', 'visita_tecnica', 'evento']),
  status: z.enum(['planejado', 'em_andamento', 'concluido', 'cancelado']).default('planejado'),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().optional(),
  location: z.string().optional(),
  participants: z.string().optional(),
  objectives: z.string().optional(),
  resources: z.string().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ToolProjectFormProps {
  onSuccess?: () => void;
  initialData?: Partial<FormData>;
  isEditing?: boolean;
  projectId?: number;
}

const typeOptions = [
  { value: 'aula', label: 'Aula' },
  { value: 'visita_tecnica', label: 'Visita Técnica' },
  { value: 'evento', label: 'Evento' },
];

const statusOptions = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function ToolProjectForm({ onSuccess, initialData, isEditing = false, projectId }: ToolProjectFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      type: initialData?.type || "aula",
      status: initialData?.status || "planejado",
      startDate: initialData?.startDate || "",
      endDate: initialData?.endDate || "",
      location: initialData?.location || "",
      participants: initialData?.participants || "",
      objectives: initialData?.objectives || "",
      resources: initialData?.resources || "",
      observations: initialData?.observations || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest('/api/tool-projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      form.reset();
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest(`/api/tool-projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormData) => {
    const mutation = isEditing ? updateMutation : createMutation;
    mutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o título do projeto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva o projeto detalhadamente"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Término</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local</FormLabel>
              <FormControl>
                <Input placeholder="Local onde será realizado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="participants"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Participantes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Liste os participantes ou critérios de participação"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="objectives"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivos</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva os objetivos do projeto"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resources"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recursos Necessários</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Liste os recursos necessários"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações adicionais"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isPending} className="bg-conecta-blue hover:bg-conecta-blue/90">
            {isPending ? 'Salvando...' : (isEditing ? 'Atualizar Projeto' : 'Criar Projeto')}
          </Button>
        </div>
      </form>
    </Form>
  );
}