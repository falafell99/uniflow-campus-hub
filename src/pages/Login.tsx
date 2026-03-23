import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// ─── ELTE Domain Mapping ──────────────────────────────────────────────────────
const ELTE_DOMAINS: Record<string, { faculty: string; university: string }> = {
  "inf.elte.hu": { faculty: "Faculty of Informatics", university: "ELTE" },
  "ptk.inf.elte.hu": { faculty: "Faculty of Informatics", university: "ELTE" },
  "student.inf.elte.hu": { faculty: "Faculty of Informatics", university: "ELTE" },
  "elte.hu": { faculty: "ELTE", university: "ELTE" },
  "btk.elte.hu": { faculty: "Faculty of Humanities", university: "ELTE" },
  "ttk.elte.hu": { faculty: "Faculty of Science", university: "ELTE" },
  "ajtk.elte.hu": { faculty: "Faculty of Social Sciences", university: "ELTE" },
  "ajk.elte.hu": { faculty: "Faculty of Law", university: "ELTE" },
  "pok.elte.hu": { faculty: "Faculty of Education", university: "ELTE" },
  "bggyk.elte.hu": { faculty: "Faculty of Special Education", university: "ELTE" },
  "ppk.elte.hu": { faculty: "Faculty of Education and Psychology", university: "ELTE" },
  "tofk.elte.hu": { faculty: "Faculty of Primary and Pre-School Education", university: "ELTE" },
};

const getElteFaculty = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return ELTE_DOMAINS[domain] ||
    Object.entries(ELTE_DOMAINS).find(([key]) => domain.endsWith(key))?.[1] ||
    null;
};

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    }
  }, [searchParams]);

  useEffect(() => {
    // Check for Supabase Auth callback params in the URL hash
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const errorDesc = params.get("error_description");
      const token = params.get("access_token");

      if (errorDesc) {
        toast({ title: "Authentication Error", description: errorDesc, variant: "destructive" });
        window.history.replaceState(null, "", window.location.pathname);
      } else if (token) {
        toast({ title: "Email confirmed successfully! 🎉" });
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/");
      }
    }
  }, [navigate]);

  const resendVerification = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: verificationEmail,
    });
    if (error) {
      toast({ title: "Failed to resend", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verification email resent ✓" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) { setError(error); setLoading(false); return; }
      navigate("/");
    } else {
      if (!displayName.trim()) { setError("Display name is required"); setLoading(false); return; }

      const elteInfo = getElteFaculty(email);

      const { error } = await signUp(email, password, displayName, {
        university: elteInfo?.university || "",
        faculty: elteInfo?.faculty || "",
      });

      if (error) { setError(error); setLoading(false); return; }
      
      // Show verification message
      setShowVerificationMessage(true);
      setVerificationEmail(email);
      setLoading(false);
    }
  };

  const elteInfo = email ? getElteFaculty(email) : null;

  // Verification message screen
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="glass-card p-6">
            <div className="flex flex-col items-center text-center space-y-4 py-8">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                📧
              </div>
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                We sent a verification link to <strong>{verificationEmail}</strong>.
                Click the link to activate your account.
              </p>
              {getElteFaculty(verificationEmail) && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    ELTE {getElteFaculty(verificationEmail)?.faculty} detected ✓
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Didn't get it?{" "}
                <button onClick={resendVerification} className="text-primary hover:underline">
                  Resend email
                </button>
              </p>
              <Button variant="outline" size="sm" onClick={() => { setShowVerificationMessage(false); setMode("signin"); setPassword(""); }}>
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">UniFlow</h1>
          <p className="text-sm text-muted-foreground">ELTE Student Collaboration Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 space-y-4">
          {/* Tab toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border/40 p-1 gap-1 bg-muted/40">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Input
                placeholder="Display name (e.g. Ahmed K.)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            )}
            <div>
              <Input
                type="email"
                placeholder="University email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {mode === "signup" && elteInfo && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-primary">
                  <GraduationCap className="h-3 w-3" />
                  <span>ELTE {elteInfo.faculty}</span>
                </div>
              )}
            </div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "signin" ? "Sign In" : "Create Account")}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to ELTE's student data policy.
        </p>
      </div>
    </div>
  );
}
