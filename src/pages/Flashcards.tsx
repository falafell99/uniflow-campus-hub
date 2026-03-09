import { useState } from "react";
import { RotateCcw, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Layers, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Card = { front: string; back: string };
type Deck = { id: string; title: string; subject: string; cards: Card[]; color: string };

const decks: Deck[] = [
  {
    id: "la", title: "Linear Algebra Definitions", subject: "Linear Algebra",
    color: "bg-primary/10 border-primary/20",
    cards: [
      { front: "What is a vector space?", back: "A vector space V over a field F is a set equipped with two operations (addition and scalar multiplication) satisfying 8 axioms: closure, commutativity, associativity of addition, existence of zero vector, additive inverse, closure of scalar multiplication, distributivity, and compatibility." },
      { front: "Define linear independence.", back: "A set of vectors {v₁, v₂, ..., vₙ} is linearly independent if the equation c₁v₁ + c₂v₂ + ... + cₙvₙ = 0 implies that all scalars c₁ = c₂ = ... = cₙ = 0." },
      { front: "What is the rank of a matrix?", back: "The rank of a matrix is the dimension of the column space (or equivalently, the row space). It equals the number of pivot positions in the row echelon form." },
      { front: "What is an eigenvalue?", back: "A scalar λ is an eigenvalue of matrix A if there exists a non-zero vector v such that Av = λv. The vector v is the corresponding eigenvector." },
    ],
  },
  {
    id: "algo", title: "Algorithm Complexities", subject: "Algorithms",
    color: "bg-success/10 border-success/20",
    cards: [
      { front: "Time complexity of Merge Sort?", back: "O(n log n) in all cases (best, average, worst). Space complexity is O(n) due to the auxiliary array used during merging." },
      { front: "What is dynamic programming?", back: "An optimization technique that solves complex problems by breaking them into overlapping subproblems, solving each once, and storing results (memoization or tabulation)." },
      { front: "Difference between BFS and DFS?", back: "BFS explores level by level using a queue — O(V+E). DFS explores depth-first using a stack/recursion — O(V+E). BFS finds shortest path in unweighted graphs; DFS is better for topological sorting." },
    ],
  },
  {
    id: "db", title: "Database Fundamentals", subject: "Databases",
    color: "bg-warning/10 border-warning/20",
    cards: [
      { front: "What is normalization?", back: "The process of organizing a database to reduce redundancy and improve data integrity. Normal forms: 1NF (atomic values), 2NF (no partial dependencies), 3NF (no transitive dependencies), BCNF (every determinant is a candidate key)." },
      { front: "ACID properties?", back: "Atomicity (all or nothing), Consistency (valid state transitions), Isolation (concurrent transactions don't interfere), Durability (committed data persists)." },
    ],
  },
];

export default function Flashcards() {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [scores, setScores] = useState<Record<string, "easy" | "hard">>({});

  const handleScore = (difficulty: "easy" | "hard") => {
    if (!selectedDeck) return;
    const key = `${selectedDeck.id}-${cardIndex}`;
    setScores((p) => ({ ...p, [key]: difficulty }));
    // Auto-advance
    if (cardIndex < selectedDeck.cards.length - 1) {
      setFlipped(false);
      setTimeout(() => setCardIndex((i) => i + 1), 300);
    }
  };

  const currentCard = selectedDeck?.cards[cardIndex];
  const progress = selectedDeck ? ((cardIndex + 1) / selectedDeck.cards.length) * 100 : 0;

  if (!selectedDeck) {
    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🧠 Flashcards</h1>
          <p className="text-muted-foreground mt-1">Master concepts with spaced repetition</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <button
              key={deck.id}
              onClick={() => { setSelectedDeck(deck); setCardIndex(0); setFlipped(false); }}
              className={`glass-card p-5 text-left hover:scale-[1.02] transition-all duration-200 border ${deck.color}`}
            >
              <div className="flex items-start justify-between mb-3">
                <Layers className="h-5 w-5 text-primary" />
                <Badge variant="outline" className="text-[10px]">{deck.cards.length} cards</Badge>
              </div>
              <h3 className="font-semibold text-sm mb-1">{deck.title}</h3>
              <p className="text-xs text-muted-foreground">{deck.subject}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedDeck(null); setCardIndex(0); setFlipped(false); }}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Decks
        </Button>
        <div className="text-sm text-muted-foreground">
          {cardIndex + 1} / {selectedDeck.cards.length}
        </div>
      </div>

      <Progress value={progress} className="w-full max-w-lg h-1.5" />

      {/* Card */}
      <div className="w-full max-w-lg" style={{ perspective: "1000px" }}>
        <div
          onClick={() => setFlipped(!flipped)}
          className="relative cursor-pointer w-full min-h-[280px]"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.5s ease",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 glass-card p-8 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <BookOpen className="h-6 w-6 text-primary mb-4 opacity-50" />
            <p className="text-lg font-medium leading-relaxed">{currentCard?.front}</p>
            <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 glass-card p-8 flex flex-col items-center justify-center text-center bg-primary/5 border-primary/20"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-sm leading-relaxed">{currentCard?.back}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={cardIndex === 0}
          onClick={() => { setCardIndex((i) => i - 1); setFlipped(false); }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleScore("hard")}>
          <ThumbsDown className="h-3.5 w-3.5" /> Hard
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-success border-success/30 hover:bg-success/10" onClick={() => handleScore("easy")}>
          <ThumbsUp className="h-3.5 w-3.5" /> Easy
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => { setFlipped(false); setCardIndex(0); }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={cardIndex === selectedDeck.cards.length - 1}
          onClick={() => { setCardIndex((i) => i + 1); setFlipped(false); }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
