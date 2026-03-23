/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  refreshProfile: (userId?: string) => Promise<any>;
  onlineUsers: Set<string>;
  signUp: (email: string, password: string, displayName: string, extraMeta?: Record<string, string>) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (userId?: string) => {
    let idToUse = userId;
    if (!idToUse) {
      const { data: { user } } = await supabase.auth.getUser();
      idToUse = user?.id;
    }

    if (idToUse) {
      const fetchPromise = supabase.from("profiles").select("*").eq("id", idToUse).single();
      const timeoutPromise = new Promise<{data: any, error: any}>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error("Profile fetch timed out") }), 5000)
      );
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (error) {
        console.error("Profile fetch error:", error);
      }
      setProfile(data || null);
      return data;
    } else {
      setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    const sessionPromise = supabase.auth.getSession();
    const fallbackTimer = new Promise((resolve) => setTimeout(() => resolve(null), 6000));
    
    Promise.race([sessionPromise, fallbackTimer]).then((result: any) => {
      const session = result?.data?.session;
      setSession(session ?? null);
      setUser(session?.user ?? null);
      if (session?.user) refreshProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Start profile fetch immediately to unblock UI
        refreshProfile(session.user.id).finally(() => setLoading(false));

        if (event === "SIGNED_IN") {
          // Run profile initialization in the background
          (async () => {
            try {
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", session.user.id)
                .single();

              if (!existingProfile) {
                await supabase.from("profiles").insert({
                  id: session.user.id,
                  display_name: session.user.email?.split("@")[0] || "Student",
                  status: "Online",
                  onboarding_completed: false,
                });
                // Refresh again if we just created it
                refreshProfile(session.user.id);
              } else {
                await supabase.from("profiles").update({ status: "Online" }).eq("id", session.user.id);
              }

              // Auto-fill faculty from ELTE email metadata
              const userMeta = session.user.user_metadata;
              if (userMeta?.faculty || userMeta?.university) {
                await supabase.from("profiles").update({
                  faculty: userMeta.faculty,
                  university: userMeta.university,
                }).eq("id", session.user.id).is("faculty", null);
              }
            } catch (err) {
              console.error(err);
            }
          })();
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for avatar-updated custom event to sync across components
  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setProfile((prev: any) => prev ? { ...prev, avatar_url: customEvent.detail.avatar_url } : null);
    };
    window.addEventListener("avatar-updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar-updated", handleAvatarUpdate);
  }, []);

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Handle Global Presence and Window Unload
  useEffect(() => {
    if (!user) {
      setOnlineUsers(new Set());
      return;
    }

    const presenceChannel = supabase.channel("online-users")
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(
          Object.values(state)
            .flat()
            .map((presence: any) => presence.user_id)
        );
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id });
        }
      });

    const handleUnload = () => {
      supabase.from("profiles").update({ status: "Offline" }).eq("id", user.id).then();
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      supabase.removeChannel(presenceChannel);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user]);

  const signUp = async (email: string, password: string, displayName: string, extraMeta?: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          ...(extraMeta || {}),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) return { error: error.message };

    // upsert profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        display_name: displayName,
        email,
        status: "🟢 Online",
        credits: 1250,
        onboarding_completed: false,
        ...(extraMeta?.university ? { university: extraMeta.university } : {}),
        ...(extraMeta?.faculty ? { faculty: extraMeta.faculty } : {}),
      });
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from("profiles").update({ status: "Online" }).eq("id", data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    if (user) {
      await supabase.from("profiles").update({ status: "Offline" }).eq("id", user.id);
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile, onlineUsers, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
