import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Users, Send, FileText, Download, Loader2, X, LogOut, BookOpen } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";

type Group = {
  id: string; name: string; subject: string; description: string | null;
  created_by: string | null; member_count: number; is_public: boolean; created_at: string;
};
type Msg = {
  id: string; group_id: string; user_id: string; content: string; created_at: string;
  profiles: { display_name: string } | null;
};
type Member = {
  user_id: string; joined_at: string;
  profiles: { display_name: string } | null;
};
type VaultFile = { id: number; name: string; storage_path: string; uploader: string; downloads: number; storage_url?: string };

export default function StudyGroups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "files" | "members">("chat");

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  // Files state
  const [groupFiles, setGroupFiles] = useState<VaultFile[]>([]);

  // Create modal state
  const [cName, setCName] = useState("");
  const [cSubject, setCSubject] = useState("");
  const [cDesc, setCDesc] = useState("");

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    const { data: allGroups } = await supabase.from("study_groups").select("*").eq("is_public", true).order("member_count", { ascending: false });
    setGroups(allGroups || []);
    const { data: myMemberships } = await supabase.from("study_group_members").select("group_id").eq("user_id", user.id);
    setMyGroupIds(new Set((myMemberships || []).map(m => m.group_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const fetchChat = useCallback(async (gid: string) => {
    const { data } = await supabase.from("study_group_messages").select("*, profiles!user_id(display_name)").eq("group_id", gid).order("created_at", { ascending: true }).limit(100);
    setMessages((data as Msg[]) || []);
  }, []);

  const fetchMembers = useCallback(async (gid: string) => {
    const { data } = await supabase.from("study_group_members").select("*, profiles!user_id(display_name)").eq("group_id", gid);
    setMembers((data as Member[]) || []);
  }, []);

  const fetchFiles = useCallback(async (subject: string) => {
    const { data } = await supabase.from("vault_files").select("id, name, storage_path, uploader, downloads").ilike("subject", `%${subject}%`).order("downloads", { ascending: false }).limit(20);
    setGroupFiles((data as VaultFile[]) || []);
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    fetchChat(selectedGroup.id);
    fetchMembers(selectedGroup.id);
    fetchFiles(selectedGroup.subject);
    const channel = supabase.channel(`group-chat-${selectedGroup.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_group_messages", filter: `group_id=eq.${selectedGroup.id}` }, () => fetchChat(selectedGroup.id))
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [selectedGroup, fetchChat, fetchMembers, fetchFiles]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedGroup) return;
    await supabase.from("study_group_messages").insert({ group_id: selectedGroup.id, user_id: user.id, content: newMessage.trim() });
    setNewMessage("");
  };

  const handleCreate = async () => {
    if (!cName.trim() || !cSubject.trim() || !user) return;
    const { data: group, error } = await supabase.from("study_groups").insert({ name: cName.trim(), subject: cSubject.trim(), description: cDesc.trim() || null, created_by: user.id, member_count: 1 }).select().single();
    if (error || !group) { toast.error("Could not create group"); return; }
    await supabase.from("study_group_members").insert({ group_id: group.id, user_id: user.id });
    publishToFeed("joined_group", group.id, group.name, group.subject);
    toast.success("Group created!");
    setCName(""); setCSubject(""); setCDesc(""); setCreateOpen(false); fetchGroups();
  };

  const handleJoin = async (group: Group) => {
    if (!user) return;
    await supabase.from("study_group_members").insert({ group_id: group.id, user_id: user.id });
    await supabase.from("study_groups").update({ member_count: group.member_count + 1 }).eq("id", group.id);
    publishToFeed("joined_group", group.id, group.name, group.subject);
    toast.success("Joined group!");
    fetchGroups();
  };

  const handleLeave = async () => {
    if (!user || !selectedGroup) return;
    await supabase.from("study_group_members").delete().eq("group_id", selectedGroup.id).eq("user_id", user.id);
    await supabase.from("study_groups").update({ member_count: Math.max(0, selectedGroup.member_count - 1) }).eq("id", selectedGroup.id);
    toast.success("Left group");
    setSelectedGroup(null); fetchGroups();
  };

  const myGroups = groups.filter(g => myGroupIds.has(g.id));
  const discoverGroups = groups.filter(g => !myGroupIds.has(g.id)).filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.subject.toLowerCase().includes(search.toLowerCase()));
  const filteredMy = myGroups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.subject.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 animate-fade-in">
      {/* Left sidebar */}
      <div className="w-72 shrink-0 border-r border-border/40 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/30 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">Study Groups</h2>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setCreateOpen(true)}><Plus className="h-3 w-3" /> New</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs pl-8" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-4">
          {filteredMy.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">My Groups</p>
              <div className="space-y-0.5">
                {filteredMy.map(g => (
                  <button key={g.id} onClick={() => { setSelectedGroup(g); setActiveTab("chat"); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${selectedGroup?.id === g.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40 text-foreground"}`}>
                    <p className="font-medium truncate text-xs">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {g.member_count} · {g.subject}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {discoverGroups.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">Discover</p>
              <div className="space-y-1">
                {discoverGroups.map(g => (
                  <div key={g.id} className="px-3 py-2 rounded-lg hover:bg-muted/30 transition-all flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.subject} · {g.member_count} members</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 shrink-0" onClick={() => handleJoin(g)}>Join</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedGroup ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <div><BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" /><p className="font-medium">Select a group to start chatting</p></div>
          </div>
        ) : (
          <>
            {/* Group header */}
            <div className="p-4 border-b border-border/30 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-bold text-base">{selectedGroup.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedGroup.subject} · {selectedGroup.member_count} members</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border border-border/40 rounded-lg overflow-hidden">
                  {(["chat", "files", "members"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${activeTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive gap-1" onClick={handleLeave}><LogOut className="h-3 w-3" /> Leave</Button>
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {activeTab === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3">
                    {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hello! 👋</p>}
                    {messages.map(msg => {
                      const isOwn = msg.user_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isOwn ? "justify-end" : ""}`}>
                          {!isOwn && <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{msg.profiles?.display_name?.charAt(0)}</div>}
                          <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${isOwn ? "bg-primary/10 text-foreground" : "bg-card border border-border/30"}`}>
                            {!isOwn && <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{msg.profiles?.display_name}</p>}
                            <p className="text-sm break-words">{msg.content}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(msg.created_at))} ago</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-border/30 flex gap-2 shrink-0">
                    <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="h-9 text-sm"
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} />
                    <Button size="sm" className="h-9 px-3" onClick={handleSend} disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
                  </div>
                </>
              )}

              {activeTab === "files" && (
                <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2">
                  {groupFiles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No files for this subject yet</p>
                      <Button variant="link" size="sm" className="mt-2" onClick={() => navigate("/vault")}>Upload a file for this subject →</Button>
                    </div>
                  ) : groupFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-card border border-border/30 rounded-xl">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">{f.uploader} · {f.downloads} downloads</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs"><Download className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "members" && (
                <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2">
                  {members.map(m => (
                    <div key={m.user_id} className="flex items-center gap-3 p-3 bg-card border border-border/30 rounded-xl">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{m.profiles?.display_name?.charAt(0)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.profiles?.display_name}</p>
                        <p className="text-[10px] text-muted-foreground">Joined {formatDistanceToNow(new Date(m.joined_at))} ago</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/messages", { state: { userId: m.user_id } })}>Message</Button>
                      {selectedGroup.created_by === user?.id && m.user_id !== user?.id && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={async () => {
                          await supabase.from("study_group_members").delete().eq("group_id", selectedGroup.id).eq("user_id", m.user_id);
                          fetchMembers(selectedGroup.id);
                        }}>Remove</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> New Study Group</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5"><label className="text-sm font-medium">Group name *</label><Input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Algorithms Study Group" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Subject *</label><Input value={cSubject} onChange={e => setCSubject(e.target.value)} placeholder="e.g. Algorithms & Data Structures" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Description</label><Textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="What's this group about?" className="resize-none" /></div>
            <Button className="w-full gap-2" onClick={handleCreate} disabled={!cName.trim() || !cSubject.trim()}><Plus className="h-4 w-4" /> Create Group</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
