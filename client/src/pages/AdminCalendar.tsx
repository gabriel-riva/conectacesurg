import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CalendarEvent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Schema para validação do formulário
const eventFormSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  eventDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Data inválida",
  }),
  eventTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Formato de hora inválido (HH:MM)",
  }),
  location: z.string().min(3, "O local deve ter pelo menos 3 caracteres"),
  isActive: z.boolean().default(true),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function AdminCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Formulário com validação
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      eventTime: "18:00",
      location: "",
      isActive: true,
    },
  });
  
  // Buscar eventos do calendário
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      const response = await fetch("/api/calendar?includeInactive=true");
      if (!response.ok) {
        throw new Error("Erro ao buscar eventos do calendário");
      }
      return response.json() as Promise<CalendarEvent[]>;
    },
  });
  
  // Mutation para criar evento
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/calendar", {
        method: "POST",
        body: data,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar evento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({
        title: "Evento criado com sucesso!",
        description: "O evento foi adicionado ao calendário.",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para atualizar evento
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/calendar/${id}`, {
        method: "PUT",
        body: data,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar evento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({
        title: "Evento atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para excluir evento
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/calendar/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir evento");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({
        title: "Evento excluído com sucesso!",
        description: "O evento foi removido do calendário.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handler para abrir o formulário de edição
  const handleEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(true);
    
    // Preencher o formulário com os dados do evento
    form.reset({
      title: event.title,
      description: event.description,
      eventDate: format(new Date(event.eventDate), "yyyy-MM-dd"),
      eventTime: event.eventTime,
      location: event.location,
      isActive: event.isActive,
    });
    
    // Definir preview da imagem
    if (event.imageUrl) {
      setImagePreview(event.imageUrl);
    } else {
      setImagePreview(null);
    }
    
    setIsOpen(true);
  };
  
  // Handler para abrir o formulário de criação
  const handleCreate = () => {
    resetForm();
    setIsEditing(false);
    setSelectedEvent(null);
    setIsOpen(true);
  };
  
  // Handler para excluir evento
  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este evento?")) {
      deleteMutation.mutate(id);
    }
  };
  
  // Handler para alterar imagem
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedImage(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(selectedEvent?.imageUrl || null);
    }
  };
  
  // Handler para enviar o formulário
  const onSubmit = (values: EventFormValues) => {
    const formData = new FormData();
    
    // Adicionar campos do formulário
    formData.append("title", values.title);
    formData.append("description", values.description);
    formData.append("eventDate", values.eventDate);
    formData.append("eventTime", values.eventTime);
    formData.append("location", values.location);
    formData.append("isActive", values.isActive.toString());
    
    // Adicionar imagem se selecionada
    if (selectedImage) {
      formData.append("image", selectedImage);
    }
    
    // Criar ou atualizar evento
    if (isEditing && selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  // Resetar o formulário
  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      eventTime: "18:00",
      location: "",
      isActive: true,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setIsOpen(false);
  };
  
  // Formatação de data para exibição
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Eventos</CardTitle>
          <CardDescription>
            Adicione, edite e remova eventos do calendário institucional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Evento
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center my-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum evento cadastrado. Clique em "Novo Evento" para adicionar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      {formatDate(event.eventDate)} {event.eventTime}
                    </TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${event.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {event.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(event)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Formulário de evento em um Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Editar Evento" : "Novo Evento"}</SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Altere os detalhes do evento conforme necessário."
                : "Preencha os campos para adicionar um novo evento ao calendário."}
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do evento" {...field} />
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
                          placeholder="Descreva o evento..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="eventTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
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
                        <Input placeholder="Local do evento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Evento ativo</FormLabel>
                        <FormDescription>
                          Eventos inativos não são exibidos no calendário.
                        </FormDescription>
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
                
                <div className="space-y-2">
                  <FormLabel>Imagem do Evento</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  
                  {imagePreview && (
                    <div className="mt-2 rounded-md overflow-hidden border">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-auto max-h-48 object-cover"
                      />
                    </div>
                  )}
                </div>
                
                <SheetFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4">
                  <SheetClose asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </SheetClose>
                  
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isEditing ? "Atualizar" : "Criar"} Evento
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}