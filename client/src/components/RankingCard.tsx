import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RankingUser {
  id: number;
  name: string;
  points: number;
  avatar?: string;
}

export function RankingCard() {
  // Dados de exemplo - serão substituídos por dados reais da API
  const users: RankingUser[] = [
    { id: 1, name: "Carla Silva", points: 30 },
    { id: 2, name: "João Lopes", points: 30 },
    { id: 3, name: "Rodrigo Silveira", points: 30 },
    { id: 4, name: "Maria Domingues", points: 30 },
    { id: 5, name: "Carlos Lira", points: 30 },
    { id: 6, name: "Jessica Alves", points: 30 },
  ];

  return (
    <Card className="h-[300px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col" style={{ height: "calc(300px - 54px)" }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="px-3 py-1 h-auto text-xs rounded-md">
              Mês
            </Button>
            <Button variant="outline" size="sm" className="px-3 py-1 h-auto text-xs rounded-md">
              Ano
            </Button>
          </div>
          
          <Select defaultValue="curso">
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue placeholder="Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="curso">Curso</SelectItem>
              <SelectItem value="si">Sistemas de Informação</SelectItem>
              <SelectItem value="direito">Direito</SelectItem>
              <SelectItem value="adm">Administração</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100% - 60px)" }}>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 max-w-[75%]">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{user.name}</span>
                </div>
                <span className="text-primary text-sm font-medium ml-2">{user.points}pts</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-2 pt-2 text-right border-t border-gray-100">
          <a href="#" className="text-[#0D8A43] text-sm hover:underline">
            Ver tudo
          </a>
        </div>
      </CardContent>
    </Card>
  );
}