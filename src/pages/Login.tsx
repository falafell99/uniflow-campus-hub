import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

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
      const { error } = await signUp(email, password, displayName);
      if (error) { setError(error); setLoading(false); return; }
      
      // Do not navigate immediately on sign up; they need to check email.
      toast({ title: "Check your email", description: "A confirmation link has been sent to your inbox." });
      setMode("signin"); // switch the UI back to signin mode
      setPassword("");
      setLoading(false);
    }
  };

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
            <Input
              type="email"
              placeholder="University email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
