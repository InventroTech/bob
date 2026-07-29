import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RealtimeProvider } from "@/hooks/useRealtime";
import ProtectedRoute from "@/hooks/ProtectedRoute";
import ProtectedAppRoute from "@/hooks/ProtectedAppRoute";
import CustomAppLayout from "@/layout/CustomAppLayout";
import NotFound from "@/features/dashboard/pages/NotFound";
import PageBuilder from "@/features/page-builder/pages/PageBuilder";
import TaskTemplate from "@/features/page-builder/pages/TaskTemplate";
import ProfileSettings from "@/features/dashboard/pages/ProfileSettings";
import Dashboard from "@/features/dashboard/pages/Dashboard";
import AuthPage from "@/features/auth/pages/AuthPage";
import SignupPage from "@/features/auth/pages/SignupPage";
import MyPages from "@/features/page-builder/pages/MyPages";
import ProfilePage from "@/features/dashboard/pages/ProfilePage";
import LeadCardTemplate from "@/components/ui/leadCardTemplate";
import AddUserPage from "@/features/membership/pages/AddUserPage";
import LeadTypeAssignmentPageWrapper from "@/features/membership/pages/LeadTypeAssignmentPageWrapper";
import { JobsPage } from "@/features/ats/pages/JobsPage";
import InventoryRequestsPage from "@/features/inventory/pages/InventoryRequestsPage";
import NewInventoryRequestPage from "@/features/inventory/pages/NewInventoryRequestPage";
import PmInventoryQueuePage from "@/features/inventory/pages/PmInventoryQueuePage";
import ReceiveShipmentsPage from "@/features/inventory/pages/ReceiveShipmentsPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import CustomAppAuthPage from "@/features/auth/pages/CustomAppAuthPage";
import AuthCallbackPage from "@/features/auth/pages/AuthCallBackPage";
import PublicTenantPage from "@/features/tenant-app/pages/PublicTenantPage";
import TeamDashboardPage from "@/features/analytics/pages/TeamDashboardPage";
import OperationsProgramsPage from "@/features/page-builder/pages/OperationsProgramsPage";
import UserHierarchyPage from "@/features/membership/pages/UserHierarchyPage";
import BillingPage from "@/features/billing/pages/BillingPage";
import EntityTypesPage from "@/features/crm/pages/EntityTypesPage";
import BackgroundJobsPage from "@/features/jobs/pages/BackgroundJobsPage";
import PyroJobsPage from "@/features/jobs/pages/PyroJobsPage";
import CustomAppDashboard from "@/features/tenant-app/pages/CustomAppDashboard";
import CustomAppPage from "@/features/tenant-app/pages/CustomAppPage";
import CustomAppProfilePage from "@/features/tenant-app/pages/CustomAppProfilePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Router>
      <AuthProvider>
        <RealtimeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/signup" element={<SignupPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pages" element={<MyPages />} />
                <Route path="/builder/new" element={<PageBuilder />} />
                <Route path="/builder/:pageId" element={<PageBuilder />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<ProfileSettings />} />
                <Route path="/task-template" element={<TaskTemplate />} />
                <Route path="/profile-settings" element={<ProfileSettings />} />
                <Route
                  path="/builder/templates/lead-card"
                  element={<LeadCardTemplate attributes={{}} />}
                />
                <Route path="/add-user" element={<AddUserPage />} />
                <Route
                  path="/lead-type-assignment"
                  element={<LeadTypeAssignmentPageWrapper />}
                />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/inventory/requests" element={<InventoryRequestsPage />} />
                <Route path="/inventory/requests/new" element={<NewInventoryRequestPage />} />
                <Route path="/inventory/requests/pm-queue" element={<PmInventoryQueuePage />} />
                <Route path="/inventory/receive-shipments" element={<ReceiveShipmentsPage />} />
                <Route path="/team-dashboard" element={<TeamDashboardPage />} />
                <Route path="/operations-programs" element={<OperationsProgramsPage />} />
                <Route path="/user-hierarchy" element={<UserHierarchyPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/entity-types" element={<EntityTypesPage />} />
                <Route path="/background-jobs" element={<BackgroundJobsPage />} />
                <Route path="/pyro-jobs" element={<PyroJobsPage />} />
              </Route>

              <Route path="/app/:tenantSlug/login" element={<CustomAppAuthPage />} />
              <Route path="/app/:tenantSlug/auth/callback" element={<AuthCallbackPage />} />
              <Route
                path="/app/:tenantSlug/auth/forgot-password"
                element={<ForgotPasswordPage />}
              />
              <Route
                path="/app/:tenantSlug/auth/reset-password"
                element={<ResetPasswordPage />}
              />
              <Route path="/app/:tenantSlug/public/:pageId" element={<PublicTenantPage />} />

              <Route path="/app/:tenantSlug" element={<ProtectedAppRoute />}>
                <Route element={<CustomAppLayout />}>
                  <Route index element={<CustomAppDashboard />} />
                  <Route path="pages/:pageId" element={<CustomAppPage />} />
                  <Route path="profile" element={<CustomAppProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </RealtimeProvider>
      </AuthProvider>
    </Router>
  </QueryClientProvider>
);

export default App;
