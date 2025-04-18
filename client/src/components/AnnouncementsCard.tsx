import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AnnouncementsCard() {
  // Exemplo vazio - normalmente seria preenchido com dados da API
  const avisos: any[] = [];

  return (
    <Card className="h-[280px] flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 border-none">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-primary/90 flex items-center">
          <span className="inline-block w-1 h-5 bg-primary rounded mr-2"></span>
          Avisos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="overflow-y-auto flex-grow">
          {avisos.length > 0 ? (
            avisos.map((aviso, index) => (
              <div key={index} className="border-t border-gray-100 pt-2 mb-3">
                {/* Conteúdo dos avisos */}
              </div>
            ))
          ) : (
            <div className="h-[170px] flex flex-col items-center justify-center border-none rounded-md bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner">
              <div className="text-gray-300 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                Não há avisos no momento
              </p>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 text-right border-t border-gray-100">
          <a href="#" className="text-primary text-sm hover:underline">
            Ver tudo
          </a>
        </div>
      </CardContent>
    </Card>
  );
}