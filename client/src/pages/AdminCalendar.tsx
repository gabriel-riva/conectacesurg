import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarIcon,
  Clock,
  Edit,
  MapPin,
  Plus,
  Trash,
  ImageIcon,
  Check,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// Schema de validação para o formulário
const eventFormSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)"),
  location: z.string().min(3, "O local deve ter pelo menos 3 caracteres"),
  isActive: z.boolean().default(true),
  image: z.instanceof(File).optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form para criar/editar eventos
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      eventTime: "14:00",
      location: "",
      isActive: true,
    },
  });

  // Consulta para buscar eventos
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar", { includeInactive: showInactive }],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/calendar?includeInactive=${showInactive}`);
        if (!response.ok) {
          throw new Error("Erro ao buscar eventos do calendário");
        }
        return response.json() as Promise<CalendarEvent[]>;
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
        return [];
      }
    },
  });

  // Mutação para criar um novo evento
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("eventDate", data.eventDate);
      formData.append("eventTime", data.eventTime);
      formData.append("location", data.location);
      formData.append("isActive", data.isActive.toString());
      
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      return apiRequest("POST", "/api/calendar", formData);
    },
    onSuccess: () => {
      toast({
        title: "Evento criado com sucesso",
        description: "O evento foi adicionado ao calendário",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/upcoming"] });
      setIsNewDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar um evento existente
  const updateEventMutation = useMutation({
    mutationFn: async (data: { id: number; values: EventFormValues }) => {
      const formData = new FormData();
      formData.append("title", data.values.title);
      formData.append("description", data.values.description);
      formData.append("eventDate", data.values.eventDate);
      formData.append("eventTime", data.values.eventTime);
      formData.append("location", data.values.location);
      formData.append("isActive", data.values.isActive.toString());
      
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      return apiRequest("PUT", `/api/calendar/${data.id}`, formData);
    },
    onSuccess: () => {
      toast({
        title: "Evento atualizado com sucesso",
        description: "As alterações foram salvas",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/upcoming"] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir um evento
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/calendar/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Evento excluído com sucesso",
        description: "O evento foi removido do calendário",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/upcoming"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Resetar o formulário
  const resetForm = () => {
    form.reset({
      title: "",
      description: "",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      eventTime: "14:00",
      location: "",
      isActive: true,
    });
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  // Abrir diálogo de edição
  const handleEdit = (event: CalendarEvent) => {
    setCurrentEvent(event);
    form.reset({
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      location: event.location,
      isActive: event.isActive,
    });
    setPreviewUrl(event.imageUrl || null);
    setIsEditDialogOpen(true);
  };

  // Abrir diálogo de exclusão
  const handleDelete = (event: CalendarEvent) => {
    setCurrentEvent(event);
    setIsDeleteDialogOpen(true);
  };

  // Manipular upload de imagem
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Enviar formulário
  const onSubmit = (values: EventFormValues) => {
    if (currentEvent) {
      updateEventMutation.mutate({ id: currentEvent.id, values });
    } else {
      createEventMutation.mutate(values);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <AdminSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-primary">Gerenciar Eventos do Calendário</h1>
              <Button onClick={() => {
                resetForm();
                setIsNewDialogOpen(true);
              }} className="flex items-center gap-1">
                <Plus className="w-4 h-4" /> Novo Evento
              </Button>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Eventos</h2>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-inactive"
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                    <Label htmlFor="show-inactive">Mostrar inativos</Label>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum evento encontrado. {!showInactive && "Talvez existam eventos inativos."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              {event.isActive ? (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                  <Check className="w-3 h-3 mr-1" /> Ativo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  <X className="w-3 h-3 mr-1" /> Inativo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{event.title}</TableCell>
                            <TableCell>{formatDate(event.eventDate)}</TableCell>
                            <TableCell>{event.eventTime}</TableCell>
                            <TableCell>{event.location}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleEdit(event)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(event)}>
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Diálogo para criar novo evento */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do evento a ser adicionado ao calendário.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data*</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input type="date" {...field} />
                        </div>
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
                      <FormLabel>Hora*</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input type="time" {...field} />
                        </div>
                      </FormControl>
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
                    <FormLabel>Descrição*</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Evento Ativo</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label htmlFor="image">Imagem (opcional)</Label>
                  <div className="mt-1 flex items-center">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div className="mt-4">
                  <Label>Preview da Imagem</Label>
                  <div className="mt-1 flex justify-center border rounded-md p-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 rounded-md"
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? "Salvando..." : "Salvar Evento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar evento */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Atualize os detalhes do evento.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data*</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input type="date" {...field} />
                        </div>
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
                      <FormLabel>Hora*</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <Input type="time" {...field} />
                        </div>
                      </FormControl>
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
                    <FormLabel>Descrição*</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Evento Ativo</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label htmlFor="editImage">Imagem (opcional)</Label>
                  <div className="mt-1 flex items-center">
                    <Input
                      id="editImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div className="mt-4">
                  <Label>Preview da Imagem</Label>
                  <div className="mt-1 flex justify-center border rounded-md p-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 rounded-md"
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? "Atualizando..." : "Atualizar Evento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{currentEvent?.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (currentEvent) {
                deleteEventMutation.mutate(currentEvent.id);
              }
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteEventMutation.isPending ? "Excluindo..." : "Excluir Evento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Função para formatar data
function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    return dateString;
  }
}