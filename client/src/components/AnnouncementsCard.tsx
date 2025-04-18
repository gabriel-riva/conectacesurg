import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnnouncementsCard() {
  return (
    <Card className="h-[220px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Avisos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="h-[120px] flex items-center justify-center border rounded-md">
          <p className="text-gray-400 text-sm">
            Não há avisos no momento
          </p>
        </div>
        <div className="pt-2 text-right">
          <a href="#" className="text-primary text-sm hover:underline">
            Ver tudo
          </a>
        </div>
      </CardContent>
    </Card>
  );
}