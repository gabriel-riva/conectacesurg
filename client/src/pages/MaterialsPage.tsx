import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder, Search, Download, Eye, Lock, Users, Calendar, User, Home, ChevronRight, FileText, Youtube } from 'lucide-react';
import { 
  BsFiletypePdf, 
  BsFiletypeDoc, 
  BsFiletypeDocx, 
  BsFiletypeXls, 
  BsFiletypeXlsx, 
  BsFiletypePpt, 
  BsFiletypePptx,
  BsFiletypeJson,
  BsFiletypeJs,
  BsFiletypeHtml,
  BsFiletypeCss,
  BsFiletypeTxt,
  BsFiletypeMp4,
  BsFiletypeMp3,
  BsFiletypePng,
  BsFiletypeJpg,
  BsFiletypeGif,
  BsFiletypeSvg,
  BsFileEarmark,
  BsFileZip,
  BsFileMusic,
  BsFilePlay,
  BsFileImage
} from 'react-icons/bs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/utils';
import { Header } from '@/components/Header';
import FileViewerModal from '@/components/materials/FileViewerModal';

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
  fileUrl: string | null;
  fileName: string | null;
  fileType: string;
  fileSize: number;
  downloadCount: number;
  contentType?: string;
  youtubeUrl?: string;
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
  const [viewerFile, setViewerFile] = useState<MaterialFile | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

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
      // Para vídeos do YouTube, abrir em nova aba
      if (file.fileType === 'video/youtube' && file.youtubeUrl) {
        window.open(file.youtubeUrl, '_blank');
        toast({
          title: 'Vídeo aberto',
          description: 'Vídeo do YouTube aberto em nova aba.'
        });
        return;
      }
      
      // Use fetch to download with proper authentication and error handling
      const response = await fetch(`/api/materials/files/${file.id}/download`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Você precisa estar logado para baixar arquivos.');
        } else if (response.status === 403) {
          throw new Error('Você não tem permissão para baixar este arquivo.');
        } else if (response.status === 404) {
          throw new Error('Arquivo não encontrado.');
        } else {
          throw new Error('Erro no servidor ao processar o download.');
        }
      }
      
      // Get the file blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName || 'download';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Download iniciado',
        description: `Download de ${file.fileName} iniciado com sucesso.`
      });
    } catch (error) {
      console.error('Erro no download:', error);
      toast({
        title: 'Erro no download',
        description: error instanceof Error ? error.message : 'Não foi possível fazer o download do arquivo.',
        variant: 'destructive'
      });
    }
  };

  const handlePreview = (file: MaterialFile) => {
    setViewerFile(file);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setViewerFile(null);
  };

  // Função para retornar o ícone correto baseado no tipo de arquivo
  const getFileIcon = (file: MaterialFile) => {
    const fileType = file.fileType.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Para vídeos do YouTube, mostrar ícone do YouTube
    if (fileType === 'video/youtube') {
      return <Youtube className="w-8 h-8 text-red-600" />;
    }
    
    // Para imagens, mostrar a própria imagem como miniatura
    if (fileType.startsWith('image/')) {
      return (
        <img 
          src={`/api/materials/files/${file.id}/view`}
          alt={file.name}
          className="w-8 h-8 object-cover rounded"
          onError={(e) => {
            // Fallback para ícone se a imagem não carregar
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    // Ícones específicos por tipo de arquivo
    if (fileType === 'application/pdf') {
      return <BsFiletypePdf className="w-8 h-8 text-red-600" />;
    } else if (fileType.includes('word') || fileType.includes('msword') || fileName.endsWith('.doc')) {
      return <BsFiletypeDoc className="w-8 h-8 text-blue-600" />;
    } else if (fileType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
      return <BsFiletypeDocx className="w-8 h-8 text-blue-600" />;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileName.endsWith('.xls')) {
      return <BsFiletypeXls className="w-8 h-8 text-green-600" />;
    } else if (fileType.includes('spreadsheetml') || fileName.endsWith('.xlsx')) {
      return <BsFiletypeXlsx className="w-8 h-8 text-green-600" />;
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation') || fileName.endsWith('.ppt')) {
      return <BsFiletypePpt className="w-8 h-8 text-orange-600" />;
    } else if (fileType.includes('presentationml') || fileName.endsWith('.pptx')) {
      return <BsFiletypePptx className="w-8 h-8 text-orange-600" />;
    } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive') || fileName.endsWith('.zip')) {
      return <BsFileZip className="w-8 h-8 text-yellow-600" />;
    } else if (fileType === 'application/json' || fileName.endsWith('.json')) {
      return <BsFiletypeJson className="w-8 h-8 text-purple-600" />;
    } else if (fileType === 'text/javascript' || fileName.endsWith('.js')) {
      return <BsFiletypeJs className="w-8 h-8 text-yellow-500" />;
    } else if (fileType === 'text/html' || fileName.endsWith('.html')) {
      return <BsFiletypeHtml className="w-8 h-8 text-orange-500" />;
    } else if (fileType === 'text/css' || fileName.endsWith('.css')) {
      return <BsFiletypeCss className="w-8 h-8 text-blue-500" />;
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return <BsFiletypeTxt className="w-8 h-8 text-gray-600" />;
    } else if (fileName.endsWith('.mp4')) {
      return <BsFiletypeMp4 className="w-8 h-8 text-red-500" />;
    } else if (fileName.endsWith('.mp3')) {
      return <BsFiletypeMp3 className="w-8 h-8 text-green-500" />;
    } else if (fileType.startsWith('video/')) {
      return <BsFilePlay className="w-8 h-8 text-red-500" />;
    } else if (fileType.startsWith('audio/')) {
      return <BsFileMusic className="w-8 h-8 text-green-500" />;
    } else if (fileName.endsWith('.png')) {
      return <BsFiletypePng className="w-8 h-8 text-blue-500" />;
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      return <BsFiletypeJpg className="w-8 h-8 text-blue-500" />;
    } else if (fileName.endsWith('.gif')) {
      return <BsFiletypeGif className="w-8 h-8 text-blue-500" />;
    } else if (fileName.endsWith('.svg')) {
      return <BsFiletypeSvg className="w-8 h-8 text-blue-500" />;
    } else {
      return <BsFileEarmark className="w-8 h-8 text-gray-600" />;
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
      file.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Mostrar apenas arquivos da pasta atual
    const matchesFolder = file.folderId === currentFolderId;
    
    return matchesSearch && matchesFolder;
  });

  const isLoading = foldersLoading || filesLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto p-6">
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

        {/* Breadcrumbs */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-lg text-gray-600">
            <button
              onClick={() => setCurrentFolderId(null)}
              className="flex items-center hover:text-gray-800 transition-colors font-medium"
            >
              <Home className="w-5 h-5 mr-2" />
              Início
            </button>
            {breadcrumbs.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="w-5 h-5 mx-2" />
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-800 font-semibold text-xl">{folder.name}</span>
                ) : (
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="hover:text-gray-800 transition-colors font-medium"
                  >
                    {folder.name}
                  </button>
                )}
              </div>
            ))}
          </div>
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
                          <div className="flex items-center gap-2">
                            {!folder.isPublic && (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-xs">
                              {folder.isPublic ? 'Pasta pública' : 'Pasta privada'}
                            </span>
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
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center relative">
                            {getFileIcon(file)}
                            {/* Fallback icon para imagens que não carregam */}
                            {file.fileType.startsWith('image/') && (
                              <div className="hidden">
                                {file.name.toLowerCase().endsWith('.png') && <BsFiletypePng className="w-8 h-8 text-blue-500" />}
                                {file.name.toLowerCase().endsWith('.jpg') && <BsFiletypeJpg className="w-8 h-8 text-blue-500" />}
                                {file.name.toLowerCase().endsWith('.jpeg') && <BsFiletypeJpg className="w-8 h-8 text-blue-500" />}
                                {file.name.toLowerCase().endsWith('.gif') && <BsFiletypeGif className="w-8 h-8 text-blue-500" />}
                                {file.name.toLowerCase().endsWith('.svg') && <BsFiletypeSvg className="w-8 h-8 text-blue-500" />}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{file.name}</CardTitle>
                            {file.description && (
                              <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePreview(file)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(file)}
                              className="flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
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
      
      {/* File Viewer Modal */}
      <FileViewerModal
        file={viewerFile}
        open={viewerOpen}
        onClose={handleCloseViewer}
        onDownload={handleDownload}
      />
    </div>
  );
}