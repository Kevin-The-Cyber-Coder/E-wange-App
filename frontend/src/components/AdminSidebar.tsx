import { Activity, Users, Settings, BarChart3, LayoutDashboard, Menu, X, LogOut, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { id: "/admin", label: "Overview", icon: LayoutDashboard },
  { id: "/admin/users", label: "User Management", icon: Users },
  { id: "/admin/settings", label: "System Config", icon: Settings },
  { id: "/admin/history", label: "Data History", icon: BarChart3 },
];

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navContent = (
    <nav className="flex flex-col gap-1.5 mt-6">
      {navItems.map((item) => {
        const isActive = location.pathname === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              navigate(item.id);
              setMobileOpen(false);
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-300 mt-2"
      >
        <Activity className="h-4 w-4" />
        <span>Dashboard</span>
      </button>
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex-shrink-0 p-5 flex flex-col border-r border-border transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "hsl(var(--card))" }}
      >
        <div className="flex items-center gap-3 px-2 mb-2 mt-10 lg:mt-0">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Settings className="h-4.5 w-4.5 text-accent icon-glow" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">E-wange</h1>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.15em]">Admin Panel</p>
          </div>
        </div>

        {navContent}

        <div className="mt-auto space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-300"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Admin</p>
            <p className="text-xs text-foreground font-mono">v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
