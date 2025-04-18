import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";

// Tipo para usuários retornados da API
interface UserFromApi {
  id: number;
  name: string;
  email: string;
  role: string;
  photoUrl: string | null;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, checkAuthStatus } = useAuth();
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [dbUsers, setDbUsers] = useState<UserFromApi[]>([]);
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = import.meta.env.MODE === 'development';

  useEffect(() => {
    // Extract error from URL if present
    const url = new URL(window.location.href);
    const error = url.searchParams.get('error');
    if (error === 'auth_failed') {
      setLoginError('Acesso negado. Apenas usuários pré-cadastrados pelo administrador podem acessar o portal. Entre em contato com o administrador.');
      // Remove query parameter
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }

    // If user is already logged in, redirect to dashboard
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Display error toast if login error exists
  useEffect(() => {
    if (loginError) {
      toast({
        title: "Login falhou",
        description: loginError,
        variant: "destructive",
      });
      setLoginError(null);
    }
  }, [loginError, toast]);

  // Função para carregar usuários do banco quando o painel é aberto
  const loadDatabaseUsers = () => {
    if (!showDevOptions) return;
    
    setIsLoadingUsers(true);
    fetch('/api/auth/dev-user-list')
      .then(res => res.json())
      .then(data => {
        setDbUsers(data);
        setIsLoadingUsers(false);
      })
      .catch(err => {
        console.error('Erro ao buscar usuários cadastrados:', err);
        setIsLoadingUsers(false);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de usuários",
          variant: "destructive",
        });
      });
  };

  // Carregar usuários quando as opções de desenvolvimento são abertas
  useEffect(() => {
    if (showDevOptions) {
      loadDatabaseUsers();
    }
  }, [showDevOptions]);

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = "/api/auth/google";
  };

  const handleCreateTestUser = () => {
    setIsLoadingUsers(true);
    fetch('/api/auth/dev-create-test-user', {
      method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
      toast({
        title: "Sucesso",
        description: data.message,
      });
      loadDatabaseUsers();
    })
    .catch(err => {
      console.error('Erro ao criar usuário de teste:', err);
      toast({
        title: "Erro",
        description: "Não foi possível criar o usuário de teste",
        variant: "destructive",
      });
      setIsLoadingUsers(false);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-gradient-to-br from-blue-900 via-primary to-green-700 overflow-hidden">
      {/* Círculos decorativos no fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full opacity-10 -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400 rounded-full opacity-10 -ml-40 -mb-40" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-green-300 rounded-full opacity-10 -ml-20 -mt-20" />
      
      {isDevelopment && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-xs text-center py-0.5 z-10">
          Ambiente de Desenvolvimento
        </div>
      )}
      
      <div className="w-full max-w-md z-10 relative">
        <Card className="border-0 shadow-2xl">
          <CardContent className="pt-8 pb-6 px-6 flex flex-col items-center">
            <Logo className="w-64 mb-6" />
            
            <p className="text-gray-600 mb-8 text-center text-sm">
              Faça login com sua conta institucional para acessar o portal.
            </p>

            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md py-2 px-6 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 mx-auto"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
              </svg>
              <span>{isLoading ? "Carregando..." : "Entrar com Google"}</span>
            </Button>
            
            <div className="mt-8 text-sm text-gray-500 text-center">
            </div>
            
            <div className="mt-6 border-t border-gray-200 pt-6 flex justify-center items-center">
              <Logo variant="cesurg" className="h-10 mx-auto" />
            </div>
            
            {/* Opções de Desenvolvimento */}
            {isDevelopment && (
              <>
                <Button
                  variant="outline"
                  className="mt-8 text-xs text-gray-500"
                  onClick={() => setShowDevOptions(!showDevOptions)}
                  size="sm"
                >
                  {showDevOptions ? "Ocultar" : "Mostrar"} Opções de Desenvolvimento
                </Button>
                
                {showDevOptions && (
                  <div className="mt-4 p-4 border rounded-md bg-gray-50 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">Selecione um usuário para login</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={loadDatabaseUsers}
                        disabled={isLoadingUsers}
                      >
                        <RefreshCw size={16} className={isLoadingUsers ? "animate-spin" : ""} />
                      </Button>
                    </div>
                    
                    {isLoadingUsers ? (
                      <div className="text-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <span className="text-sm mt-2 block">Carregando usuários...</span>
                      </div>
                    ) : dbUsers.length === 0 ? (
                      <div className="text-center py-6">
                        <span className="text-sm">Nenhum usuário cadastrado ainda.</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mt-4 mx-auto"
                          onClick={handleCreateTestUser}
                        >
                          Criar Usuário de Teste
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto mt-3">
                        {dbUsers.map(user => (
                          <a 
                            key={user.id}
                            href={`/api/auth/dev-login/${user.id}`}
                            className="flex items-center p-3 text-sm bg-white border rounded hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                            <Badge variant={
                              user.role === 'superadmin' ? 'destructive' : 
                              user.role === 'admin' ? 'default' : 'outline'
                            }>
                              {user.role}
                            </Badge>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
