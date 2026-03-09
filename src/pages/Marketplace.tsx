import { useState } from "react";
import { ShoppingCart, Star, Search, Tag, Check, TrendingUp, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

const listings = [
  { id: 1, title: "Golden Notes: Calculus I Complete", author: "Bence M.", price: 500, credits: true, rating: 4.8, reviews: 34, subject: "Calculus I", tag: "Best Seller" },
  { id: 2, title: "Algorithms Cheat Sheet Bundle", author: "Gábor L.", price: 300, credits: true, rating: 4.6, reviews: 22, subject: "Algorithms", tag: "" },
  { id: 3, title: "Discrete Math Proof Templates", author: "Anna K.", price: 200, credits: true, rating: 4.9, reviews: 41, subject: "Discrete Math", tag: "Top Rated" },
  { id: 4, title: "Linear Algebra Solved Problems (200+)", author: "Márton B.", price: 750, credits: true, rating: 4.7, reviews: 28, subject: "Linear Algebra", tag: "Best Seller" },
  { id: 5, title: "OS Concepts Mind Maps", author: "Dániel T.", price: 0, credits: false, rating: 4.5, reviews: 15, subject: "Operating Systems", tag: "Free" },
  { id: 6, title: "Probability & Statistics Summary", author: "Eszter N.", price: 400, credits: true, rating: 4.4, reviews: 19, subject: "Probability", tag: "" },
];

const trendingThisWeek = [
  { id: 101, title: "Calculus II Final Review Pack", author: "Anna K.", downloads: 342, subject: "Calculus II" },
  { id: 102, title: "Data Structures Visualized", author: "Gábor L.", downloads: 289, subject: "Algorithms" },
  { id: 103, title: "Discrete Math Proofs Masterclass", author: "Eszter N.", downloads: 256, subject: "Discrete Math" },
];

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [confirmItem, setConfirmItem] = useState<typeof listings[0] | null>(null);
  const { credits, spendCredits, ownedItems, addOwnedItem } = useApp();

  const filtered = listings.filter((l) =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleBuy = () => {
    if (!confirmItem) return;
    if (confirmItem.price === 0) {
      addOwnedItem(confirmItem.id);
      toast({ title: "Added to library!", description: `"${confirmItem.title}" is now yours.` });
      setConfirmItem(null);
      return;
    }
    if (spendCredits(confirmItem.price)) {
      addOwnedItem(confirmItem.id);
      toast({ title: "Purchase successful!", description: `"${confirmItem.title}" has been added to your library.` });
    } else {
      toast({ title: "Insufficient credits", description: `You need ${confirmItem.price - credits} more credits.`, variant: "destructive" });
    }
    setConfirmItem(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🏪 Marketplace</h1>
          <p className="text-muted-foreground mt-1">Buy, sell, or trade Golden Notes for Academic Credits.</p>
        </div>
        <div className="flex items-center gap-2 glass-subtle px-3 py-1.5 rounded-lg">
          <Tag className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{credits.toLocaleString()} Credits</span>
        </div>
      </div>

      {/* Trending This Week */}
      <section className="glass-card p-5">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-warning" /> Trending This Week
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {trendingThisWeek.map((item, i) => (
            <div key={item.id} className="glass-subtle p-3 flex items-center gap-3 hover:shadow-md transition-all duration-200 cursor-pointer">
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 font-bold text-sm text-warning">
                #{i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.author} · {item.downloads} downloads</p>
              </div>
              <TrendingUp className="h-4 w-4 text-success shrink-0" />
            </div>
          ))}
        </div>
      </section>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const owned = ownedItems.includes(item.id);
          return (
            <div key={item.id} className="glass-card p-5 flex flex-col hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm flex-1 mr-2">{item.title}</h3>
                {item.tag && (
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${item.tag === "Free" ? "bg-success/10 text-success border-success/20" : "badge-golden"}`}>
                    {item.tag}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">by {item.author} · {item.subject}</p>
              <div className="flex items-center gap-1 mb-4">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="text-xs font-medium">{item.rating}</span>
                <span className="text-xs text-muted-foreground">({item.reviews} reviews)</span>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <span className="font-bold text-sm">{item.price === 0 ? "Free" : `${item.price} Credits`}</span>
                {owned ? (
                  <Button size="sm" className="h-7 gap-1 text-xs" variant="outline" disabled>
                    <Check className="h-3 w-3" /> Owned
                  </Button>
                ) : (
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setConfirmItem(item)}>
                    <ShoppingCart className="h-3 w-3" /> {item.price === 0 ? "Get" : "Buy"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirmItem} onOpenChange={() => setConfirmItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              {confirmItem?.price === 0
                ? `Add "${confirmItem?.title}" to your library for free?`
                : `Purchase "${confirmItem?.title}" for ${confirmItem?.price} Credits?`}
            </DialogDescription>
          </DialogHeader>
          {confirmItem && confirmItem.price > 0 && (
            <div className="glass-subtle p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="font-medium">{credits.toLocaleString()} Credits</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-medium text-destructive">-{confirmItem.price}</span>
              </div>
              <div className="border-t border-border/40 pt-1 flex justify-between text-sm">
                <span className="font-medium">After Purchase</span>
                <span className={`font-bold ${credits - confirmItem.price < 0 ? "text-destructive" : "text-success"}`}>
                  {(credits - confirmItem.price).toLocaleString()} Credits
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItem(null)}>Cancel</Button>
            <Button onClick={handleBuy} disabled={confirmItem ? confirmItem.price > credits : false}>
              {confirmItem?.price === 0 ? "Add to Library" : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
