import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Vault from "@/pages/Vault";
import AIOracle from "@/pages/AIOracle";
import Meetups from "@/pages/Meetups";
import Forums from "@/pages/Forums";
import Professors from "@/pages/Professors";
import Toolbox from "@/pages/Toolbox";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/ai-oracle" element={<AIOracle />} />
            <Route path="/meetups" element={<Meetups />} />
            <Route path="/forums" element={<Forums />} />
            <Route path="/professors" element={<Professors />} />
            <Route path="/toolbox" element={<Toolbox />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
