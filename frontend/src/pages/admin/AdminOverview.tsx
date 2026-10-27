import { motion } from "framer-motion";
import { Users, Settings, BarChart3, Activity } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { useEffect, useState } from "react";

interface OverviewCounts {
  users: number;
  devices: number;
  readings: number;
  logs: number;
  onlineDevices: number;
  configs: number;
}

const AdminOverview = () => {
  const { data, connected } = useFirebaseData();
  const { user } = useAuth();
  const [counts, setCounts] = useState<OverviewCounts | null>(null);

  useEffect(() => {
    api
      .get("/admin/overview")
      .then((res) => setCounts(res?.counts ?? null))
      .catch(() => setCounts(null));
  }, []);

  const stats = [
    { label: "Active Devices", value: "6", icon: Activity, color: "text-primary" },
    { label: "Users", value: counts ? String(counts.users) : "…", icon: Users, color: "text-accent" },
    { label: "Config Items", value: counts ? String(counts.configs) : "…", icon: Settings, color: "text-success" },
    { label: "Data Points", value: counts ? String(counts.readings) : "…", icon: BarChart3, color: "text-info" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Admin Overview</h2>
        <p className="text-sm text-muted-foreground">
          Welcome back, <span className="text-foreground font-medium">{user?.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="glass-card p-3 sm:p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${connected ? "text-success" : "text-muted-foreground"}`}>
                {connected ? "Live" : "Offline"}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Current Readings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Temperature</span>
              <span className="text-sm font-mono text-foreground">{data.temperature}°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Humidity</span>
              <span className="text-sm font-mono text-foreground">{data.humidity}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gas Sensor</span>
              <span className={`text-sm font-mono ${data.gas === "NO" ? "text-success" : "text-destructive"}`}>
                {data.gas === "NO" ? "Safe" : data.gas}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Main Door</span>
              <span className="text-sm font-mono text-foreground">{data.main_door.door_state} ({data.main_door.access})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Parking Slots</span>
              <span className="text-sm font-mono text-foreground">S1: {data.parking.slot1.status} / S2: {data.parking.slot2.status}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Device States</h3>
          <div className="space-y-3">
            {[
              { label: "Lamp", value: data.lamp },
              { label: "Fan", value: data.fan },
              { label: "Curtains", value: data.curtains },
              { label: "Water Pump", value: data.water_pump },
              { label: "Buzzer", value: data.buzzer },
              { label: "Parking Gate", value: data.parking.gate },
            ].map((d) => (
              <div key={d.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{d.label}</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${
                  d.value === "ON" || d.value === "Open"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminOverview;
