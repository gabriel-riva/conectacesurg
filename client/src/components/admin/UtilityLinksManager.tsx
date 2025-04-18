import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UtilityLink } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, Edit, Trash2, Plus, Upload, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function UtilityLinksManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<UtilityLink | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    order: 0,
    logoFile: null as File | null,
  });
  
  // Buscar links úteis
  const { data: links, isLoading } = useQuery<UtilityLink[]>({
    queryKey: ['/api/utility-links'],
    refetchOnWindowFocus: false,
  });

  // Mutation para criar link
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest<UtilityLink>("POST", "/api/utility-links", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/utility-links'] });
      toast({
        title: "Link criado",
        description: "O link útil foi criado com sucesso."
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao criar link:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o link. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar link
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await apiRequest<UtilityLink>("PUT", `/api/utility-links/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/utility-links'] });
      toast({
        title: "Link atualizado",
        description: "O link útil foi atualizado com sucesso.",
      });
      resetForm();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao atualizar link:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o link. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir link
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/utility-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/utility-links'] });
      toast({
        title: "Link excluído",
        description: "O link útil foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao excluir link:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o link. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar status do link
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const formData = new FormData();
      formData.append("isActive", isActive.toString());
      
      const response = await apiRequest<UtilityLink>("PUT", `/api/utility-links/${id}`, formData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/utility-links'] });
      toast({
        title: "Status atualizado",
        description: "O status do link foi alterado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do link. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para mudar ordem dos links
  const changeOrderMutation = useMutation({
    mutationFn: async ({ id, order }: { id: number; order: number }) => {
      const formData = new FormData();
      formData.append("order", order.toString());
      
      const response = await apiRequest<UtilityLink>("PUT", `/api/utility-links/${id}`, formData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/utility-links'] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar ordem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reordenar o link. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Handler para alternar status do link
  const handleToggleStatus = (link: UtilityLink) => {
    toggleStatusMutation.mutate({ id: link.id, isActive: !link.isActive });
  };

  // Handler para mover link para cima
  const handleMoveUp = (link: UtilityLink, index: number) => {
    if (index > 0 && links) {
      const newOrder = links[index - 1].order || 0;
      changeOrderMutation.mutate({ id: link.id, order: newOrder });
    }
  };

  // Handler para mover link para baixo
  const handleMoveDown = (link: UtilityLink, index: number) => {
    if (links && index < links.length - 1) {
      const newOrder = links[index + 1].order || 0;
      changeOrderMutation.mutate({ id: link.id, order: newOrder });
    }
  };

  // Handler para adicionar link
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append("title", formData.title);
    data.append("url", formData.url);
    data.append("order", formData.order.toString());
    if (formData.logoFile) {
      data.append("logo", formData.logoFile);
    }
    
    createMutation.mutate(data);
  };

  // Handler para editar link
  const handleEditLink = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLink) return;
    
    const data = new FormData();
    if (formData.title) data.append("title", formData.title);
    if (formData.url) data.append("url", formData.url);
    if (formData.logoFile) data.append("logo", formData.logoFile);
    
    updateMutation.mutate({ id: selectedLink.id, data });
  };

  // Handler para excluir link
  const handleDeleteLink = (link: UtilityLink) => {
    if (confirm(`Tem certeza que deseja excluir o link "${link.title}"?`)) {
      deleteMutation.mutate(link.id);
    }
  };

  // Handler para abrir o modal de edição
  const openEditDialog = (link: UtilityLink) => {
    setSelectedLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      order: link.order || 0,
      logoFile: null,
    });
    setIsEditDialogOpen(true);
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      title: "",
      url: "",
      order: 0,
      logoFile: null,
    });
    setSelectedLink(null);
  };

  // Handler para alteração de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, logoFile: e.target.files[0] });
    }
  };

  // Renderizar estado de carregamento
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Links Úteis</CardTitle>
          <CardDescription>
            Adicione, edite ou remova links úteis exibidos na página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar links por ordem
  const sortedLinks = [...(links || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Links Úteis</CardTitle>
        <CardDescription>
          Adicione, edite ou remova links úteis exibidos na página inicial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedLinks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Nenhum link cadastrado ainda.</p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Link Útil</DialogTitle>
                  <DialogDescription>
                    Preencha os campos abaixo para adicionar um novo link útil.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddLink}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        type="url"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="logo">Logo (opcional)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("logo")?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {formData.logoFile ? "Trocar Logo" : "Upload Logo"}
                        </Button>
                        {formData.logoFile && (
                          <span className="text-sm text-gray-500">
                            {formData.logoFile.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button 
                      type="submit"
                      disabled={!formData.title || !formData.url || createMutation.isPending}
                    >
                      {createMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Link Útil</DialogTitle>
                    <DialogDescription>
                      Preencha os campos abaixo para adicionar um novo link útil.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddLink}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                          id="url"
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          type="url"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="logo">Logo (opcional)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("logo")?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {formData.logoFile ? "Trocar Logo" : "Upload Logo"}
                          </Button>
                          {formData.logoFile && (
                            <span className="text-sm text-gray-500">
                              {formData.logoFile.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button 
                        type="submit" 
                        disabled={!formData.title || !formData.url || createMutation.isPending}
                      >
                        {createMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Logo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-[100px] text-center">Ativo</TableHead>
                  <TableHead className="w-[120px] text-center">Ordem</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLinks.map((link, index) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      {link.logoUrl ? (
                        <img 
                          src={link.logoUrl} 
                          alt={link.title} 
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{link.title}</TableCell>
                    <TableCell>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center max-w-[200px] truncate"
                      >
                        <span className="truncate">{link.url}</span>
                        <ExternalLink className="w-3 h-3 ml-1 inline-block flex-shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={link.isActive}
                        onCheckedChange={() => handleToggleStatus(link)}
                        aria-label={link.isActive ? "Ativo" : "Inativo"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveUp(link, index)}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveDown(link, index)}
                          disabled={index === sortedLinks.length - 1}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(link)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLink(link)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Modal de edição */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Link Útil</DialogTitle>
                  <DialogDescription>
                    Atualize as informações do link útil.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditLink}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-title">Título</Label>
                      <Input
                        id="edit-title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-url">URL</Label>
                      <Input
                        id="edit-url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        type="url"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-logo">
                        Logo {selectedLink?.logoUrl && "(mantém a atual se não alterar)"}
                      </Label>
                      {selectedLink?.logoUrl && (
                        <div className="mb-2">
                          <img 
                            src={selectedLink.logoUrl} 
                            alt={selectedLink.title} 
                            className="w-16 h-16 object-contain border rounded p-1"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          id="edit-logo"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("edit-logo")?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {formData.logoFile ? "Trocar Logo" : "Upload Logo"}
                        </Button>
                        {formData.logoFile && (
                          <span className="text-sm text-gray-500">
                            {formData.logoFile.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button 
                      type="submit" 
                      disabled={!formData.title || !formData.url || updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}