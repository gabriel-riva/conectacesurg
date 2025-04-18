import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="h-[280px] flex flex-col">
      <CardContent className="p-6 flex-grow">
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4">Meu Perfil</h2>
          
          <div className="mb-4">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage 
                src={user.photoUrl || undefined} 
                alt={user.name} 
              />
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-gray-500 text-sm mb-1">{user.email}</p>
            <Badge className="mt-1">{user.role}</Badge>
          </div>
          
          <Button asChild className="w-full" variant="outline">
            <Link href="/profile">Ver Perfil Completo</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}