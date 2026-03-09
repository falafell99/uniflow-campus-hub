import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";

const allItems = [
  { label: "Dashboard", group: "Pages", url: "/", emoji: "🏠" },
  { label: "The Vault", group: "Pages", url: "/vault", emoji: "📚" },
  { label: "AI Oracle", group: "Pages", url: "/ai-oracle", emoji: "🤖" },
  { label: "Past Exams Hub", group: "Pages", url: "/past-exams", emoji: "📝" },
  { label: "Study Circles", group: "Pages", url: "/meetups", emoji: "🤝" },
  { label: "Voice Lounges", group: "Pages", url: "/voice-lounges", emoji: "🎙" },
  { label: "Forums / Lobby", group: "Pages", url: "/forums", emoji: "💬" },
  { label: "Professor Radar", group: "Pages", url: "/professors", emoji: "⭐" },
  { label: "Internship Board", group: "Pages", url: "/internships", emoji: "💼" },
  { label: "Marketplace", group: "Pages", url: "/marketplace", emoji: "🏪" },
  { label: "Toolbox", group: "Pages", url: "/toolbox", emoji: "🛠" },
  { label: "Profile", group: "Pages", url: "/profile", emoji: "👤" },
  { label: "Linear Algebra", group: "Subjects", url: "/vault", emoji: "📐" },
  { label: "Calculus II", group: "Subjects", url: "/vault", emoji: "∫" },
  { label: "Algorithms & Data Structures", group: "Subjects", url: "/vault", emoji: "🔢" },
  { label: "Discrete Mathematics", group: "Subjects", url: "/vault", emoji: "🧮" },
  { label: "Prof. Kovács", group: "People", url: "/professors", emoji: "👨‍🏫" },
  { label: "Prof. Tóth", group: "People", url: "/professors", emoji: "👩‍🏫" },
  { label: "Márton B.", group: "People", url: "/profile", emoji: "👤" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const groups = [...new Set(allItems.map((i) => i.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to anything... (subjects, people, pages)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {allItems.filter((i) => i.group === group).map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => { navigate(item.url); setOpen(false); }}
                className="gap-2"
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
