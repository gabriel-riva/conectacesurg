import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarEventCard } from "./CalendarEventCard";

export function CalendarCard() {
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
  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yy", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  return (
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
                <div key={event.id} className="border-t border-gray-100 pt-1 mb-1">
                  <div className="text-xs text-muted-foreground">
                    {formatEventDate(event.eventDate)} - {event.eventTime}
                  </div>
                  <div className="font-medium text-sm">{event.title}</div>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="mt-2 pt-2 text-right border-t border-gray-100">
          <a href="/calendar" className="text-[#0D8A43] text-sm hover:underline">
            Ver tudo
          </a>
        </div>
      </CardContent>
    </Card>
  );
}