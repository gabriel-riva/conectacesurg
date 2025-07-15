import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder, FileText, Plus, Upload, Search, Edit, Trash2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateFolderDialog from '@/components/materials/CreateFolderDialog';
import UploadFileDialog from '@/components/materials/UploadFileDialog';
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
  _count: {
    subfolders: number;
    files: number;
  };
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
}

export default function MaterialsPage() {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);

  const { data: folders = [], isLoading: foldersLoading } = useQuery<MaterialFolder[]>({
    queryKey: ['/api/materials/folders', currentFolderId],
    queryFn: async () => {
      const url = currentFolderId 
        ? `/api/materials/folders/${currentFolderId}/subfolders`
        : '/api/materials/folders';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch folders');
      return response.json();
    }
  });

  const { data: files = [], isLoading: filesLoading } = useQuery<MaterialFile[]>({
    queryKey: ['/api/materials/files', currentFolderId],
    queryFn: async () => {
      const url = currentFolderId 
        ? `/api/materials/folders/${currentFolderId}/files`
        : '/api/materials/files';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    }
  });

  const { data: currentFolder } = useQuery<MaterialFolder>({
    queryKey: ['/api/materials/folders', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return null;
      const response = await fetch(`/api/materials/folders/${currentFolderId}`);
      if (!response.ok) throw new Error('Failed to fetch folder');
      return response.json();
    },
    enabled: !!currentFolderId
  });

  const { data: breadcrumbs = [] } = useQuery<MaterialFolder[]>({
    queryKey: ['/api/materials/breadcrumbs', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return [];
      const response = await fetch(`/api/materials/folders/${currentFolderId}/breadcrumbs`);
      if (!response.ok) throw new Error('Failed to fetch breadcrumbs');
      return response.json();
    },
    enabled: !!currentFolderId
  });

  const handleFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    if (currentFolder?.parentId) {
      setCurrentFolderId(currentFolder.parentId);
    } else {
      setCurrentFolderId(null);
    }
  };

  const handleBreadcrumbClick = (folderId: number | null) => {
    setCurrentFolderId(folderId);
  };

  const handleDownload = async (file: MaterialFile) => {
    try {
      const response = await fetch(`/api/materials/files/${file.id}/download`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to download file');
      
      // Open file in new tab
      window.open(file.fileUrl, '_blank');
      
      toast({
        title: 'Download iniciado',
        description: `Download de ${file.fileName} iniciado com sucesso.`
      });
    } catch (error) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível fazer o download do arquivo.',
        variant: 'destructive'
      });
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = foldersLoading || filesLoading;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Materiais</h1>
          <p className="text-gray-600">Repositório de documentos e arquivos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button>
                <Folder className="w-4 h-4 mr-2" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateFolderDialog 
                parentId={currentFolderId}
                onSuccess={() => setIsCreateFolderOpen(false)}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isUploadFileOpen} onOpenChange={setIsUploadFileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload Arquivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <UploadFileDialog 
                folderId={currentFolderId}
                onSuccess={() => setIsUploadFileOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleBreadcrumbClick(null)}
          className="text-blue-600 hover:text-blue-800"
        >
          Início
        </Button>
        {breadcrumbs.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <span className="text-gray-400">/</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBreadcrumbClick(folder.id)}
              className="text-blue-600 hover:text-blue-800"
            >
              {folder.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar pastas e arquivos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {filteredFolders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Pastas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFolders.map((folder) => (
                  <Card key={folder.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader 
                      className="pb-2"
                      onClick={() => handleFolderClick(folder.id)}
                    >
                      <div className="flex items-center gap-3">
                        {folder.imageUrl ? (
                          <img 
                            src={folder.imageUrl} 
                            alt={folder.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                            <Folder className="w-6 h-6 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-sm">{folder.name}</CardTitle>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {folder._count.subfolders} pasta(s)
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {folder._count.files} arquivo(s)
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {folder.description && (
                        <p className="text-sm text-gray-600 mb-2">{folder.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={folder.creator.photoUrl || ''} />
                          <AvatarFallback>{folder.creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <span>{folder.creator.name}</span>
                        <span>•</span>
                        <span>{new Date(folder.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {filteredFiles.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Arquivos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file) => (
                  <Card key={file.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                          <FileText className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm">{file.name}</CardTitle>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {file.fileType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatFileSize(file.fileSize)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {file.description && (
                        <p className="text-sm text-gray-600 mb-2">{file.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={file.uploader.photoUrl || ''} />
                            <AvatarFallback>{file.uploader.name[0]}</AvatarFallback>
                          </Avatar>
                          <span>{file.uploader.name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(file)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {file.downloadCount} download(s) • {new Date(file.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredFolders.length === 0 && filteredFiles.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Folder className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Pasta vazia'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Tente buscar com outros termos'
                  : 'Comece criando uma nova pasta ou fazendo upload de arquivos'
                }
              </p>
              {!searchTerm && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setIsCreateFolderOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Pasta
                  </Button>
                  <Button variant="outline" onClick={() => setIsUploadFileOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Arquivo
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}