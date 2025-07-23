import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Filter, Settings, Calendar, Brain, Wrench, Edit, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Tipos
interface ToolCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isActive: boolean;
}

interface Tool {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  allowedUserCategories: number[];
  settings?: any;
  category?: {
    id: number;
    name: string;
    color: string;
    icon: string;
  };
}

interface UserCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

// Schemas
const toolCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  color: z.string().default("#3B82F6"),
  icon: z.string().default("settings"),
  isActive: z.boolean().default(true),
});

const toolSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  categoryId: z.number().optional(),
  allowedUserCategories: z.array(z.number()).default([]),
  isActive: z.boolean().default(true),
  settings: z.any().optional(),
});

type ToolCategoryFormData = z.infer<typeof toolCategorySchema>;
type ToolFormData = z.infer<typeof toolSchema>;

// Helper para ícones
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'calendar': return Calendar;
    case 'brain-circuit': return Brain;
    case 'settings': return Settings;
    default: return Wrench;
  }
};

export default function AdminFerramentasPage() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [editingCategory, setEditingCategory] = useState<ToolCategory | null>(null);
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);
  const { toast } = useToast();

  // Queries
  const { data: tools = [], isLoading: toolsLoading } = useQuery<Tool[]>({
    queryKey: ['/api/admin/tools'],
  });

  const { data: categories = [] } = useQuery<ToolCategory[]>({
    queryKey: ['/api/admin/tools/categories'],
  });

  const { data: userCategories = [] } = useQuery<UserCategory[]>({
    queryKey: ['/api/user-categories'],
  });

  // Forms
  const categoryForm = useForm<ToolCategoryFormData>({
    resolver: zodResolver(toolCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "settings",
      isActive: true,
    },
  });

  const toolForm = useForm<ToolFormData>({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: undefined,
      allowedUserCategories: [],
      isActive: true,
      settings: {},
    },
  });

  // Filtros
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           (tool.category?.id.toString() === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Handlers
  const handleCreateCategory = async (data: ToolCategoryFormData) => {
    try {
      const url = editingCategory ? `/api/admin/tools/categories/${editingCategory.id}` : '/api/admin/tools/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({ 
          title: editingCategory ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!" 
        });
        setCategoryDialogOpen(false);
        setEditingCategory(null);
        categoryForm.reset();
        // Invalidar query para recarregar dados
        window.location.reload();
      }
    } catch (error) {
      toast({ 
        title: editingCategory ? "Erro ao atualizar categoria" : "Erro ao criar categoria", 
        variant: "destructive" 
      });
    }
  };

  const handleEditCategory = (category: ToolCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      color: category.color,
      icon: category.icon,
      isActive: category.isActive,
    });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tools/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: "Categoria excluída com sucesso!" });
        window.location.reload();
      } else {
        toast({ title: "Erro ao excluir categoria", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro ao excluir categoria", variant: "destructive" });
    }
  };

  const handleCreateTool = async (data: ToolFormData) => {
    try {
      const url = editingTool ? `/api/admin/tools/${editingTool.id}` : '/api/admin/tools';
      const method = editingTool ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({ 
          title: editingTool ? "Ferramenta atualizada com sucesso!" : "Ferramenta criada com sucesso!" 
        });
        setToolDialogOpen(false);
        setEditingTool(null);
        toolForm.reset();
        // Invalidar query para recarregar dados
        window.location.reload();
      }
    } catch (error) {
      toast({ 
        title: editingTool ? "Erro ao atualizar ferramenta" : "Erro ao criar ferramenta", 
        variant: "destructive" 
      });
    }
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
    toolForm.reset({
      name: tool.name,
      description: tool.description || "",
      categoryId: tool.category?.id,
      allowedUserCategories: tool.allowedUserCategories,
      isActive: tool.isActive,
      settings: tool.settings || {},
    });
    setToolDialogOpen(true);
  };

  const handleOpenTool = (toolId: number) => {
    setLocation(`/admin/ferramentas/tool/${toolId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Ferramentas</h1>
                <p className="text-gray-600">Gerencie ferramentas e categorias do sistema</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setCategoryManagementOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Gerenciar Categorias
                </Button>

                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? "Editar Categoria de Ferramenta" : "Nova Categoria de Ferramenta"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCategory ? "Edite os dados da categoria" : "Crie uma nova categoria para organizar as ferramentas"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nome da categoria" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Descrição da categoria" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={categoryForm.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cor</FormLabel>
                                <FormControl>
                                  <Input {...field} type="color" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={categoryForm.control}
                            name="icon"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ícone</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o ícone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="calendar">Calendário</SelectItem>
                                    <SelectItem value="brain-circuit">IA</SelectItem>
                                    <SelectItem value="settings">Configurações</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setCategoryDialogOpen(false);
                              setEditingCategory(null);
                              categoryForm.reset();
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit">
                            {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                {/* Diálogo de Gerenciamento de Categorias */}
                <Dialog open={categoryManagementOpen} onOpenChange={setCategoryManagementOpen}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Gerenciar Categorias de Ferramentas</DialogTitle>
                      <DialogDescription>
                        Visualize, edite ou exclua categorias existentes
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {categories.length === 0 ? (
                        <div className="text-center py-8">
                          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma categoria encontrada</h3>
                          <p className="text-gray-600">Crie a primeira categoria de ferramenta.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {categories.map((category) => {
                            const IconComponent = getIconComponent(category.icon);
                            return (
                              <Card key={category.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: category.color }}
                                      >
                                        <IconComponent className="w-5 h-5 text-white" />
                                      </div>
                                      <div>
                                        <h4 className="font-medium">{category.name}</h4>
                                        <p className="text-sm text-gray-600">{category.description || "Sem descrição"}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant={category.isActive ? "default" : "secondary"} className="text-xs">
                                            {category.isActive ? "Ativa" : "Inativa"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleEditCategory(category)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleDeleteCategory(category.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setCategoryManagementOpen(false)}
                      >
                        Fechar
                      </Button>
                      <Button
                        onClick={() => {
                          setCategoryManagementOpen(false);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Categoria
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={toolDialogOpen} onOpenChange={setToolDialogOpen}>
                  <DialogTrigger asChild>
                    <Button style={{ display: 'none' }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Ferramenta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTool ? "Editar Ferramenta" : "Nova Ferramenta"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTool ? "Edite os dados da ferramenta" : "Crie uma nova ferramenta no sistema"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...toolForm}>
                      <form onSubmit={toolForm.handleSubmit(handleCreateTool)} className="space-y-4">
                        <FormField
                          control={toolForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nome da ferramenta" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={toolForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Descrição da ferramenta" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={toolForm.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a categoria" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={toolForm.control}
                          name="allowedUserCategories"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categorias de Usuários Permitidas</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-600">
                                    Deixe em branco para permitir todos os usuários
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {userCategories.map((category) => (
                                      <div key={category.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`category-${category.id}`}
                                          checked={field.value.includes(category.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.onChange([...field.value, category.id]);
                                            } else {
                                              field.onChange(field.value.filter((id) => id !== category.id));
                                            }
                                          }}
                                        />
                                        <label htmlFor={`category-${category.id}`} className="text-sm">
                                          {category.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={toolForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Ativa</FormLabel>
                                <p className="text-sm text-gray-600">
                                  Determina se a ferramenta está disponível para uso
                                </p>
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
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setToolDialogOpen(false);
                              setEditingTool(null);
                              toolForm.reset();
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit">
                            {editingTool ? "Salvar Alterações" : "Criar Ferramenta"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar ferramentas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid de Ferramentas */}
            {toolsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Carregando ferramentas...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool) => {
                  const IconComponent = tool.category ? getIconComponent(tool.category.icon) : Wrench;
                  
                  return (
                    <Card key={tool.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: tool.category?.color || '#6B7280' }}
                            >
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{tool.name}</CardTitle>
                              {tool.category && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {tool.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Badge variant={tool.isActive ? "default" : "secondary"} className="text-xs">
                              {tool.isActive ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4 min-h-[40px]">
                          {tool.description || "Sem descrição"}
                        </CardDescription>
                        
                        {tool.allowedUserCategories.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-700 mb-2">Acesso restrito a:</p>
                            <div className="flex flex-wrap gap-1">
                              {tool.allowedUserCategories.map((categoryId) => {
                                const category = userCategories.find(c => c.id === categoryId);
                                return category ? (
                                  <Badge key={categoryId} variant="outline" className="text-xs">
                                    {category.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleOpenTool(tool.id)}
                          >
                            Abrir
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditTool(tool)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {filteredTools.length === 0 && !toolsLoading && (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ferramenta encontrada</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== "all" 
                    ? "Tente ajustar os filtros de busca" 
                    : "Comece criando sua primeira ferramenta"}
                </p>
                {!searchTerm && selectedCategory === "all" && (
                  <Button onClick={() => setToolDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeira ferramenta
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}