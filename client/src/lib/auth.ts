import { useState, useEffect, useContext, createContext } from "react";
import { User } from "@shared/schema";
import { apiRequest } from "./queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  googleLogin: (code: string) => Promise<void>;
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

  const { refetch } = useQuery({
    queryKey: ['/api/auth/status'],
    onSuccess: (data) => {
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    },
    onError: (err) => {
      setError(err as Error);
      setUser(null);
      setIsLoading(false);
    },
  });

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const { data } = await refetch();
      if (data?.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setError(error as Error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const googleLogin = async (code: string) => {
    try {
      setIsLoading(true);

      // Exchange the authorization code for user info
      // This would normally be done on your backend
      // For this example, simulating with a direct API call
      const mockGoogleUserData = {
        tokenId: code,
        email: "conecta@cesurg.com", // Simulating the email from Google
        name: "Conecta Admin",
        googleId: "google-id-123",
        photoUrl: null
      };

      // Send the Google data to your backend
      const response = await apiRequest("POST", "/api/auth/google", mockGoogleUserData);
      const data = await response.json();
      
      setUser(data.user);
      setError(null);
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    error,
    googleLogin,
    logout,
    checkAuthStatus,
  };
};
