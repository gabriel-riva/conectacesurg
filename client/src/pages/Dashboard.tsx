import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { HomeProfile } from "@/components/HomeProfile";
import { UtilityLinks } from "@/components/UtilityLinks";
import { UtilityLinksManager } from "@/components/admin/UtilityLinksManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, MessageSquare, FileText } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-6">
          Bem-vindo ao Portal Conecta CESURG
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Perfil */}
          <div className="space-y-6">
            <HomeProfile />
            <UtilityLinks />
          </div>
          
          {/* Coluna 2 e 3: Conteúdo principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Administração de Links Úteis (apenas para admin) */}
            {isAdmin && (
              <div className="mb-6">
                <UtilityLinksManager />
              </div>
            )}
            
            {/* Em breve: Tabs para Calendário, Anúncios e Notícias */}
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="calendar">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="calendar" className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>Calendário</span>
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <span>Anúncios</span>
                    </TabsTrigger>
                    <TabsTrigger value="news" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Notícias</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Conteúdo do Calendário */}
                  <TabsContent value="calendar" className="mt-0">
                    <div className="border rounded-md p-4 bg-gray-50">
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-2">Calendário em desenvolvimento.</p>
                        <p className="text-sm text-gray-400">O calendário de eventos será implementado em breve.</p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Conteúdo dos Anúncios */}
                  <TabsContent value="announcements" className="mt-0">
                    <div className="border rounded-md p-4 bg-gray-50">
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-2">Anúncios em desenvolvimento.</p>
                        <p className="text-sm text-gray-400">A seção de anúncios institucionais será implementada em breve.</p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* Conteúdo das Notícias */}
                  <TabsContent value="news" className="mt-0">
                    <div className="border rounded-md p-4 bg-gray-50">
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-2">Notícias em desenvolvimento.</p>
                        <p className="text-sm text-gray-400">A seção de notícias será implementada em breve.</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
