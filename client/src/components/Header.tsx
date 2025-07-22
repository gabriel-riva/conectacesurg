import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { UserDropdown } from "@/components/UserDropdown";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { MenuItem } from "@/components/MenuItem";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Importing icons
import inicioIcon from "@assets/icone_inicio.png";
import materiaisIcon from "@assets/icone_materiais_new.svg";
import trilhasIcon from "@assets/icone_materiais.png";
import ideiasIcon from "@assets/icone_ideias.png";
import comunidadeIcon from "@assets/icone_comunidade.png";
import gamificacaoIcon from "@assets/icone_gamificacao.png";
import iaIcon from "@assets/icone_ia.png";
import ferramentasIcon from "@assets/icone_ferramentas.svg";

// Importing green icons
import inicioIconVerde from "@assets/icone_inicio_verde.png";
import materiaisIconVerde from "@assets/icone_materiais_verde_new.svg";
import trilhasIconVerde from "@assets/icone_materiais_verde.png";
import ideiasIconVerde from "@assets/icone_ideias_verde.png";
import comunidadeIconVerde from "@assets/icone_comunidade_verde.png";
import gamificacaoIconVerde from "@assets/icone_gamificacao_verde.png";
import iaIconVerde from "@assets/icone_ia_verde.png";
import ferramentasIconVerde from "@assets/icone_ferramentas_verde.svg";

interface FeatureSetting {
  id: number;
  featureName: string;
  isEnabled: boolean;
  showInHeader: boolean;
  disabledMessage: string;
  lastUpdatedBy?: {
    id: number;
    name: string;
    email: string;
  };
  updatedAt: string;
}

export function Header() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = import.meta.env.MODE === 'development';
  
  const isAdmin = user?.role === "superadmin" || user?.role === "admin";
  
  // Query para buscar configurações de funcionalidades
  const { data: featureSettings } = useQuery({
    queryKey: ['/api/feature-settings'],
    queryFn: () => apiRequest<FeatureSetting[]>('/api/feature-settings'),
    enabled: !!user, // Só faz a query se o usuário estiver logado
  });
  
  // Função para verificar se uma funcionalidade deve aparecer no header
  const shouldShowInHeader = (featureName: string): boolean => {
    if (!featureSettings) return true; // Se não há configurações, mostra por padrão
    const setting = featureSettings.find(s => s.featureName === featureName);
    return setting?.showInHeader !== false; // Mostra se não estiver explicitamente oculta
  };
  
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
            <Link href="/dashboard">
              <Logo variant="white" className="h-8 cursor-pointer" />
            </Link>
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
            <MenuItem 
              href="/dashboard"
              icon={inicioIcon}
              iconHover={inicioIconVerde}
              label="Início"
              isActive={location === '/dashboard'}
            />
            {shouldShowInHeader('materiais') && (
              <MenuItem 
                href="/materiais"
                icon={materiaisIcon}
                iconHover={materiaisIconVerde}
                label="Materiais"
                isActive={location === '/materiais'}
              />
            )}
            {shouldShowInHeader('trilhas') && (
              <MenuItem 
                href="/trilhas"
                icon={trilhasIcon}
                iconHover={trilhasIconVerde}
                label="Trilhas"
                isActive={location === '/trilhas'}
              />
            )}
            {shouldShowInHeader('ideias') && (
              <MenuItem 
                href="/ideias"
                icon={ideiasIcon}
                iconHover={ideiasIconVerde}
                label="Ideias"
                isActive={location === '/ideias'}
              />
            )}
            {shouldShowInHeader('comunidades') && (
              <MenuItem 
                href="/comunidades"
                icon={comunidadeIcon}
                iconHover={comunidadeIconVerde}
                label="Comunidade"
                isActive={location === '/comunidades'}
              />
            )}
            {shouldShowInHeader('gamificacao') && (
              <MenuItem 
                href="/gamificacao"
                icon={gamificacaoIcon}
                iconHover={gamificacaoIconVerde}
                label="Gamificação"
                isActive={location === '/gamificacao'}
              />
            )}
            {shouldShowInHeader('ferramentas') && (
              <MenuItem 
                href="/ferramentas"
                icon={ferramentasIcon}
                iconHover={ferramentasIconVerde}
                label="Ferramentas"
                isActive={location === '/ferramentas' || location.startsWith('/ferramentas/')}
              />
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
            <MenuItem 
              href="/dashboard"
              icon={inicioIcon}
              iconHover={inicioIconVerde}
              label="Início"
              isActive={location === '/dashboard'}
              className="py-2"
            />
            {shouldShowInHeader('materiais') && (
              <MenuItem 
                href="/materiais"
                icon={materiaisIcon}
                iconHover={materiaisIconVerde}
                label="Materiais"
                isActive={location === '/materiais'}
                className="py-2"
              />
            )}
            {shouldShowInHeader('trilhas') && (
              <MenuItem 
                href="/trilhas"
                icon={trilhasIcon}
                iconHover={trilhasIconVerde}
                label="Trilhas"
                isActive={location === '/trilhas'}
                className="py-2"
              />
            )}
            {shouldShowInHeader('ideias') && (
              <MenuItem 
                href="/ideias"
                icon={ideiasIcon}
                iconHover={ideiasIconVerde}
                label="Ideias"
                isActive={location === '/ideias'}
                className="py-2"
              />
            )}
            {shouldShowInHeader('comunidades') && (
              <MenuItem 
                href="/comunidades"
                icon={comunidadeIcon}
                iconHover={comunidadeIconVerde}
                label="Comunidade"
                isActive={location === '/comunidades'}
                className="py-2"
              />
            )}
            {shouldShowInHeader('gamificacao') && (
              <MenuItem 
                href="/gamificacao"
                icon={gamificacaoIcon}
                iconHover={gamificacaoIconVerde}
                label="Gamificação"
                isActive={location === '/gamificacao'}
                className="py-2"
              />
            )}
            {shouldShowInHeader('ferramentas') && (
              <MenuItem 
                href="/ferramentas"
                icon={ferramentasIcon}
                iconHover={ferramentasIconVerde}
                label="Ferramentas"
                isActive={location === '/ferramentas' || location.startsWith('/ferramentas/')}
                className="py-2"
              />
            )}
          </div>
        )}
      </div>
    </header>
  );
}
