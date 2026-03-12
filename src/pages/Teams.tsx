import { useState, useEffect } from "react";
import { 
  Users, User, BarChart3, Plus, Search, 
  ChevronRight, ArrowRight, ShieldCheck, 
  UserPlus, MessageSquare, Info, ChevronLeft,
  MoreVertical, Settings, ExternalLink, Loader2, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
}

interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
}

export default function Teams() {
  const [activeTab, setActiveTab] = useState("all-teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error("Error fetching teams:", error.message);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const channel = supabase
      .channel('teams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('teams')
        .insert([
          { 
            name: newTeamName, 
            description: newTeamDescription, 
            owner_id: user.id 
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner in team_members
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          { team_id: data.id, user_id: user.id, role: 'owner' }
        ]);

      if (memberError) throw memberError;

      toast.success("Team created successfully!");
      setIsCreateModalOpen(false);
      setNewTeamName("");
      setNewTeamDescription("");
    } catch (error: any) {
      console.error("Error creating team:", error.message);
      toast.error(error.message || "Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const newName = prompt("Enter new name for the team:", team.name);
    if (!newName || newName === team.name) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: newName })
        .eq('id', teamId);

      if (error) throw error;
      toast.success("Team renamed");
      if (selectedTeam?.id === teamId) {
        setSelectedTeam({ ...selectedTeam, name: newName });
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      toast.success("Team deleted");
      setSelectedTeam(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  const fetchTeamMembers = async (teamId: string) => {
    try {
      setIsLoadingMembers(true);
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          role,
          user_id,
          profiles:user_id (
            display_name,
            avatar_color,
            avatar_emoji
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error: any) {
      console.error("Error fetching members:", error.message);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
      
      const channel = supabase
        .channel(`team-members-${selectedTeam.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'team_members', 
          filter: `team_id=eq.${selectedTeam.id}` 
        }, () => {
          fetchTeamMembers(selectedTeam.id);
        })
        .subscribe();

      return () => { channel.unsubscribe(); };
    }
  }, [selectedTeam]);

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeam) return;

    try {
      setIsSubmitting(true);
      const { data: profile, error: searchError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('display_name', inviteEmail.trim())
        .single();

      if (searchError || !profile) {
        throw new Error("User not found. Try searching by their exact display name.");
      }

      const { error: inviteError } = await supabase
        .from('team_members')
        .insert([
          { team_id: selectedTeam.id, user_id: profile.id, role: inviteRole }
        ]);

      if (inviteError) throw inviteError;

      toast.success("Member added!");
      setIsInviteModalOpen(false);
      setInviteEmail("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] w-full max-w-[1400px] mx-auto md:rounded-xl border-x md:border-y border-border/40 overflow-hidden bg-background">
      
      {/* ─── LEFT SIDEBAR (Internal) ─── */}
      <div className="w-64 border-r border-border/40 bg-card/10 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <span className="font-semibold text-sm">Teams</span>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-2 space-y-0.5">
          <button 
            onClick={() => setActiveTab("all-teams")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "all-teams" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>All Teams</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("all-people")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "all-people" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            <div className="flex-1 flex items-center justify-between">
              <span>All People</span>
              <span className="text-[10px] bg-muted px-1.5 rounded opacity-60">1</span>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeTab === "analytics" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
        </div>

        <div className="mt-6 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          My Teams
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
           <div className="h-12 w-12 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
           </div>
           <p className="text-[11px] text-muted-foreground px-4">
             Once you join or create a Team you will see it here
           </p>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-card/5">
        
        {/* Header Content */}
        <div className="h-14 border-b border-border/20 flex items-center justify-between px-6 shrink-0 bg-background/50 backdrop-blur-sm">
           <div className="flex items-center gap-3">
             <h2 className="font-semibold text-sm capitalize">{activeTab.replace("-", " ")}</h2>
           </div>
           
           <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                className="h-8 rounded-md text-xs font-medium px-4 bg-[#7b68ee] hover:bg-[#6a5acd]"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Team
              </Button>
           </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scroll">
           <div className="max-w-4xl mx-auto space-y-12">
              
              {/* Hero Section */}
              <div className="space-y-6 max-w-2xl">
                 <h1 className="text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                   Align teams and <span className="text-primary italic">visualize</span><br />
                   their work!
                 </h1>
                 <p className="text-lg text-muted-foreground leading-relaxed">
                   Use Teams Hub to coordinate teams, organize priorities, and understand the details of their work.
                 </p>
                 
                 <div className="flex gap-3 pt-4">
                    <Button 
                      size="lg" 
                      className="h-12 px-8 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] text-white font-bold text-base shadow-lg shadow-primary/20"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      Create Team
                    </Button>
                    <Button variant="outline" size="lg" className="h-12 px-8 rounded-xl font-semibold text-base border-border/60">
                      Browse People
                    </Button>
                 </div>
              </div>

              {/* Grid Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 
                 {/* Feature Card 1 */}
                 <div className="group bg-background border border-border/40 rounded-2xl p-1 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                    <div className="aspect-[4/3] rounded-xl bg-muted/20 overflow-hidden mb-6 flex items-center justify-center p-4 relative">
                       {/* Mock UI Element */}
                       <div className="w-full bg-card rounded-lg border border-border/40 shadow-sm p-4 space-y-4">
                          <div className="flex items-center gap-3">
                             <Avatar className="h-8 w-8">
                                <AvatarImage src="https://ui-avatars.com/api/?name=Priya+Gupta&background=random" />
                                <AvatarFallback>PG</AvatarFallback>
                             </Avatar>
                             <div>
                                <p className="text-xs font-bold">Priya Gupta</p>
                                <p className="text-[10px] text-muted-foreground underline">UI Designer</p>
                             </div>
                          </div>
                          <div className="space-y-1.5 pt-1">
                             {[
                               { id: 1, text: "4.0 design", color: "bg-blue-500" },
                               { id: 2, text: "Todo page", color: "bg-yellow-500" },
                               { id: 3, text: "Chat : Next gen views", color: "bg-red-500" },
                             ].map(item => (
                               <div key={item.id} className="flex items-center gap-2">
                                  <div className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                                  <span className="text-[10px] font-medium">{item.text}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                       
                       {/* More Mock UI */}
                       <div className="absolute -bottom-2 -right-2 w-3/4 bg-card rounded-lg border border-border/40 shadow-lg p-3 space-y-2 transform translate-x-2 translate-y-2">
                           <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                 <AvatarImage src="https://ui-avatars.com/api/?name=Mei+Chen&background=random" />
                              </Avatar>
                              <span className="text-[10px] font-bold">Mei Chen</span>
                           </div>
                           <p className="text-[9px] text-muted-foreground">Cloud Solutions Architect</p>
                       </div>
                    </div>
                    <div className="px-5 pb-5 space-y-2">
                       <h3 className="font-bold text-lg">Member & team management</h3>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                         Easily browse, find, and manage all teams and members in one convenient area. Add, remove, or update roles with ease.
                       </p>
                    </div>
                 </div>

                 {/* Feature Card 2 */}
                 <div className="group bg-background border border-border/40 rounded-2xl p-1 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                    <div className="aspect-[4/3] rounded-xl bg-muted/20 overflow-hidden mb-6 flex items-center justify-center p-4">
                       <div className="grid grid-cols-2 gap-2 w-full">
                          <div className="bg-card rounded-lg border border-border/40 p-3 flex flex-col items-center justify-center text-center gap-2">
                             <ShieldCheck className="h-6 w-6 text-[#7b68ee]" />
                             <span className="text-[10px] font-bold">Permissions</span>
                          </div>
                          <div className="bg-card rounded-lg border border-border/40 p-3 flex flex-col items-center justify-center text-center gap-2">
                             <UserPlus className="h-6 w-6 text-green-500" />
                             <span className="text-[10px] font-bold">Invites</span>
                          </div>
                          <div className="bg-card rounded-lg border border-border/40 p-3 flex flex-col items-center justify-center text-center gap-2 col-span-2">
                             <BarChart3 className="h-6 w-6 text-orange-500" />
                             <span className="text-[10px] font-bold">Team Performance & Analytics</span>
                          </div>
                       </div>
                    </div>
                    <div className="px-5 pb-5 space-y-2">
                       <h3 className="font-bold text-lg">Detailed Team Insights</h3>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                         Gain deep insights into how your teams are performing with unified analytics and dedicated member views.
                       </p>
                    </div>
                 </div>

                 {/* Feature Card 3 */}
                 <div className="group bg-background border border-border/40 rounded-2xl p-1 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                    <div className="aspect-[4/3] rounded-xl bg-muted/20 overflow-hidden mb-6 flex items-center justify-center p-4">
                       <div className="w-full bg-card rounded-lg border border-border/40 p-4 flex flex-col gap-3">
                          <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                             <MessageSquare className="h-4 w-4 text-primary" />
                             <span className="text-xs font-bold font-mono uppercase tracking-widest">Team Chat</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="h-6 w-6 rounded-full bg-primary/20" />
                             <div className="h-2 w-24 bg-muted rounded-full" />
                          </div>
                          <div className="flex items-center gap-2 self-end">
                             <div className="h-2 w-16 bg-primary/40 rounded-full" />
                             <div className="h-6 w-6 rounded-full bg-primary" />
                          </div>
                       </div>
                    </div>
                    <div className="px-5 pb-5 space-y-2">
                       <h3 className="font-bold text-lg">Centralize Communication</h3>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                         Keep everyone on the same page with centralized team discussions, shared goals, and collaborative docs.
                       </p>
                    </div>
                 </div>

              </div>

              {/* Real Teams Section (When not on overview) */}
              {activeTab === "all-teams" && (
                <div className="space-y-6 pt-12">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Your Teams</h2>
                    <div className="relative w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input className="pl-9 h-9 text-xs" placeholder="Search teams..." />
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Loading teams...</p>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed border-border/40 rounded-3xl bg-card/5">
                      <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold">No teams found</p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          You haven't created or joined any teams yet. Start by creating one!
                        </p>
                      </div>
                      <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" size="sm">
                        Create your first team
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {teams.map((team) => (
                        <div key={team.id} className="group bg-card border border-border/40 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                          <div className="h-2 rounded-t-2xl bg-gradient-to-r from-[#7b68ee] to-[#6a5acd]" />
                          <div className="p-6 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                {team.name.charAt(0).toUpperCase()}
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                            <div>
                               <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{team.name}</h3>
                               <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                                 {team.description || "No description provided."}
                               </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-border/20">
                               <div className="flex -space-x-2">
                                  {[1, 2, 3].map(i => (
                                    <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                      <AvatarImage src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} />
                                    </Avatar>
                                  ))}
                                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold">
                                    +1
                                  </div>
                               </div>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 text-xs gap-1 group/btn"
                                 onClick={() => setSelectedTeam(team)}
                               >
                                  View Details
                                  <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                               </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Team Detail View */}
              {selectedTeam && (
                <div className="animate-in slide-in-from-right duration-300">
                  <div className="flex items-center gap-2 mb-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedTeam(null)}
                    >
                      <ChevronLeft className="h-4 w-4" /> Back to Teams
                    </Button>
                  </div>

                  <div className="bg-card border border-border/40 rounded-3xl p-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl">
                          {selectedTeam.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                           <div className="flex items-center gap-3">
                             <h1 className="text-3xl font-bold">{selectedTeam.name}</h1>
                             <Badge className="bg-[#7b68ee]/10 text-[#7b68ee] border-[#7b68ee]/20 font-semibold px-2">Owner</Badge>
                           </div>
                           <p className="text-muted-foreground mt-2 max-w-xl text-lg">
                             {selectedTeam.description || "No description provided for this team."}
                           </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          size="lg" 
                          className="h-12 px-6 rounded-xl border-border/60 font-semibold"
                          onClick={() => handleRenameTeam(selectedTeam.id)}
                        >
                          <Settings className="h-4 w-4 mr-2" /> Rename Team
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="lg" 
                          className="h-12 px-6 rounded-xl text-destructive hover:bg-destructive/10 font-semibold"
                          onClick={() => handleDeleteTeam(selectedTeam.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Team
                        </Button>
                        <Button 
                          size="lg" 
                          className="h-12 px-8 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] font-bold text-white shadow-lg shadow-primary/20"
                          onClick={() => setIsInviteModalOpen(true)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" /> Invite Members
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-border/20">
                       <div className="space-y-6">
                         <h3 className="text-xl font-bold flex items-center gap-2">
                           <Users className="h-5 w-5 text-primary" /> Team Members
                         </h3>
                         <div className="space-y-4">
                            {isLoadingMembers ? (
                              <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              </div>
                            ) : teamMembers.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">No members found.</p>
                            ) : (
                              teamMembers.map((member, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-muted/5 border border-border/20 rounded-2xl hover:bg-muted/10 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                      {member.profiles?.display_name?.charAt(0) || "?"}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm truncate">{member.profiles?.display_name || "Unknown User"}</p>
                                      <p className="text-[10px] text-muted-foreground truncate opacity-50">ID: {member.user_id}</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-background/50">{member.role}</Badge>
                                </div>
                              ))
                            )}
                         </div>
                       </div>

                       <div className="space-y-6">
                         <h3 className="text-xl font-bold flex items-center gap-2">
                           <MessageSquare className="h-5 w-5 text-primary" /> Active Projects
                         </h3>
                         <div className="flex flex-col items-center justify-center p-12 bg-muted/10 border-2 border-dashed border-border/40 rounded-3xl text-center space-y-4">
                            <div className="h-16 w-16 bg-muted/40 rounded-2xl flex items-center justify-center">
                              <BarChart3 className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-lg">No active projects</p>
                              <p className="text-sm text-muted-foreground max-w-[240px]">
                                Connect this team to a Workspace to start tracking project progress together.
                              </p>
                            </div>
                            <Button variant="link" className="text-[#7b68ee] font-bold">Connect Workspace <ExternalLink className="h-4 w-4 ml-2" /></Button>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}
           </div>
        </div>

      </div>

      {/* ─── CREATE TEAM MODAL ─── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#1a1a1a] border-border/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Team</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Teams help you group people and coordinate work across projects.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Team Name</label>
              <Input 
                placeholder="e.g. Design Team, Frontend dev" 
                className="bg-background/50 border-border/40 h-11"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description (Optional)</label>
              <Textarea 
                placeholder="What is this team about?" 
                className="bg-background/50 border-border/40 min-h-[100px] resize-none"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="hover:bg-muted/10">
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTeam} 
              disabled={isSubmitting || !newTeamName.trim()}
              className="bg-[#7b68ee] hover:bg-[#6a5acd] px-8"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── INVITE MEMBER MODAL ─── */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#1a1a1a] border-border/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Invite to {selectedTeam?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a user to your team by their display name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Username / Display Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Enter user's name..." 
                  className="bg-background/50 border-border/40 h-11 pl-10"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Permissions Role</label>
              <select 
                className="w-full h-11 bg-background/50 border border-border/40 rounded-md px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="member" className="bg-[#1a1a1a]">Member (Edit & View)</option>
                <option value="owner" className="bg-[#1a1a1a]">Owner (Full Control)</option>
                <option value="guest" className="bg-[#1a1a1a]">Guest (View Only)</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)} className="hover:bg-muted/10">
              Cancel
            </Button>
            <Button 
              onClick={handleInviteMember} 
              disabled={isSubmitting || !inviteEmail.trim()}
              className="bg-primary hover:bg-primary/90 px-8"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
