import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnnouncementsCard() {
  return (
    <Card className="h-[220px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Avisos</CardTitle>
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