import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarEventList() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar/upcoming"],
    queryFn: async () => {
      const response = await fetch("/api/calendar/upcoming");
      if (!response.ok) {
        throw new Error("Erro ao buscar eventos do calendário");
      }
      return response.json() as Promise<CalendarEvent[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendário</CardTitle>
          <CardDescription>Próximos eventos</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Não há eventos agendados no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <CalendarEventCard key={event.id} event={event} />
      ))}
      <div className="text-center">
        <Button variant="link" asChild>
          <a href="/calendar">Ver todos os eventos</a>
        </Button>
      </div>
    </div>
  );
}

export function EventsCalendarCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda CESURG</CardTitle>
        <CardDescription>Próximos eventos</CardDescription>
      </CardHeader>
      <CardContent>
        <CalendarEventList />
      </CardContent>
    </Card>
  );
}

interface CalendarEventCardProps {
  event: CalendarEvent;
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Formatação de data para exibição
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-lg text-center min-w-16">
                  <div className="text-primary text-sm font-medium">
                    {format(new Date(event.eventDate), "MMM", { locale: ptBR }).toUpperCase()}
                  </div>
                  <div className="text-2xl font-bold">
                    {format(new Date(event.eventDate), "dd")}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">{event.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {event.eventTime} · {event.location}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
            <DialogDescription>
              Detalhes do evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {event.imageUrl && (
              <div className="rounded-md overflow-hidden">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(event.eventDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{event.eventTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm whitespace-pre-line">{event.description}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EventsCalendarCard;