import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarEventList } from "./CalendarEventCard";
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { CalendarClock, MapPin, ExternalLink } from "lucide-react";
import googleCalendarIcon from "@assets/Google_Icons-03-512.webp";

export function CalendarCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar/upcoming"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/calendar/upcoming?limit=3");
        if (!response.ok) {
          throw new Error("Erro ao buscar eventos do calendário");
        }
        return response.json() as Promise<CalendarEvent[]>;
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
        return [];
      }
    },
  });

  // Formatar data para exibição
  const formatEventDate = (dateString: string, detailed = false) => {
    try {
      const date = new Date(dateString);
      if (detailed) {
        return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
      return format(date, "dd/MM/yy", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };
  
  // Função para criar URL do Google Calendar
  const createGoogleCalendarUrl = (event: CalendarEvent) => {
    try {
      // Parse da data e hora
      const eventDate = new Date(event.eventDate);
      const [hours, minutes] = event.eventTime.split(':');
      const startDate = new Date(eventDate);
      startDate.setHours(parseInt(hours), parseInt(minutes), 0);
      
      // Define a data de término como 1 hora após o início
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      
      // Formatando datas para o formato do Google Calendar (YYYYMMDDTHHMMSS)
      const formatGoogleCalendarDate = (date: Date) => {
        return format(date, "yyyyMMdd'T'HHmmss");
      };
      
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`,
        details: event.description,
        location: event.location,
      });
      
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch (error) {
      console.error('Erro ao criar URL do Google Calendar:', error);
      return '#';
    }
  };
  
  // Função para parar a propagação do evento de clique
  const handleClickWithoutClosing = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-primary/90 flex items-center">
            <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
            Calendário
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex flex-col" style={{ height: "calc(280px - 54px)" }}>
          <div className="overflow-y-auto flex-grow" style={{ maxHeight: "calc(100% - 30px)" }}>
            {isLoading ? (
              <>
                {[1, 2, 3].map((index) => (
                  <div key={index} className="border-t border-gray-100 pt-2 pb-1 mb-1">
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </>
            ) : events.length === 0 ? (
              <div className="border-t border-gray-100 pt-2 text-center text-muted-foreground text-sm">
                Nenhum evento agendado.
              </div>
            ) : (
              <>
                {events.map((event) => (
                  <Dialog key={event.id}>
                    <DialogTrigger asChild>
                      <div className="border-t border-gray-100 pt-1 mb-1 cursor-pointer hover:bg-slate-50 rounded p-1">
                        <div className="text-xs text-muted-foreground">
                          {formatEventDate(event.eventDate)} - {event.eventTime}
                        </div>
                        <div className="font-medium text-sm flex items-center justify-between">
                          <span>{event.title}</span>
                          <a 
                            href={createGoogleCalendarUrl(event)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleClickWithoutClosing}
                            title="Adicionar ao Google Calendar"
                            className="ml-1"
                          >
                            <img src={googleCalendarIcon} alt="Google Calendar" className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{event.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="flex items-start gap-2">
                          <CalendarClock className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <div className="font-medium">Data e Hora</div>
                            <div className="text-muted-foreground">
                              {formatEventDate(event.eventDate, true)} - {event.eventTime}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <div className="font-medium">Local</div>
                            <div className="text-muted-foreground">{event.location}</div>
                          </div>
                        </div>
                        <div className="pt-2">
                          <div className="font-medium mb-1">Descrição</div>
                          <div className="text-sm text-muted-foreground">
                            {event.description}
                          </div>
                        </div>
                        {event.imageUrl && (
                          <div className="pt-2">
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              className="rounded-md max-h-[300px] w-auto mx-auto object-contain"
                            />
                          </div>
                        )}
                        
                        <div className="pt-4 flex items-center justify-between gap-2">
                          <a 
                            href={createGoogleCalendarUrl(event)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                            onClick={handleClickWithoutClosing}
                          >
                            <img src={googleCalendarIcon} alt="Google Calendar" className="w-5 h-5" />
                            Adicionar ao Google Calendar
                          </a>
                          
                          {event.externalUrl && (
                            <a 
                              href={event.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                              onClick={handleClickWithoutClosing}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Mais detalhes
                            </a>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </>
            )}
          </div>
          <div className="mt-2 pt-2 text-right border-t border-gray-100">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="text-primary text-sm hover:underline bg-transparent border-none cursor-pointer p-0">
                  Ver tudo
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Calendário de Eventos</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <CalendarEventList />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}