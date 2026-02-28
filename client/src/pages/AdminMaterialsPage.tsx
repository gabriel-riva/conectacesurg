import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder, FileText, Edit, Trash2, Eye, Upload, Download, Youtube } from 'lucide-react';
import { Header } from '@/components/Header';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminHeader } from '@/components/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import UploadFileDialog from '@/components/materials/UploadFileDialog';
import EditFileDialog from '@/components/materials/EditFileDialog';

interface UserCategory {
  id: number;
  name: string;
  color: string;
}

interface MaterialFolder {
  id: number;
  name: string;
  description: string | null;
  creatorId: number;
  parentId: number | null;
  imageUrl: string | null;
  isPublic: boolean;
  targetUserCategories: number[];
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: number;
    name: string;
    email: string;
    photoUrl: string | null;
  };
  children?: MaterialFolder[];
  files?: MaterialFile[];
}

interface MaterialFile {
  id: number;
  name: string;
  description: string | null;
  folderId: number | null;
  uploaderId: number;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string;
  fileSize: number;
  downloadCount: number;
  contentType?: string;
  youtubeUrl?: string;
  targetUserCategories?: number[];
  createdAt: Date;
  updatedAt: Date;
  uploader: {
    id: number;
    name: string;
    email: string;
    photoUrl: string | null;
  };
  folder?: {
    id: number;
    name: string;
  };
}

const folderSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  parentId: z.number().optional(),
  targetUserCategories: z.array(z.number()).default([]),
});

type FolderFormData = z.infer<typeof folderSchema>;



export default function AdminMaterialsPage() {
  const [activeTab, setActiveTab] = useState('pastas');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isEditFileDialogOpen, setIsEditFileDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MaterialFolder | null>(null);
  const [editingFile, setEditingFile] = useState<MaterialFile | null>(null);
  const [deletingItem, setDeletingItem] = useState<{type: 'folder' | 'file', id: number} | null>(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: folders = [], isLoading: foldersLoading } = useQuery<MaterialFolder[]>({
    queryKey: ['/api/materials/folders'],
    queryFn: async () => {
      const response = await fetch('/api/materials/folders');
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    }
  });

  const { data: files = [], isLoading: filesLoading } = useQuery<MaterialFile[]>({
    queryKey: ['/api/materials/files'],
    queryFn: async () => {
      const response = await fetch('/api/materials/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    }
  });

  const { data: userCategories = [] } = useQuery<UserCategory[]>({
    queryKey: ['/api/user-categories'],
    queryFn: async () => {
      const response = await fetch('/api/user-categories');
      if (!response.ok) throw new Error('Failed to fetch user categories');
      return response.json();
    }
  });

  // Forms
  const folderForm = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: '',
      description: '',
      targetUserCategories: [],
    },
  });



  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: async (data: FolderFormData) => {
      const response = await fetch('/api/materials/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create folder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/folders'] });
      setIsFolderDialogOpen(false);
      folderForm.reset();
      toast({ title: 'Pasta criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar pasta', variant: 'destructive' });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FolderFormData }) => {
      const response = await fetch(`/api/materials/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update folder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/folders'] });
      setIsFolderDialogOpen(false);
      setEditingFolder(null);
      folderForm.reset();
      toast({ title: 'Pasta atualizada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar pasta', variant: 'destructive' });
    },
  });



  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/materials/folders/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/folders'] });
      toast({ title: 'Pasta excluída com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir pasta', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Tentando excluir arquivo no frontend:', id);
      try {
        const result = await apiRequest(`/api/materials/files/${id}`, { method: 'DELETE' });
        console.log('Arquivo excluído com sucesso no frontend:', result);
        return result;
      } catch (error) {
        console.error('Erro ao excluir arquivo no frontend:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/files'] });
      toast({ title: 'Arquivo excluído com sucesso' });
    },
    onError: (error: any) => {
      console.error('Erro na mutação de exclusão:', error);
      toast({ title: 'Erro ao excluir arquivo', description: error.message, variant: 'destructive' });
    },
  });

  // Handlers
  const handleEditFolder = (folder: MaterialFolder) => {
    setEditingFolder(folder);
    folderForm.reset({
      name: folder.name,
      description: folder.description || '',
      parentId: folder.parentId || undefined,
      targetUserCategories: folder.targetUserCategories || [],
    });
    setIsFolderDialogOpen(true);
  };

  const handleFolderSubmit = (data: FolderFormData) => {
    if (editingFolder) {
      updateFolderMutation.mutate({ id: editingFolder.id, data });
    } else {
      createFolderMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (!deletingItem) return;

    if (deletingItem.type === 'folder') {
      deleteFolderMutation.mutate(deletingItem.id);
    } else {
      deleteFileMutation.mutate(deletingItem.id);
    }
  };

  const closeFolderDialog = () => {
    setIsFolderDialogOpen(false);
    setEditingFolder(null);
    folderForm.reset();
  };

  // Helper to get category names for a folder
  const getCategoryBadges = (folder: MaterialFolder) => {
    if (!folder.targetUserCategories || folder.targetUserCategories.length === 0) {
      return <Badge variant="default"><Eye className="w-3 h-3 mr-1" />Visível para todos</Badge>;
    }
    return folder.targetUserCategories.map((catId) => {
      const category = userCategories.find(c => c.id === catId);
      if (!category) return null;
      return (
        <Badge key={catId} variant="secondary" className="mr-1">
          <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: category.color }} />
          {category.name}
        </Badge>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex flex-1 bg-gray-100">
        <AdminSidebar />

        <div className="flex-1 p-8">
          <AdminHeader
            title="Gerenciamento de Materiais"
            description="Gerencie pastas e arquivos do repositório de materiais."
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="pastas">Pastas</TabsTrigger>
              <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
            </TabsList>

            <TabsContent value="pastas">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Pastas</CardTitle>
                    <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Nova Pasta
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {editingFolder ? 'Editar Pasta' : 'Nova Pasta'}
                          </DialogTitle>
                        </DialogHeader>
                        <Form {...folderForm}>
                          <form onSubmit={folderForm.handleSubmit(handleFolderSubmit)} className="space-y-4">
                            <FormField
                              control={folderForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Nome da pasta" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={folderForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Descrição</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Descrição da pasta (opcional)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={folderForm.control}
                              name="parentId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pasta Pai</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma pasta pai (opcional)" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="null">Nenhuma (raiz)</SelectItem>
                                      {folders.map((folder) => (
                                        <SelectItem key={folder.id} value={folder.id.toString()}>
                                          {folder.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={folderForm.control}
                              name="targetUserCategories"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Visibilidade por Categoria</FormLabel>
                                  <div className="text-sm text-muted-foreground mb-2">
                                    Se nenhuma categoria for selecionada, a pasta será visível para todos os usuários.
                                  </div>
                                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                                    {userCategories.map((category) => (
                                      <div key={category.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`folder-category-${category.id}`}
                                          checked={field.value.includes(category.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.onChange([...field.value, category.id]);
                                            } else {
                                              field.onChange(field.value.filter((id: number) => id !== category.id));
                                            }
                                          }}
                                        />
                                        <label
                                          htmlFor={`folder-category-${category.id}`}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                        >
                                          <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: category.color }}
                                          />
                                          {category.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={closeFolderDialog}>
                                Cancelar
                              </Button>
                              <Button type="submit" disabled={createFolderMutation.isPending || updateFolderMutation.isPending}>
                                {editingFolder ? 'Atualizar' : 'Criar'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {foldersLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Visibilidade</TableHead>
                          <TableHead>Criador</TableHead>
                          <TableHead>Criado em</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
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
                            <TableCell>{folder.description || '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getCategoryBadges(folder)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={folder.creator.photoUrl || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {folder.creator.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{folder.creator.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{new Date(folder.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditFolder(folder)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir a pasta "{folder.name}"? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          deleteFolderMutation.mutate(folder.id);
                                        }}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="arquivos">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Arquivos</CardTitle>
                    <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Upload className="w-4 h-4 mr-2" />
                          Enviar Arquivo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <UploadFileDialog
                          folderId={null}
                          onSuccess={() => setIsFileDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {filesLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Pasta</TableHead>
                          <TableHead>Tamanho</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Visibilidade</TableHead>
                          <TableHead>Uploader</TableHead>
                          <TableHead>Downloads</TableHead>
                          <TableHead>Enviado em</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {file.fileType === 'video/youtube' ? (
                                  <Youtube className="w-4 h-4 text-red-600" />
                                ) : (
                                  <FileText className="w-4 h-4 text-gray-600" />
                                )}
                                {file.name}
                              </div>
                            </TableCell>
                            <TableCell>{file.description || '-'}</TableCell>
                            <TableCell>{file.folder?.name || 'Raiz'}</TableCell>
                            <TableCell>{file.fileType === 'video/youtube' ? 'Vídeo YouTube' : formatFileSize(file.fileSize)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{file.fileType}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getCategoryBadges({ targetUserCategories: file.targetUserCategories || [] } as any)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={file.uploader.photoUrl || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {file.uploader.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{file.uploader.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{file.downloadCount}</TableCell>
                            <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (file.fileType === 'video/youtube' && file.youtubeUrl) {
                                      window.open(file.youtubeUrl, '_blank');
                                    } else {
                                      window.open(file.fileUrl || '', '_blank');
                                    }
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingFile(file);
                                    setIsEditFileDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o arquivo "{file.name}"? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          deleteFileMutation.mutate(file.id);
                                        }}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Diálogo de edição de arquivo */}
      {editingFile && (
        <Dialog open={isEditFileDialogOpen} onOpenChange={setIsEditFileDialogOpen}>
          <DialogContent className="max-w-2xl">
            <EditFileDialog
              file={editingFile}
              onSuccess={() => {
                setIsEditFileDialogOpen(false);
                setEditingFile(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
