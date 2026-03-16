import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { MeetupProvider } from "@/contexts/MeetupContext";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Vault from "@/pages/Vault";
import AIOracle from "@/pages/AIOracle";
import Meetups from "@/pages/Meetups";
import Forums from "@/pages/Forums";
import Professors from "@/pages/Professors";
import Toolbox from "@/pages/Toolbox";
import Profile from "@/pages/Profile";
import VoiceLounges from "@/pages/VoiceLounges";
import Flashcards from "@/pages/Flashcards";
import KnowledgeGraph from "@/pages/KnowledgeGraph";
import Teams from "@/pages/Teams";
import Pomodoro from "@/pages/Pomodoro";
import Workspace from "@/pages/Workspace";
import Messages from "@/pages/Messages";
import Studio from "@/pages/Studio";
import Internships from "@/pages/Internships";
import Calendar from "@/pages/Calendar";
import Notes from "@/pages/Notes";
import KanbanBoard from "@/pages/KanbanBoard";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <MeetupProvider>
      <AppProvider>
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
            <Route path="/voice-lounges" element={<VoiceLounges />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="/pomodoro" element={<Pomodoro />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/tasks" element={<KanbanBoard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/internships" element={<Internships />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AppProvider>
    </MeetupProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ProtectedApp />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
