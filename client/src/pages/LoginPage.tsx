import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, googleLogin, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleGoogleLogin = async () => {
    try {
      // Initialize Google OAuth client
      const client = google.accounts.oauth2.initCodeClient({
        client_id: "1033430857520-a0q61g5f6dl8o20g1oejuukrqdb4lol1.apps.googleusercontent.com",
        scope: "profile email",
        ux_mode: "popup",
        callback: async (response: any) => {
          if (response.code) {
            try {
              // Process Google login
              await googleLogin(response.code);
              setLocation("/dashboard");
            } catch (error) {
              console.error("Login error:", error);
              toast({
                title: "Login falhou",
                description: "Certifique-se de que seu email termine com @cesurg.com",
                variant: "destructive",
              });
            }
          }
        },
      });
      
      client.requestCode();
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        title: "Erro de login",
        description: "Não foi possível iniciar o login com Google. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-md">
        <Card className="border-0">
          <CardContent className="pt-6 flex flex-col items-center">
            <Logo className="w-64 mb-8" />
            <h1 className="text-2xl font-bold text-center text-primary mb-8">
              Portal Conecta CESURG
            </h1>
            
            <p className="text-gray-600 mb-8 text-center">
              Faça login com sua conta institucional para acessar o portal.
            </p>

            <Button
              variant="outline"
              className="flex items-center justify-center w-full gap-2 bg-white border border-gray-300 rounded-md py-6 px-4 text-gray-700 hover:bg-gray-50 transition-all duration-200"
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
              <p>
                Apenas usuários com e-mail institucional <strong>@cesurg.com</strong> possuem acesso.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
