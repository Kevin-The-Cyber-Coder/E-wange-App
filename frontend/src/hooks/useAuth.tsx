import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api, { setToken, getToken } from "@/lib/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  role: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface LoginResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

const toAuthUser = (user: LoginResponse["user"]): AuthUser => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);

  // Restore the session from the stored JWT on first paint.
  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((me) => {
        if (cancelled || !me) return;
        setUser({ id: me._id, name: me.name, email: me.email, role: me.role });
        setRole(me.role);
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    const data = (await api.post("/auth/login", {
      email: identifier.trim(),
      password,
    })) as LoginResponse;

    setToken(data.token);
    setUser(toAuthUser(data.user));
    setRole(data.user.role);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setRole("viewer");
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
