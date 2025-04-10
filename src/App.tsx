
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ComponentsLibrary from "./pages/ComponentsLibrary";
import PageBuilder from "./pages/PageBuilder";
import TaskTemplate from "./pages/TaskTemplate";
import LeadsTemplate from "./pages/LeadsTemplate";
import ProfileSettings from "./pages/ProfileSettings";
import Templates from "./pages/Templates";
import PagesGallery from "./pages/PagesGallery";
import PageView from "./pages/PageView";
import PagePreview from "./pages/PagePreview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/components" element={<ComponentsLibrary />} />
          <Route path="/builder/new" element={<PageBuilder />} />
          <Route path="/builder/edit/:id" element={<PageBuilder />} />
          <Route path="/builder/templates/:template" element={<PageBuilder />} />
          <Route path="/task-template" element={<TaskTemplate />} />
          <Route path="/leads-template" element={<LeadsTemplate />} />
          <Route path="/settings" element={<ProfileSettings />} />
          <Route path="/settings/profile" element={<ProfileSettings />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/pages" element={<PagesGallery />} />
          <Route path="/pages/:id" element={<PageView />} />
          <Route path="/pages/preview" element={<PagePreview />} />
          <Route path="/leads" element={<LeadsTemplate />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
