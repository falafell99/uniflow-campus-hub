import { useState, useEffect, useRef } from "react";
import {
  RotateCcw, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight,
  Layers, BookOpen, Plus, Trash2, Loader2, Edit2, X, Check, Sparkles, Zap, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { VaultFilePicker } from "@/components/VaultFilePicker";
import { extractTextFromPDF } from "@/lib/pdfUtils";
import { useLocation } from "react-router-dom";
import { logActivity } from "@/lib/activity";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Types ───────────────────────────────────────────────────────────────────
type Card = { id: number; front: string; back: string; deck_id: number };
type Deck = { id: number; title: string; subject: string; color: string; card_count: number };

const COLORS = [
  "bg-primary/10 border-primary/20",
  "bg-success/10 border-success/20",
  "bg-warning/10 border-warning/20",
  "bg-destructive/10 border-destructive/20",
  "bg-purple-500/10 border-purple-500/20",
];

// Built-in starter decks (seeded on first load if DB empty)
const starterDecks = [
  {
    title: "Linear Algebra Definitions", subject: "Linear Algebra", color: COLORS[0],
    cards: [
      { front: "What is a vector space?", back: "A set V over a field F with addition and scalar multiplication satisfying 8 axioms: closure, commutativity, associativity, zero vector, additive inverse, scalar closure, distributivity, and compatibility." },
      { front: "Define linear independence.", back: "Vectors {v₁…vₙ} are linearly independent if c₁v₁+…+cₙvₙ=0 implies c₁=…=cₙ=0." },
      { front: "What is an eigenvalue?", back: "Scalar λ is an eigenvalue of A if ∃ non-zero v: Av = λv. The vector v is the eigenvector." },
    ],
  },
  {
    title: "Algorithm Complexities", subject: "Algorithms", color: COLORS[1],
    cards: [
      { front: "Time complexity of Merge Sort?", back: "O(n log n) in all cases. Space: O(n) for auxiliary array." },
      { front: "Difference between BFS and DFS?", back: "BFS: queue, level-by-level, finds shortest path. DFS: stack/recursion, topological sort. Both O(V+E)." },
      { front: "What is dynamic programming?", back: "Optimization by solving overlapping subproblems once and storing results (memoization/tabulation)." },
    ],
  },
];

function timeLabel(score: Record<number, "easy" | "hard">, total: number) {
  const done = Object.keys(score).length;
  const easy = Object.values(score).filter((v) => v === "easy").length;
  return done === total ? `${easy}/${total} easy` : `${done}/${total} done`;
}

// ─── Card flip viewer ─────────────────────────────────────────────────────────
function CardViewer({ cards, deckId }: { cards: Card[]; deckId: number }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [scores, setScores] = useState<Record<number, "easy" | "hard">>({});
  const { user } = useAuth();

  const card = cards[idx];
  const progress = ((idx + 1) / cards.length) * 100;
  const allDone = Object.keys(scores).length === cards.length;

  const handleScore = async (difficulty: "easy" | "hard") => {
    setScores((p) => ({ ...p, [idx]: difficulty }));
    // Save to supabase
    if (user) {
      await supabase.from("flashcard_results").upsert({
        user_id: user.id, deck_id: deckId, card_id: card.id, result: difficulty,
      });
      logActivity("flashcard_reviewed");
    }
    if (idx < cards.length - 1) {
      setFlipped(false);
      setTimeout(() => setIdx((i) => i + 1), 280);
    }
  };

  if (allDone) {
    const easy = Object.values(scores).filter((v) => v === "easy").length;
    return (
      <div className="text-center space-y-4 py-8">
        <p className="text-4xl">🎉</p>
        <div>
          <p className="text-xl font-bold">Deck Complete!</p>
          <p className="text-muted-foreground mt-1">{easy}/{cards.length} marked Easy · {cards.length - easy} need more practice</p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => { setIdx(0); setFlipped(false); setScores({}); }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Study Again
          </Button>
          <Button variant="outline" onClick={() => { setIdx(0); setFlipped(false); setScores({}); }}>
            Hard Cards Only
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 flex flex-col items-center w-full max-w-lg mx-auto">
      <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
        <span>{idx + 1} / {cards.length}</span>
        <span>{timeLabel(scores, cards.length)}</span>
      </div>

      <Progress value={progress} className="w-full h-1.5" />

      {/* Flip card */}
      <div className="w-full" style={{ perspective: "1000px" }}>
        <div
          onClick={() => setFlipped((v) => !v)}
          className="relative cursor-pointer w-full min-h-[260px]"
          style={{ transformStyle: "preserve-3d", transition: "transform 0.45s ease", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div className="absolute inset-0 glass-card p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden" }}>
            <BookOpen className="h-6 w-6 text-primary mb-4 opacity-40" />
            <p className="text-lg font-medium leading-relaxed">{card?.front}</p>
            <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
          </div>
          <div className="absolute inset-0 glass-card p-8 flex flex-col items-center justify-center text-center bg-primary/5 border-primary/20" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <p className="text-sm leading-relaxed">{card?.back}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => { setIdx((i) => i - 1); setFlipped(false); }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleScore("hard")}>
          <ThumbsDown className="h-3.5 w-3.5" /> Hard
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-success border-success/30 hover:bg-success/10" onClick={() => handleScore("easy")}>
          <ThumbsUp className="h-3.5 w-3.5" /> Easy
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setFlipped(false); setIdx(0); setScores({}); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={idx === cards.length - 1} onClick={() => { setIdx((i) => i + 1); setFlipped(false); }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Add Card Dialog ──────────────────────────────────────────────────────────
function AddCardDialog({ deckId, open, onClose, onAdded }: { deckId: number; open: boolean; onClose: () => void; onAdded: (c: Card) => void }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!front.trim() || !back.trim()) { toast({ title: "Fill both sides", variant: "destructive" }); return; }
    setSaving(true);
    const { data, error } = await supabase.from("flashcard_cards").insert({ deck_id: deckId, front: front.trim(), back: back.trim() }).select().single();
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    onAdded(data as Card);
    setFront(""); setBack("");
    toast({ title: "Card added ✓" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Flashcard</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-1">
          <div><label className="text-sm font-medium mb-1 block">Front (question)</label>
            <Textarea rows={2} placeholder="e.g. What is an eigenvalue?" value={front} onChange={(e) => setFront(e.target.value)} />
          </div>
          <div><label className="text-sm font-medium mb-1 block">Back (answer)</label>
            <Textarea rows={3} placeholder="Detailed explanation..." value={back} onChange={(e) => setBack(e.target.value)} />
          </div>
          <Button className="w-full gap-2" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Flashcards page ─────────────────────────────────────────────────────
export default function Flashcards() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; storagePath: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const location = useLocation();
  const vaultFile = (location.state as any)?.vaultFile;
  const autoGenTriggered = useRef(false);

  const loadDecks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("flashcard_decks")
      .select("id, title, subject, color, card_count")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setDecks(data as Deck[]);
    } else {
      // Seed starter decks
      for (const d of starterDecks) {
        const { data: deck } = await supabase.from("flashcard_decks")
          .insert({ title: d.title, subject: d.subject, color: d.color, card_count: d.cards.length, owner_id: user?.id })
          .select().single();
        if (deck) {
          await supabase.from("flashcard_cards").insert(d.cards.map((c) => ({ ...c, deck_id: deck.id })));
        }
      }
      const { data: seeded } = await supabase.from("flashcard_decks").select("*").order("created_at");
      if (seeded) setDecks(seeded as Deck[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadDecks();
  }, [user]);

  // Auto-generate from Vault navigation
  useEffect(() => {
    if (!vaultFile || !API_KEY || !user || autoGenTriggered.current) return;
    autoGenTriggered.current = true;
    const autoGenerate = async () => {
      setGenerating(true);
      try {
        const storagePath = vaultFile.storage_path || vaultFile.storagePath;
        const text = await extractTextFromPDF(storagePath);
        if (!text) throw new Error("No text extracted from PDF");

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: "You are a flashcard generator. Given text from a lecture or document, create exactly 10 flashcards. Respond ONLY with a valid JSON array, no other text, no markdown code blocks. Format: [{\"front\": \"question or term\", \"back\": \"answer or definition\"}]" },
              { role: "user", content: "Create 10 flashcards from this text:\n\n" + text.slice(0, 6000) }
            ],
            temperature: 0.2,
          }),
        });

        const resData = await response.json();
        const aiContent = resData.choices?.[0]?.message?.content;
        let cards: { front: string; back: string }[] = [];
        try {
          const parsed = JSON.parse(aiContent);
          cards = Array.isArray(parsed) ? parsed : parsed.cards || parsed.flashcards || [];
        } catch {
          const match = aiContent?.match(/\[.*\]/s);
          if (match) cards = JSON.parse(match[0]);
        }

        if (cards.length === 0) throw new Error("AI returned no flashcards");

        const color = COLORS[decks.length % COLORS.length];
        const { data: deck } = await supabase.from("flashcard_decks").insert({
          title: vaultFile.name.replace(/\.pdf$/i, ""),
          subject: "AI Generated",
          color,
          card_count: cards.length,
          owner_id: user.id,
        }).select().single();

        if (deck) {
          await supabase.from("flashcard_cards").insert(
            cards.map((c: any) => ({ front: c.front, back: c.back, deck_id: deck.id }))
          );
          setDecks(prev => [...prev, deck as Deck]);
          toast({ title: `${cards.length} flashcards created from ${vaultFile.name} ✨` });
        }
      } catch (err: any) {
        toast({ title: "Auto-generation failed", description: err.message, variant: "destructive" });
      } finally {
        setGenerating(false);
        window.history.replaceState({}, "");
      }
    };
    autoGenerate();
  }, [vaultFile, user, API_KEY]);

  const openDeck = async (deck: Deck) => {
    setSelectedDeck(deck);
    setLoadingCards(true);
    const { data } = await supabase.from("flashcard_cards").select("*").eq("deck_id", deck.id).order("id");
    setDeckCards((data as Card[]) || []);
    setLoadingCards(false);
  };

  const createDeck = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const color = COLORS[decks.length % COLORS.length];
    const { data, error } = await supabase.from("flashcard_decks").insert({
      title: newTitle.trim(), subject: newSubject.trim() || "General", color, card_count: 0, owner_id: user?.id,
    }).select().single();
    setCreating(false);
    if (error || !data) { toast({ title: "Error creating deck", variant: "destructive" }); return; }
    setDecks((p) => [...p, data as Deck]);
    toast({ title: "Deck created ✓" });
    setNewTitle(""); setNewSubject(""); setNewDeckOpen(false);
  };

  const deleteDeck = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("flashcard_decks").delete().eq("id", id);
    setDecks((p) => p.filter((d) => d.id !== id));
    toast({ title: "Deck deleted" });
  };

  const handleCardAdded = async (card: Card) => {
    setDeckCards((p) => [...p, card]);
    // Update count
    if (selectedDeck) {
      await supabase.from("flashcard_decks").update({ card_count: (selectedDeck.card_count || 0) + 1 }).eq("id", selectedDeck.id);
      setSelectedDeck((d) => d ? { ...d, card_count: (d.card_count || 0) + 1 } : d);
    }
  };

  const handleAiGenerate = async () => {
    if (!selectedFile || !API_KEY) return;
    setGenerating(true);
    try {
      // 1. Extract text
      const text = await extractTextFromPDF(selectedFile.storagePath);
      if (!text) throw new Error("Could not extract text from PDF");

      // 2. Call AI
      const prompt = `Generate 8-10 high-quality flashcards based on the following text. 
Return ONLY a JSON array of objects with "front" and "back" keys. 
Example: [{"front": "Question", "back": "Answer"}]

TEXT:
${text}`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        }),
      });

      const resData = await response.json();
      const aiContent = resData.choices[0].message.content;
      let cards = [];
      try {
        const parsed = JSON.parse(aiContent);
        cards = Array.isArray(parsed) ? parsed : parsed.cards || [];
      } catch {
        // Fallback if AI didn't return pure array
        const match = aiContent.match(/\[.*\]/s);
        if (match) cards = JSON.parse(match[0]);
      }

      if (cards.length === 0) throw new Error("AI failed to generate cards");

      // 3. Create deck
      const color = COLORS[decks.length % COLORS.length];
      const { data: deck } = await supabase.from("flashcard_decks").insert({
        title: selectedFile.name.replace(".pdf", ""),
        subject: "AI Generated",
        color,
        card_count: cards.length,
        owner_id: user?.id,
      }).select().single();

      if (deck) {
        await supabase.from("flashcard_cards").insert(
          cards.map((c: any) => ({ ...c, deck_id: deck.id }))
        );
        setDecks(prev => [...prev, deck as Deck]);
        toast({ title: "AI Deck created! ✨" });
        setAiGenOpen(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // ── Deck list view ──
  if (!selectedDeck) {
    return (
      <div className="animate-fade-in space-y-6">
        {generating && vaultFile && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-2xl text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Generating flashcards from <strong>{vaultFile.name}</strong>...</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">🧠 Flashcards</h1>
            <p className="text-muted-foreground mt-1">Master concepts with spaced repetition — cloud synced</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => setAiGenOpen(true)}>
              <Sparkles className="h-4 w-4" /> AI Generate
            </Button>
            <Button className="gap-2" onClick={() => setNewDeckOpen(true)}>
              <Plus className="h-4 w-4" /> New Deck
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <button
                key={deck.id}
                onClick={() => openDeck(deck)}
                className={`glass-card p-5 text-left hover:scale-[1.02] transition-all duration-200 border group relative ${deck.color}`}
              >
                <button
                  onClick={(e) => deleteDeck(deck.id, e)}
                  className="absolute top-3 right-3 h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-start justify-between mb-3">
                  <Layers className="h-5 w-5 text-primary" />
                  <Badge variant="outline" className="text-[10px]">{deck.card_count} cards</Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1 pr-6">{deck.title}</h3>
                <p className="text-xs text-muted-foreground">{deck.subject}</p>
              </button>
            ))}

            {/* Add deck shortcut */}
            <button
              onClick={() => setNewDeckOpen(true)}
              className="glass-card p-5 text-left border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Create Deck</span>
            </button>
          </div>
        )}

        {/* New Deck dialog */}
        <Dialog open={newDeckOpen} onOpenChange={(v) => !v && setNewDeckOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>New Flashcard Deck</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-1">
              <Input placeholder="Deck title, e.g. Probability Theorems" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <Input placeholder="Subject, e.g. Probability Theory" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              <Button className="w-full gap-2" onClick={createDeck} disabled={creating || !newTitle.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Deck
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Study view ──
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedDeck(null); setDeckCards([]); }}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Decks
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{selectedDeck.title}</Badge>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddCardOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Card
          </Button>
        </div>
      </div>

      {loadingCards ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : deckCards.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">📭</p>
          <p className="font-medium">No cards yet</p>
          <p className="text-sm text-muted-foreground">Add your first card to start studying</p>
          <Button className="gap-2" onClick={() => setAddCardOpen(true)}>
            <Plus className="h-4 w-4" /> Add First Card
          </Button>
        </div>
      ) : (
        <CardViewer cards={deckCards} deckId={selectedDeck.id} />
      )}

      <AddCardDialog
        deckId={selectedDeck.id}
        open={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onAdded={handleCardAdded}
      />

      {/* AI Generation Dialog */}
      <Dialog open={aiGenOpen} onOpenChange={setAiGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Deck from PDF
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="text-center p-6 border-2 border-dashed border-border/40 rounded-2xl bg-muted/30">
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold truncate max-w-full">{selectedFile.name}</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setSelectedFile(null)}>Change file</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Select a lecture or note from The Vault</p>
                  <Button onClick={() => setVaultPickerOpen(true)} variant="secondary" size="sm">Select from Vault</Button>
                </div>
              )}
            </div>

            <Button 
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2" 
              disabled={!selectedFile || generating}
              onClick={handleAiGenerate}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing PDF...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Generate 10 Flashcards
                </>
              )}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              AI will extract the key concepts and create a study deck automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <VaultFilePicker 
        open={vaultPickerOpen} 
        onOpenChange={setVaultPickerOpen} 
        onSelect={(file) => {
          setSelectedFile(file);
          setVaultPickerOpen(false);
        }}
      />
    </div>
  );
}
