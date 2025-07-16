import { ReactNode } from "react";
import { useFeatureCheck } from "@/hooks/useFeatureSettings";
import { FeatureDisabledPage } from "./FeatureDisabledPage";

interface FeatureGuardProps {
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGuard({ featureName, children, fallback }: FeatureGuardProps) {
  const { data: featureStatus, isLoading, error } = useFeatureCheck(featureName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    // Em caso de erro, permitir acesso (fail-safe)
    return <>{children}</>;
  }

  if (!featureStatus?.isEnabled) {
    return fallback || (
      <FeatureDisabledPage 
        featureName={featureName} 
        message={featureStatus?.disabledMessage || "Em breve, novidades!"} 
      />
    );
  }

  return <>{children}</>;
}

// HOC para facilitar o uso
export function withFeatureGuard(featureName: string) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function FeatureGuardedComponent(props: P) {
      return (
        <FeatureGuard featureName={featureName}>
          <Component {...props} />
        </FeatureGuard>
      );
    };
  };
}