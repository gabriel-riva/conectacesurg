import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-2/3">
            <h1 className="text-2xl font-bold text-primary mb-6">
              Bem-vindo ao Portal Conecta CESURG, {user?.name}
            </h1>
            
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-primary mb-4">Últimas Notícias</h2>
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="font-medium">Lançamento do Portal Conecta</h3>
                    <p className="text-sm text-gray-600">O novo portal de comunicação interna da CESURG está no ar!</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">15/05/2023</span>
                      <a href="#" className="text-sm text-secondary hover:underline">Leia mais</a>
                    </div>
                  </div>
                  <div className="border-b pb-4">
                    <h3 className="font-medium">Programa de Ideias Inovadoras</h3>
                    <p className="text-sm text-gray-600">Participe do nosso novo programa de ideias e ajude a transformar a CESURG.</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">10/05/2023</span>
                      <a href="#" className="text-sm text-secondary hover:underline">Leia mais</a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-primary mb-4">Próximos Eventos</h2>
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="font-medium">Workshop de Inovação</h3>
                    <p className="text-sm text-gray-600">Aprenda técnicas de pensamento inovador e resolução criativa de problemas.</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">25/05/2023 - 14:00</span>
                      <a href="#" className="text-sm text-secondary hover:underline">Inscrever-se</a>
                    </div>
                  </div>
                  <div className="pb-4">
                    <h3 className="font-medium">Palestra: Tecnologias Emergentes</h3>
                    <p className="text-sm text-gray-600">Descubra as tecnologias que estão transformando o cenário educacional.</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">30/05/2023 - 10:00</span>
                      <a href="#" className="text-sm text-secondary hover:underline">Inscrever-se</a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:w-1/3">
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-primary mb-4">Sua Atividade</h2>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">Você ainda não possui atividades recentes.</p>
                    <button className="mt-4 text-sm text-white bg-secondary px-4 py-2 rounded-md hover:bg-secondary/90 transition-all">Explore o Portal</button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-primary mb-4">Links Rápidos</h2>
                <div className="space-y-2">
                  <a href="#" className="flex items-center p-2 rounded-md hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Programa de Ideias
                  </a>
                  <a href="#" className="flex items-center p-2 rounded-md hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Comunidade
                  </a>
                  <a href="#" className="flex items-center p-2 rounded-md hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendário de Eventos
                  </a>
                  <a href="#" className="flex items-center p-2 rounded-md hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documentos Importantes
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
