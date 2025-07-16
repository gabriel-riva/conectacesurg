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
    <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Ranking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col items-center justify-center" style={{ height: "calc(280px - 54px)" }}>
        <div className="text-center text-gray-500">
          <p className="text-base font-medium">Em breve</p>
          <p className="text-sm mt-1">Esta funcionalidade será implementada em breve</p>
        </div>
      </CardContent>
    </Card>
  );
}