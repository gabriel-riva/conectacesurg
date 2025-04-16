import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Ban, Info, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AccessDeniedPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract email from URL if present
    const url = new URL(window.location.href);
    const emailParam = url.searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, []);
  
  const handleGoToLogin = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-lg">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center">
            <Logo className="w-64 mb-4" />
            
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-6">
              <Ban className="h-12 w-12 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Acesso Negado
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              Seu e-mail <strong>{email ?? "@cesurg.com"}</strong> não está pré-cadastrado no sistema.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 w-full">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-800">O que aconteceu?</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    O Portal Conecta CESURG requer pré-cadastro pelo administrador. 
                    Apenas usuários autorizados com e-mail @cesurg.com podem acessar.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800">Como obter acesso?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Entre em contato com o administrador do sistema através do e-mail 
                    <strong> conecta@cesurg.com</strong> solicitando o cadastro do seu usuário.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center pb-6">
            <Button onClick={handleGoToLogin} className="px-8">
              Voltar para a página de login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}