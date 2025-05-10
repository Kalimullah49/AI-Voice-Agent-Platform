import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layouts/AppLayout";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import AgentsPage from "@/pages/agents";
import ActionsPage from "@/pages/actions";
import CallsHistoryPage from "@/pages/calls/history";
import CallsMonitorPage from "@/pages/calls/monitor";
import ContactsPage from "@/pages/contacts";
import CampaignsPage from "@/pages/campaigns";
import PhoneNumbersPage from "@/pages/phone-numbers";
import BillingPage from "@/pages/billing";
import SettingsPage from "@/pages/settings";

function Router() {
  // For demo purposes, we're not implementing real authentication
  // In a real app, you would use a hook like useAuth to check if the user is authenticated
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="*">
          <Login />
        </Route>
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/actions" component={ActionsPage} />
        <Route path="/calls/history" component={CallsHistoryPage} />
        <Route path="/calls/monitor" component={CallsMonitorPage} />
        <Route path="/contacts" component={ContactsPage} />
        <Route path="/campaigns" component={CampaignsPage} />
        <Route path="/phone-numbers" component={PhoneNumbersPage} />
        <Route path="/billing" component={BillingPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
