import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarCard() {
  // Dados de exemplo - serão substituídos por dados reais da API
  const events = [
    { id: 1, date: "17/04/25", time: "18:30h", title: "Evento UniDois Três" },
    { id: 2, date: "17/04/25", time: "19:45h", title: "Evento UniDois Três" },
    { id: 3, date: "17/04/25", time: "18:30h", title: "Evento UniDois Três" },
  ];

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
          {events.map((event) => (
            <div key={event.id} className="border-t border-gray-100 pt-1 mb-1">
              <div className="text-xs text-muted-foreground">{event.date} - {event.time}</div>
              <div className="font-medium text-sm">{event.title}</div>
            </div>
          ))}
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