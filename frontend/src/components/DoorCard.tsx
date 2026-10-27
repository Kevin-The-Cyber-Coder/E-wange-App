import { DoorOpen, DoorClosed, ShieldCheck, ShieldAlert, Lock, Unlock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DoorCardProps {
  label: string;
  access: string;
  doorState: string;
  userName?: string;
  index?: number;
}

export function DoorCard({ label, access, doorState, userName, index = 0 }: DoorCardProps) {
  const isAuthorized = access === "Authorized";
  const isOpen = doorState === "Open";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card p-4 sm:p-6 relative overflow-hidden ${
        !isAuthorized ? "border-destructive/20" : ""
      }`}
    >
      {!isAuthorized && (
        <div className="absolute inset-0 bg-destructive/5 animate-pulse pointer-events-none" />
      )}
      {isAuthorized && (
        <div className="absolute inset-0 bg-success/[0.03] pointer-events-none" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <span className="section-label">{label}</span>
          <div className={isAuthorized ? "status-dot-active" : "status-dot-alert"} />
        </div>

        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors duration-500 ${
            isOpen
              ? "bg-warning/10 border border-warning/20"
              : "bg-success/10 border border-success/20"
          }`}>
            {isOpen ? (
              <DoorOpen className="h-5 w-5 sm:h-6 sm:w-6 text-warning icon-pulse" />
            ) : (
              <DoorClosed className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
            )}
          </div>
          <div>
            <div className={`text-lg sm:text-xl font-semibold font-mono transition-colors duration-500 ${
              isOpen ? "text-warning" : "text-success"
            }`}>
              {doorState}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Door State</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 sm:gap-2.5 px-3 py-2 rounded-xl transition-colors duration-500 ${
          isAuthorized
            ? "bg-success/5 border border-success/10"
            : "bg-destructive/5 border border-destructive/10"
        }`}>
          {isAuthorized ? (
            <ShieldCheck className="h-4 w-4 text-success flex-shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-destructive icon-pulse flex-shrink-0" />
          )}
          <span className={`text-xs font-semibold ${isAuthorized ? "text-success" : "text-destructive"}`}>
            {access}
          </span>
          <div className="flex-1" />
          {isAuthorized ? (
            <Unlock className="h-3 w-3 text-success/50 flex-shrink-0" />
          ) : (
            <Lock className="h-3 w-3 text-destructive/50 flex-shrink-0" />
          )}
        </div>

        {/* User name section */}
        <AnimatePresence mode="wait">
          <motion.div
            key={userName || "no-user"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className={`mt-3 flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl border transition-colors duration-500 ${
              isAuthorized
                ? "bg-primary/5 border-primary/10"
                : "bg-destructive/5 border-destructive/10"
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isAuthorized ? "bg-primary/10" : "bg-destructive/10"
            }`}>
              <User className={`h-3.5 w-3.5 ${isAuthorized ? "text-primary" : "text-destructive"}`} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                {isAuthorized ? "Opened By" : "Attempt"}
              </span>
              <span className={`text-xs font-semibold truncate block ${isAuthorized ? "text-foreground" : "text-destructive"}`}>
                {isAuthorized
                  ? (userName || "Unknown User")
                  : "Unauthorized Access Attempt"
                }
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
