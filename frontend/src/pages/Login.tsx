import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, LogIn, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const { login, user, loading: authLoading, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exiting, setExiting] = useState(false);
  const pendingLoginRef = useRef(false);

  // Auto-redirect if already logged in OR after login when role resolves
  useEffect(() => {
    if (!authLoading && user && role) {
      setExiting(true);
      const target = role === "admin" ? "/admin" : "/dashboard";
      const timer = setTimeout(() => {
        navigate(target, { replace: true });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      pendingLoginRef.current = true;
      toast.success("Welcome back!");
      // Role resolves via onAuthStateChange → useEffect handles redirect
    } catch {
      toast.error("Invalid credentials");
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background bg-mesh flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8 text-center"
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {!exiting && (
          <motion.div
            key="login-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card p-8 w-full max-w-md"
          >
            <div className="flex items-center gap-3 justify-center mb-8">
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center"
              >
                <Activity className="h-6 w-6 text-primary icon-glow" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground">E-wange</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">Smart Home</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Username or Email</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="name or email"
                  required
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 rounded-xl bg-secondary border border-border px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </motion.button>
            </form>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-[11px] text-muted-foreground mt-6"
            >
              Secure access to E-wange Smart Home
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
