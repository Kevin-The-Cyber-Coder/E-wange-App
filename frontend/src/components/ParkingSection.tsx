import { Car, CircleParking, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import type { ParkingSlot } from "@/hooks/useFirebaseData";

interface ParkingSectionProps {
  slot1: ParkingSlot;
  slot2: ParkingSlot;
  gateState: string;
}

export function ParkingSection({ slot1, slot2, gateState }: ParkingSectionProps) {
  const isGateOpen = gateState.includes("Open");

  const slots = [
    { label: "Slot 1", data: slot1 },
    { label: "Slot 2", data: slot2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card p-4 sm:p-6"
    >
      <span className="section-label">Parking</span>

      {/* Slots */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 sm:mt-5">
        {slots.map(({ label, data }, i) => {
          const occupied = data.status?.toLowerCase() === "occupied";
          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border p-3 sm:p-4 transition-colors duration-500 ${
                occupied
                  ? "bg-warning/10 border-warning/25"
                  : "bg-success/10 border-success/25"
              }`}
            >
              {occupied ? (
                <Car className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
              ) : (
                <CircleParking className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              )}
              <span className="text-xs font-semibold font-mono">{label}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                occupied ? "text-warning" : "text-success"
              }`}>
                {occupied ? "Occupied" : "Free"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Gate */}
      <div className="flex items-center gap-3 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-border">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center ${
          isGateOpen ? "bg-success/10 border-success/20" : "bg-warning/10 border-warning/20"
        }`}>
          {isGateOpen ? (
            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
          ) : (
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
          )}
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Gate</span>
          <span className={`text-sm font-mono font-semibold ${isGateOpen ? "text-success" : "text-warning"}`}>
            {isGateOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
