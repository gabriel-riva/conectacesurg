import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { format, isAfter, isBefore, parseISO } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Clock, 
  Filter, 
  Loader2, 
  MapPin,
  Search,
  X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CalendarPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<string>("");
  
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      const response = await fetch("/api/calendar");
      if (!response.ok) {
        throw new Error("Erro ao buscar eventos do calendário");
      }
      return response.json() as Promise<CalendarEvent[]>;
    },
  });
  
  // Filtrar eventos
  const filteredEvents = events.filter((event) => {
    // Filtro por termo de busca
    const matchesSearch = searchTerm
      ? event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    // Filtro por data
    const matchesDate = filterDate
      ? event.eventDate === filterDate
      : true;
    
    return matchesSearch && matchesDate;
  });
  
  // Separar eventos por período
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingEvents = filteredEvents.filter((event) => {
    const eventDate = parseISO(event.eventDate);
    return isAfter(eventDate, today) || 
           (eventDate.getDate() === today.getDate() && 
            eventDate.getMonth() === today.getMonth() && 
            eventDate.getFullYear() === today.getFullYear());
  });
  
  const pastEvents = filteredEvents.filter((event) => {
    const eventDate = parseISO(event.eventDate);
    return isBefore(eventDate, today) && 
           !(eventDate.getDate() === today.getDate() && 
             eventDate.getMonth() === today.getMonth() && 
             eventDate.getFullYear() === today.getFullYear());
  });
  
  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm("");
    setFilterDate("");
  };
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Agenda CESURG</CardTitle>
          <CardDescription>
            Confira os eventos e atividades programadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar eventos..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="pl-9 w-full"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            {(searchTerm || filterDate) && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center my-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum evento encontrado.
            </div>
          ) : (
            <Tabs defaultValue="upcoming">
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming">
                  Próximos Eventos ({upcomingEvents.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Eventos Anteriores ({pastEvents.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming">
                {upcomingEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Não há eventos futuros agendados.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="past">
                {pastEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Não há eventos anteriores registrados.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface EventCardProps {
  event: CalendarEvent;
}

function EventCard({ event }: EventCardProps) {
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
  
  // Formatar data curta
  const formatShortDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors overflow-hidden">
          <div className="flex h-full">
            {event.imageUrl && (
              <div className="hidden sm:block w-1/3 bg-muted">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className={event.imageUrl ? "w-full sm:w-2/3" : "w-full"}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg text-center min-w-14 mt-1">
                    <div className="text-primary text-xs font-medium">
                      {format(new Date(event.eventDate), "MMM", { locale: ptBR }).toUpperCase()}
                    </div>
                    <div className="text-xl font-bold">
                      {format(new Date(event.eventDate), "dd")}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{event.eventTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{event.location}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{event.description}</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            {formatShortDate(event.eventDate)} • {event.eventTime}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
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
  );
}