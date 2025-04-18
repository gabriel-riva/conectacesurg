import React from "react";
import { CalendarEventList } from "@/components/CalendarEventCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { CalendarEvent } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  
  // Buscar todos os eventos
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/calendar");
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

  // Criar um conjunto de datas com eventos para destacá-las no calendário
  const eventDates = React.useMemo(() => {
    return new Set(
      events.map((event) => {
        const date = new Date(event.eventDate);
        return format(date, "yyyy-MM-dd");
      })
    );
  }, [events]);

  // Filtrar eventos para a data selecionada
  const selectedDateEvents = React.useMemo(() => {
    if (!selectedDate) return [];
    
    const formattedSelectedDate = format(selectedDate, "yyyy-MM-dd");
    
    return events.filter(
      (event) => format(new Date(event.eventDate), "yyyy-MM-dd") === formattedSelectedDate
    );
  }, [selectedDate, events]);

  // Renderizar dia com marcador se houver eventos
  const renderDay = (day: Date, activeMonth: boolean) => {
    const formattedDay = format(day, "yyyy-MM-dd");
    const hasEvent = eventDates.has(formattedDay);
    
    return (
      <div className="relative">
        <div>{format(day, "d")}</div>
        {hasEvent && activeMonth && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
        )}
      </div>
    );
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Calendário de Eventos</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                formatters={{
                  formatDay: (date) => format(date, "d"),
                  formatMonthCaption: (date) => format(date, "MMMM yyyy", { locale: ptBR }),
                  formatWeekdayName: (date) => format(date, "ccccc", { locale: ptBR }).toUpperCase(),
                }}
                components={{
                  Day: ({ day, activeMonth, ...props }) => (
                    <button {...props} className={props.className}>
                      {renderDay(day, activeMonth || false)}
                    </button>
                  ),
                }}
                className="rounded-md border"
              />
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? `Eventos para ${format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}`
                  : "Selecione uma data para ver os eventos"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Não há eventos programados para esta data.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <CalendarEventList />
        </div>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: CalendarEvent;
}

function EventCard({ event }: EventCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {event.imageUrl && (
          <div className="md:w-1/4 min-h-[120px] max-h-[200px] overflow-hidden">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className={event.imageUrl ? "md:w-3/4 p-4" : "w-full p-4"}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold">{event.title}</h3>
            <Badge variant="outline" className="ml-2">
              {event.eventTime}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{event.location}</p>
          <p className="text-sm line-clamp-3">{event.description}</p>
        </div>
      </div>
    </Card>
  );
}