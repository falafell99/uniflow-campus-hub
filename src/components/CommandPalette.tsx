import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Book, Users, MessageSquare, 
  Settings, LogOut, Moon, Sun, Timer, 
  Plus, FileText, Layout, Hash,
  Loader2, User as UserIcon, Calendar, Info, 
  Image as ImageIcon, FileText as FileIcon, 
  AtSign, Hash as HashIcon, Star
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const staticPages = [
  { label: "Dashboard", url: "/", emoji: <Layout className="h-4 w-4" /> },
  { label: "The Vault", url: "/vault", emoji: <Book className="h-4 w-4" /> },
  { label: "AI Oracle", url: "/ai-oracle", emoji: <Hash className="h-4 w-4" /> },
  { label: "Past Exams Hub", url: "/past-exams", emoji: <FileText className="h-4 w-4" /> },
  { label: "Study Circles", url: "/meetups", emoji: <Users className="h-4 w-4" /> },
  { label: "Voice Lounges", url: "/voice-lounges", emoji: <MessageSquare className="h-4 w-4" /> },
  { label: "Teams Hub", url: "/teams", emoji: <Users className="h-4 w-4" /> },
  { label: "Studio", url: "/studio", emoji: <Plus className="h-4 w-4" /> },
  { label: "Profile", url: "/profile", emoji: <Settings className="h-4 w-4" /> },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "results" | "error">("idle");
  const [results, setResults] = useState<{
    people: any[];
    files: any[];
    teams: any[];
    discussions: any[];
  }>({ people: [], files: [], teams: [], discussions: [] });
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const handleOpen = (e: any) => {
      setOpen(true);
      if (e.detail?.query) setQuery(e.detail.query);
    };
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpen);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ people: [], files: [], teams: [], discussions: [] });
      setStatus("idle");
      return;
    }
  }, [open]);

  useEffect(() => {
    const hasPrefix = query.length > 0 && "@#*!".includes(query[0]);
    const minLength = hasPrefix ? 1 : 2;

    if (!query || query.length < minLength) {
      setResults({ people: [], files: [], teams: [], discussions: [] });
      setStatus("idle");
      return;
    }

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const performSearch = async () => {
    setStatus("loading");
    try {
      const cleanQuery = query.replace(/^[@#*!]/, "").trim();
      const hasPrefix = query.length > 0 && "@#*!".includes(query[0]);
      const prefix = hasPrefix ? query[0] : null;

      const searchTasks = [];

      // Only search specific table if prefix is present, otherwise search all
      if (!prefix || prefix === "@") {
        let q = supabase.from("profiles").select("id, display_name, avatar_url, email");
        if (cleanQuery) q = q.ilike("display_name", `%${cleanQuery}%`);
        else q = q.order("display_name", { ascending: true }); // Fallback to alpha order
        searchTasks.push(q.limit(prefix === "@" ? 12 : 4).then(r => ({ type: 'people', data: r.data })));
      }
      if (!prefix || prefix === "*") {
        let q = supabase.from("vault_files").select("id, name, subject, file_type");
        if (cleanQuery) q = q.ilike("name", `%${cleanQuery}%`);
        else q = q.order("created_at", { ascending: false }); // Fallback to recent
        searchTasks.push(q.limit(prefix === "*" ? 12 : 5).then(r => ({ type: 'files', data: r.data })));
      }
      if (!prefix || prefix === "!") {
        let q = supabase.from("teams").select("id, name");
        if (cleanQuery) q = q.ilike("name", `%${cleanQuery}%`);
        else q = q.order("name", { ascending: true });
        searchTasks.push(q.limit(prefix === "!" ? 12 : 4).then(r => ({ type: 'teams', data: r.data })));
      }
      if (!prefix || prefix === "#") {
        let q = supabase.from("forum_posts").select("id, title");
        if (cleanQuery) q = q.ilike("title", `%${cleanQuery}%`);
        else q = q.order("created_at", { ascending: false });
        searchTasks.push(q.limit(prefix === "#" ? 12 : 5).then(r => ({ type: 'discussions', data: r.data })));
      }

      const resultsList = await Promise.all(searchTasks);
      
      const newResults = {
        people: resultsList.find(r => r.type === 'people')?.data || [],
        files: resultsList.find(r => r.type === 'files')?.data || [],
        teams: resultsList.find(r => r.type === 'teams')?.data || [],
        discussions: resultsList.find(r => r.type === 'discussions')?.data || []
      };

      setResults(newResults);
      setStatus("results");
    } catch (err) {
      console.error("Search error:", err);
      setStatus("error");
    }
  };

  const runCommand = (action: () => void) => {
    setOpen(false);
    action();
  };

  type CommandInfo = {
    label: string;
    category: string;
    emoji?: React.ReactNode;
    url?: string;
    action?: () => void;
    badge?: string;
  };

  const commands: CommandInfo[] = [
    ...staticPages.map(page => ({ ...page, category: "Global Navigation" })),
    { label: "Start Pomodoro Timer", url: "/pomodoro?start=true", emoji: <Timer className="h-4 w-4 text-orange-400" />, badge: "25m", category: "Quick Actions" },
    { label: theme === "dark" ? "Switch to Day Light" : "Enable Dark Mode", action: () => toggleTheme(), emoji: theme === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-indigo-400" />, category: "Quick Actions" }
  ];

  const uniqueCommands = commands.filter((cmd, index, self) =>
    index === self.findIndex(c => c.label === cmd.label)
  );

  const filtered = uniqueCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category?.toLowerCase().includes(query.toLowerCase())
  );

  const navigationCommands = filtered.filter(cmd => cmd.category === "Global Navigation");
  const actionCommands = filtered.filter(cmd => cmd.category === "Quick Actions");

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <div className="flex items-center border-b px-3 overflow-hidden">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandInput 
          placeholder="Type a command or search..." 
          value={query}
          onValueChange={setQuery}
          className="border-none focus:ring-0 h-11 bg-transparent"
        />
        <div className="hidden md:flex items-center gap-1.5 ml-auto">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">↑↓</span>
          </kbd>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⏎</span>
          </kbd>
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Filter by:</span>
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-primary/10 border-primary/20 flex gap-1 items-center px-1.5 py-0 text-[10px] font-medium transition-colors"
          onClick={() => setQuery("@")}
        >
          <AtSign className="h-3 w-3" /> Students
        </Badge>
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-purple-500/10 border-purple-500/20 flex gap-1 items-center px-1.5 py-0 text-[10px] font-medium transition-colors"
          onClick={() => setQuery("#")}
        >
          <HashIcon className="h-3 w-3" /> Forums
        </Badge>
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-emerald-500/10 border-emerald-500/20 flex gap-1 items-center px-1.5 py-0 text-[10px] font-medium transition-colors"
          onClick={() => setQuery("*")}
        >
          <FileIcon className="h-3 w-3" /> Files
        </Badge>
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-blue-500/10 border-blue-500/20 flex gap-1 items-center px-1.5 py-0 text-[10px] font-medium transition-colors"
          onClick={() => setQuery("!")}
        >
          <Star className="h-3 w-3" /> Teams
        </Badge>
      </div>
      <CommandList className="max-h-[70vh] custom-scroll p-2">
        {status === "loading" && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
            <span className="ml-2 text-sm text-muted-foreground">Scanning UniFlow...</span>
          </div>
        )}

        {status === "idle" && !query && (
          <CommandGroup heading="Recent Activity & Quick Links">
            {staticPages.slice(0, 5).map((page) => (
              <CommandItem key={page.label} onSelect={() => runCommand(() => navigate(page.url))} className="gap-2 rounded-md">
                <div className="text-muted-foreground opacity-70">{page.emoji}</div>
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {status === "error" && (
          <div className="p-4 text-center text-sm text-destructive flex items-center justify-center gap-2">
            <Info className="h-4 w-4" /> Error performing search. Please try again.
          </div>
        )}

        {status === "results" && 
         results.people.length === 0 && 
         results.files.length === 0 && 
         results.teams.length === 0 && 
         results.discussions.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Search className="h-8 w-8 opacity-20" />
            <p>No results found for "{query}"</p>
          </div>
        )}
        
        {results.people.length > 0 && (
          <CommandGroup heading="Students & Faculty">
            {results.people.map((person) => (
              <CommandItem 
                key={person.id} 
                onSelect={() => runCommand(() => navigate(`/profile?id=${person.id}`))}
                className="gap-3 rounded-md py-2"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{person.display_name}</span>
                  <span className="text-[10px] text-muted-foreground">{person.email}</span>
                </div>
                <Badge variant="outline" className="ml-auto text-[9px] opacity-70">Student</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.discussions.length > 0 && (
          <CommandGroup heading="Forum Discussions">
            {results.discussions.map((thread) => (
              <CommandItem 
                key={thread.id} 
                onSelect={() => runCommand(() => navigate(`/forums?id=${thread.id}`))}
                className="gap-3 rounded-md"
              >
                <MessageSquare className="h-4 w-4 text-purple-400 opacity-70" />
                <span className="truncate">{thread.title}</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">Thread</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.files.length > 0 && (
          <CommandGroup heading="Files & Materials">
            {results.files.map((file) => (
              <CommandItem 
                key={file.id} 
                onSelect={() => runCommand(() => navigate(`/vault?file=${file.id}`))}
                className="gap-3 rounded-md"
              >
                <FileText className="h-4 w-4 text-emerald-400 opacity-70" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground">{file.subject}</span>
                </div>
                <Badge variant="outline" className="ml-auto text-[9px] border-emerald-500/20 text-emerald-500 uppercase">
                  {file.file_type || "File"}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.teams.length > 0 && (
          <CommandGroup heading="Teams & Groups">
            {results.teams.map((team) => (
              <CommandItem 
                key={team.id} 
                onSelect={() => runCommand(() => navigate(`/teams?id=${team.id}`))}
                className="gap-3 rounded-md"
              >
                <Users className="h-4 w-4 text-blue-400 opacity-70" />
                <span>{team.name} Team</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">Official</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {actionCommands.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              {actionCommands.map((cmd) => (
                <CommandItem key={cmd.label} onSelect={() => runCommand(cmd.action ? cmd.action : () => navigate(cmd.url!))} className="gap-2 rounded-md">
                  {cmd.emoji}
                  <span>{cmd.label}</span>
                  {cmd.badge && <Badge variant="secondary" className="ml-auto text-[10px] py-0">{cmd.badge}</Badge>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {navigationCommands.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Global Navigation">
              {navigationCommands.map((page) => (
                <CommandItem 
                  key={page.label} 
                  onSelect={() => runCommand(() => navigate(page.url!))}
                  className="gap-2 rounded-md"
                >
                  <div className="text-muted-foreground opacity-70">{page.emoji}</div>
                  <span>{page.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
