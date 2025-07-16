import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Pencil, Plus, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

const announcementSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  isActive: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

type Announcement = {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    name: string;
    email: string;
  };
};



export default function AdminAnnouncementsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);


  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      isActive: true,
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: "",
    },
  });

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["/api/announcements", { includeInactive }],
    queryFn: async () => {
      const response = await fetch(`/api/announcements?includeInactive=${includeInactive}`);
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }
      return response.json() as Promise<Announcement[]>;
    },
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      return apiRequest("/api/announcements", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Sucesso!",
        description: "Aviso criado com sucesso.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao criar aviso.",
        variant: "destructive",
      });
    },
  });

  // Update announcement mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData & { id: number }) => {
      return apiRequest(`/api/announcements/${data.id}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Sucesso!",
        description: "Aviso atualizado com sucesso.",
      });
      setIsEditDialogOpen(false);
      setSelectedAnnouncement(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao atualizar aviso.",
        variant: "destructive",
      });
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/announcements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Sucesso!",
        description: "Aviso excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao excluir aviso.",
        variant: "destructive",
      });
    },
  });



  const handleSubmit = (data: AnnouncementFormData) => {
    if (selectedAnnouncement) {
      updateMutation.mutate({ ...data, id: selectedAnnouncement.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    form.reset({
      title: announcement.title,
      content: announcement.content,
      isActive: announcement.isActive,
      startDate: announcement.startDate ? format(new Date(announcement.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      endDate: announcement.endDate ? format(new Date(announcement.endDate), "yyyy-MM-dd'T'HH:mm") : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este aviso?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    setSelectedAnnouncement(null);
    form.reset();
    setIsCreateDialogOpen(true);
  };

  const AnnouncementForm = () => (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Digite o título do aviso"
        />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="content">Conteúdo</Label>
        <Textarea
          id="content"
          {...form.register("content")}
          placeholder="Digite o conteúdo do aviso"
          rows={5}
        />
        {form.formState.errors.content && (
          <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Data de Início</Label>
          <Input
            id="startDate"
            type="datetime-local"
            {...form.register("startDate")}
          />
        </div>

        <div>
          <Label htmlFor="endDate">Data de Fim (opcional)</Label>
          <Input
            id="endDate"
            type="datetime-local"
            {...form.register("endDate")}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={form.watch("isActive")}
          onCheckedChange={(checked) => form.setValue("isActive", checked)}
        />
        <Label htmlFor="isActive">Ativo</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
          }}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1 bg-gray-100">
        <AdminSidebar />
        
        <div className="flex-1 p-8">
          <AdminHeader
            title="Gerenciamento de Avisos"
            description="Crie e gerencie avisos que aparecem na página inicial do portal."
          />
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeInactive"
                  checked={includeInactive}
                  onCheckedChange={setIncludeInactive}
                />
                <Label htmlFor="includeInactive">Incluir inativos</Label>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateNew} className="btn-primary flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Aviso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Aviso</DialogTitle>
                </DialogHeader>
                <AnnouncementForm />
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <Badge variant={announcement.isActive ? "default" : "secondary"}>
                          {announcement.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">{announcement.content}</p>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div>
                        <p>Por: {announcement.creator.name}</p>
                        <p>Criado: {format(new Date(announcement.createdAt), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                      <div className="text-right">
                        <p>Início: {format(new Date(announcement.startDate), "dd/MM/yyyy HH:mm")}</p>
                        {announcement.endDate && (
                          <p>Fim: {format(new Date(announcement.endDate), "dd/MM/yyyy HH:mm")}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {announcements.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">Nenhum aviso encontrado</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Aviso</DialogTitle>
          </DialogHeader>
          <AnnouncementForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}