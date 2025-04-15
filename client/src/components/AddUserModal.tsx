import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form schema for adding a user
const formSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().min(1, { message: "Email é obrigatório" })
    .refine(email => /^[a-zA-Z0-9._-]+$/.test(email), {
      message: "Email contém caracteres inválidos"
    }),
  role: z.enum(["user", "admin"])
});

type FormValues = z.infer<typeof formSchema>;

interface AddUserModalProps {
  onClose: () => void;
  onUserCreated: () => void;
}

export function AddUserModal({ onClose, onUserCreated }: AddUserModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);

  // Use react-hook-form with zod validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "user",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      const fullEmail = `${formData.email}@cesurg.com`;
      const userData = {
        name: formData.name,
        email: fullEmail,
        role: formData.role,
      };
      
      await apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      onUserCreated();
      toast({
        title: "Usuário adicionado",
        description: "O usuário foi adicionado com sucesso.",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o usuário.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createUserMutation.mutate(data);
  };

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Adicionar Novo Usuário</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="flex">
                    <FormControl>
                      <Input {...field} className="rounded-r-none" />
                    </FormControl>
                    <span className="inline-flex items-center px-3 py-2 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">
                      @cesurg.com
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Somente emails com domínio @cesurg.com são permitidos.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
