import React from "react";
import { Header } from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminIdeas } from "@/components/AdminIdeas";

export default function AdminIdeasPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <AdminSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Gerenciamento de Ideias</h1>
            <AdminIdeas />
          </div>
        </main>
      </div>
    </div>
  );
}