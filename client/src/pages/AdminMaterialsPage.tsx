import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder, FileText, Edit, Trash2, Users, Eye, Lock, Upload, Download } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/utils';

interface MaterialFolder {
  id: number;
  name: string;
  description: string | null;
  creatorId: number;
  parentId: number | null;
  imageUrl: string | null;
  isPublic: boolean;
  groupIds: number[];
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
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadCount: number;
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

interface Group {
  id: number;
  name: string;
  description: string | null;
}

const folderSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  parentId: z.number().optional(),
  isPublic: z.boolean().default(false),
  groupIds: z.array(z.number()).default([]),
});

type FolderFormData = z.infer<typeof folderSchema>;

const fileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  folderId: z.number().optional(),
});

type FileFormData = z.infer<typeof fileSchema>;

export default function AdminMaterialsPage() {
  const [activeTab, setActiveTab] = useState('pastas');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MaterialFolder | null>(null);
  const [editingFile, setEditingFile] = useState<MaterialFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    queryFn: async () => {
      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Failed to fetch groups');
      return response.json();
    }
  });

  // Forms
  const folderForm = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: false,
      groupIds: [],
    },
  });

  const fileForm = useForm<FileFormData>({
    resolver: zodResolver(fileSchema),
    defaultValues: {
      name: '',
      description: '',
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

  const uploadFileMutation = useMutation({
    mutationFn: async (data: FileFormData & { file: File }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.folderId) formData.append('folderId', data.folderId.toString());

      const response = await fetch('/api/materials/files', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload file');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/files'] });
      setIsFileDialogOpen(false);
      setSelectedFile(null);
      fileForm.reset();
      toast({ title: 'Arquivo enviado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao enviar arquivo', variant: 'destructive' });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/materials/folders/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete folder');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/folders'] });
      setDeletingItem(null);
      toast({ title: 'Pasta excluída com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir pasta', variant: 'destructive' });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/materials/files/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete file');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials/files'] });
      setDeletingItem(null);
      toast({ title: 'Arquivo excluído com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir arquivo', variant: 'destructive' });
    },
  });

  // Handlers
  const handleEditFolder = (folder: MaterialFolder) => {
    setEditingFolder(folder);
    folderForm.reset({
      name: folder.name,
      description: folder.description || '',
      parentId: folder.parentId || undefined,
      isPublic: folder.isPublic,
      groupIds: folder.groupIds || [],
    });
    setIsFolderDialogOpen(true);
  };

  const handleEditFile = (file: MaterialFile) => {
    setEditingFile(file);
    fileForm.reset({
      name: file.name,
      description: file.description || '',
      folderId: file.folderId || undefined,
    });
    setIsFileDialogOpen(true);
  };

  const handleFolderSubmit = (data: FolderFormData) => {
    if (editingFolder) {
      updateFolderMutation.mutate({ id: editingFolder.id, data });
    } else {
      createFolderMutation.mutate(data);
    }
  };

  const handleFileSubmit = (data: FileFormData) => {
    if (!selectedFile) {
      toast({ title: 'Selecione um arquivo', variant: 'destructive' });
      return;
    }
    uploadFileMutation.mutate({ ...data, file: selectedFile });
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

  const closeFileDialog = () => {
    setIsFileDialogOpen(false);
    setEditingFile(null);
    setSelectedFile(null);
    fileForm.reset();
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
                              name="isPublic"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Público</FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                      Pasta visível para todos os usuários
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
                              <Badge variant={folder.isPublic ? 'default' : 'secondary'}>
                                {folder.isPublic ? (
                                  <><Eye className="w-3 h-3 mr-1" />Público</>
                                ) : (
                                  <><Lock className="w-3 h-3 mr-1" />Privado</>
                                )}
                              </Badge>
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
                                          setDeletingItem({ type: 'folder', id: folder.id });
                                          handleDelete();
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
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Enviar Arquivo</DialogTitle>
                        </DialogHeader>
                        <Form {...fileForm}>
                          <form onSubmit={fileForm.handleSubmit(handleFileSubmit)} className="space-y-4">
                            <div>
                              <Label htmlFor="file-upload">Arquivo</Label>
                              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <input
                                  id="file-upload"
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-600">
                                    {selectedFile ? selectedFile.name : 'Clique para selecionar um arquivo'}
                                  </p>
                                </label>
                              </div>
                            </div>
                            
                            <FormField
                              control={fileForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Nome do arquivo" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={fileForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Descrição</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Descrição do arquivo (opcional)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={fileForm.control}
                              name="folderId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pasta</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma pasta (opcional)" />
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
                            
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={closeFileDialog}>
                                Cancelar
                              </Button>
                              <Button type="submit" disabled={uploadFileMutation.isPending}>
                                Enviar
                              </Button>
                            </div>
                          </form>
                        </Form>
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
                                <FileText className="w-4 h-4 text-gray-600" />
                                {file.name}
                              </div>
                            </TableCell>
                            <TableCell>{file.description || '-'}</TableCell>
                            <TableCell>{file.folder?.name || 'Raiz'}</TableCell>
                            <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{file.fileType}</Badge>
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
                                  onClick={() => window.open(file.fileUrl, '_blank')}
                                >
                                  <Download className="w-4 h-4" />
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
                                          setDeletingItem({ type: 'file', id: file.id });
                                          handleDelete();
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
    </div>
  );
}