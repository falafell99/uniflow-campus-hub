import { useState, useEffect } from "react";
import { Plus, Clock, MessageSquare, Users, Loader2, Search, UserSearch } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { publishToFeed } from "@/lib/feed";

type PartnerRequest = {
  id: string; user_id: string; subject: string; description: string | null; availability: string | null;
  is_active: boolean; created_at: string;
  profiles: { display_name: string; university: string | null; faculty: string | null } | null;
};

const AVAILABILITY_OPTS = ["Any", "Mornings", "Afternoons", "Evenings", "Weekends"];

export default function PartnersTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [myRequest, setMyRequest] = useState<PartnerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [filterAvail, setFilterAvail] = useState("Any");
  const [postOpen, setPostOpen] = useState(false);
  const [pSubject, setPSubject] = useState(""); const [pDesc, setPDesc] = useState(""); const [pAvail, setPAvail] = useState("Flexible");

  const fetchData = async () => {
    if (!user) return;
    const { data } = await supabase.from("study_partner_requests").select("*, profiles!user_id(display_name, university, faculty)").eq("is_active", true).order("created_at", { ascending: false });
    const all = (data as PartnerRequest[]) || [];
    setMyRequest(all.find(r => r.user_id === user.id) || null);
    setRequests(all.filter(r => r.user_id !== user.id));
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, [user]);

  const handlePost = async () => {
    if (!pSubject.trim() || !user) return;
    await supabase.from("study_partner_requests").update({ is_active: false }).eq("user_id", user.id);
    const { data: newReq, error } = await supabase.from("study_partner_requests").insert({ user_id: user.id, subject: pSubject.trim(), description: pDesc.trim() || null, availability: pAvail, is_active: true }).select().single();
    if (error || !newReq) { toast.error("Failed to post request: " + (error?.message || "Unknown error")); return; }
    publishToFeed("question_asked", newReq.id, `Looking for study partner: ${pSubject.trim()}`, pSubject.trim());
    toast.success("Your post is live!"); setPostOpen(false); setPSubject(""); setPDesc(""); fetchData();
  };

  const deactivateRequest = async () => {
    if (!user) return;
    await supabase.from("study_partner_requests").update({ is_active: false }).eq("user_id", user.id);
    toast.success("Post removed"); fetchData();
  };

  const filtered = requests.filter(r => {
    const matchesSearch = !search || r.subject.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesAvail = filterAvail === "Any" || r.availability?.includes(filterAvail);
    return matchesSearch && matchesAvail;
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div />
        <Button onClick={() => setPostOpen(true)} className="bg-primary gap-2 shrink-0"><Plus className="h-4 w-4" />Looking for Partner</Button>
      </div>

      {myRequest && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0"><p className="text-sm font-semibold text-primary">Your active post</p><p className="text-xs text-muted-foreground truncate">{myRequest.subject} · {myRequest.description}</p></div>
          <Button variant="ghost" size="sm" onClick={deactivateRequest} className="text-destructive shrink-0 h-8 text-xs">Remove post</Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by subject..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border/40" /></div>
        <div className="flex border border-border/40 rounded-lg overflow-hidden bg-card shrink-0">
          {AVAILABILITY_OPTS.map(opt => <button key={opt} onClick={() => setFilterAvail(opt)} className={`px-3 py-2 text-xs font-medium transition-all ${filterAvail === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{opt}</button>)}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-24">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border/30">
            <UserSearch className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">No one looking for a partner yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Post your request to find a study partner!</p>
          <Button onClick={() => setPostOpen(true)} className="gap-2">
            Post your request
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-card border border-border/40 rounded-2xl p-5 hover:border-primary/20 transition-all space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">{p.profiles?.display_name?.charAt(0) || "?"}</div>
                  <div className="min-w-0"><p className="font-semibold text-sm truncate">{p.profiles?.display_name}</p><p className="text-[11px] text-muted-foreground truncate">{p.profiles?.university || "University"}</p></div>
                </div>
                <Badge className="bg-primary/10 text-primary border-0 text-[11px] shrink-0">{p.subject}</Badge>
              </div>
              {p.description && <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">{p.description}</p>}
              {p.availability && <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/20"><Clock className="h-3 w-3 shrink-0" /><span className="truncate">{p.availability}</span></div>}
              <div className="flex gap-2 pt-2 mt-auto">
                <Button size="sm" className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90" onClick={() => navigate("/messages", { state: { userId: p.user_id } })}><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Message</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" />Looking for Partner</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Subject *</label><Input value={pSubject} onChange={e => setPSubject(e.target.value)} placeholder="e.g. Calculus II" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">What are you looking for?</label><Textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="e.g. Preparing for the final exam..." className="resize-none min-h-[100px]" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Availability</label>
              <select value={pAvail} onChange={e => setPAvail(e.target.value)} className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <option value="Flexible">Flexible</option><option value="Mornings">Mornings</option><option value="Afternoons">Afternoons</option><option value="Evenings">Evenings</option><option value="Weekends">Weekends</option>
              </select>
            </div>
            <Button className="w-full" onClick={handlePost} disabled={!pSubject.trim()}>Post Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
