import { Sprout } from "lucide-react";
import { motion } from "framer-motion";

interface SoilMoistureCardProps {
  value: number;
  index?: number;
}

function getSoilHealth(moisture: number) {
  if (moisture >= 40 && moisture <= 70)
    return { label: "Healthy", color: "text-success", bg: "bg-success/10 border-success/20", bar: "bg-success", dot: "status-dot-active" };
  if ((moisture >= 20 && moisture < 40) || (moisture > 70 && moisture <= 85))
    return { label: "Moderate", color: "text-warning", bg: "bg-warning/10 border-warning/20", bar: "bg-warning", dot: "status-dot-alert" };
  return { label: "Critical", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", bar: "bg-destructive", dot: "status-dot-alert" };
}

export function SoilMoistureCard({ value, index = 0 }: SoilMoistureCardProps) {
  const health = getSoilHealth(value);
  const percent = Math.min(100, Math.max(0, value));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-4 sm:p-6"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center ${health.bg}`}>
            <Sprout className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${health.color}`} />
          </div>
          <span className="section-label text-[9px] sm:text-[10px]">Soil Moisture</span>
        </div>
        <div className={health.dot} />
      </div>

      <div className={`text-xl sm:text-2xl font-bold font-mono transition-colors duration-500 ${health.color}`}>
        {value}<span className="text-base sm:text-lg ml-0.5">%</span>
      </div>

      <div className="gauge-bar mt-2 sm:mt-3">
        <div className={`gauge-fill ${health.bar}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-mono">0%</span>
        <span className={`text-[9px] sm:text-[10px] font-mono font-semibold ${health.color}`}>{health.label}</span>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-mono">100%</span>
      </div>
    </motion.div>
  );
}
