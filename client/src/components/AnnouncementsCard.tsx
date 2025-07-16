import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle, Info, AlertTriangle, ExternalLink } from "lucide-react";

type Announcement = {
  id: number;
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "error";
  priority: number;
  imageUrl?: string;
  externalUrl?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  creator: {
    id: number;
    name: string;
    email: string;
  };
};

const typeIcons = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

const typeColors = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

export function AnnouncementsCard() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["/api/announcements/active"],
    queryFn: async () => {
      const response = await fetch("/api/announcements/active?limit=5");
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }
      return response.json() as Promise<Announcement[]>;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const handleAnnouncementClick = (announcement: Announcement) => {
    if (announcement.externalUrl) {
      window.open(announcement.externalUrl, "_blank");
    }
  };

  return (
    <Card className="h-[500px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Avisos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col" style={{ height: "calc(500px - 54px)" }}>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100% - 30px)" }}>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : announcements.length > 0 ? (
            announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className={`border-t border-gray-100 pt-3 mb-3 ${
                  announcement.externalUrl ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-md' : ''
                }`}
                onClick={() => handleAnnouncementClick(announcement)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={`${typeColors[announcement.type]} text-xs`}>
                      {typeIcons[announcement.type]}
                      <span className="ml-1 capitalize">{announcement.type}</span>
                    </Badge>
                    {announcement.priority >= 4 && (
                      <Badge variant="destructive" className="text-xs">
                        Prioridade {announcement.priority}
                      </Badge>
                    )}
                  </div>
                  {announcement.externalUrl && (
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                
                <h4 className="font-medium text-sm text-gray-900 mb-1">
                  {announcement.title}
                </h4>
                
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {announcement.content}
                </p>
                
                {announcement.imageUrl && (
                  <div className="mb-2">
                    <img 
                      src={announcement.imageUrl} 
                      alt={announcement.title}
                      className="w-12 h-12 object-cover rounded-md"
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>Por: {announcement.creator.name}</span>
                  <span>{format(new Date(announcement.createdAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center border-none rounded-md bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner" style={{ height: "170px" }}>
              <div className="text-gray-300 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                Não há avisos no momento
              </p>
            </div>
          )}
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