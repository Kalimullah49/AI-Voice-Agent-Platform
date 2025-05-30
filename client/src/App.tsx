import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layouts/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth";
import VerifyPage from "@/pages/auth/verify";
import EmailVerificationPage from "@/pages/auth/EmailVerification";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import { AuthProvider } from "@/providers/AuthProvider";
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
import WebhookLogsPage from "@/pages/webhook-logs";

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
      <Route path="/auth/verify">
        <VerifyPage />
      </Route>
      <Route path="/auth/verify-email">
        <EmailVerificationPage />
      </Route>
      <Route path="/forgot-password">
        <ForgotPasswordPage />
      </Route>
      <Route path="/reset-password">
        <ResetPasswordPage />
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
      <Route path="/webhook-logs">
        <ProtectedAppRoute>
          <WebhookLogsPage />
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
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
