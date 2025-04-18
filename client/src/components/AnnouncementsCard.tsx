import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnnouncementsCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>Avisos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40 flex items-center justify-center border rounded-md">
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