import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { UserDropdown } from "@/components/UserDropdown";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";

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
    <header className="bg-primary text-white shadow-md relative">
      {/* Indicador de ambiente de desenvolvimento */}
      {isDevelopment && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-xs text-center py-0.5">
          Ambiente de Desenvolvimento
        </div>
      )}
      
      <div className="container mx-auto px-4">
        <div className={`flex items-center justify-between ${isDevelopment ? 'pt-6 pb-4' : 'py-4'}`}>
          <div className="flex items-center">
            <Logo className="h-10" />
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
            <Link href="/dashboard">
              <a className={`text-white hover:text-secondary transition-colors ${location === '/dashboard' ? 'text-secondary' : ''}`}>
                Home
              </a>
            </Link>
            <Link href="#ideias">
              <a className="text-white hover:text-secondary transition-colors">
                Ideias
              </a>
            </Link>
            <Link href="#conteudos">
              <a className="text-white hover:text-secondary transition-colors">
                Conteúdos
              </a>
            </Link>
            {isAdmin && (
              <Link href="/admin">
                <a className={`text-white hover:text-secondary transition-colors ${location === '/admin' ? 'text-secondary' : ''}`}>
                  Admin
                </a>
              </Link>
            )}
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
            <Link href="/dashboard">
              <a className="block py-2 text-white hover:text-secondary transition-colors">
                Home
              </a>
            </Link>
            <Link href="#ideias">
              <a className="block py-2 text-white hover:text-secondary transition-colors">
                Ideias
              </a>
            </Link>
            <Link href="#conteudos">
              <a className="block py-2 text-white hover:text-secondary transition-colors">
                Conteúdos
              </a>
            </Link>
            {isAdmin && (
              <Link href="/admin">
                <a className="block py-2 text-white hover:text-secondary transition-colors">
                  Admin
                </a>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
