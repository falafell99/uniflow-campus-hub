import { useState } from "react";
import { Mic, MicOff, Volume2, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";

type Room = {
  id: number;
  name: string;
  topic: string;
  users: { name: string; avatar: string; speaking: boolean }[];
  max: number;
  locked: boolean;
};

const initialRooms: Room[] = [
  {
    id: 1, name: "📐 Linear Algebra Grind", topic: "Eigenvalues & Diagonalization", max: 8, locked: false,
    users: [
      { name: "Márton B.", avatar: "MB", speaking: true },
      { name: "Anna K.", avatar: "AK", speaking: false },
      { name: "Eszter N.", avatar: "EN", speaking: false },
    ],
  },
  {
    id: 2, name: "💻 Algo Practice Room", topic: "Dynamic Programming Problems", max: 6, locked: false,
    users: [
      { name: "Gábor L.", avatar: "GL", speaking: true },
      { name: "Dániel T.", avatar: "DT", speaking: false },
    ],
  },
  {
    id: 3, name: "🧮 Discrete Math Chill", topic: "Graph Theory Review", max: 10, locked: false,
    users: [
      { name: "Bence M.", avatar: "BM", speaking: false },
    ],
  },
  {
    id: 4, name: "🔒 Private Study Session", topic: "Exam Prep - Invite Only", max: 4, locked: true,
    users: [
      { name: "Prof. Kovács", avatar: "PK", speaking: true },
      { name: "Top Student", avatar: "TS", speaking: false },
    ],
  },
];

export default function VoiceLounges() {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [joinedRoom, setJoinedRoom] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const { setVoiceRoom } = useApp();

  const handleJoin = (room: Room) => {
    // Add user to room
    setRooms((prev) =>
      prev.map((r) =>
        r.id === room.id
          ? { ...r, users: [...r.users, { name: "Ahmed K.", avatar: "AK", speaking: false }] }
          : r
      )
    );
    setJoinedRoom(room.id);
    setVoiceRoom(room.name.replace(/^[^\w]*/, "").trim());
  };

  const handleLeave = () => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === joinedRoom
          ? { ...r, users: r.users.filter((u) => u.avatar !== "AK" || u.name !== "Ahmed K.") }
          : r
      )
    );
    setJoinedRoom(null);
    setVoiceRoom(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">🎙 Voice Lounges</h1>
        <p className="text-muted-foreground mt-1">Join virtual study rooms and learn together in real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => (
          <div key={room.id} className={`glass-card p-5 transition-all duration-200 ${joinedRoom === room.id ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{room.name}</h3>
                {room.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <Badge variant="outline" className="text-[10px]">
                <Users className="h-3 w-3 mr-1" /> {room.users.length}/{room.max}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{room.topic}</p>

            {/* Avatars */}
            <div className="flex flex-wrap gap-3 mb-4">
              {room.users.map((u, i) => (
                <div key={`${u.name}-${i}`} className="flex flex-col items-center gap-1">
                  <div className={`relative h-10 w-10 rounded-full flex items-center justify-center ${u.speaking ? "ring-2 ring-success ring-offset-2" : "bg-muted"}`}>
                    <span className="text-xs font-semibold text-primary">{u.avatar}</span>
                    {u.speaking && (
                      <Volume2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-success bg-background rounded-full p-0.5" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{u.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>

            {joinedRoom === room.id ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {muted ? "Unmute" : "Mute"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleLeave}
                >
                  Leave
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full"
                disabled={room.locked || joinedRoom !== null}
                onClick={() => handleJoin(room)}
              >
                {room.locked ? "Locked" : "Join Room"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
