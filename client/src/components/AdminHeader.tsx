import { UserDropdown } from "@/components/UserDropdown";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";

export function AdminHeader() {
  const { user } = useAuth();
  
  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 w-full">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-semibold text-primary text-lg flex items-center">
          <span>Portal Conecta</span>
          <span className="font-bold text-emerald-600 ml-1">CESURG</span>
        </Link>
        
        <span className="text-gray-400">|</span>
        
        <span className="text-gray-600 font-medium">Painel Administrativo</span>
      </div>
      
      <div className="flex items-center gap-4">
        {user && <UserDropdown />}
      </div>
    </header>
  );
}