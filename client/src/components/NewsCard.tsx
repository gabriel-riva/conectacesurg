import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewsCard() {
  return (
    <Card className="h-[220px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Últimas Notícias
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="h-[120px] flex flex-col items-center justify-center border-none rounded-md bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner">
          <div className="text-gray-300 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/>
              <path d="M15 18h-5"/>
              <path d="M10 6h8v4h-8V6Z"/>
            </svg>
          </div>
          <p className="text-gray-400 text-sm">
            Não há notícias recentes
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