import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import AdminPage from "@/pages/AdminPage";
import AdminIdeasPage from "@/pages/AdminIdeasPage";
import CommunityPage from "@/pages/CommunityPage";
import IdeasPage from "@/pages/IdeasPage";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import AIPage from "@/pages/AIPage";

import LinksPage from "@/pages/admin/LinksPage";
import Profile from "@/pages/Profile";
import CalendarPage from "@/pages/CalendarPage";
import AdminCalendar from "@/pages/AdminCalendar";
import AdminNewsSimplified from "@/pages/AdminNewsSimplified";
import NewsEditorPage from "@/pages/NewsEditorPage";
import NewsListPage from "@/pages/NewsListPage";
import NewsDetailPage from "@/pages/NewsDetailPage";
import MaterialsPage from "@/pages/MaterialsPage";
import AdminMaterialsPage from "@/pages/AdminMaterialsPage";
import AdminAnnouncementsPage from "@/pages/AdminAnnouncementsPage";
import AdminFeatureSettingsPage from "@/pages/AdminFeatureSettingsPage";
import GamificationPage from "@/pages/GamificationPage";
import TrilhasPage from "@/pages/TrilhasPage";
import TrailDetailsPage from "@/pages/TrailDetailsPage";
import AdminTrilhasPage from "@/pages/AdminTrilhasPage";
import AdminTrailContentsPage from "@/pages/AdminTrailContentsPage";
import AdminGamificationPage from "@/pages/AdminGamificationPage";
import FeedbackManagement from "@/pages/admin/FeedbackManagement";
import { AuthProvider } from "./providers/AuthProvider";
import { useAuth } from "./lib/auth";
import FeedbackWrapper from "./components/FeedbackWrapper";

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    // If not logged in, redirect to login page
    window.location.href = "/";
    return null;
  }
  
  if (adminOnly && user.role !== "superadmin" && user.role !== "admin") {
    // If admin only route but user is not admin, redirect to dashboard
    window.location.href = "/dashboard";
    return null;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <FeedbackWrapper>
      <Switch>
        <Route path="/ideas">
          {() => <ProtectedRoute component={IdeasPage} />}
        </Route>
      <Route path="/ideias">
        {() => <ProtectedRoute component={IdeasPage} />}
      </Route>
      <Route path="/community">
        {() => <ProtectedRoute component={CommunityPage} />}
      </Route>
      <Route path="/comunidades">
        {() => <ProtectedRoute component={CommunityPage} />}
      </Route>
      <Route path="/ai">
        {() => <ProtectedRoute component={AIPage} />}
      </Route>
      <Route path="/gamificacao">
        {() => <ProtectedRoute component={GamificationPage} />}
      </Route>

      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/ideas">
        {() => <ProtectedRoute component={AdminIdeasPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/usuarios">
        {() => <ProtectedRoute component={AdminPage} adminOnly={true} activeTab="usuarios" />}
      </Route>
      <Route path="/admin/grupos">
        {() => <ProtectedRoute component={AdminPage} adminOnly={true} activeTab="grupos" />}
      </Route>
      <Route path="/admin/acessos">
        {() => <ProtectedRoute component={AdminPage} adminOnly={true} activeTab="acessos" />}
      </Route>
      <Route path="/admin/links">
        {() => <ProtectedRoute component={LinksPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/calendar">
        {() => <ProtectedRoute component={AdminCalendar} adminOnly={true} />}
      </Route>
      <Route path="/admin/noticias">
        {() => <ProtectedRoute component={AdminNewsSimplified} adminOnly={true} />}
      </Route>
      <Route path="/admin/noticias/nova">
        {() => <ProtectedRoute component={NewsEditorPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/noticias/editar/:id">
        {() => <ProtectedRoute component={NewsEditorPage} adminOnly={true} isEditMode={true} />}
      </Route>
      <Route path="/admin/materiais">
        {() => <ProtectedRoute component={AdminMaterialsPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/trilhas">
        {() => <ProtectedRoute component={AdminTrilhasPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/trilhas/:trailId/conteudos">
        {() => <ProtectedRoute component={AdminTrailContentsPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/avisos">
        {() => <ProtectedRoute component={AdminAnnouncementsPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/funcionalidades">
        {() => <ProtectedRoute component={AdminFeatureSettingsPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/gamificacao">
        {() => <ProtectedRoute component={AdminGamificationPage} adminOnly={true} />}
      </Route>
      <Route path="/admin/feedback">
        {() => <ProtectedRoute component={FeedbackManagement} adminOnly={true} />}
      </Route>
      <Route path="/materiais">
        {() => <ProtectedRoute component={MaterialsPage} />}
      </Route>
      <Route path="/trilhas">
        {() => <ProtectedRoute component={TrilhasPage} />}
      </Route>
      <Route path="/trilhas/:trailId">
        {() => <ProtectedRoute component={TrailDetailsPage} />}
      </Route>
      <Route path="/calendar">
        {() => <ProtectedRoute component={CalendarPage} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/noticias/:id">
        <NewsDetailPage />
      </Route>
      <Route path="/noticias">
        <NewsListPage />
      </Route>
      <Route path="/access-denied" component={AccessDeniedPage} />
      <Route path="/" component={LoginPage} />
      <Route component={NotFound} />
      </Switch>
    </FeedbackWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
