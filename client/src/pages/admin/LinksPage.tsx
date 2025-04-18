import { AdminHeader } from "@/components/AdminHeader";
import { AdminSidebar } from "@/components/AdminSidebar";
import { UtilityLinksManager } from "@/components/admin/UtilityLinksManager";

export default function LinksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <h1 className="text-2xl font-bold mb-6">Gerenciamento de Links Úteis</h1>
          <p className="text-gray-500 mb-8">
            Gerencie os links úteis que aparecem na página inicial. Você pode adicionar, editar, excluir e controlar a visibilidade dos links.
          </p>
          
          <UtilityLinksManager />
        </main>
      </div>
    </div>
  );
}