import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Edit, Eye, Folder, BookOpen, ClipboardList } from "lucide-react";
import { UserCategory } from "@shared/schema";

interface MaterialFolder {
  id: number;
  name: string;
  description: string | null;
  targetUserCategories: number[];
  isPublic: boolean;
}

interface Trail {
  id: number;
  title: string;
  description: string | null;
  targetUserCategories: number[];
  isPublished: boolean;
  categoryId: number | null;
  isActive: boolean;
  order: number;
  imageUrl?: string | null;
}

interface Survey {
  id: number;
  title: string;
  description: string | null;
  targetUserCategories: number[];
  isActive: boolean;
}

export function AdminAccessManagement() {
  const [accessTab, setAccessTab] = useState("materiais");
  const [editingResource, setEditingResource] = useState<{
    type: "folder" | "trail" | "survey";
    id: number;
    name: string;
    targetUserCategories: number[];
  } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const { toast } = useToast();

  // Fetch user categories
  const { data: userCategories = [] } = useQuery<UserCategory[]>({
    queryKey: ["/api/user-categories"],
  });

  // Fetch material folders
  const { data: folders = [], isLoading: foldersLoading } = useQuery<MaterialFolder[]>({
    queryKey: ["/api/materials/folders"],
    queryFn: async () => {
      const response = await fetch("/api/materials/folders");
      if (!response.ok) throw new Error("Failed to fetch folders");
      return response.json();
    },
  });

  // Fetch trails (admin)
  const { data: trails = [], isLoading: trailsLoading } = useQuery<Trail[]>({
    queryKey: ["/api/trails/admin/all"],
    queryFn: async () => {
      const response = await fetch("/api/trails/admin/all");
      if (!response.ok) throw new Error("Failed to fetch trails");
      return response.json();
    },
  });

  // Fetch surveys (admin)
  const { data: surveys = [], isLoading: surveysLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    queryFn: async () => {
      const response = await fetch("/api/surveys");
      if (!response.ok) throw new Error("Failed to fetch surveys");
      return response.json();
    },
  });

  // Mutation for updating folder access
  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, targetUserCategories }: { id: number; targetUserCategories: number[] }) => {
      const folder = folders.find(f => f.id === id);
      const response = await fetch(`/api/materials/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folder?.name,
          description: folder?.description,
          targetUserCategories,
        }),
      });
      if (!response.ok) throw new Error("Failed to update folder");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials/folders"] });
      toast({ title: "Acesso da pasta atualizado com sucesso" });
      setEditingResource(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar acesso da pasta", variant: "destructive" });
    },
  });

  // Mutation for updating trail access
  const updateTrailMutation = useMutation({
    mutationFn: async ({ id, targetUserCategories }: { id: number; targetUserCategories: number[] }) => {
      const trail = trails.find(t => t.id === id);
      const response = await fetch(`/api/trails/admin/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trail?.title,
          description: trail?.description,
          categoryId: trail?.categoryId,
          isPublished: trail?.isPublished,
          isActive: trail?.isActive,
          order: trail?.order,
          imageUrl: trail?.imageUrl,
          targetUserCategories,
        }),
      });
      if (!response.ok) throw new Error("Failed to update trail");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trails/admin/all"] });
      toast({ title: "Acesso da trilha atualizado com sucesso" });
      setEditingResource(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar acesso da trilha", variant: "destructive" });
    },
  });

  // Mutation for updating survey access
  const updateSurveyMutation = useMutation({
    mutationFn: async ({ id, targetUserCategories }: { id: number; targetUserCategories: number[] }) => {
      const survey = surveys.find(s => s.id === id);
      const response = await fetch(`/api/surveys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: survey?.title,
          description: survey?.description,
          isActive: survey?.isActive,
          targetUserCategories,
        }),
      });
      if (!response.ok) throw new Error("Failed to update survey");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({ title: "Acesso da pesquisa atualizado com sucesso" });
      setEditingResource(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar acesso da pesquisa", variant: "destructive" });
    },
  });

  const handleEdit = (type: "folder" | "trail" | "survey", id: number, name: string, targetUserCategories: number[]) => {
    setEditingResource({ type, id, name, targetUserCategories });
    setSelectedCategories(targetUserCategories || []);
  };

  const handleSave = () => {
    if (!editingResource) return;

    switch (editingResource.type) {
      case "folder":
        updateFolderMutation.mutate({ id: editingResource.id, targetUserCategories: selectedCategories });
        break;
      case "trail":
        updateTrailMutation.mutate({ id: editingResource.id, targetUserCategories: selectedCategories });
        break;
      case "survey":
        updateSurveyMutation.mutate({ id: editingResource.id, targetUserCategories: selectedCategories });
        break;
    }
  };

  const renderCategoryBadges = (targetUserCategories: number[]) => {
    if (!targetUserCategories || targetUserCategories.length === 0) {
      return (
        <Badge variant="default">
          <Eye className="w-3 h-3 mr-1" />
          Visível para todos
        </Badge>
      );
    }
    return targetUserCategories.map((catId) => {
      const category = userCategories.find((c) => c.id === catId);
      if (!category) return null;
      return (
        <Badge key={catId} variant="secondary" className="mr-1 mb-1">
          <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: category.color || undefined }} />
          {category.name}
        </Badge>
      );
    });
  };

  const isSaving = updateFolderMutation.isPending || updateTrailMutation.isPending || updateSurveyMutation.isPending;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Gestão de Acessos</h2>
          <p className="text-gray-600 mb-4">
            Configure a visibilidade dos recursos por categoria de usuário. Recursos sem categorias selecionadas são visíveis para todos.
          </p>

          <Tabs value={accessTab} onValueChange={setAccessTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="materiais" className="flex items-center gap-1">
                <Folder className="w-4 h-4" />
                Materiais
              </TabsTrigger>
              <TabsTrigger value="trilhas" className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                Trilhas
              </TabsTrigger>
              <TabsTrigger value="pesquisas" className="flex items-center gap-1">
                <ClipboardList className="w-4 h-4" />
                Pesquisas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="materiais">
              {foldersLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  Nenhuma pasta de material encontrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasta</TableHead>
                      <TableHead>Categorias com acesso</TableHead>
                      <TableHead className="w-20">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {folders.map((folder) => (
                      <TableRow key={folder.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4 text-blue-600" />
                            {folder.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {renderCategoryBadges(folder.targetUserCategories || [])}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit("folder", folder.id, folder.name, folder.targetUserCategories || [])}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="trilhas">
              {trailsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : trails.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  Nenhuma trilha encontrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trilha</TableHead>
                      <TableHead>Categorias com acesso</TableHead>
                      <TableHead className="w-20">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trails.map((trail) => (
                      <TableRow key={trail.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-green-600" />
                            {trail.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {renderCategoryBadges(trail.targetUserCategories || [])}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit("trail", trail.id, trail.title, trail.targetUserCategories || [])}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="pesquisas">
              {surveysLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : surveys.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  Nenhuma pesquisa encontrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pesquisa</TableHead>
                      <TableHead>Categorias com acesso</TableHead>
                      <TableHead className="w-20">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-purple-600" />
                            {survey.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {renderCategoryBadges(survey.targetUserCategories || [])}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit("survey", survey.id, survey.title, survey.targetUserCategories || [])}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Acesso: {editingResource?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Visibilidade por Categoria</label>
              <div className="text-sm text-muted-foreground mb-2">
                Se nenhuma categoria for selecionada, o recurso será visível para todos os usuários.
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {userCategories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`access-category-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories([...selectedCategories, category.id]);
                        } else {
                          setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`access-category-${category.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color || undefined }}
                      />
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingResource(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
