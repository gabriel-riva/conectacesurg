import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

// Define the form schema based on the report table structure
const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  status: z.enum(['pendente', 'em_revisao', 'aprovado', 'rejeitado']).default('pendente'),
});

type FormData = z.infer<typeof formSchema>;

interface ToolProjectReportFormProps {
  projectId: number;
  onSuccess?: () => void;
}

export function ToolProjectReportForm({ projectId, onSuccess }: ToolProjectReportFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      status: "pendente",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest(`/api/tool-projects/${projectId}/reports`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      form.reset();
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título *</FormLabel>
              <FormControl>
                <Input placeholder="Digite o título do relatório" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva o relatório detalhadamente"
                  className="min-h-[200px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={createMutation.isPending} className="bg-conecta-blue hover:bg-conecta-blue/90">
            {createMutation.isPending ? 'Criando...' : 'Criar Relatório'}
          </Button>
        </div>
      </form>
    </Form>
  );
}