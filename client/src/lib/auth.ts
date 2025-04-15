import { useState, useEffect, useContext, createContext } from "react";
import { User } from "@shared/schema";
import { apiRequest } from "./queryClient";
import { useQuery } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useAuthProvider = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use the status query with stale time to prevent too many refreshes
  const { refetch } = useQuery<{authenticated: boolean, user?: User}>({
    queryKey: ['/api/auth/status']
  });

  // Function to check authentication status
  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const result = await refetch();
      const data = result.data;
      
      if (data?.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setError(err as Error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    error,
    logout,
    checkAuthStatus,
  };
};
