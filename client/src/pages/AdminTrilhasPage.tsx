import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";

// Mock data for trilhas
const mockTrilhas = [
  {
    id: 1,
    title: "Introdução ao Portal CESURG",
    description: "Aprenda como navegar e usar todas as funcionalidades do Portal Conecta CESURG",
    category: "Básico",
    duration: "30 min",
    lessons: 5,
    participants: 156,
    isActive: true,
    isVisible: true,
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    title: "Comunidade e Colaboração",
    description: "Como participar ativamente da comunidade e contribuir com ideias e projetos",
    category: "Intermediário",
    duration: "45 min",
    lessons: 7,
    participants: 89,
    isActive: true,
    isVisible: true,
    createdAt: "2024-01-20"
  },
  {
    id: 3,
    title: "Gestão de Projetos Avançada",
    description: "Técnicas avançadas para gerenciar projetos e liderar equipes dentro do CESURG",
    category: "Avançado",
    duration: "60 min",
    lessons: 10,
    participants: 34,
    isActive: false,
    isVisible: false,
    createdAt: "2024-02-01"
  },
  {
    id: 4,
    title: "Inovação e Empreendedorismo",
    description: "Como transformar ideias em realidade e desenvolver o mindset empreendedor",
    category: "Especialização",
    duration: "90 min",
    lessons: 12,
    participants: 67,
    isActive: true,
    isVisible: true,
    createdAt: "2024-02-10"
  }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Básico":
      return "bg-green-100 text-green-800";
    case "Intermediário":
      return "bg-blue-100 text-blue-800";
    case "Avançado":
      return "bg-orange-100 text-orange-800";
    case "Especialização":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function AdminTrilhasPage() {
  const handleToggleVisibility = (id: number) => {
    console.log(`Toggling visibility for trilha ${id}`);
  };

  const handleToggleActive = (id: number) => {
    console.log(`Toggling active status for trilha ${id}`);
  };

  const handleEdit = (id: number) => {
    console.log(`Editing trilha ${id}`);
  };

  const handleDelete = (id: number) => {
    console.log(`Deleting trilha ${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <AdminSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">Gerenciar Trilhas</h1>
                <p className="text-muted-foreground">
                  Administre as trilhas de aprendizado disponíveis na plataforma
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Trilha
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{mockTrilhas.length}</p>
                      <p className="text-sm text-muted-foreground">Total de Trilhas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{mockTrilhas.filter(t => t.isActive).length}</p>
                      <p className="text-sm text-muted-foreground">Trilhas Ativas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{mockTrilhas.reduce((sum, t) => sum + t.participants, 0)}</p>
                      <p className="text-sm text-muted-foreground">Total de Participantes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">{mockTrilhas.reduce((sum, t) => sum + t.lessons, 0)}</p>
                      <p className="text-sm text-muted-foreground">Total de Aulas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trilhas Table */}
            <Card>
              <CardHeader>
                <CardTitle>Trilhas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTrilhas.map((trilha) => (
                    <div key={trilha.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{trilha.title}</h3>
                          <Badge className={getCategoryColor(trilha.category)}>
                            {trilha.category}
                          </Badge>
                          <Badge variant={trilha.isActive ? "default" : "secondary"}>
                            {trilha.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                          <Badge variant={trilha.isVisible ? "outline" : "destructive"}>
                            {trilha.isVisible ? "Visível" : "Oculta"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{trilha.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>⏱️ {trilha.duration}</span>
                          <span>📚 {trilha.lessons} aulas</span>
                          <span>👥 {trilha.participants} participantes</span>
                          <span>📅 {trilha.createdAt}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleVisibility(trilha.id)}
                        >
                          {trilha.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(trilha.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(trilha.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}