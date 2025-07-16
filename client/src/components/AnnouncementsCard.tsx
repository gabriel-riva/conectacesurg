import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, X } from "lucide-react";

type Announcement = {
  id: number;
  title: string;
  content: string;
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

export function AnnouncementsCard() {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isAllAnnouncementsDialogOpen, setIsAllAnnouncementsDialogOpen] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["/api/announcements/active"],
    queryFn: async () => {
      const response = await fetch("/api/announcements/active?limit=3");
      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }
      return response.json() as Promise<Announcement[]>;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: allAnnouncements = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["/api/announcements/all-active"],
    queryFn: async () => {
      const response = await fetch("/api/announcements/active");
      if (!response.ok) {
        throw new Error("Failed to fetch all announcements");
      }
      return response.json() as Promise<Announcement[]>;
    },
    enabled: isAllAnnouncementsDialogOpen,
  });

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const handleReadMore = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
  };

  const handleViewAll = () => {
    setIsAllAnnouncementsDialogOpen(true);
  };

  return (
    <>
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
                <div key={announcement.id} className="border-t border-gray-100 pt-3 mb-3">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">
                    {announcement.title}
                  </h4>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {truncateContent(announcement.content)}
                    {announcement.content.length > 100 && (
                      <button
                        onClick={() => handleReadMore(announcement)}
                        className="text-[#0D8A43] hover:underline ml-1"
                      >
                        ler mais...
                      </button>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {announcement.creator.name}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(announcement.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
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
            <button
              onClick={handleViewAll}
              className="text-[#0D8A43] text-sm hover:underline"
            >
              Ver tudo
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Modal "Ler mais" */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedAnnouncement?.title}</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedAnnouncement(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="whitespace-pre-wrap text-sm text-gray-700">
              {selectedAnnouncement?.content}
            </div>
            <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t">
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {selectedAnnouncement?.creator.name}
              </span>
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {selectedAnnouncement && format(new Date(selectedAnnouncement.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal "Ver tudo" */}
      <Dialog open={isAllAnnouncementsDialogOpen} onOpenChange={setIsAllAnnouncementsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Todos os Avisos</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsAllAnnouncementsDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingAll ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : allAnnouncements.length > 0 ? (
              allAnnouncements.map((announcement) => (
                <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-base text-gray-900 mb-2">
                    {announcement.title}
                  </h4>
                  
                  <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                    {announcement.content}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {announcement.creator.name}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(announcement.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Não há avisos no momento
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}