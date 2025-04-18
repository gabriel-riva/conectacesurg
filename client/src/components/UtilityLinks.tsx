import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { UtilityLink } from "@shared/schema";
import { useAuth } from "@/lib/auth";

export function UtilityLinks() {
  // Obter informações do usuário logado
  const { user } = useAuth();
  
  // Buscar links úteis da API
  const { data: links, isLoading } = useQuery<UtilityLink[]>({
    queryKey: ['/api/utility-links'],
    refetchOnWindowFocus: false,
  });
  
  // Função para processar a URL do link
  const getProcessedUrl = (url: string) => {
    // Verificar se é um link do Gmail e substituir pelo link com o email do usuário
    if (url.includes('mail.google.com') && user?.email) {
      // Formatar URL do Gmail para abrir a caixa de entrada do usuário
      return `https://mail.google.com/mail/u/${user.email}`;
    }
    
    // Se não for um link especial, retorna a URL original
    return url;
  };

  // Renderizar estado de carregamento
  if (isLoading) {
    return (
      <Card className="h-[280px] shadow-md border-none overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            Links Úteis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4" style={{ height: "calc(280px - 54px)" }}>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center p-2">
                <Skeleton className="h-8 w-8 rounded-full mr-3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderizar mensagem se não houver links
  if (!links || links.length === 0) {
    return (
      <Card className="h-[280px] shadow-md border-none overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            Links Úteis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4" style={{ height: "calc(280px - 54px)" }}>
          <p className="text-gray-500 text-center py-4">
            Nenhum link útil disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Renderizar os links
  return (
    <Card className="h-[280px] shadow-md hover:shadow-lg transition-shadow duration-300 border-none overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Links Úteis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4" style={{ height: "calc(280px - 54px)" }}>
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.id}>
              <a 
                href={getProcessedUrl(link.url)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center p-2 hover:bg-gray-50 rounded-md transition-colors group"
              >
                {link.logoUrl ? (
                  <img 
                    src={link.logoUrl} 
                    alt={link.title} 
                    className="w-8 h-8 object-contain mr-3"
                  />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full mr-3">
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <span className="flex-1 font-medium">{link.title}</span>
                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}