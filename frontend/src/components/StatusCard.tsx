import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatusCardProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  subtitle?: string;
  status?: "active" | "inactive" | "alert" | "warning";
  className?: string;
  index?: number;
}

const statusColors = {
  active: "text-success",
  inactive: "text-muted-foreground",
  alert: "text-destructive",
  warning: "text-warning",
};

const statusBg = {
  active: "bg-success/10 border-success/20",
  inactive: "bg-muted/50 border-border",
  alert: "bg-destructive/10 border-destructive/20",
  warning: "bg-warning/10 border-warning/20",
};

const dotClass = {
  active: "status-dot-active",
  inactive: "status-dot-inactive",
  alert: "status-dot-alert",
  warning: "status-dot-alert",
};

export function StatusCard({
  title,
  icon: Icon,
  value,
  subtitle,
  status = "inactive",
  className = "",
  index = 0,
}: StatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card p-4 sm:p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center ${statusBg[status]}`}>
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${statusColors[status]} ${status === "alert" ? "icon-pulse" : ""}`} />
          </div>
          <span className="section-label text-[9px] sm:text-[10px]">{title}</span>
        </div>
        <div className={dotClass[status]} />
      </div>
      <div className={`text-xl sm:text-2xl font-bold font-mono transition-colors duration-500 ${statusColors[status]}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 sm:mt-1.5 font-medium">{subtitle}</p>
      )}
    </motion.div>
  );
}
