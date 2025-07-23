import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeatureGuard } from "@/components/FeatureGuard";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  UsersIcon, 
  CalendarIcon, 
  FileTextIcon, 
  TrendingUpIcon, 
  SettingsIcon,
  BookOpenIcon,
  MapPinIcon,
  UserCheckIcon,
  Filter,
  Clock,
  CheckCircle
} from "lucide-react";

interface Tool {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    description?: string;
    icon: string;
  };
  allowedUserCategories: number[];
  settings: any;
  createdAt: string;
  updatedAt: string;
}

interface ToolCategory {
  id: number;
  name: string;
  description?: string;
  icon: string;
}

// Função para mapear ícones por nome
const getIconByName = (iconName: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'users': <UsersIcon className="h-8 w-8" />,
    'calendar': <CalendarIcon className="h-8 w-8" />,
    'file-text': <FileTextIcon className="h-8 w-8" />,
    'trending-up': <TrendingUpIcon className="h-8 w-8" />,
    'settings': <SettingsIcon className="h-8 w-8" />,
    'book-open': <BookOpenIcon className="h-8 w-8" />,
    'map-pin': <MapPinIcon className="h-8 w-8" />,
    'user-check': <UserCheckIcon className="h-8 w-8" />,
    'default': <SettingsIcon className="h-8 w-8" />
  };
  
  return iconMap[iconName] || iconMap['default'];
};

// Função para mapear URL da ferramenta
const getToolUrl = (tool: Tool) => {
  // Mapear ferramentas específicas para suas rotas
  switch (tool.id) {
    case 1: // Aulas com Extensão
      return "/ferramentas/atividades-externas";
    default:
      return `/ferramentas/${tool.id}`;
  }
};

function FerramentasPageContent() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Buscar ferramentas ativas e categorias
  const { data: tools = [], isLoading: toolsLoading } = useQuery<Tool[]>({
    queryKey: ['/api/tools/user/accessible'],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ToolCategory[]>({
    queryKey: ['/api/tools/categories'],
  });

  // Buscar informações do usuário atual
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/status'],
  });

  // Filtrar ferramentas por categoria selecionada
  const filteredTools = selectedCategory === "all" 
    ? tools 
    : tools.filter(tool => tool.categoryId === parseInt(selectedCategory));

  // Agrupar ferramentas por categoria
  const toolsByCategory = categories.reduce((acc, category) => {
    const categoryTools = filteredTools.filter(tool => tool.categoryId === category.id);
    if (categoryTools.length > 0) {
      acc[category.id] = {
        category,
        tools: categoryTools
      };
    }
    return acc;
  }, {} as Record<number, { category: ToolCategory; tools: Tool[] }>);

  // Ferramentas sem categoria
  const uncategorizedTools = filteredTools.filter(tool => !tool.categoryId);

  if (toolsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Carregando ferramentas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ferramentas</h1>
          <p className="text-gray-600">
            Conjunto de ferramentas inteligentes para otimizar o ensino e gestão acadêmica
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrar por categoria:</span>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ferramentas agrupadas por categoria */}
        {Object.values(toolsByCategory).map(({ category, tools: categoryTools }) => (
          <div key={category.id} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {getIconByName(category.icon)}
              {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTools.map(tool => (
                <Card key={tool.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getIconByName(category.icon)}
                        <div>
                          <CardTitle className="text-lg">{tool.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={tool.isActive ? "default" : "secondary"}>
                              {tool.isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Ativo
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Inativo
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {tool.description || 'Ferramenta para otimização de processos acadêmicos.'}
                    </CardDescription>
                    <div className="flex justify-end">
                      {tool.isActive ? (
                        <Link href={getToolUrl(tool)}>
                          <Button>
                            Acessar Ferramenta
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled variant="secondary">
                          Em Breve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Ferramentas sem categoria */}
        {uncategorizedTools.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Outras Ferramentas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uncategorizedTools.map(tool => (
                <Card key={tool.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getIconByName('settings')}
                        <div>
                          <CardTitle className="text-lg">{tool.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={tool.isActive ? "default" : "secondary"}>
                              {tool.isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Ativo
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Inativo
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {tool.description || 'Ferramenta para otimização de processos acadêmicos.'}
                    </CardDescription>
                    <div className="flex justify-end">
                      {tool.isActive ? (
                        <Link href={getToolUrl(tool)}>
                          <Button>
                            Acessar Ferramenta
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled variant="secondary">
                          Em Breve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Mensagem quando não há ferramentas */}
        {tools.length === 0 && (
          <div className="text-center py-12">
            <SettingsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma ferramenta disponível
            </h3>
            <p className="text-gray-600">
              Não há ferramentas configuradas para sua categoria de usuário no momento.
            </p>
          </div>
        )}

        {/* Mensagem quando filtro não retorna resultados */}
        {tools.length > 0 && filteredTools.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma ferramenta encontrada
            </h3>
            <p className="text-gray-600">
              Não há ferramentas na categoria selecionada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FerramentasPage() {
  return (
    <FeatureGuard featureName="ferramentas">
      <FerramentasPageContent />
    </FeatureGuard>
  );
}