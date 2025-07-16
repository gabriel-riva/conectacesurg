import React from "react";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminFeatureSettings } from "@/components/AdminFeatureSettings";

export default function AdminFeatureSettingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <AdminSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Configurações de Funcionalidades</h1>
            <AdminFeatureSettings />
          </div>
        </main>
      </div>
    </div>
  );
}