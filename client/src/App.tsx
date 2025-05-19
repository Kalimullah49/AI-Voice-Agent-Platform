import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layouts/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth";
import AgentsPage from "@/pages/agents";
import AgentDetailPage from "@/pages/agents/[id]";
import ActionsPage from "@/pages/actions";
import CreateActionPage from "@/pages/actions/create";
import CallsHistoryPage from "@/pages/calls/history";
import ContactsPage from "@/pages/contacts";
import CampaignsPage from "@/pages/campaigns";
import PhoneNumbersPage from "@/pages/phone-numbers";
import BillingPage from "@/pages/billing";
import SettingsPage from "@/pages/settings";

function Router() {
  const ProtectedAppRoute = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );

  return (
    <Switch>
      <Route path="/">
        <ProtectedAppRoute>
          <Dashboard />
        </ProtectedAppRoute>
      </Route>
      <Route path="/auth">
        <AuthPage />
      </Route>
      <Route path="/agents">
        <ProtectedAppRoute>
          <AgentsPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/agents/:id">
        <ProtectedAppRoute>
          <AgentDetailPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/actions">
        <ProtectedAppRoute>
          <ActionsPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/actions/create">
        <ProtectedAppRoute>
          <CreateActionPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/calls/history">
        <ProtectedAppRoute>
          <CallsHistoryPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/contacts">
        <ProtectedAppRoute>
          <ContactsPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/campaigns">
        <ProtectedAppRoute>
          <CampaignsPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/phone-numbers">
        <ProtectedAppRoute>
          <PhoneNumbersPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/billing">
        <ProtectedAppRoute>
          <BillingPage />
        </ProtectedAppRoute>
      </Route>
      <Route path="/settings">
        <ProtectedAppRoute>
          <SettingsPage />
        </ProtectedAppRoute>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <Router />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
