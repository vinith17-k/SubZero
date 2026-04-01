import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/Auth/AuthGuard";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import InsightsPage from "./pages/InsightsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={<AuthGuard><Dashboard /></AuthGuard>}
            />
            <Route
              path="/subscriptions"
              element={<AuthGuard><SubscriptionsPage /></AuthGuard>}
            />
            <Route
              path="/insights"
              element={<AuthGuard><InsightsPage /></AuthGuard>}
            />
            <Route
              path="/analytics"
              element={<AuthGuard><AnalyticsPage /></AuthGuard>}
            />
            <Route
              path="/settings"
              element={<AuthGuard><SettingsPage /></AuthGuard>}
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
