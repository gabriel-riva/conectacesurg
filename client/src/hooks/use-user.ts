import { useQuery } from "@tanstack/react-query";

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  photoUrl?: string;
}

export function useUser() {
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: authData?.authenticated ? authData.user : null,
    isAuthenticated: authData?.authenticated || false,
    isLoading: !authData,
  };
}