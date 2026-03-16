/**
 * SQL CHANGES REQUIRED FOR THIS UPDATE:
 * -- ALTER TABLE notes ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
 * -- CREATE INDEX IF NOT EXISTS notes_team_id_idx ON notes(team_id);
 */
import { useState, useEffect, useCallback } from "react";
import { 
  Users, User, BarChart3, Plus, Search, ArrowRight,
  ShieldCheck, UserPlus, MessageSquare, ChevronLeft,
  MoreVertical, Settings, Loader2, Trash2, Crown, Palette,
  Eye, Edit3, X, Check, Activity, Clock, TrendingUp,
  BookmarkPlus, Pencil, Info
} from "lucide-react";
import Whiteboard from "@/pages/Whiteboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PublicProfileModal } from "@/components/PublicProfileModal";

interface Team {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected';
  profiles?: {
    display_name: string;
    avatar_color?: string;
    status?: string;
  };
}

type SidebarTab = "all-teams" | "all-people" | "analytics";
type TeamTab = "overview" | "whiteboard" | "analytics" | "members" | "priorities";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  member: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  guest: "bg-muted/10 text-muted-foreground border-border/30",
};
const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
  guest: <Eye className="h-3 w-3" />,
};

export default function Teams() {
  const navigate = useNavigate();

  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("all-teams");
  
  // Team list state
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected team state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamTab, setTeamTab] = useState<TeamTab>("overview");

  // Members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allPeople, setAllPeople] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Create team modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamEmoji, setNewTeamEmoji] = useState("👥");

  // Invite member modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Edit team description
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  // General
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; avatar_color?: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUserProfileId, setSelectedUserProfileId] = useState<string | null>(null);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Invitations state
  const [invitations, setInvitations] = useState<(TeamMember & { teams: Team })[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  const { user, onlineUsers } = useAuth();
  const currentUserId = user?.id;

  // Search for users to invite
  useEffect(() => {
    if (!inviteSearch.trim() || inviteSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_color")
        .ilike("display_name", `%${inviteSearch}%`)
        .limit(5);
      
      // Filter out users who are already in the team or already invited
      const existingIds = new Set(teamMembers.map(m => m.user_id));
      setSearchResults((data || []).filter(u => !existingIds.has(u.id)));
      setIsSearching(false);
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [inviteSearch, teamMembers, isLoadingMembers]);

  // Fetch all teams (where I am a member)
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Simplified query to reduce RLS overhead during initial load
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          team_id,
          status,
          teams (*)
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (error) {
        console.error("fetchTeams error:", error);
        throw error;
      }
      
      const formattedTeams = data?.map((m: any) => {
        const team = Array.isArray(m.teams) ? m.teams[0] : m.teams;
        if (!team) return null;
        return {
          ...team,
          member_count: 0 // Will be updated by fetchTeamMembers when selected
        };
      }).filter(Boolean) || [];
      
      setTeams(formattedTeams);
    } catch (e: any) {
      console.error("Failed to load teams:", e);
      toast.error(`Failed to load teams: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoadingInvites(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("team_members")
        .select("team_id, role, status, teams (*)")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      setInvitations(data?.map((inv: any) => ({
        ...inv,
        teams: Array.isArray(inv.teams) ? inv.teams[0] : inv.teams,
        user_id: user.id // Explicitly adding user_id to satisfy TeamMember type
      })).filter(inv => inv.teams) || []);
    } catch (e: any) {
      console.error("Failed to load invitations", e);
    } finally {
      setIsLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchInvitations();

    const teamsChannel = supabase
      .channel("teams_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, fetchTeams)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => {
        fetchTeams();
        fetchInvitations();
      })
      .subscribe();

    return () => { supabase.removeChannel(teamsChannel); };
  }, [fetchTeams, fetchInvitations]);

  // Fetch all people across teams
  const fetchAllPeople = useCallback(async () => {
    const { data } = await supabase
      .from("team_members")
      .select("role, user_id, profiles!user_id (display_name, avatar_color, status)");
    const unique = new Map();
    (data || []).forEach((m: any) => {
      if (!unique.has(m.user_id)) unique.set(m.user_id, m);
    });
    setAllPeople(Array.from(unique.values()));
  }, []);

  useEffect(() => {
    fetchAllPeople();
  }, [fetchAllPeople]);

  // Fetch members of selected team
  const fetchTeamMembers = useCallback(async (teamId: string) => {
    setIsLoadingMembers(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("role, user_id, status, profiles!user_id (display_name, avatar_color, status)")
      .eq("team_id", teamId);

    if (error) {
      console.error("Error fetching team members:", error);
      toast.error(`Could not load members: ${error.message}`);
    }
    
    if (!error && data) {
      const formattedMembers = data.map((m: any) => ({
        ...m,
        team_id: teamId,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      }));
      setTeamMembers(formattedMembers);
      
      // Update the selected team's member count for the header
      if (selectedTeam && selectedTeam.id === teamId) {
        const activeCount = formattedMembers.filter(m => m.status === 'accepted').length;
        setSelectedTeam(prev => prev ? { ...prev, member_count: activeCount } : null);
      }
    }
    setIsLoadingMembers(false);
  }, [selectedTeam]);

  // Fetch priorities/tasks for selected team
  const fetchTeamTasks = useCallback(async (teamId: string) => {
    setIsLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, tags, updated_at, user_id, profiles!user_id(display_name)")
        .eq("team_id", teamId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTeamTasks(data || []);
    } catch (e: any) {
      console.error("Error fetching team tasks:", e);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
      fetchTeamTasks(selectedTeam.id);
      
      const ch = supabase.channel(`members-${selectedTeam.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "team_members", filter: `team_id=eq.${selectedTeam.id}` }, () => fetchTeamMembers(selectedTeam.id))
        .subscribe();
      
      const taskCh = supabase.channel(`tasks-${selectedTeam.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `team_id=eq.${selectedTeam.id}` }, () => fetchTeamTasks(selectedTeam.id))
        .subscribe();
        
      return () => { 
        ch.unsubscribe(); 
        taskCh.unsubscribe();
      };
    }
  }, [selectedTeam, fetchTeamMembers, fetchTeamTasks]);

  // Create team
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("teams").insert([{
        name: newTeamName.trim(),
        description: newTeamDescription.trim(),
        owner_id: user.id,
      }]).select().single();
      if (error) throw error;
      await supabase.from("team_members").insert([{ 
        team_id: data.id, 
        user_id: user.id, 
        role: "owner",
        status: "accepted"
      }]);
      toast.success("Team created!");
      setIsCreateModalOpen(false);
      setNewTeamName(""); setNewTeamDescription(""); setNewTeamEmoji("👥");
      fetchTeams();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Delete this team? This cannot be undone.")) return;
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) toast.error(error.message);
    else { toast.success("Team deleted"); setSelectedTeam(null); }
  };

  // Rename team (inline prompt)
  const handleRenameTeam = async (team: Team) => {
    const name = prompt("New team name:", team.name);
    if (!name || name === team.name) return;
    const { error } = await supabase.from("teams").update({ name }).eq("id", team.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Renamed!");
      if (selectedTeam?.id === team.id) setSelectedTeam({ ...selectedTeam, name });
    }
  };

  // Save description
  const handleSaveDescription = async () => {
    if (!selectedTeam) return;
    const { error } = await supabase.from("teams").update({ description: editDesc }).eq("id", selectedTeam.id);
    if (error) toast.error(error.message);
    else { setSelectedTeam({ ...selectedTeam, description: editDesc }); setIsEditingDesc(false); toast.success("Description updated"); }
  };

  // Invite member
  const handleInviteMember = async (targetId?: string) => {
    const userIdToInvite = targetId;
    if (!userIdToInvite || !selectedTeam) return;
    
    // Safety: Check if user is already an accepted member
    const isAlreadyMember = teamMembers.find(m => m.user_id === userIdToInvite && m.status === 'accepted');
    if (isAlreadyMember) {
      toast.error("This user is already a member of the team.");
      setIsInviteModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("team_members").upsert([
        { team_id: selectedTeam.id, user_id: userIdToInvite, role: inviteRole, status: "pending" }
      ], { onConflict: 'team_id,user_id' });
      if (error) throw error;
      toast.success("Invitation sent!"); 
      setIsInviteModalOpen(false); 
      setInviteSearch("");
      setSearchResults([]);
      fetchTeamMembers(selectedTeam.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam || !confirm("Remove this member from the team?")) return;
    const { error } = await supabase.from("team_members")
      .delete().eq("team_id", selectedTeam.id).eq("user_id", userId);
    if (error) toast.error(error.message);
    else toast.success("Member removed");
  };

  // Update member role
  const handleUpdateRole = async (userId: string, role: string) => {
    if (!selectedTeam) return;
    const { error } = await supabase.from("team_members").update({ role }).eq("team_id", selectedTeam.id).eq("user_id", userId);
    if (error) toast.error(error.message);
    else toast.success("Role updated");
  };

  // Accept/Decline invitation
  const handleInvitationResponse = async (teamId: string, accept: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (accept) {
        const { error } = await supabase
          .from("team_members")
          .update({ status: "accepted" })
          .eq("team_id", teamId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Joined team!");
      } else {
        const { error } = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", teamId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Invitation declined");
      }
      fetchTeams();
      fetchInvitations();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isOwner = selectedTeam && currentUserId === selectedTeam.owner_id;

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] w-full max-w-[1400px] mx-auto md:rounded-xl border-x md:border-y border-border/40 overflow-hidden bg-background">

      {/* ─── LEFT SIDEBAR ─── */}
      <div className="w-60 border-r border-border/40 bg-card/10 flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <span className="font-bold text-sm tracking-tight">Teams</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-2 space-y-0.5">
          {([
            { id: "all-teams", icon: <Users className="h-4 w-4" />, label: "All Teams", count: teams.length },
            { id: "all-people", icon: <User className="h-4 w-4" />, label: "All People", count: allPeople.length },
            { id: "analytics", icon: <BarChart3 className="h-4 w-4" />, label: "Analytics" },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => { setSidebarTab(item.id); setSelectedTeam(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                sidebarTab === item.id && !selectedTeam
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {"count" in item && item.count! > 0 && (
                <span className="text-[10px] bg-muted/70 px-1.5 py-0.5 rounded font-bold">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          My Teams
          <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-muted/30 border-0">{teams.length}</Badge>
        </div>

        <div className="overflow-y-auto px-2 py-1 space-y-0.5 max-h-[40vh] custom-scroll">
          {teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center opacity-40 space-y-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">No teams yet</p>
            </div>
          ) : (
            teams.map(team => (
              <button
                key={team.id}
                onClick={() => { setSelectedTeam(team); setTeamTab("overview"); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedTeam?.id === team.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold shrink-0">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate flex-1 text-left text-xs">{team.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Pending Invitations Section */}
        {invitations.length > 0 && (
          <>
            <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-orange-400 flex items-center justify-between">
              Invitations
              <Badge className="bg-orange-500 text-white text-[9px] h-3.5 px-1 border-0">{invitations.length}</Badge>
            </div>
            <div className="overflow-y-auto px-2 py-1 space-y-1.5 max-h-[30vh] custom-scroll">
              {invitations.map(inv => (
                <div key={inv.team_id} className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 space-y-3 shadow-lg shadow-orange-500/5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-bold shrink-0 border border-orange-500/20">
                      {inv.teams.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-bold text-orange-200">{inv.teams.name}</p>
                      <p className="text-[10px] text-orange-400/80 font-medium">Invited you to join</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="h-7 px-0 flex-1 text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all"
                      onClick={() => handleInvitationResponse(inv.team_id, true)}
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-0 flex-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-orange-500/20 rounded-lg"
                      onClick={() => handleInvitationResponse(inv.team_id, false)}
                    >
                      Ignore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar */}
        <div className="h-14 border-b border-border/20 flex items-center justify-between px-6 shrink-0 bg-background/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            {selectedTeam ? (
              <>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground -ml-2" onClick={() => setSelectedTeam(null)}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold">
                    {selectedTeam.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm">{selectedTeam.name}</span>
                </div>
              </>
            ) : (
              <h2 className="font-semibold text-sm capitalize">
                {sidebarTab === "all-teams" ? "All Teams" : sidebarTab === "all-people" ? "All People" : "Analytics"}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedTeam ? (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5" /> Add member
                </Button>
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleRenameTeam(selectedTeam)}>
                        <Settings className="h-4 w-4 mr-2" /> Rename Team
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTeam(selectedTeam.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            ) : (
              <Button size="sm" className="h-8 text-xs bg-[#7b68ee] hover:bg-[#6a5acd] font-semibold" onClick={() => setIsCreateModalOpen(true)}>
                Create Team
              </Button>
            )}
          </div>
        </div>

        {/* ─── SELECTED TEAM VIEW ─── */}
        {selectedTeam ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Team Header */}
            <div className="px-8 pt-6 pb-0 border-b border-border/20 shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                className="md:hidden -ml-2 mb-4 text-muted-foreground hover:bg-transparent px-0"
                onClick={() => setSelectedTeam(null)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Teams
              </Button>
              <div className="flex items-center gap-5 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#7b68ee]/20 to-[#6a5acd]/10 flex items-center justify-center text-[#7b68ee] font-black text-2xl border border-[#7b68ee]/20">
                  {selectedTeam.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight">{selectedTeam.name}</h1>
                    <span className="text-xs text-muted-foreground font-mono">@{selectedTeam.name.toLowerCase().replace(/\s+/g, "")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedTeam.member_count || teamMembers.length} members</p>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 -mb-px overflow-x-auto no-scrollbar scroll-smooth px-4 md:px-0">
                {([
                  { id: "overview", label: "Overview", icon: <Info className="h-3.5 w-3.5" /> },
                  { id: "whiteboard", label: "Whiteboard", icon: <Palette className="h-3.5 w-3.5" /> },
                  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
                  { id: "members", label: "Members", icon: <Users className="h-3.5 w-3.5" />, count: teamMembers.length },
                  { id: "priorities", label: "Priorities", icon: <Activity className="h-3.5 w-3.5" />, count: teamTasks.length },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTeamTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap ${
                      teamTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {"count" in tab && tab.count! > 0 && (
                      <span className="text-[10px] bg-muted/80 px-1.5 rounded font-bold">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col overflow-y-auto custom-scroll min-h-0">

              {/* WHITEBOARD TAB */}
              {teamTab === "whiteboard" && (
                <div className="flex-1 p-4 lg:p-6" style={{ minHeight: '600px' }}>
                  <Whiteboard roomId={`team-${selectedTeam.id}`} embedded />
                </div>
              )}

              {/* OVERVIEW TAB */}
              {teamTab === "overview" && (
                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
                  {/* Left: Description + Bookmarks + Feed */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Description Box */}
                    <div className="border border-border/40 rounded-2xl overflow-hidden">
                      <div className="p-4 flex items-center justify-between border-b border-border/20">
                        <span className="text-sm font-semibold">About this team</span>
                        {!isEditingDesc ? (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => { setIsEditingDesc(true); setEditDesc(selectedTeam.description || ""); }}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditingDesc(false)}><X className="h-3 w-3" /></Button>
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveDescription}><Check className="h-3 w-3" /> Save</Button>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        {isEditingDesc ? (
                          <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="min-h-[80px] resize-none bg-transparent border-border/30 text-sm" placeholder="Add a team description, mission, and goals..." />
                        ) : (
                          <p className="text-sm text-muted-foreground min-h-[40px]">
                            {selectedTeam.description || <span className="italic opacity-50">No description yet. Click Edit to add one.</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bookmarks Widget */}
                    <div className="border border-border/40 rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-border/20 flex items-center justify-between">
                        <span className="text-sm font-semibold">Bookmarks</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => toast.info("Coming soon!")}>
                          <BookmarkPlus className="h-3 w-3" /> Add Bookmark
                        </Button>
                      </div>
                      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center opacity-50">
                        <BookmarkPlus className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
                        <p className="text-xs text-muted-foreground max-w-[200px]">Bookmarks make it easy to save important links for your team.</p>
                      </div>
                    </div>

                    {/* Feed Widget */}
                    <div className="border border-border/40 rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-border/20">
                        <span className="text-sm font-semibold">Feed</span>
                      </div>
                      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center opacity-50">
                        <Activity className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
                        <p className="text-sm font-medium">Nothing to see here</p>
                        <p className="text-xs text-muted-foreground">Looks like there's no team activity yet.</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Members + Analytics summary */}
                  <div className="space-y-4">
                    {/* Members widget */}
                    <div className="border border-border/40 rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-border/20 flex items-center justify-between">
                        <span className="text-sm font-semibold">Members</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsInviteModalOpen(true)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="p-3 space-y-1">
                        {isLoadingMembers ? (
                          <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                        ) : teamMembers.slice(0, 5).map((m, i) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/10 cursor-pointer"
                            onClick={() => setSelectedUserProfileId(m.user_id)}
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {m.profiles?.display_name?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{m.profiles?.display_name || "Unknown"}</p>
                              <p className="text-[10px] text-muted-foreground">{m.role}</p>
                            </div>
                          </div>
                        ))}
                        {teamMembers.length > 5 && (
                          <button onClick={() => setTeamTab("members")} className="w-full text-xs text-primary text-center py-2 hover:underline">
                            View all {teamMembers.length} members →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Analytics teaser */}
                    <div className="border border-border/40 rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-border/20">
                        <span className="text-sm font-semibold">Team Analytics</span>
                      </div>
                      <div className="p-6 flex flex-col items-center gap-4">
                        <div className="flex flex-col items-center gap-1 opacity-40">
                          <BarChart3 className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
                          <p className="text-xs text-muted-foreground">Not enough data.</p>
                        </div>
                        <div className="w-full space-y-2">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                            <p className="text-xs font-semibold text-green-400">Stay focused with Priorities</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Know what each team member is working on.</p>
                            <Button size="sm" className="mt-2 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => setTeamTab("priorities")}>
                              Go to Priorities
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ANALYTICS TAB */}
              {teamTab === "analytics" && (
                <div className="p-8 space-y-6 max-w-4xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Analytics</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border border-border/40 rounded-lg px-3 py-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Last 30 days</span>
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Total Members", value: teamMembers.length, icon: <Users className="h-5 w-5 text-blue-400" />, color: "bg-blue-500/10 border-blue-500/20" },
                      { label: "Active Now", value: teamMembers.filter(m => m.profiles?.status?.includes("Online")).length, icon: <Activity className="h-5 w-5 text-green-400" />, color: "bg-green-500/10 border-green-500/20" },
                      { label: "Owners", value: teamMembers.filter(m => m.role === "owner").length, icon: <Crown className="h-5 w-5 text-yellow-400" />, color: "bg-yellow-500/10 border-yellow-500/20" },
                    ].map((stat, i) => (
                      <div key={i} className={`border rounded-2xl p-5 ${stat.color}`}>
                        <div className="flex items-center justify-between mb-3">
                          {stat.icon}
                          <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                        <p className="text-3xl font-black">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Activity chart placeholder */}
                  <div className="border border-border/40 rounded-2xl p-6 space-y-3">
                    <p className="text-sm font-semibold">People who were online</p>
                    <div className="h-40 flex items-center justify-center opacity-30">
                      <div className="flex flex-col items-center gap-2">
                        <BarChart3 className="h-12 w-12 text-muted-foreground" strokeWidth={1} />
                        <p className="text-xs text-muted-foreground">Not enough data yet.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-border/20">
                      <span className="text-xs bg-muted/20 px-3 py-1 rounded-full font-medium">
                        {teamMembers.filter(m => m.profiles?.status?.includes("Online")).length} Online
                      </span>
                      <span className="text-xs bg-muted/20 px-3 py-1 rounded-full font-medium">
                        {teamMembers.filter(m => !m.profiles?.status?.includes("Online")).length} Offline
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MEMBERS TAB */}
              {teamTab === "members" && (
                <div className="p-8 space-y-6 max-w-4xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">{teamMembers.length} Members</h2>
                    <Button size="sm" className="h-8 text-xs gap-1.5 bg-[#7b68ee] hover:bg-[#6a5acd]" onClick={() => setIsInviteModalOpen(true)}>
                      <UserPlus className="h-3.5 w-3.5" /> Add Member
                    </Button>
                  </div>

                  {/* Members table */}
                  <div className="border border-border/40 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 bg-muted/5">
                      <div className="col-span-5">Name</div>
                      <div className="col-span-3">Role</div>
                      <div className="col-span-3">Status</div>
                      <div className="col-span-1" />
                    </div>
                    {isLoadingMembers ? (
                      <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : teamMembers.length === 0 ? (
                      <div className="p-12 text-center opacity-40">
                        <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" strokeWidth={1} />
                        <p className="text-sm">No members yet. Invite someone!</p>
                      </div>
                    ) : teamMembers.map((m, i) => (
                      <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center border-b border-border/10 last:border-0 hover:bg-muted/5 transition-colors group">
                        <div 
                          className="col-span-5 flex items-center gap-3 cursor-pointer group/member"
                          onClick={() => setSelectedUserProfileId(m.user_id)}
                        >
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0 group-hover/member:bg-primary/20 transition-colors">
                            {m.profiles?.display_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm group-hover/member:text-primary transition-colors">{m.profiles?.display_name || "Unknown User"}</p>
                              {m.status === 'pending' && <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-orange-500/30 text-orange-400 bg-orange-500/5">Invited</Badge>}
                            </div>
                            <p className="text-[10px] text-muted-foreground opacity-60">{m.user_id.slice(0, 8)}…</p>
                          </div>
                        </div>
                        <div className="col-span-3">
                          {isOwner ? (
                            <select
                              value={m.role}
                              onChange={e => handleUpdateRole(m.user_id, e.target.value)}
                              className={`text-[11px] font-bold uppercase tracking-wider border rounded-md px-2 py-1 bg-transparent outline-none cursor-pointer ${ROLE_COLORS[m.role] || ""}`}
                            >
                              <option value="owner">Owner</option>
                              <option value="member">Member</option>
                              <option value="guest">Guest</option>
                            </select>
                          ) : (
                            <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider gap-1 ${ROLE_COLORS[m.role] || ""}`}>
                              {ROLE_ICONS[m.role]} {m.role}
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-3">
                          {(() => {
                            const isOnline = onlineUsers.has(m.user_id);
                            return (
                              <span className={`text-[11px] font-medium ${isOnline ? "text-green-400" : "text-muted-foreground"}`}>
                                {isOnline ? "🟢 Online" : "⚪️ Offline"}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {isOwner && m.user_id !== currentUserId && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveMember(m.user_id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRIORITIES TAB */}
              {teamTab === "priorities" && (
                <div className="p-8 space-y-6 max-w-4xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Priorities</h2>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => navigate("/workspace")}>
                      Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  {isLoadingTasks ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : teamTasks.length === 0 ? (
                    <div className="border border-border/40 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                        <Activity className="h-8 w-8 text-primary/40" strokeWidth={1} />
                      </div>
                      <div>
                        <p className="font-bold text-lg">No priorities yet</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                          Go to the Workspace to assign notes to this team. They'll appear here as priorities.
                        </p>
                      </div>
                      <Button className="bg-[#7b68ee] hover:bg-[#6a5acd]" onClick={() => {
                        toast.info("Assign a note to this team in the Workspace to see it here.", { duration: 5000 });
                        navigate("/workspace");
                      }}>
                        Assign a note to this team
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {teamTasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/10 hover:bg-card/30 transition-all group cursor-pointer"
                          onClick={() => navigate(`/workspace?noteId=${task.id}`)}
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {task.title.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {(task.tags || []).slice(0, 3).map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[9px] px-1.5 h-4 bg-muted/30">
                                  {tag}
                                </Badge>
                              ))}
                              <span className="text-[10px] text-muted-foreground italic">
                                Updated {new Date(task.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right hidden sm:block">
                              <p className="text-[11px] font-medium">{task.profiles?.display_name || "Unknown"}</p>
                              <p className="text-[9px] text-muted-foreground">Assignee</p>
                            </div>
                            <Avatar className="h-8 w-8 border border-border/40">
                              <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                                {task.profiles?.display_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        ) : (
          /* ─── DEFAULT TABS CONTENT ─── */
          <div className="flex-1 overflow-y-auto custom-scroll">
            {/* ALL TEAMS */}
            {sidebarTab === "all-teams" && (
              <div className="p-8 space-y-12 max-w-5xl mx-auto">
                {/* Hero */}
                <div className="space-y-5">
                  <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1]">
                    Align teams and <span className="text-[#7b68ee] italic">visualize</span><br />their work!
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                    Use Teams Hub to coordinate teams, organize priorities, and understand the details of their work.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <Button size="lg" className="h-12 px-8 rounded-xl bg-[#7b68ee] hover:bg-[#6a5acd] font-bold shadow-lg shadow-[#7b68ee]/20" onClick={() => setIsCreateModalOpen(true)}>
                      Create Team
                    </Button>
                    <Button variant="outline" size="lg" className="h-12 px-8 rounded-xl font-semibold border-border/60" onClick={() => setSidebarTab("all-people")}>
                      Browse People
                    </Button>
                  </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    {
                      title: "Member & team management",
                      desc: "Easily browse, find, and manage all teams and members in one area. Add, remove, or update roles with ease.",
                      icon: <Users className="h-8 w-8 text-[#7b68ee]" />,
                      color: "from-[#7b68ee]/10 to-[#7b68ee]/5"
                    },
                    {
                      title: "Detailed Team Insights",
                      desc: "Gain deep insights into how your teams are performing with unified analytics and dedicated member views.",
                      icon: <BarChart3 className="h-8 w-8 text-orange-400" />,
                      color: "from-orange-500/10 to-orange-500/5"
                    },
                    {
                      title: "Centralize Communication",
                      desc: "Keep everyone on the same page with centralized team discussions, shared goals, and collaborative docs.",
                      icon: <MessageSquare className="h-8 w-8 text-green-400" />,
                      color: "from-green-500/10 to-green-500/5"
                    },
                  ].map((card, i) => (
                    <div key={i} className="border border-border/40 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all">
                      <div className={`h-32 flex items-center justify-center bg-gradient-to-br ${card.color}`}>
                        {card.icon}
                      </div>
                      <div className="p-5 space-y-2">
                        <h3 className="font-bold">{card.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Your Teams */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Your Teams</h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9 h-9 text-xs w-56" placeholder="Search teams..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-16 opacity-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : filteredTeams.length === 0 ? (
                    <div className="border-2 border-dashed border-border/40 rounded-3xl p-16 text-center space-y-4">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-30" strokeWidth={1} />
                      <div>
                        <p className="font-bold">No teams found</p>
                        <p className="text-sm text-muted-foreground">{searchQuery ? "Try a different search." : "Create your first team to get started!"}</p>
                      </div>
                      {!searchQuery && <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">Create a team</Button>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredTeams.map(team => (
                        <div key={team.id} className="group border border-border/40 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all">
                          <div className="h-1.5 bg-gradient-to-r from-[#7b68ee] to-[#9c8fff]" />
                          <div className="p-6 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="h-12 w-12 rounded-xl bg-[#7b68ee]/10 flex items-center justify-center text-[#7b68ee] font-black text-xl">
                                {team.name.charAt(0).toUpperCase()}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => { setSelectedTeam(team); setTeamTab("overview"); }}>
                                    <Eye className="h-4 w-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRenameTeam(team)}>
                                    <Edit3 className="h-4 w-4 mr-2" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTeam(team.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div>
                              <h3 className="font-bold text-base group-hover:text-primary transition-colors">{team.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[36px]">
                                {team.description || "No description yet."}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-border/20">
                              <div className="flex -space-x-1.5">
                                {["U1", "U2", "U3"].map((u, i) => (
                                  <div key={i} className="h-6 w-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[8px] font-bold text-primary">
                                    {u}
                                  </div>
                                ))}
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 group/btn" onClick={() => { setSelectedTeam(team); setTeamTab("overview"); }}>
                                View Details <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ALL PEOPLE */}
            {sidebarTab === "all-people" && (
              <div className="p-8 space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">All People</h2>
                  <Button size="sm" className="h-8 text-xs bg-[#7b68ee] hover:bg-[#6a5acd]" onClick={() => setIsCreateModalOpen(true)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Invite to Team
                  </Button>
                </div>
                <div className="border border-border/40 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 bg-muted/5">
                    <div className="col-span-5">Name</div>
                    <div className="col-span-4">Role</div>
                    <div className="col-span-3">Status</div>
                  </div>
                  {allPeople.length === 0 ? (
                    <div className="p-12 text-center opacity-40">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" strokeWidth={1} />
                      <p className="text-sm">No people found across your teams.</p>
                    </div>
                  ) : allPeople.map((m, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center border-b border-border/10 last:border-0 hover:bg-muted/5">
                      <div 
                        className="col-span-5 flex items-center gap-3 cursor-pointer group/person"
                        onClick={() => setSelectedUserProfileId(m.user_id)}
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold group-hover/person:bg-primary/20 transition-colors">
                          {m.profiles?.display_name?.charAt(0) || "?"}
                        </div>
                        <p className="font-semibold text-sm group-hover/person:text-primary transition-colors">{m.profiles?.display_name || "Unknown"}</p>
                      </div>
                      <div className="col-span-4">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider gap-1 ${ROLE_COLORS[m.role] || ""}`}>
                          {ROLE_ICONS[m.role]} {m.role}
                        </Badge>
                      </div>
                      <div className="col-span-3">
                        <span className={`text-[11px] font-medium ${m.profiles?.status?.includes("Online") ? "text-green-400" : "text-muted-foreground"}`}>
                          {m.profiles?.status || "Offline"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ANALYTICS */}
            {sidebarTab === "analytics" && (
              <div className="p-8 space-y-6 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold">Analytics</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Teams", value: teams.length, icon: <Users className="h-5 w-5 text-[#7b68ee]" />, color: "bg-[#7b68ee]/10 border-[#7b68ee]/20" },
                    { label: "Total Members", value: allPeople.length, icon: <User className="h-5 w-5 text-blue-400" />, color: "bg-blue-500/10 border-blue-500/20" },
                    { label: "Active Teams", value: teams.length, icon: <Activity className="h-5 w-5 text-green-400" />, color: "bg-green-500/10 border-green-500/20" },
                  ].map((s, i) => (
                    <div key={i} className={`border rounded-2xl p-6 ${s.color}`}>
                      <div className="flex justify-between items-start mb-4">{s.icon}<TrendingUp className="h-4 w-4 text-muted-foreground/40" /></div>
                      <p className="text-4xl font-black">{s.value}</p>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="border border-border/40 rounded-2xl p-8 text-center opacity-40">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" strokeWidth={1} />
                  <p className="text-sm">Not enough data to show detailed analytics yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Create teams and add members to get started.</p>
                </div>
              </div>
            )}

            {/* MOBILE TEAMS LIST (visible on mobile when no team is selected) */}
            {!selectedTeam && (
              <div className="md:hidden p-4 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight">Teams</h2>
                  <Button size="sm" className="h-8 w-8 p-0 bg-[#7b68ee] hover:bg-[#6a5acd]" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile Tabs */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                  {([
                    { id: "all-teams", label: "All Teams", icon: <Users className="h-3.5 w-3.5" /> },
                    { id: "all-people", label: "All People", icon: <User className="h-3.5 w-3.5" /> },
                    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSidebarTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                        sidebarTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {sidebarTab === "all-teams" && (
                  <div className="grid gap-3 pt-2">
                    {teams.length === 0 ? (
                      <div className="text-center py-10 opacity-40">
                        <Users className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-xs">No teams yet</p>
                      </div>
                    ) : (
                      teams.map(team => (
                        <div 
                          key={team.id} 
                          className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card/20 shadow-sm transition-all active:scale-[0.98]"
                          onClick={() => { setSelectedTeam(team); setTeamTab("overview"); }}
                        >
                          <div className="h-10 w-10 rounded-xl bg-[#7b68ee]/10 flex items-center justify-center text-[#7b68ee] font-black text-lg">
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate">{team.name}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Click to view details</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {sidebarTab === "all-people" && (
                  <div className="pt-2">
                    {allPeople.length === 0 ? (
                      <div className="text-center py-10 opacity-40">
                        <User className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-xs">No people found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allPeople.map((m, i) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-card/20"
                            onClick={() => setSelectedUserProfileId(m.user_id)}
                          >
                            <Avatar className="h-10 w-10 border border-primary/20">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {m.profiles?.display_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{m.profiles?.display_name}</p>
                              <Badge variant="outline" className={`text-[9px] font-bold uppercase ${ROLE_COLORS[m.role]}`}>
                                {m.role}
                              </Badge>
                            </div>
                            <span className={`h-2 w-2 rounded-full ${m.profiles?.status?.includes("Online") ? "bg-green-400" : "bg-muted-foreground/30"}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {sidebarTab === "analytics" && (
                  <div className="pt-2 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Teams", value: teams.length, color: "bg-[#7b68ee]/10 text-[#7b68ee]" },
                        { label: "Members", value: allPeople.length, color: "bg-blue-500/10 text-blue-400" },
                      ].map((s, i) => (
                        <div key={i} className={`p-4 rounded-2xl border border-border/20 ${s.color}`}>
                          <p className="text-2xl font-black">{s.value}</p>
                          <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 border border-dashed border-border/40 rounded-2xl text-center opacity-40">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-[10px]">Detailed analytics coming soon for mobile.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── CREATE TEAM MODAL ─── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-[#1a1a1a] border-border/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Team</DialogTitle>
            <DialogDescription className="text-muted-foreground">Teams help you group people and coordinate work across projects.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="flex gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Icon</label>
                <Input className="bg-background/50 border-border/40 h-11 w-16 text-center text-xl" value={newTeamEmoji} onChange={e => setNewTeamEmoji(e.target.value)} />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-semibold">Team Name *</label>
                <Input placeholder="e.g. Design Team, Frontend Dev" className="bg-background/50 border-border/40 h-11" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateTeam()} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <Textarea placeholder="What is this team about?" className="bg-background/50 border-border/40 min-h-[80px] resize-none" value={newTeamDescription} onChange={e => setNewTeamDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={isSubmitting || !newTeamName.trim()} className="bg-[#7b68ee] hover:bg-[#6a5acd] px-8">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── INVITE MEMBER MODAL ─── */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-[#1a1a1a] border-border/40 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Invite to {selectedTeam?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Selected user will receive an invitation to join the team.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Display Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Enter user's display name..." 
                  className="bg-background/50 border-border/40 h-11 pl-10" 
                  value={inviteSearch} 
                  onChange={e => setInviteSearch(e.target.value)} 
                />
                
                {/* Search Results Dropdown */}
                {inviteSearch.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-border/40 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {isSearching ? (
                      <div className="p-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Searching students...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">
                        No students found matching "{inviteSearch}"
                      </div>
                    ) : (
                      <div className="py-1">
                        {searchResults.map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleInviteMember(u.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {u.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{u.display_name}</p>
                              <p className="text-[10px] text-muted-foreground">Select to invite</p>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all mr-1" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: "owner", label: "Owner", icon: <Crown className="h-4 w-4" />, desc: "Full control" },
                  { val: "member", label: "Member", icon: <User className="h-4 w-4" />, desc: "Edit & View" },
                  { val: "guest", label: "Guest", icon: <Eye className="h-4 w-4" />, desc: "View only" },
                ].map(r => (
                  <button
                    key={r.val}
                    onClick={() => setInviteRole(r.val)}
                    className={`p-3 rounded-xl border text-center transition-all ${inviteRole === r.val ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-border"}`}
                  >
                    <div className="flex justify-center mb-1">{r.icon}</div>
                    <p className="text-xs font-bold">{r.label}</p>
                    <p className="text-[10px] opacity-60">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setIsInviteModalOpen(false); setSearchResults([]); setInviteSearch(""); }}>Cancel</Button>
            <Button onClick={() => searchResults[0] && handleInviteMember(searchResults[0].id)} disabled={isSubmitting || searchResults.length === 0} className="bg-[#7b68ee] hover:bg-[#6a5acd] px-8">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Invite Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <PublicProfileModal 
        userId={selectedUserProfileId} 
        onClose={() => setSelectedUserProfileId(null)} 
      />
    </div>
  );
}
