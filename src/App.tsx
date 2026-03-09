import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { MeetupProvider } from "@/contexts/MeetupContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Dashboard from "@/pages/Dashboard";
import Vault from "@/pages/Vault";
import AIOracle from "@/pages/AIOracle";
import Meetups from "@/pages/Meetups";
import Forums from "@/pages/Forums";
import Professors from "@/pages/Professors";
import Toolbox from "@/pages/Toolbox";
import Profile from "@/pages/Profile";
import PastExams from "@/pages/PastExams";
import VoiceLounges from "@/pages/VoiceLounges";
import Marketplace from "@/pages/Marketplace";
import Internships from "@/pages/Internships";
import Flashcards from "@/pages/Flashcards";
import KnowledgeGraph from "@/pages/KnowledgeGraph";
import Pomodoro from "@/pages/Pomodoro";
import Workspace from "@/pages/Workspace";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AppProvider>
          <MeetupProvider>
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
                  <Route path="/past-exams" element={<PastExams />} />
                  <Route path="/voice-lounges" element={<VoiceLounges />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/internships" element={<Internships />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </MeetupProvider>
        </AppProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
