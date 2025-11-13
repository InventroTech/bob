import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ComponentsLibrary from "./pages/ComponentsLibrary";
import PageBuilder from "./pages/PageBuilder";
import TaskTemplate from "./pages/TaskTemplate";
import LeadsTemplate from "./pages/LeadsTemplate";
import ProfileSettings from "./pages/ProfileSettings";
import Templates from "./pages/Templates";
import PagesGallery from "./pages/PagesGallery";
import Dashboard from './pages/Dashboard'
import ProfilePage from './pages/ProfilePage'
import AuthPage from './pages/AuthPage'
import ProtectedRoute from './hooks/ProtectedRoute'
import MyPages from './pages/MyPages'
import TablesPage from './pages/TablesPage'
import TableDetailsPage from './pages/TableDetailsPage'
import CustomAppAuthPage from './pages/CustomAppAuthPage';
import ProtectedAppRoute from './hooks/ProtectedAppRoute';
import CustomAppLayout from './layout/CustomAppLayout';
import CustomAppDashboard from './pages/CustomAppDashboard';
import CustomAppPage from './pages/CustomAppPage';
import CustomAppProfilePage from './pages/CustomAppProfilePage';
import InviteUsersPage from './pages/InviteUsersPage';
import LeadCardTemplate from "./components/ui/leadCardTemplate";
import { CardComponent } from "./layout/CardEditLayout";
import { LeadFormComponent } from "./components/page-builder/LeadsTableForm";
import AddUserPage from "./pages/AddUserPage";
import AuthCallbackPage from "./pages/AuthCallBackPage";
import LeadTypeAssignmentPageWrapper from "./pages/LeadTypeAssignmentPageWrapper";
import { JobsPage } from "./pages/JobsPage";
import PublicTenantPage from "./pages/PublicTenantPage";
const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <Router>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public Route - Login/Signup */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected Routes - Require Login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pages" element={<MyPages />} />
            <Route path="/team/invite" element={<InviteUsersPage />} />
            <Route path="/builder/new" element={<PageBuilder />} />
            <Route path="/builder/:pageId" element={<PageBuilder />} />
            <Route path="/components" element={<ComponentsLibrary />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<ProfileSettings />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/task-template" element={<TaskTemplate />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/leads" element={<LeadFormComponent />} />
            <Route path="/cards" element={<CardComponent />} />
            <Route path="/tables/:tableName" element={<TableDetailsPage />} />
            <Route path="/builder/templates/lead-card" element={<LeadCardTemplate attributes={{}} />} />
            <Route path="/add-user" element={<AddUserPage />} />
            <Route path="/lead-type-assignment" element={<LeadTypeAssignmentPageWrapper />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Route>

          {/* Custom App Routes */}
          <Route path="/app/:tenantSlug/login" element={<CustomAppAuthPage />} />
          <Route path="/app/:tenantSlug/auth/callback" element={<AuthCallbackPage />} />
          
          {/* Public Tenant Pages - No Authentication Required */}
          <Route path="/app/:tenantSlug/public/:pageId" element={<PublicTenantPage />} />

          <Route path="/app/:tenantSlug" element={<ProtectedAppRoute />}>  
            <Route element={<CustomAppLayout />}> 
              <Route index element={<CustomAppDashboard />} />
              <Route path="pages/:pageId" element={<CustomAppPage />} />
              <Route path="profile" element={<CustomAppProfilePage />} />
            </Route>
          </Route>

          {/* Add a catch-all or 404 route if needed */}
          {/* <Route path="*" element={<NotFoundPage />} /> */}
        </Routes>
      </TooltipProvider>
    </Router>
  </QueryClientProvider>
);

export default App;
