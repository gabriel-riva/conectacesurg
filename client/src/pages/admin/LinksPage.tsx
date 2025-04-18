import React from "react";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { UtilityLinksManager } from "@/components/admin/UtilityLinksManager";

export default function LinksPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <AdminSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Gerenciamento de Links Úteis</h1>
            <p className="text-muted-foreground">
              Gerencie os links úteis que aparecem na página inicial. Você pode adicionar, editar, excluir e controlar a visibilidade dos links.
            </p>
            <UtilityLinksManager />
          </div>
        </main>
      </div>
    </div>
  );
}