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
import LeadCardTemplate from "./builder/templates/lead-card";
import { CardComponent } from "./layout/CardEditLayout";
const queryClient = new QueryClient();
const attributes = {
  name: "Mamata Banerjee",
  age: "50",
  phone: "+91 9876543210",
  email: "pisimoni@tmc.chor",
  party: "TMC",
  partyColor: "green",
  textColor: "black",
  flag:"https://5.imimg.com/data5/SELLER/Default/2023/3/294646333/KS/CI/NV/14541723/tmc-indian-national-flag.jpg",
  address: "Kalighat, Kolkata",
  tag: "Lead",
  image: "https://www.hindustantimes.com/ht-img/img/2025/04/04/550x309/Mamata_Banerjee_1740645038692_1743754103685.jpg",
  infoData:[
    {
      id:1,
      title: "Last Connected",
      description: "10 days ago",
    }
  ],
  taskData:{
      title: "Task Details",
      tasks:[
        {
          id:1,
          title: "Veiw Poster Layout",
          description: "",
        },
        {
          id:2,
          title: "Package to pitch",
          description: ": Monthly",
        },
      ],
      description:"Prospect showed interest in trail activation."
    
    },
    notesData:{
      title: "Additional Notes",
    }
}
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
            <Route path="/cards" element={<CardComponent />} />
            <Route path="/tables/:tableName" element={<TableDetailsPage />} />
            <Route path="/builder/templates/lead-card" element={<LeadCardTemplate attributes={attributes} />} />
          </Route>

          {/* Custom App Routes */}
          <Route path="/app/:tenantSlug/login" element={<CustomAppAuthPage />} />
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
