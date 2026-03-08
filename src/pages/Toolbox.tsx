import { ExternalLink, Globe, FileText, Code, BookOpen, Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categories = [
  {
    title: "University Platforms",
    icon: Globe,
    tools: [
      { name: "ELTE Canvas", desc: "Official LMS for course materials and assignments", url: "https://canvas.elte.hu", tag: "Essential" },
      { name: "Neptun", desc: "Course registration, grades, and transcripts", url: "https://neptun.elte.hu", tag: "Essential" },
      { name: "ELTE IK Website", desc: "Faculty of Informatics official site", url: "https://inf.elte.hu", tag: "Info" },
    ],
  },
  {
    title: "Writing & LaTeX",
    icon: FileText,
    tools: [
      { name: "Overleaf", desc: "Online collaborative LaTeX editor", url: "https://overleaf.com", tag: "Popular" },
      { name: "LaTeX Tutorial", desc: "Comprehensive LaTeX guide for beginners", url: "https://latex-tutorial.com", tag: "Learning" },
      { name: "Detexify", desc: "Draw a symbol to find its LaTeX command", url: "https://detexify.kirelabs.org", tag: "Handy" },
    ],
  },
  {
    title: "Coding & Development",
    icon: Code,
    tools: [
      { name: "GitHub Student Pack", desc: "Free developer tools for students", url: "https://education.github.com/pack", tag: "Free" },
      { name: "LeetCode", desc: "Practice coding problems for interviews", url: "https://leetcode.com", tag: "Practice" },
      { name: "Visualgo", desc: "Visualize algorithms and data structures", url: "https://visualgo.net", tag: "Learning" },
    ],
  },
  {
    title: "Study Resources",
    icon: BookOpen,
    tools: [
      { name: "Wolfram Alpha", desc: "Computational knowledge engine for math", url: "https://wolframalpha.com", tag: "Math" },
      { name: "3Blue1Brown", desc: "Visual math explanations on YouTube", url: "https://3blue1brown.com", tag: "Videos" },
      { name: "MIT OpenCourseWare", desc: "Free university-level courses", url: "https://ocw.mit.edu", tag: "Free" },
    ],
  },
  {
    title: "Language Tools",
    icon: Languages,
    tools: [
      { name: "Sztaki Szótár", desc: "Hungarian-English dictionary", url: "https://szotar.sztaki.hu", tag: "Dictionary" },
      { name: "Tureng", desc: "Turkish-English dictionary", url: "https://tureng.com", tag: "Dictionary" },
      { name: "DeepL Translator", desc: "AI-powered translation tool", url: "https://deepl.com", tag: "Translation" },
    ],
  },
];

export default function Toolbox() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🛠 Resource Toolbox</h1>
        <p className="text-muted-foreground mt-1">Your curated collection of essential tools and links</p>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => (
          <section key={cat.title} className="glass-card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <cat.icon className="h-5 w-5 text-primary" />
              {cat.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cat.tools.map((tool) => (
                <a
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-subtle p-3.5 rounded-lg hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{tool.name}</h3>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{tool.desc}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">{tool.tag}</Badge>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
