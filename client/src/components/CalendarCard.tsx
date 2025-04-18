import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarCard() {
  // Dados de exemplo - serão substituídos por dados reais da API
  const events = [
    { id: 1, date: "17/04/25", time: "18:30h", title: "Evento UniDois Três" },
    { id: 2, date: "17/04/25", time: "19:45h", title: "Evento UniDois Três" },
    { id: 3, date: "17/04/25", time: "18:30h", title: "Evento UniDois Três" },
    { id: 4, date: "17/04/25", time: "18:30h", title: "Evento UniDois Três" },
  ];

  return (
    <Card className="h-[280px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Calendário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 flex-grow overflow-y-auto">
        {events.map((event) => (
          <div key={event.id} className="text-sm">
            <div className="text-xs text-muted-foreground">{event.date} - {event.time}</div>
            <div className="font-medium">{event.title}</div>
          </div>
        ))}
        <div className="pt-2 text-right">
          <a href="#" className="text-primary text-sm hover:underline">
            Ver tudo
          </a>
        </div>
      </CardContent>
    </Card>
  );
}