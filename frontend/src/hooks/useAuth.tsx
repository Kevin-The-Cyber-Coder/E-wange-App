import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  role: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const resolvingRole = useRef(false);

  const resolveRole = async (u: User | null) => {
    // Prevent concurrent role resolution calls
    if (resolvingRole.current) return;
    resolvingRole.current = true;

    if (!u) {
      setUser(null);
      setRole("viewer");
      setLoading(false);
      resolvingRole.current = false;
      return;
    }
    setLoading(true);
    setUser(u);
    try {
      const { data } = await supabase.rpc("is_admin");
      setRole(data ? "admin" : "viewer");
    } catch {
      setRole("viewer");
    }
    setLoading(false);
    resolvingRole.current = false;
  };

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only resolve role on meaningful events, NOT on token refreshes
      if (event === "TOKEN_REFRESHED") return;

      initialized.current = true;
      resolveRole(session?.user ?? null);
    });

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized.current) {
        initialized.current = true;
        resolveRole(session?.user ?? null);
      }
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    let email = identifier;
    // If not an email, look up email by name in profiles
    if (!identifier.includes("@")) {
      const { data, error: lookupError } = await supabase.rpc("get_email_by_name" as any, { _name: identifier });
      if (lookupError || !data) throw new Error("User not found");
      email = data as string;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
