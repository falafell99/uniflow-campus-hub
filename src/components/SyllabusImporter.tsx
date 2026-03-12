import { useState, useRef } from "react";
import { format } from "date-fns";
import { 
  FileText, Upload, Sparkles, X, CheckCircle2, 
  Loader2, CalendarPlus, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

type ExtractedEvent = {
  title: string;
  description: string;
  event_type: "exam" | "deadline" | "meetup";
  start_time: string;
  end_time: string | null;
};

interface SyllabusImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SyllabusImporter({ open, onOpenChange, onSuccess }: SyllabusImporterProps): JSX.Element {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setExtractedEvents([]);
    setError(null);
    setIsProcessing(false);
    setIsSyncing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetState();
    onOpenChange(newOpen);
  };

  // Convert File to Base64
  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type
      }
    };
  };

  const processFile = async (selectedFile: File) => {
    if (!GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env.local file.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);

    try {
      const filePart = await fileToGenerativePart(selectedFile);

      const prompt = `
        Analyze this university course syllabus PDF. 
        Extract all important dates, deadlines, exams, quizzes, and project milestones.
        Today's date is: ${new Date().toISOString()} (Use this to resolve relative dates or assume the current year if unspecified).

        Return the extracted data EXACTLY as a raw JSON array of objects with this schema:
        [
          {
            "title": "Name of the assignment/exam",
            "description": "Brief details or weightage",
            "event_type": "exam" | "deadline",
            "start_time": "ISO 8601 datetime string (estimate if time is missing, e.g. 23:59 for deadlines)",
            "end_time": "ISO 8601 datetime string (optional, usually 1-3 hours later for exams)"
          }
        ]
        
        CRITICAL: 
        1. Return ONLY the JSON array. Start with [ and end with ]. 
        2. Do not include markdown formatting like \`\`\`json.
        3. Make sure all dates correspond to the content in the syllabus logically.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }, filePart]
          }],
          generationConfig: {
            temperature: 0.2, // Low temperature for factual extraction
          }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with Gemini API");
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) throw new Error("Could not extract text from response");

      // Clean the response (sometimes Gemini still adds markdown)
      const cleanJsonStr = textResponse.replace(/^[\`\s]*(?:json)?\n?/, "").replace(/[\`\s]*$/, "");
      
      const parsedEvents = JSON.parse(cleanJsonStr);
      
      if (!Array.isArray(parsedEvents) || parsedEvents.length === 0) {
        throw new Error("No events found in the syllabus");
      }

      setExtractedEvents(parsedEvents);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process the syllabus. Ensure it's a readable text PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    if (!user || extractedEvents.length === 0) return;
    
    setIsSyncing(true);
    try {
      const eventsToInsert = extractedEvents.map(e => ({
        user_id: user.id,
        title: e.title,
        description: e.description,
        event_type: e.event_type,
        start_time: e.start_time,
        end_time: e.end_time || e.start_time,
      }));

      const { error } = await supabase.from("campus_events").insert(eventsToInsert);
      if (error) throw error;

      toast({
        title: "Successfully synced!",
        description: `Imported ${extractedEvents.length} events from syllabus.`,
      });
      
      onSuccess();
      handleOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Syllabus Sync
          </DialogTitle>
        </DialogHeader>

        {!file && !isProcessing && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/50 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors group"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Upload Syllabus (PDF)</h3>
            <p className="text-sm text-muted-foreground w-64">
              Our AI will read your syllabus and automatically extract all important deadlines and exams.
            </p>
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,application/pdf"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
          </div>
        )}

        {isProcessing && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="font-semibold text-lg mb-1 animate-pulse">Reading Syllabus...</h3>
            <p className="text-sm text-muted-foreground">Extracting your dates and deadlines using Gemini AI.</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex gap-3 text-sm items-start">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Extraction Failed</p>
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-3 bg-background" onClick={resetState}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {extractedEvents.length > 0 && !isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <p className="text-sm font-medium text-muted-foreground">Found {extractedEvents.length} events</p>
              <Badge variant="outline" className="bg-primary/5 text-primary">Ready to sync</Badge>
            </div>
            
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-3">
                {extractedEvents.map((evt, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card/50 flex gap-3">
                    <div className="mt-1">
                      {evt.event_type === "exam" ? (
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                          <FileText className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{evt.title}</h4>
                      <p className="text-xs text-muted-foreground mb-1">{evt.description}</p>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {format(new Date(evt.start_time), "MMM d, yyyy h:mm a")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="ghost" onClick={resetState}>Cancel</Button>
              <Button onClick={handleSync} disabled={isSyncing} className="gap-2">
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                Add to Calendar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
