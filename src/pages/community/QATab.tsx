import { useState, useEffect } from "react";
import { HelpCircle, ChevronLeft, CheckCircle, ThumbsUp, Plus, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { publishToFeed } from "@/lib/feed";
import { toast } from "sonner";

type Question = { id: string; user_id: string; title: string; body: string | null; subject: string | null; tags: string[]; answer_count: number; is_resolved: boolean; created_at: string; profiles: { display_name: string } | null };
type Answer = { id: string; question_id: string; user_id: string; content: string; is_accepted: boolean; upvotes: number; created_at: string; profiles: { display_name: string } | null };

export default function QATab() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"Latest" | "Unanswered" | "Resolved">("Latest");
  const [search, setSearch] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [qTitle, setQTitle] = useState(""); const [qBody, setQBody] = useState(""); const [qSubject, setQSubject] = useState(""); const [qTags, setQTags] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const fetchQuestions = async () => {
    const { data } = await supabase.from("qa_questions").select("*, profiles!user_id(display_name)").order("created_at", { ascending: false }).limit(50);
    setQuestions((data as Question[]) || []); setLoading(false);
  };
  useEffect(() => { fetchQuestions(); }, []);

  const fetchAnswers = async (qId: string) => {
    const { data } = await supabase.from("qa_answers").select("*, profiles!user_id(display_name)").eq("question_id", qId).order("is_accepted", { ascending: false }).order("upvotes", { ascending: false }).order("created_at", { ascending: true });
    setAnswers((data as Answer[]) || []);
  };
  useEffect(() => { if (selectedQuestion) fetchAnswers(selectedQuestion.id); }, [selectedQuestion]);

  const handlePostQuestion = async () => {
    if (!qTitle.trim() || !user) return;
    const tagsArray = qTags.split(",").map(t => t.trim()).filter(Boolean);
    const { data: q, error } = await supabase.from("qa_questions").insert({ user_id: user.id, title: qTitle.trim(), body: qBody.trim() || null, subject: qSubject.trim() || null, tags: tagsArray }).select().single();
    if (error || !q) { toast.error("Could not post question: " + (error?.message || "Unknown error")); return; }
    publishToFeed("question_asked", q.id, q.title, q.subject);
    toast.success("Question posted!"); setAskOpen(false); setQTitle(""); setQBody(""); setQSubject(""); setQTags(""); fetchQuestions();
  };

  const handleSubmitAnswer = async () => {
    if (!newAnswer.trim() || !user || !selectedQuestion) return;
    const { error } = await supabase.from("qa_answers").insert({ question_id: selectedQuestion.id, user_id: user.id, content: newAnswer.trim() });
    if (error) { toast.error("Could not post answer: " + error.message); return; }
    await supabase.from("qa_questions").update({ answer_count: selectedQuestion.answer_count + 1 }).eq("id", selectedQuestion.id);
    setSelectedQuestion({ ...selectedQuestion, answer_count: selectedQuestion.answer_count + 1 });
    publishToFeed("question_answered", selectedQuestion.id, selectedQuestion.title, selectedQuestion.subject || undefined);
    setNewAnswer(""); fetchAnswers(selectedQuestion.id); fetchQuestions();
  };

  const markResolved = async (qId: string) => {
    await supabase.from("qa_questions").update({ is_resolved: true }).eq("id", qId);
    toast.success("Marked as resolved!");
    if (selectedQuestion?.id === qId) setSelectedQuestion({ ...selectedQuestion!, is_resolved: true });
    fetchQuestions();
  };

  const acceptAnswer = async (answerId: string) => {
    if (!selectedQuestion) return;
    await supabase.from("qa_answers").update({ is_accepted: true }).eq("id", answerId);
    await markResolved(selectedQuestion.id); fetchAnswers(selectedQuestion.id);
  };

  const handleUpvote = async (answerId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("qa_answer_votes").select("answer_id").eq("answer_id", answerId).eq("user_id", user.id).single();
    if (existing) { toast.error("Already upvoted"); return; }
    const ans = answers.find(a => a.id === answerId); if (!ans) return;
    await supabase.from("qa_answer_votes").insert({ answer_id: answerId, user_id: user.id });
    await supabase.from("qa_answers").update({ upvotes: ans.upvotes + 1 }).eq("id", answerId);
    fetchAnswers(selectedQuestion!.id);
  };

  const filtered = questions.filter(q => {
    if (filter === "Unanswered" && q.answer_count > 0) return false;
    if (filter === "Resolved" && !q.is_resolved) return false;
    if (search && !q.subject?.toLowerCase().includes(search.toLowerCase()) && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div />
        <Button onClick={() => setAskOpen(true)} className="bg-primary gap-2 shrink-0"><HelpCircle className="h-4 w-4" />Ask Question</Button>
      </div>

      {!selectedQuestion ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex border border-border/40 rounded-lg overflow-hidden bg-card shrink-0">
              {(["Latest", "Unanswered", "Resolved"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-xs font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
              ))}
            </div>
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search subject or title..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border/40" /></div>
          </div>
          {loading ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center text-3xl">❓</div>
              <div className="space-y-2">
                <p className="font-bold text-lg">No questions yet</p>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Be the first to ask! Click "Ask Question" and get help from fellow students. Good questions help everyone.</p>
              </div>
              <Button onClick={() => setAskOpen(true)} className="mt-2 bg-primary hover:bg-primary/90">
                Ask the first question →
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.map(q => (
                <div key={q.id} onClick={() => setSelectedQuestion(q)} className="bg-card border border-border/40 rounded-2xl p-5 hover:border-primary/20 transition-all cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl border shrink-0 ${q.is_resolved ? "bg-success/10 border-success/20 text-success" : q.answer_count > 0 ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/20 border-border/40 text-muted-foreground"}`}>
                      <span className="text-lg font-black leading-none">{q.answer_count}</span>
                      <span className="text-[9px] font-medium leading-none mt-1">{q.answer_count === 1 ? "answer" : "answers"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-snug">{q.title}</h3>
                        {q.is_resolved && <Badge className="bg-success/10 text-success border-success/20 text-[10px] shrink-0">Resolved</Badge>}
                      </div>
                      {q.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.body}</p>}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {q.subject && <Badge variant="outline" className="text-[10px] h-5">{q.subject}</Badge>}
                        {q.tags?.map(tag => <Badge key={tag} variant="outline" className="text-[10px] h-5 bg-muted/20">{tag}</Badge>)}
                        <span className="text-[11px] text-muted-foreground ml-auto">by {q.profiles?.display_name} · {formatDistanceToNow(new Date(q.created_at))} ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedQuestion(null)} className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4 mr-1" />Back to questions</Button>
          <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold leading-tight">{selectedQuestion.title}</h2>
              {selectedQuestion.user_id === user?.id && !selectedQuestion.is_resolved && (
                <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10 shrink-0" onClick={() => markResolved(selectedQuestion.id)}>Mark Resolved</Button>
              )}
            </div>
            {selectedQuestion.body && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedQuestion.body}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/20">
              {selectedQuestion.subject && <Badge variant="outline" className="text-[11px]">{selectedQuestion.subject}</Badge>}
              {selectedQuestion.tags?.map(tag => <Badge key={tag} variant="outline" className="text-[10px] bg-muted/20">{tag}</Badge>)}
              <span className="text-[11px] text-muted-foreground ml-auto">Asked by {selectedQuestion.profiles?.display_name} · {formatDistanceToNow(new Date(selectedQuestion.created_at))} ago</span>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-sm px-1">{answers.length} Answer{answers.length !== 1 ? "s" : ""}</h3>
            {answers.map(answer => (
              <div key={answer.id} className={`bg-card border rounded-2xl p-5 space-y-3 ${answer.is_accepted ? "border-success/30 bg-success/5" : "border-border/40"}`}>
                {answer.is_accepted && <div className="flex items-center gap-1.5 text-success text-xs font-semibold"><CheckCircle className="h-3.5 w-3.5" />Accepted Answer</div>}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer.content}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border/10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleUpvote(answer.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors bg-muted/20 px-2.5 py-1.5 rounded-lg"><ThumbsUp className="h-3.5 w-3.5" />{answer.upvotes}</button>
                    <span className="text-[11px] text-muted-foreground">by {answer.profiles?.display_name} · {formatDistanceToNow(new Date(answer.created_at))} ago</span>
                  </div>
                  {selectedQuestion.user_id === user?.id && !selectedQuestion.is_resolved && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-success hover:bg-success/10 px-2.5" onClick={() => acceptAnswer(answer.id)}>Accept Answer</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!selectedQuestion.is_resolved && (
            <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-sm">Your Answer</h3>
              <Textarea value={newAnswer} onChange={e => setNewAnswer(e.target.value)} placeholder="Write a helpful, detailed answer..." className="min-h-[120px] resize-none bg-background/50 text-sm" />
              <div className="flex justify-end"><Button onClick={handleSubmitAnswer} disabled={!newAnswer.trim()} className="bg-primary px-6">Post Answer</Button></div>
            </div>
          )}
        </div>
      )}

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Ask a Question</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Title *</label><Input value={qTitle} onChange={e => setQTitle(e.target.value)} placeholder="e.g. How do I solve this integral?" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Details</label><Textarea value={qBody} onChange={e => setQBody(e.target.value)} placeholder="Add more context..." className="resize-none min-h-[100px]" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Subject</label><Input value={qSubject} onChange={e => setQSubject(e.target.value)} placeholder="e.g. Calculus II" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Tags</label><Input value={qTags} onChange={e => setQTags(e.target.value)} placeholder="e.g. integration, limits (comma separated)" /></div>
            <Button className="w-full" onClick={handlePostQuestion} disabled={!qTitle.trim()}>Post Question</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
