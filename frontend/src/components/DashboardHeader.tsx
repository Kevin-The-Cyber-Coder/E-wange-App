import { Wifi, WifiOff, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  connected: boolean;
  lastCommand: string;
  title: string;
}

export function DashboardHeader({ connected, lastCommand, title }: DashboardHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 pl-14 lg:pl-0"
    >
      <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">{title}</h2>

      <div className="flex items-center gap-2 flex-wrap">
        {/* GSM command */}
        <div className="glass-card flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">GSM</span>
          <div className="w-px h-3.5 bg-border" />
          <span className="text-xs font-mono text-foreground font-medium truncate max-w-[100px] sm:max-w-none">{lastCommand}</span>
        </div>

        {/* Connection status */}
        <div className={`glass-card flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 ${
          connected ? "border-success/20" : "border-destructive/20"
        }`}>
          {connected ? (
            <>
              <div className="relative">
                <Wifi className="h-3.5 w-3.5 text-success" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              </div>
              <span className="text-xs text-success font-semibold tracking-wide">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs text-destructive font-semibold tracking-wide">Offline</span>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
