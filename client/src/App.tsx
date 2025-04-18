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
import AdminAIPage from "@/pages/AdminAIPage";
import { AuthProvider } from "./providers/AuthProvider";
import { useAuth } from "./lib/auth";

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
    <Switch>
      <Route path="/ideas">
        {() => <ProtectedRoute component={IdeasPage} />}
      </Route>
      <Route path="/community">
        {() => <ProtectedRoute component={CommunityPage} />}
      </Route>
      <Route path="/ai">
        {() => <ProtectedRoute component={AIPage} />}
      </Route>
      <Route path="/admin/ai">
        {() => <ProtectedRoute component={AdminAIPage} adminOnly={true} />}
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
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/access-denied" component={AccessDeniedPage} />
      <Route path="/" component={LoginPage} />
      <Route component={NotFound} />
    </Switch>
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
