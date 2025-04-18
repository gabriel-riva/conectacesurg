import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { UtilityLink } from "@shared/schema";

export function UtilityLinks() {
  // Buscar links úteis da API
  const { data: links, isLoading } = useQuery<UtilityLink[]>({
    queryKey: ['/api/utility-links'],
    refetchOnWindowFocus: false,
  });

  // Renderizar estado de carregamento
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Links Úteis</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
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
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Links Úteis</h2>
          <p className="text-gray-500 text-center py-4">
            Nenhum link útil disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Renderizar os links
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Links Úteis</h2>
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.id}>
              <a 
                href={link.url} 
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