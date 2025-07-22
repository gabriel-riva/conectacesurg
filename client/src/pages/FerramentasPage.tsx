import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UsersIcon, 
  CalendarIcon, 
  FileTextIcon, 
  TrendingUpIcon, 
  SettingsIcon,
  BookOpenIcon,
  MapPinIcon,
  UserCheckIcon
} from "lucide-react";

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  status: 'available' | 'coming_soon' | 'beta';
  category: 'education' | 'management' | 'analysis' | 'automation';
}

const tools: Tool[] = [
  {
    id: 'external-activities',
    title: 'Atividades com Convidados Externos',
    description: 'Assistente para criação e gestão de projetos de aulas com convidados externos, visitas técnicas e eventos acadêmicos.',
    icon: <UserCheckIcon className="h-8 w-8" />,
    href: '/ferramentas/atividades-externas',
    status: 'available',
    category: 'education'
  },
  {
    id: 'lesson-planner',
    title: 'Planejador de Aulas com IA',
    description: 'Geração automática de planos de aula, atividades e avaliações usando inteligência artificial.',
    icon: <BookOpenIcon className="h-8 w-8" />,
    href: '/ferramentas/planejador-aulas',
    status: 'coming_soon',
    category: 'education'
  },
  {
    id: 'attendance-tracker',
    title: 'Controle de Presença',
    description: 'Sistema automatizado para registro e acompanhamento de presença em aulas e eventos.',
    icon: <UsersIcon className="h-8 w-8" />,
    href: '/ferramentas/controle-presenca',
    status: 'coming_soon',
    category: 'management'
  },
  {
    id: 'schedule-optimizer',
    title: 'Otimizador de Horários',
    description: 'Ferramenta inteligente para otimização de cronogramas e agendamento de recursos.',
    icon: <CalendarIcon className="h-8 w-8" />,
    href: '/ferramentas/otimizador-horarios',
    status: 'coming_soon',
    category: 'management'
  },
  {
    id: 'report-generator',
    title: 'Gerador de Relatórios',
    description: 'Criação automática de relatórios acadêmicos e administrativos com análises detalhadas.',
    icon: <FileTextIcon className="h-8 w-8" />,
    href: '/ferramentas/gerador-relatorios',
    status: 'coming_soon',
    category: 'analysis'
  },
  {
    id: 'performance-analytics',
    title: 'Analytics de Performance',
    description: 'Análise avançada de performance acadêmica e engagement dos estudantes.',
    icon: <TrendingUpIcon className="h-8 w-8" />,
    href: '/ferramentas/analytics-performance',
    status: 'beta',
    category: 'analysis'
  }
];

const categoryLabels = {
  education: 'Educação',
  management: 'Gestão',
  analysis: 'Análise',
  automation: 'Automação'
};

const statusLabels = {
  available: 'Disponível',
  coming_soon: 'Em Breve',
  beta: 'Beta'
};

const statusColors = {
  available: 'bg-green-100 text-green-800',
  coming_soon: 'bg-yellow-100 text-yellow-800',
  beta: 'bg-blue-100 text-blue-800'
};

export default function FerramentasPage() {
  const categories = Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ferramentas</h1>
        <p className="text-gray-600">
          Conjunto de ferramentas inteligentes para otimizar o ensino e gestão acadêmica
        </p>
      </div>

      {categories.map(category => {
        const categoryTools = tools.filter(tool => tool.category === category);
        if (categoryTools.length === 0) return null;

        return (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {categoryLabels[category]}
            </h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {categoryTools.map(tool => (
                <Card key={tool.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-conecta-blue/10 rounded-lg text-conecta-blue">
                          {tool.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tool.title}</CardTitle>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[tool.status]}`}>
                              {statusLabels[tool.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {tool.description}
                    </CardDescription>
                    
                    {tool.status === 'available' ? (
                      <Link href={tool.href}>
                        <Button className="w-full bg-conecta-blue hover:bg-conecta-blue/90">
                          Acessar Ferramenta
                        </Button>
                      </Link>
                    ) : (
                      <Button disabled className="w-full">
                        {tool.status === 'coming_soon' ? 'Em Breve' : 'Acesso Beta'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Sugestão de novas ferramentas */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sugerir Nova Ferramenta
        </h3>
        <p className="text-gray-600 mb-4">
          Tem alguma ideia para uma nova ferramenta que poderia ajudar no ensino ou gestão acadêmica?
        </p>
        <Link href="/ideias">
          <Button variant="outline">
            Enviar Sugestão
          </Button>
        </Link>
      </div>
    </div>
  );
}