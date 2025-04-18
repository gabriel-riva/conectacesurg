import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@shared/schema";
import { CalendarClock, CalendarIcon, MapPin, ExternalLink } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import googleCalendarIcon from "@assets/Google_Icons-03-512.webp";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarEventList() {
  const [filterFuture, setFilterFuture] = useState(true);
  
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar/upcoming"],
    queryFn: async () => {
      try {
        // Usar o mesmo endpoint que o card principal, mas sem limite para mostrar todos
        const response = await fetch("/api/calendar/upcoming?days=365");
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

  // Filtrar eventos por data
  const filteredEvents = filterFuture 
    ? events.filter(event => {
        const eventDate = new Date(event.eventDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return isAfter(eventDate, today) || isSameDay(eventDate, today);
      })
    : events;

  // Ordenar eventos por data (mais próximos primeiro)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
  });

  function isSameDay(date1: Date, date2: Date) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Eventos</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={filterFuture ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterFuture(true)}
          >
            Próximos eventos
          </Button>
          <Button
            variant={!filterFuture ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterFuture(false)}
          >
            Todos os eventos
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card key={index} className="h-[200px]">
              <CardContent className="p-4 flex flex-col h-full">
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <div className="flex-grow"></div>
                <Skeleton className="h-8 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {filterFuture
            ? "Não há eventos agendados para o futuro."
            : "Não há eventos cadastrados."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedEvents.map((event) => (
            <CalendarEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EventsCalendarCard() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar/upcoming"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/calendar/upcoming?limit=5");
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

  return (
    <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
            Próximos Eventos
          </h3>
        </div>

        <div className="overflow-y-auto flex-grow">
          {isLoading ? (
            <>
              {[1, 2, 3].map((index) => (
                <div key={index} className="mb-3">
                  <Skeleton className="h-5 w-3/4 mb-1" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </>
          ) : events.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Não há eventos agendados.
            </div>
          ) : (
            <>
              {events.map((event) => (
                <div key={event.id} className="mb-3 border-b pb-2 last:border-b-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer hover:bg-slate-50 p-1 rounded-md">
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <CalendarClock className="mr-1 h-3 w-3" />
                          {formatEventDate(event.eventDate)} - {event.eventTime}
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{event.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 mt-4">
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
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 pt-2 text-right border-t border-gray-100">
          <a href="/calendar" className="text-primary hover:underline text-sm">
            Ver todos os eventos
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

interface CalendarEventCardProps {
  event: CalendarEvent;
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  // Formatar data para exibição
  const formattedDate = formatEventDate(event.eventDate);
  
  // Criar URL do Google Calendar
  const googleCalendarUrl = createGoogleCalendarUrl(event);
  
  // Função para parar a propagação do evento de clique
  const handleClickWithoutClosing = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <CardContent className="p-4">
            <div className="mb-2">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">{event.title}</h3>
                <a 
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClickWithoutClosing}
                  className="ml-2 flex-shrink-0"
                  title="Adicionar ao Google Calendar"
                >
                  <img src={googleCalendarIcon} alt="Google Calendar" className="w-6 h-6" />
                </a>
              </div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <CalendarClock className="mr-1 h-4 w-4" />
                <span>{formattedDate} - {event.eventTime}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-1 h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
            <div className="mt-4">
              <Button variant="outline" size="sm" className="w-full">
                Ver detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-md">
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
              href={googleCalendarUrl}
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
  );
}

// Função para formatar data
function formatEventDate(dateString: string, detailed = false) {
  try {
    const date = new Date(dateString);
    if (detailed) {
      return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    return dateString;
  }
}

// Função para criar URL do Google Calendar
function createGoogleCalendarUrl(event: CalendarEvent) {
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
}