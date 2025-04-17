import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Group } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres.",
  }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditGroupModalProps {
  groupId: number;
  onClose: () => void;
  onGroupUpdated: () => void;
}

export function EditGroupModal({ groupId, onClose, onGroupUpdated }: EditGroupModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Carregar dados do grupo
  const { data: group, isLoading: isLoadingGroup } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    queryFn: async () => {
      return await apiRequest<Group>("GET", `/api/groups/${groupId}`);
    },
    enabled: !!groupId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    }
  });

  // Preencher formulário quando os dados do grupo estiverem disponíveis
  useEffect(() => {
    if (group && !isLoadingGroup) {
      form.reset({
        name: group.name,
        description: group.description || "",
      });
    }
  }, [group, isLoadingGroup, form]);

  // Mutation para atualizar o grupo
  const updateGroupMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      return await apiRequest("PATCH", `/api/groups/${groupId}`, formData);
    },
    onSuccess: () => {
      toast({
        title: "Grupo atualizado",
        description: "O grupo foi atualizado com sucesso.",
      });
      onGroupUpdated();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o grupo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateGroupMutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Grupo</DialogTitle>
        </DialogHeader>
        {isLoadingGroup ? (
          <div className="flex justify-center items-center py-8">
            <p>Carregando dados do grupo...</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Grupo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do grupo" {...field} />
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
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição do grupo (opcional)" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="mr-2"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateGroupMutation.isPending || isLoadingGroup}
                >
                  {updateGroupMutation.isPending ? "Atualizando..." : "Salvar alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}