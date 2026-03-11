import { useState, useEffect, useRef } from "react";
import { Send, CheckCheck, Search, MessageCircle, MoreVertical, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AvatarDisplay } from "@/pages/Profile";
import { useSearchParams } from "react-router-dom";

type ProfileSnap = {
  id: string;
  display_name: string;
  status: string;
  avatar_color?: string;
  avatar_emoji?: string;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type Conversation = {
  user: ProfileSnap;
  lastMessage?: Message;
  unreadCount: number;
};

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUserId = searchParams.get("user");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUser, setActiveUser] = useState<ProfileSnap | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  
  // New Chat Search state
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSnap[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. Load Conversations (People we've chatted with)
  const loadConversations = async () => {
    if (!user) return;
    setLoadingConvos(true);

    // Get all our messages (sent or received) to find unique conversational partners
    const { data: allMessages, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error || !allMessages) {
      setLoadingConvos(false);
      return;
    }

    const msgs = allMessages as Message[];
    
    // Find unique partner IDs
    const partnerIds = Array.from(new Set(
      msgs.map(m => m.sender_id === user.id ? m.receiver_id : m.sender_id)
    ));

    // If there's an active query param user who isn't in our history yet, add them
    if (initialUserId && !partnerIds.includes(initialUserId) && initialUserId !== user.id) {
      partnerIds.push(initialUserId);
    }

    if (partnerIds.length === 0) {
      setConversations([]);
      setLoadingConvos(false);
      return;
    }

    // Fetch profiles for all partner IDs
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, status, avatar_color, avatar_emoji")
      .in("id", partnerIds);

    if (profiles) {
      const convos: Conversation[] = profiles.map(p => {
        // Find last message related to this user
        const relatedMsgs = msgs.filter(m => m.sender_id === p.id || m.receiver_id === p.id);
        const lastMessage = relatedMsgs.length > 0 ? relatedMsgs[0] : undefined;
        // Count unread messages SENT BY THEM to US
        const unreadCount = relatedMsgs.filter(m => m.sender_id === p.id && !m.read).length;

        return { user: p as ProfileSnap, lastMessage, unreadCount };
      });

      // Sort by latest message date
      convos.sort((a, b) => {
        const dateA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const dateB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return dateB - dateA; // descending
      });

      setConversations(convos);

      // If there's an initialUserId, automatically select them
      if (initialUserId && !activeUser) {
        const initialProfile = convos.find(c => c.user.id === initialUserId)?.user;
        if (initialProfile) setActiveUser(initialProfile);
      }
    }
    
    setLoadingConvos(false);
  };

  useEffect(() => {
    loadConversations();
  }, [user, initialUserId]);

  // 2. Load Messages for Active Conversation
  useEffect(() => {
    if (!user || !activeUser) return;

    const loadChat = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeUser.id}),and(sender_id.eq.${activeUser.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
        
        // Mark as read (update all messages where sender is the activeUser and we are the receiver)
        const unreadIds = data.filter(m => m.sender_id === activeUser.id && !m.read).map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase.from("direct_messages").update({ read: true }).in("id", unreadIds);
          // Update local unread counts in convo list
          setConversations(prev => prev.map(c => 
            c.user.id === activeUser.id ? { ...c, unreadCount: 0 } : c
          ));
        }
      }
      setLoadingMessages(false);
    };

    loadChat();

    // Setup Realtime Subscription
    const channel = supabase
      .channel(`chat_${activeUser.id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "direct_messages" 
      }, (payload) => {
        const msg = payload.new as Message;
        // Only append if it belongs to this active chat
        if (
          (msg.sender_id === user.id && msg.receiver_id === activeUser.id) ||
          (msg.sender_id === activeUser.id && msg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, msg]);
          
          // If they sent it, mark it as read immediately since we have the chat open
          if (msg.sender_id === activeUser.id) {
            supabase.from("direct_messages").update({ read: true }).eq("id", msg.id).then();
          }
        }
        
        // Refresh conversations list to update previews
        loadConversations();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, activeUser]);


  // 3. Send Message
  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !activeUser || !newMessage.trim()) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage(""); // Optimistic clear

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activeUser.id,
      content,
    });

    setSending(false);
    if (error) {
      console.error(error);
      setNewMessage(content); // Revert on error
    } else {
      // It will be added locally via the subscription, but just to make LHS preview update:
      loadConversations();
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // 4. Search directory for new chats
  useEffect(() => {
    if (!newChatOpen || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, status, avatar_color, avatar_emoji")
        .ilike("display_name", `%${searchQuery}%`)
        .neq("id", user?.id)
        .limit(10);
      
      setSearchResults((data as ProfileSnap[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, newChatOpen, user]);

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full max-w-6xl mx-auto rounded-xl border border-border/40 overflow-hidden bg-card/20 backdrop-blur-md animate-fade-in">
      
      {/* ─── LEFT PANE: Conversation List ─── */}
      <div className="w-80 shrink-0 border-r border-border/40 flex flex-col bg-card/40">
        <div className="p-4 border-b border-border/40 shrink-0 h-[72px] flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" /> Messages
          </h2>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20" onClick={() => setNewChatOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-9 bg-background/50 h-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
          {loadingConvos ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs mt-1">Visit a student's profile to start chatting.</p>
            </div>
          ) : (
            conversations.map(c => {
              const isActive = activeUser?.id === c.user.id;
              return (
                <button
                  key={c.user.id}
                  onClick={() => {
                    setActiveUser(c.user);
                    setSearchParams({ user: c.user.id });
                  }}
                  className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isActive ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    <AvatarDisplay name={c.user.display_name} avatarColor={c.user.avatar_color} avatarEmoji={c.user.avatar_emoji} size="md" />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${c.user.status.includes("Online") ? "bg-success" : "bg-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className={`text-sm truncate ${isActive ? "font-semibold text-primary" : "font-medium"}`}>
                        {c.user.display_name}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(c.lastMessage?.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-xs truncate ${c.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        {c.lastMessage?.content || <span className="italic opacity-60">No messages yet</span>}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT PANE: Chat View ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        {activeUser ? (
          <>
            {/* Chat Header */}
            <div className="h-[72px] shrink-0 border-b border-border/40 px-6 flex items-center justify-between glass-subtle z-10">
              <div className="flex items-center gap-3">
                <AvatarDisplay name={activeUser.display_name} avatarColor={activeUser.avatar_color} avatarEmoji={activeUser.avatar_emoji} size="md" />
                <div>
                  <h3 className="font-semibold">{activeUser.display_name}</h3>
                  <p className="text-xs text-muted-foreground">{activeUser.status}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-6">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                  <p className="font-medium">Say hi to {activeUser.display_name.split(' ')[0]}!</p>
                  <p className="text-sm">This is the beginning of your direct message history.</p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const isMine = m.sender_id === user?.id;
                  const showAvatar = !isMine && (i === messages.length - 1 || messages[i + 1]?.sender_id !== m.sender_id);
                  const showTime = i === messages.length - 1 || new Date(messages[i+1]?.created_at).getTime() - new Date(m.created_at).getTime() > 300000; // 5 min
                  
                  return (
                    <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      <div className={`flex gap-2 max-w-[75%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar placeholder for alignment if missing */}
                        {!isMine && (
                          <div className="w-8 shrink-0 flex items-end">
                            {showAvatar ? (
                              <AvatarDisplay name={activeUser.display_name} avatarColor={activeUser.avatar_color} avatarEmoji={activeUser.avatar_emoji} size="sm" />
                            ) : null}
                          </div>
                        )}
                        
                        <div className={`p-3 rounded-2xl ${
                          isMine 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-muted/60 text-foreground rounded-bl-sm"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                        </div>
                      </div>
                      
                      {showTime && (
                        <div className={`text-[10px] text-muted-foreground mt-1 flex flex-row items-center gap-1 ${isMine ? "mr-1" : "ml-11"}`}>
                          {formatTime(m.created_at)}
                          {isMine && <CheckCheck className={`h-3 w-3 ${m.read ? "text-primary" : "opacity-40"}`} />}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border/40 glass-subtle shrink-0">
              <form onSubmit={sendMessage} className="relative flex items-center">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={`Message @${activeUser.display_name}...`}
                  className="w-full pr-12 rounded-xl bg-background border-border/50 h-12 shadow-sm focus-visible:ring-1"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!newMessage.trim() || sending} 
                  className="absolute right-1.5 h-9 w-9 rounded-lg transition-transform active:scale-95"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
            <MessageCircle className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Your Messages</h3>
            <p className="text-sm">Select a conversation or start a new one from a user's profile.</p>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border/40 bg-muted/30">
            <DialogTitle>Start a new conversation</DialogTitle>
          </DialogHeader>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                autoFocus
                placeholder="Search students by name..." 
                className="pl-9 bg-background/50 h-10 shadow-none border-border/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="h-72 overflow-y-auto px-2 pb-2">
            {!searchQuery.trim() ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">Type a name to search the campus directory</p>
              </div>
            ) : searching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No students found.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveUser(p);
                      setSearchParams({ user: p.id });
                      setNewChatOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors text-left"
                  >
                    <AvatarDisplay name={p.display_name} avatarColor={p.avatar_color} avatarEmoji={p.avatar_emoji} size="md" />
                    <div>
                      <p className="font-semibold text-sm">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground">{p.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
