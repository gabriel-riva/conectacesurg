import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

export function HomeProfile() {
  const { user } = useAuth();

  // Função para obter as iniciais do nome do usuário
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="mb-4">Faça login para ver seu perfil</p>
            <Button asChild>
              <Link href="/">Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Meu Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="flex flex-col">
          
          <div className="flex items-center mb-4">
            <Avatar className="h-14 w-14 border-2 border-primary">
              <AvatarImage 
                src={user.photoUrl || undefined} 
                alt={user.name} 
              />
              <AvatarFallback className="text-sm">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="ml-4">
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
          
          {/* Área vazia para futuras adições */}
          <div className="flex-grow mb-4">
            {/* Espaço reservado para futuro conteúdo */}
          </div>
          
          <Button asChild className="w-full mt-auto" variant="outline">
            <Link href="/profile">Ver Perfil Completo</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}