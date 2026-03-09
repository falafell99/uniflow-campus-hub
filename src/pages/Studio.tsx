import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AudioLines, Presentation, PlayCircle, Network, FileCheck, BarChart3, Pencil, Sparkles, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Tool = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
};

const tools: Tool[] = [
  { id: "audio", title: "Audio Summary", description: "Convert notes into podcast-style audio summaries", icon: <AudioLines className="h-6 w-6" />, color: "text-primary" },
  { id: "presentation", title: "Presentation Generator", description: "Auto-generate slide decks from your notes", icon: <Presentation className="h-6 w-6" />, badge: "BETA", color: "text-warning" },
  { id: "video", title: "Video Summary", description: "Create visual explainers from course material", icon: <PlayCircle className="h-6 w-6" />, color: "text-success" },
  { id: "mentalmap", title: "Mental Map", description: "Interactive mind maps for any topic", icon: <Network className="h-6 w-6" />, color: "text-info" },
  { id: "reports", title: "Reports & Tests", description: "Generate quizzes and study reports", icon: <FileCheck className="h-6 w-6" />, color: "text-destructive" },
  { id: "infographics", title: "Infographics", description: "Turn data into beautiful visual summaries", icon: <BarChart3 className="h-6 w-6" />, badge: "BETA", color: "text-warning" },
];

export default function Studio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileContext = searchParams.get("file");

  const handleToolClick = (toolId: string) => {
    if (toolId === "mentalmap") {
      navigate(`/mental-map${fileContext ? `?file=${encodeURIComponent(fileContext)}` : ""}`);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🎨 Studio</h1>
        <p className="text-muted-foreground mt-1">Transform your study materials with AI-powered tools</p>
      </div>

      {/* File context banner */}
      {fileContext && (
        <div className="glass-subtle p-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Working with: <span className="text-primary">{fileContext}</span></p>
            <p className="text-[11px] text-muted-foreground">Select a tool below to process this file</p>
          </div>
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
      )}

      {/* Tool grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className="glass-card p-5 text-left group hover:scale-[1.02] transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 relative overflow-hidden"
          >
            {/* Edit icon */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-7 w-7 rounded-md bg-muted/80 flex items-center justify-center">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center ${tool.color}`}>
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{tool.title}</h3>
                  {tool.badge && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-warning/30 text-warning">
                      {tool.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
              </div>
            </div>

            {/* Hover arrow */}
            <div className="mt-4 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Open tool</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
