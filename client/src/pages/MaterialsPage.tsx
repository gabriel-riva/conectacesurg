import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder, FileText, Search, Download, Eye, Lock, Users, Calendar, User, Home, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/utils';
import { Header } from '@/components/Header';

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
}

export default function MaterialsPage() {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleFolderClick = (folderId: number) => {
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

  // Construir breadcrumbs para navegação
  const buildBreadcrumbs = () => {
    const breadcrumbs = [];
    let currentFolder = currentFolderId;
    
    while (currentFolder !== null) {
      const folder = folders.find(f => f.id === currentFolder);
      if (folder) {
        breadcrumbs.unshift(folder);
        currentFolder = folder.parentId;
      } else {
        break;
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  // Filtrar pastas pela pasta atual e pelo termo de busca
  const filteredFolders = folders.filter(folder => {
    const matchesSearch = folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      folder.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Mostrar apenas pastas filhas da pasta atual
    const matchesParent = folder.parentId === currentFolderId;
    
    return matchesSearch && matchesParent;
  });

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Mostrar apenas arquivos da pasta atual
    const matchesFolder = file.folderId === currentFolderId;
    
    return matchesSearch && matchesFolder;
  });

  const isLoading = foldersLoading || filesLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Materiais</h1>
          <p className="text-gray-600">Repositório de documentos e arquivos da comunidade</p>
        </div>

        {/* Breadcrumbs */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <button
              onClick={() => setCurrentFolderId(null)}
              className="flex items-center hover:text-gray-700 transition-colors"
            >
              <Home className="w-4 h-4 mr-1" />
              Início
            </button>
            {breadcrumbs.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="w-4 h-4 mx-1" />
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-700 font-medium">{folder.name}</span>
                ) : (
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="hover:text-gray-700 transition-colors"
                  >
                    {folder.name}
                  </button>
                )}
              </div>
            ))}
          </div>
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
          <div className="space-y-8">
            {/* Folders */}
            {filteredFolders.length > 0 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFolders.map((folder) => (
                    <Card 
                      key={folder.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleFolderClick(folder.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {folder.imageUrl ? (
                            <img 
                              src={folder.imageUrl} 
                              alt={folder.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                              <Folder className="w-6 h-6 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <CardTitle className="text-lg">{folder.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{folder.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {folder.isPublic ? (
                              <Eye className="w-4 h-4 text-green-600" />
                            ) : (
                              <Lock className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Folder className="w-4 h-4" />
                              {folder.children?.length || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {folder.files?.length || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={folder.creator.photoUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {folder.creator.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{folder.creator.name}</span>
                          </div>
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
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Arquivos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{file.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(file)}
                            className="ml-2"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-4">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span className="flex items-center gap-1">
                              <Download className="w-4 h-4" />
                              {file.downloadCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={file.uploader.photoUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {file.uploader.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{file.uploader.name}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {file.fileType}
                          </Badge>
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
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Folder className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhum material encontrado
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Tente buscar com outros termos' : 'Não há materiais disponíveis no momento'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}