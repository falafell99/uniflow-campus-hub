import { useState, useEffect, useRef, useCallback } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import {
  Mic, MicOff, Volume2, VolumeX, Users, Lock, Plus,
  PhoneOff, Radio, Loader2, Wifi, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";
import { AvatarDisplay, AVATAR_COLORS } from "@/pages/Profile";
import { PublicProfileModal } from "@/components/PublicProfileModal";

// Fallback ensures App ID always has a value even if Vite env hasn't picked up .env.local
const AGORA_APP_ID: string = import.meta.env.VITE_AGORA_APP_ID ?? "14ba5447c00842149f1b6ae0316a1ce1";
const LOBBY_CHANNEL = "voice-lobby-global";
const REJOIN_KEY = "uniflow-voice-rejoin";

// ─── Types ────────────────────────────────────────────────────────────────────
type Room = {
  id: string;
  name: string;
  topic: string;
  emoji: string;
  max_users: number;
  locked: boolean;
  created_by?: string;
};

type Participant = {
  uid: string;
  display_name: string;
  avatar_color?: string;
  avatar_emoji?: string;
  muted: boolean;
  current_room: string; // which room this user is in
};

// ─── Predefined rooms ─────────────────────────────────────────────────────────
const PRESET_ROOMS: Room[] = [
  { id: "algo-grind",   name: "Algo Grind",       topic: "Dynamic Programming & Graphs",    emoji: "💻", max_users: 8,  locked: false },
  { id: "math-chill",   name: "Math Chill Zone",  topic: "Analysis & Linear Algebra help",  emoji: "📐", max_users: 10, locked: false },
  { id: "oop-session",  name: "OOP Session",      topic: "Design Patterns & Java",          emoji: "🧩", max_users: 6,  locked: false },
  { id: "exam-prep",    name: "Exam Prep",        topic: "Any subject — focused mode",      emoji: "📝", max_users: 8,  locked: false },
  { id: "lounge",       name: "Chill Lounge",     topic: "Hanging out between classes",     emoji: "☕", max_users: 20, locked: false },
  { id: "project-room", name: "Project Room",     topic: "Team projects & code reviews",    emoji: "🚀", max_users: 6,  locked: false },
];

const ROOM_EMOJIS = ["🎙", "💻", "📐", "🧪", "📝", "☕", "🚀", "🎮", "🎵", "🌙"];

// ─── Agora singletons ─────────────────────────────────────────────────────
// Client and local audio track persist across navigation so mute always works
let _agoraClient: IAgoraRTCClient | null = null;
let _localAudioTrack: ILocalAudioTrack | null = null;
function getAgoraClient() {
  if (!_agoraClient) _agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  return _agoraClient;
}

// ─── Lobby channel singleton (persists across navigation) ─────────────────────
let _lobbyChannel: ReturnType<typeof supabase.channel> | null = null;
let _lobbyPresenceCache: Record<string, Participant> = {};
// Stores OUR last tracked presence payload so navigation doesn't reset current_room
let _myPresencePayload: Partial<Participant> = {};
// Stores when the user joined so timer survives navigation
let _joinTimestamp: number | null = null;
type PresenceSyncListener = (map: Record<string, Participant>) => void;
const _presenceListeners = new Set<PresenceSyncListener>();

function notifyPresenceListeners(map: Record<string, Participant>) {
  _lobbyPresenceCache = map;
  _presenceListeners.forEach((fn) => fn(map));
}

function parseLobbyState(channel: ReturnType<typeof supabase.channel>): Record<string, Participant> {
  const state = channel.presenceState() as Record<string, (Participant & { presence_ref: string })[]>;
  const map: Record<string, Participant> = {};
  Object.values(state).forEach((entries) => {
    entries.forEach((entry) => { if (entry.uid) map[entry.uid] = entry; });
  });
  return map;
}

async function ensureLobbyChannel(
  userId: string,
  profile: { display_name: string; avatar_color?: string; avatar_emoji?: string; current_room?: string; muted?: boolean },
  options: { preserveRoom?: boolean } = {}
) {
  // Merge with cached payload — preserveRoom=true keeps existing current_room if caller passes ""
  const payload: Participant = {
    uid: userId,
    display_name: profile.display_name,
    avatar_color: profile.avatar_color ?? _myPresencePayload.avatar_color,
    avatar_emoji: profile.avatar_emoji ?? _myPresencePayload.avatar_emoji,
    muted: profile.muted ?? _myPresencePayload.muted ?? false,
    // If preserveRoom is true (re-mount), keep existing room; otherwise use what caller provides
    current_room: (options.preserveRoom && _myPresencePayload.current_room)
      ? _myPresencePayload.current_room
      : (profile.current_room ?? _myPresencePayload.current_room ?? ""),
  };
  // Save so future calls can preserve the state
  _myPresencePayload = { ...payload };

  if (_lobbyChannel) {
    await _lobbyChannel.track(payload).catch(() => {});
    notifyPresenceListeners(parseLobbyState(_lobbyChannel));
    return _lobbyChannel;
  }

  const channel = supabase.channel(LOBBY_CHANNEL, { config: { presence: { key: userId } } });
  _lobbyChannel = channel;

  channel.on("presence", { event: "sync" }, () => {
    notifyPresenceListeners(parseLobbyState(channel));
  });

  await new Promise<void>((resolve) => {
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track(payload);
        resolve();
      }
    });
  });

  return channel;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VoiceLounges() {
  const { user } = useAuth();
  const { setVoiceRoom } = useApp();

  // Room list
  const [userRooms, setUserRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");
  const [newRoomEmoji, setNewRoomEmoji] = useState("🎙");
  const [creating, setCreating] = useState(false);

  // Voice state
  const [joinedRoom, setJoinedRoom] = useState<Room | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Participants: map from uid → Participant — initialized from module-level cache
  // so re-mounting the component never shows 0 when people are still in rooms
  const [allPresence, setAllPresence] = useState<Record<string, Participant>>(_lobbyPresenceCache);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<ILocalAudioTrack | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [volumeMap, setVolumeMap] = useState<Record<string, number>>({});

  // Session timer
  const [sessionTime, setSessionTime] = useState("00:00");
  useEffect(() => {
    if (!joinedRoom) return;
    // Restore timestamp from sessionStorage if not in memory (page refresh)
    if (!_joinTimestamp) {
      const stored = sessionStorage.getItem(REJOIN_KEY + "-ts");
      if (stored) _joinTimestamp = Number(stored);
      else _joinTimestamp = Date.now();
    }
    const tick = () => {
      const secs = Math.floor((Date.now() - (_joinTimestamp ?? Date.now())) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setSessionTime(h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [joinedRoom]);
  const [myProfile, setMyProfile] = useState<{ display_name: string; avatar_color?: string; avatar_emoji?: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_color, avatar_emoji").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) setMyProfile(data as typeof myProfile);
        else setMyProfile({ display_name: user.email?.split("@")[0] || "Student" });
      });
  }, [user]);

  // Load user-created rooms
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data } = await supabase.from("voice_rooms").select("*").order("created_at", { ascending: true });
    if (data) setUserRooms(data as Room[]);
    setLoadingRooms(false);
  }, []);
  useEffect(() => { loadRooms(); }, [loadRooms]);

  // ── Global lobby presence ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !myProfile) return;

    // Register this component as a listener for presence updates
    const listener: PresenceSyncListener = (map) => setAllPresence({ ...map });
    _presenceListeners.add(listener);

    // Connect / update presence (idempotent — won't re-subscribe if already connected)
    ensureLobbyChannel(user.id, { ...myProfile, current_room: "", muted: false }, { preserveRoom: true });

    return () => {
      // Only remove the listener — keep the channel alive!
      _presenceListeners.delete(listener);
    };
  }, [user, myProfile]);

  // Update lobby presence whenever room/muted changes
  const updateLobbyPresence = useCallback(async (roomId: string, isMuted: boolean) => {
    if (!user || !myProfile) return;
    await ensureLobbyChannel(user.id, {
      ...myProfile,
      current_room: roomId,
      muted: isMuted,
    });
  }, [user, myProfile]);

  // Compute per-room participant lists from global presence
  const getRoomParticipants = useCallback((roomId: string) => {
    return Object.values(allPresence).filter((p) => p.current_room === roomId);
  }, [allPresence]);

  // ── Agora join ────────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (room: Room) => {
    if (!user || !myProfile) { toast({ title: "Sign in first" }); return; }
    if (joinedRoom) { toast({ title: "Leave current room first" }); return; }

    setConnecting(true);
    try {
      const client = getAgoraClient();
      clientRef.current = client;

      let localAudio: ILocalAudioTrack;
      try {
        localAudio = await AgoraRTC.createMicrophoneAudioTrack();
      } catch {
        toast({ title: "Microphone access denied", description: "Allow mic access in your browser.", variant: "destructive" });
        setConnecting(false);
        return;
      }
      localTrackRef.current = localAudio;
      _localAudioTrack = localAudio; // persist at module level

      const uid = await client.join(AGORA_APP_ID, room.id, null, null);
      const uidStr = String(uid);
      setMyUid(uidStr);

      // Remote audio
      client.on("user-published", async (remoteUser: IAgoraRTCRemoteUser, mediaType) => {
        if (mediaType === "audio") {
          await client.subscribe(remoteUser, "audio");
          remoteUser.audioTrack?.play();
        }
      });
      client.on("user-unpublished", (remoteUser) => { remoteUser.audioTrack?.stop(); });

      // Volume / speaking detection
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (vols) => {
        const map: Record<string, number> = {};
        vols.forEach((v) => { map[String(v.uid)] = v.level; });
        setVolumeMap(map);
      });

      await client.publish([localAudio]);

      // Update lobby presence with new room
      await updateLobbyPresence(room.id, false);

      // Save join timestamp (module-level so it survives navigation)
      _joinTimestamp = Date.now();

      // Save to sessionStorage for auto-rejoin on refresh
      sessionStorage.setItem(REJOIN_KEY, room.id);
      sessionStorage.setItem(REJOIN_KEY + "-ts", String(_joinTimestamp));

      setJoinedRoom(room);
      setVoiceRoom(room.name);
      toast({ title: `Joined ${room.emoji} ${room.name}` });
    } catch (err) {
      console.error("Agora join error:", err);
      toast({ title: "Failed to join room", description: String(err), variant: "destructive" });
    }
    setConnecting(false);
  }, [user, myProfile, joinedRoom, setVoiceRoom, updateLobbyPresence]);

  // ── Auto-rejoin / restore on navigation ──────────────────────────────────────
  useEffect(() => {
    const savedRoomId = sessionStorage.getItem(REJOIN_KEY);
    if (!savedRoomId || !myProfile) return;

    const allRoomsFlat = [...PRESET_ROOMS, ...userRooms];
    const room = allRoomsFlat.find((r) => r.id === savedRoomId);
    if (!room || joinedRoom || connecting) return;

    const connectionState = _agoraClient?.connectionState;

    if (connectionState === "CONNECTED" || connectionState === "CONNECTING") {
      // Client is still connected from before navigation — just restore UI state
      clientRef.current = _agoraClient;
      localTrackRef.current = _localAudioTrack; // restore local audio track so mute works!
      setJoinedRoom(room);
      setVoiceRoom(room.name);
      // Restore muted state from presence cache
      const myPresenceMuted = _myPresencePayload.muted ?? false;
      setMuted(myPresenceMuted);
      // Re-enable volume indicator and remote audio
      _agoraClient?.enableAudioVolumeIndicator();
      _agoraClient?.remoteUsers.forEach((u) => { u.audioTrack?.play(); });
    } else {
      // Genuine page reload — client is disconnected, do a real rejoin
      toast({ title: "Reconnecting to voice room…", description: room.name });
      joinRoom(room);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile, userRooms]); // run once when profile + rooms are loaded


  // ── Leave room ────────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    try {
      _localAudioTrack?.stop();
      _localAudioTrack?.close();
      _localAudioTrack = null;
      localTrackRef.current = null;
      await clientRef.current?.leave();
      _agoraClient = null;
      clientRef.current = null;
    } catch (e) { console.warn("Leave error", e); }

    // Reset lobby presence to "not in room"
    await updateLobbyPresence("", false);
    _joinTimestamp = null;
    sessionStorage.removeItem(REJOIN_KEY);
    sessionStorage.removeItem(REJOIN_KEY + "-ts");

    setJoinedRoom(null);
    setMyUid(null);
    setMuted(false);
    setDeafened(false);
    setVolumeMap({});
    setVoiceRoom(null);
    toast({ title: "Left voice room" });
  }, [updateLobbyPresence, setVoiceRoom]);

  // Leave on window unload (helps with counts when tab is closed)
  useEffect(() => {
    const handleUnload = () => {
      if (joinedRoom) {
        clientRef.current?.leave().catch(() => {});
        _lobbyChannel?.untrack().catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [joinedRoom]);

  // ── Mute / Deafen ─────────────────────────────────────────────────────────────
  const toggleMute = async () => {
    const track = localTrackRef.current;
    if (!track) return;
    const next = !muted;
    await track.setEnabled(!next);
    setMuted(next);
    await updateLobbyPresence(joinedRoom?.id ?? "", next);
  };

  const toggleDeafen = () => {
    const client = clientRef.current;
    if (!client) return;
    const next = !deafened;
    client.remoteUsers.forEach((u) => { next ? u.audioTrack?.stop() : u.audioTrack?.play(); });
    setDeafened(next);
  };

  // ── Create room ───────────────────────────────────────────────────────────────
  const createRoom = async () => {
    if (!user || !newRoomName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("voice_rooms").insert({
      name: newRoomName.trim(),
      topic: newRoomTopic.trim() || "Open discussion",
      emoji: newRoomEmoji,
      max_users: 10,
      locked: false,
      created_by: user.id,
    });
    setCreating(false);
    if (error) { toast({ title: "Failed to create room", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Room "${newRoomName}" created!` });
    setCreateOpen(false);
    setNewRoomName(""); setNewRoomTopic(""); setNewRoomEmoji("🎙");
    loadRooms();
  };

  const allRooms = [...PRESET_ROOMS, ...userRooms];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🎙 Voice Lounges</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time voice rooms — powered by Agora WebRTC</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Room
        </Button>
      </div>

      {/* Active session bar */}
      {joinedRoom && (
        <div className="glass-card p-4 border-primary/40 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-semibold">{joinedRoom.emoji} {joinedRoom.name}</span>
            <span className="text-xs text-muted-foreground truncate hidden sm:block">{joinedRoom.topic}</span>
          </div>
          {/* Session timer */}
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            {sessionTime}
          </div>
          <div className="flex items-center gap-1">
            <Button variant={muted ? "destructive" : "outline"} size="icon" className="h-8 w-8" onClick={toggleMute}>
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant={deafened ? "destructive" : "outline"} size="icon" className="h-8 w-8" onClick={toggleDeafen}>
              {deafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5 ml-2" onClick={leaveRoom}>
              <PhoneOff className="h-3.5 w-3.5" /> Leave
            </Button>
          </div>
        </div>
      )}

      {/* Room grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allRooms.map((room) => {
          const isJoined = joinedRoom?.id === room.id;
          const roomParticipants = getRoomParticipants(room.id);
          const count = roomParticipants.length;

          return (
            <div
              key={room.id}
              className={`glass-card p-5 flex flex-col gap-3 transition-all duration-200 ${
                isJoined ? "ring-2 ring-primary border-primary/30" : "hover:border-primary/20"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{room.emoji}</span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{room.name}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{room.topic}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${count > 0 ? "border-success text-success" : ""}`}
                >
                  <Users className="h-2.5 w-2.5 mr-1" />
                  {count}/{room.max_users}
                </Badge>
              </div>

              {/* Participant avatars (visible to everyone via lobby presence) */}
              {count > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roomParticipants.slice(0, 7).map((p) => {
                    const speaking = (volumeMap[p.uid] ?? 0) > 5 && !p.muted && isJoined;
                    return (
                      <div key={p.uid} className="flex flex-col items-center gap-0.5" title={p.display_name}>
                        <button 
                          onClick={() => setSelectedProfileId(p.uid)}
                          className={`relative transition-transform duration-150 outline-none hover:scale-110 focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-2xl ${speaking ? "scale-115" : ""}`}
                        >
                          <AvatarDisplay
                            name={p.display_name}
                            avatarColor={p.avatar_color ?? AVATAR_COLORS[0].from}
                            avatarEmoji={p.avatar_emoji}
                            size="sm"
                          />
                          {speaking && (
                            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-success border-2 border-background flex items-center justify-center">
                              <Radio className="h-2 w-2 text-white animate-pulse" />
                            </span>
                          )}
                          {p.muted && (
                            <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-0.5 border-2 border-background">
                              <MicOff className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-full px-1 text-center">
                          {p.display_name}
                        </span>
                      </div>
                    );
                  })}
                  {count > 7 && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                      +{count - 7}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wifi className="h-3 w-3" />
                  <span>Empty — be the first to join!</span>
                </div>
              )}

              {/* Action buttons */}
              {isJoined ? (
                <div className="flex gap-2 mt-auto">
                  <Button variant={muted ? "destructive" : "outline"} size="sm" className="gap-1 flex-1" onClick={toggleMute}>
                    {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {muted ? "Unmute" : "Mute"}
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={leaveRoom}>
                    <PhoneOff className="h-3.5 w-3.5" /> Leave
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full mt-auto gap-1.5"
                  disabled={room.locked || !!joinedRoom || connecting}
                  onClick={() => joinRoom(room)}
                >
                  {connecting && !joinedRoom ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…</>
                  ) : room.locked ? (
                    "🔒 Locked"
                  ) : joinedRoom ? (
                    "In another room"
                  ) : (
                    <><Mic className="h-3.5 w-3.5" /> Join Room</>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal overlays */}
      <PublicProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />

      {/* Create Room Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Create Voice Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Room Emoji</p>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_EMOJIS.map((e) => (
                  <button key={e} onClick={() => setNewRoomEmoji(e)}
                    className={`h-9 w-9 text-lg rounded-lg border transition-all ${newRoomEmoji === e ? "border-primary bg-primary/10 scale-110" : "border-border/50 hover:border-primary/50"}`}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name" maxLength={40} />
              <Input value={newRoomTopic} onChange={(e) => setNewRoomTopic(e.target.value)} placeholder="Topic (optional)" maxLength={80} />
            </div>
            <Button className="w-full gap-2" onClick={createRoom} disabled={!newRoomName.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
