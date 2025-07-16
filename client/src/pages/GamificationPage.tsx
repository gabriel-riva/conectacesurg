import { FeatureGuard } from "@/components/FeatureGuard";
import { Header } from "@/components/Header";

function GamificationPageContent() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Gamificação</h1>
        <div className="text-center">
          <p>Sistema de gamificação em desenvolvimento...</p>
        </div>
      </main>
    </div>
  );
}

export default function GamificationPage() {
  return (
    <FeatureGuard featureName="gamification">
      <GamificationPageContent />
    </FeatureGuard>
  );
}