import { useState, useEffect, useRef } from "react";
import { Search, MessageCircle, MoreVertical, Loader2, Plus, ArrowLeft, Send, CheckCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AvatarDisplay } from "@/pages/Profile";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

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
  const { user, onlineUsers } = useAuth();
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

  // Mentions State
  const [mentionQuery, setMentionQuery] = useState<{ query: string, start: number } | null>(null);
  const [mentionResults, setMentionResults] = useState<ProfileSnap[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mention search effect
  useEffect(() => {
    if (!mentionQuery) {
      setMentionResults([]);
      return;
    }
    const search = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_color, avatar_emoji")
        .ilike("display_name", `%${mentionQuery.query}%`)
        .limit(5);
      setMentionResults((data as ProfileSnap[]) || []);
    };
    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  // Use a ref to access activeUser inside the generic realtime listener
  const activeUserRef = useRef<ProfileSnap | null>(null);
  useEffect(() => {
    activeUserRef.current = activeUser;
  }, [activeUser]);

  // 1. Load Conversations (People we've chatted with)
  const loadConversations = async (isBackgroundRefresh = false) => {
    if (!user) return;
    if (!isBackgroundRefresh) setLoadingConvos(true);

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
      if (!isBackgroundRefresh) setConversations([]);
      if (!isBackgroundRefresh) setLoadingConvos(false);
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
    }
    
    if (!isBackgroundRefresh) setLoadingConvos(false);
  };

  useEffect(() => {
    loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle URL-based initial user selection safely
  useEffect(() => {
    if (initialUserId && !activeUserRef.current && conversations.length > 0) {
      const match = conversations.find(c => c.user.id === initialUserId);
      if (match) setActiveUser(match.user);
    }
  }, [initialUserId, conversations]);

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

    loadChat();
  }, [user, activeUser]);

  // Global Realtime Subscription for Messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_direct_messages')
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, (payload) => {
        const record = (payload.new || payload.old) as Message;
        if (!record || (record.sender_id !== user.id && record.receiver_id !== user.id)) return;

        // Any insert or update should refresh the conversation list silently
        loadConversations(true);

        const currentActive = activeUserRef.current;
        if (currentActive && (
          (record.sender_id === user.id && record.receiver_id === currentActive.id) ||
          (record.sender_id === currentActive.id && record.receiver_id === user.id)
        )) {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // If we received it while chating with them, mark as read
            if (newMsg.sender_id === currentActive.id && !newMsg.read) {
              supabase.from("direct_messages").update({ read: true }).eq("id", newMsg.id).then();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message;
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          }
        }

        // Notification logic for newly received messages containing our name
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as Message;
          if (newMsg.receiver_id === user.id) {
            const myName = user.user_metadata?.display_name || user.email?.split("@")[0];
            if (myName && newMsg.content.includes(`@${myName}`)) {
              supabase.from("profiles").select("display_name").eq("id", newMsg.sender_id).single().then(({data}) => {
                const senderName = data?.display_name || "Someone";
                const preview = newMsg.content.length > 30 ? newMsg.content.substring(0, 30) + "..." : newMsg.content;
                if (Notification.permission === "granted") {
                  new Notification("UniFlow", { body: `${senderName} mentioned you: "${preview}"`, icon: "/favicon.png" });
                } else if (Notification.permission === "default") {
                  Notification.requestPermission();
                }
                toast(`📣 ${senderName} mentioned you`);
              });
            }
          }
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);


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

  const handleMarkAllRead = async () => {
    if (!user) return;
    await supabase.from("direct_messages").update({ read: true }).eq("receiver_id", user.id).eq("read", false);
    // Locally clear counts
    setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    
    // Check for @mention
    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionQuery({ query: match[1], start: cursor - match[0].length });
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (name: string) => {
    if (!mentionQuery) return;
    const before = newMessage.slice(0, mentionQuery.start);
    const after = newMessage.slice(mentionQuery.start + mentionQuery.query.length + 1);
    setNewMessage(`${before}@${name} ${after}`);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const renderMessageContent = (content: string) => {
    // Split by @mention pattern
    const parts = content.split(/(@[a-zA-Z0-9_ -]+)/gi);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="bg-primary/15 text-primary rounded px-1 text-[13px] font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // 4. Search directory for new chats
  useEffect(() => {
    if (!newChatOpen) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearching(true);
      
      let query = supabase
        .from("profiles")
        .select("id, display_name, status, avatar_color, avatar_emoji")
        .neq("id", user?.id)
        .limit(20);
        
      if (searchQuery.trim()) {
        query = query.ilike("display_name", `%${searchQuery}%`);
      }
      
      const { data } = await query;
      setSearchResults((data as ProfileSnap[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, newChatOpen, user]);

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] w-full max-w-6xl mx-auto md:rounded-xl border-x md:border-y border-border/40 overflow-hidden bg-card/20 backdrop-blur-md animate-fade-in -mx-4 md:mx-auto">
      
      {/* ─── LEFT PANE: Conversation List ─── */}
      <div className={`w-full md:w-80 shrink-0 md:border-r border-border/40 flex flex-col bg-card/40 ${activeUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border/40 shrink-0 h-[72px] flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" /> Messages
          </h2>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={handleMarkAllRead} title="Mark all as read">
              <CheckCheck className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20" onClick={() => setNewChatOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${onlineUsers.has(c.user.id) ? "bg-success" : "bg-muted-foreground"}`} />
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
      <div className={`flex-1 flex-col min-w-0 bg-background/50 ${!activeUser ? 'hidden md:flex' : 'flex'}`}>
        {activeUser ? (
          <>
            {/* Chat Header */}
            <div className="h-[72px] shrink-0 border-b border-border/40 px-4 md:px-6 flex items-center justify-between glass-subtle z-10 w-full">
              <div className="flex items-center gap-2 md:gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden -ml-2 text-muted-foreground mr-1"
                  onClick={() => {
                    setActiveUser(null);
                    setSearchParams({});
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="relative">
                  <AvatarDisplay name={activeUser.display_name} avatarColor={activeUser.avatar_color} avatarEmoji={activeUser.avatar_emoji} size="md" />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${onlineUsers.has(activeUser.id) ? "bg-success" : "bg-muted-foreground"}`} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-semibold truncate">{activeUser.display_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{onlineUsers.has(activeUser.id) ? "Online" : "Offline"}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full shrink-0">
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
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{renderMessageContent(m.content)}</p>
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
            <div className="p-4 border-t border-border/40 glass-subtle shrink-0 relative">
              {mentionQuery && mentionResults.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 bg-card border border-border/40 rounded-xl shadow-xl overflow-hidden z-50 w-56">
                  {mentionResults.map(u => (
                    <button 
                      key={u.id}
                      type="button"
                      onClick={() => insertMention(u.display_name)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/20 text-left text-sm"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                        {u.display_name.charAt(0)}
                      </div>
                      <span className="truncate">{u.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={sendMessage} className="relative flex items-center">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
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
            {searching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
                    <div className="relative">
                      <AvatarDisplay name={p.display_name} avatarColor={p.avatar_color} avatarEmoji={p.avatar_emoji} size="md" />
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${onlineUsers.has(p.id) ? "bg-success" : "bg-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground">{onlineUsers.has(p.id) ? "Online" : "Offline"}</p>
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
