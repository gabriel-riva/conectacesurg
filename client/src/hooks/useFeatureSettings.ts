import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FeatureSetting {
  id: number;
  featureName: string;
  isEnabled: boolean;
  disabledMessage: string;
  lastUpdatedBy?: {
    id: number;
    name: string;
    email: string;
  };
  updatedAt: string;
}

export function useFeatureSettings() {
  const { data: settings = [], ...queryState } = useQuery({
    queryKey: ['/api/feature-settings'],
    queryFn: () => apiRequest<FeatureSetting[]>('/api/feature-settings'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const getFeatureStatus = (featureName: string) => {
    const setting = settings.find(s => s.featureName === featureName);
    return {
      isEnabled: setting?.isEnabled ?? true,
      disabledMessage: setting?.disabledMessage || "Em breve, novidades!",
    };
  };

  const checkFeature = async (featureName: string) => {
    try {
      const response = await apiRequest<{ isEnabled: boolean; disabledMessage?: string }>
        (`/api/feature-settings/check/${featureName}`);
      return response;
    } catch (error) {
      console.error('Erro ao verificar funcionalidade:', error);
      return { isEnabled: true, disabledMessage: "Em breve, novidades!" };
    }
  };

  return {
    settings,
    getFeatureStatus,
    checkFeature,
    ...queryState,
  };
}

export function useFeatureCheck(featureName: string) {
  return useQuery({
    queryKey: ['/api/feature-settings/check', featureName],
    queryFn: () => apiRequest<{ isEnabled: boolean; disabledMessage?: string }>
      (`/api/feature-settings/check/${featureName}`),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}