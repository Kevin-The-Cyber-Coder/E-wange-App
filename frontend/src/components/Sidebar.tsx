import { Activity, DoorOpen, Thermometer, Car, Menu, X, LogOut, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems = [
  { id: "overview", label: "Dashboard", icon: Activity },
  { id: "doors", label: "Door & Security", icon: DoorOpen },
  { id: "environment", label: "Environment", icon: Thermometer },
  { id: "parking", label: "Parking & Gate", icon: Car },
];

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navContent = (
    <nav className="flex flex-col gap-1.5 mt-6">
      {navItems.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onSectionChange(item.id);
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
    </nav>
  );

  return (
    <>
      {/* Mobile toggle — always visible on small screens */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-foreground shadow-lg"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — hidden on mobile by default, slides in when open */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex-shrink-0 p-5 flex flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-2 mt-2 lg:mt-0">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-primary icon-glow" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">E-wange</h1>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.15em]">Smart Home</p>
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">System</p>
            <p className="text-xs text-foreground font-mono">v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
