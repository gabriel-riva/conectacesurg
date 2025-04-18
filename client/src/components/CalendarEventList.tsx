import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarEventList() {
  const [selectedTab, setSelectedTab] = useState("proximos");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Buscar todos os eventos
  const { data: allEvents = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      const response = await fetch("/api/calendar");
      if (!response.ok) {
        throw new Error("Erro ao buscar todos os eventos do calendário");
      }
      return response.json() as Promise<CalendarEvent[]>;
    },
  });

  // Buscar próximos eventos (30 dias)
  const { data: upcomingEvents = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ["/api/calendar/upcoming"],
    queryFn: async () => {
      const response = await fetch("/api/calendar/upcoming");
      if (!response.ok) {
        throw new Error("Erro ao buscar próximos eventos do calendário");
      }
      return response.json() as Promise<CalendarEvent[]>;
    },
  });

  const events = selectedTab === "proximos" ? upcomingEvents : allEvents;
  const isLoading = selectedTab === "proximos" ? isLoadingUpcoming : isLoadingAll;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const openEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      <Tabs
        defaultValue="proximos"
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="proximos">Próximos eventos</TabsTrigger>
          <TabsTrigger value="todos">Todos os eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="proximos" className="mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Mostrando eventos para os próximos 30 dias
          </div>
          {renderEventList()}
        </TabsContent>

        <TabsContent value="todos" className="mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            Mostrando todos os eventos
          </div>
          {renderEventList()}
        </TabsContent>
      </Tabs>

      {/* Diálogo de detalhes do evento */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex items-start gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium">Data e Hora</div>
                    <div className="text-muted-foreground">
                      {formatDate(selectedEvent.eventDate)} às {selectedEvent.eventTime}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium">Local</div>
                    <div className="text-muted-foreground">{selectedEvent.location}</div>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="font-medium mb-1">Descrição</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEvent.description}
                  </div>
                </div>
                {selectedEvent.imageUrl && (
                  <div className="pt-4">
                    <img
                      src={selectedEvent.imageUrl}
                      alt={selectedEvent.title}
                      className="rounded-md max-h-[300px] w-auto mx-auto object-contain"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderEventList() {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum evento encontrado neste período.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events
          .filter(event => event.isActive)
          .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
          .map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEventDetails(event)}
            >
              <h3 className="font-semibold text-lg line-clamp-2 mb-2">{event.title}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <CalendarIcon className="h-4 w-4" />
                <span>{formatDate(event.eventDate)}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span>{event.eventTime}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  openEventDetails(event);
                }}
              >
                Ver detalhes
              </Button>
            </div>
          ))}
      </div>
    );
  }
}