import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { UserDropdown } from "@/components/UserDropdown";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";

// Importing icons
import inicioIcon from "@assets/icone_inicio.png";
import materiaisIcon from "@assets/icone_materiais.png";
import ideiasIcon from "@assets/icone_ideias.png";
import comunidadeIcon from "@assets/icone_comunidade.png";
import gamificacaoIcon from "@assets/icone_gamificacao.png";

export function Header() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = import.meta.env.MODE === 'development';
  
  const isAdmin = user?.role === "superadmin" || user?.role === "admin";
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-conecta-blue text-white shadow-md relative">
      {/* Indicador de ambiente de desenvolvimento */}
      {isDevelopment && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-xs text-center py-0.5">
          Ambiente de Desenvolvimento
        </div>
      )}
      
      <div className="container mx-auto px-4">
        <div className={`flex items-center justify-between ${isDevelopment ? 'pt-6 pb-4' : 'py-4'}`}>
          <div className="flex items-center">
            <Logo variant="white" className="h-8" />
            {isDevelopment && (
              <Badge 
                variant="outline" 
                className="ml-2 bg-yellow-500 text-black border-yellow-600"
              >
                DEV
              </Badge>
            )}
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link href="/dashboard" className={`menu-item ${location === '/dashboard' ? 'text-conecta-green' : ''}`}>
              <img src={inicioIcon} alt="Início" className="w-5 h-5 mr-2" />
              Início
            </Link>
            <Link href="/materiais" className={`menu-item ${location === '/materiais' ? 'text-conecta-green' : ''}`}>
              <img src={materiaisIcon} alt="Materiais" className="w-5 h-5 mr-2" />
              Materiais
            </Link>
            <Link href="/ideias" className={`menu-item ${location === '/ideias' ? 'text-conecta-green' : ''}`}>
              <img src={ideiasIcon} alt="Ideias" className="w-5 h-5 mr-2" />
              Ideias
            </Link>
            <Link href="/comunidade" className={`menu-item ${location === '/comunidade' ? 'text-conecta-green' : ''}`}>
              <img src={comunidadeIcon} alt="Comunidade" className="w-5 h-5 mr-2" />
              Comunidade
            </Link>
            <Link href="/gamificacao" className={`menu-item ${location === '/gamificacao' ? 'text-conecta-green' : ''}`}>
              <img src={gamificacaoIcon} alt="Gamificação" className="w-5 h-5 mr-2" />
              Gamificação
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <UserDropdown />
            
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden text-white"
              onClick={toggleMobileMenu}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
        
        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link href="/dashboard" className="menu-item py-2">
              <img src={inicioIcon} alt="Início" className="w-5 h-5 mr-2" />
              Início
            </Link>
            <Link href="/materiais" className="menu-item py-2">
              <img src={materiaisIcon} alt="Materiais" className="w-5 h-5 mr-2" />
              Materiais
            </Link>
            <Link href="/ideias" className="menu-item py-2">
              <img src={ideiasIcon} alt="Ideias" className="w-5 h-5 mr-2" />
              Ideias
            </Link>
            <Link href="/comunidade" className="menu-item py-2">
              <img src={comunidadeIcon} alt="Comunidade" className="w-5 h-5 mr-2" />
              Comunidade
            </Link>
            <Link href="/gamificacao" className="menu-item py-2">
              <img src={gamificacaoIcon} alt="Gamificação" className="w-5 h-5 mr-2" />
              Gamificação
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
