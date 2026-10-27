import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Clock, Thermometer, Droplets, Activity } from "lucide-react";
import { database, ref, onValue } from "@/lib/firebase";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface DataPoint {
  temperature: number;
  humidity: number;
}

const TIME_RANGES = [
  { label: "1 Hour", key: "1hour", unit: "min" },
  { label: "24 Hours", key: "24hours", unit: "hr" },
  { label: "7 Days", key: "7days", unit: "day" },
] as const;

const DataHistory = () => {
  const [historyData, setHistoryData] = useState<Record<string, Record<string, DataPoint>>>({});
  const [range, setRange] = useState(0);
  const { data: liveData, connected } = useFirebaseData();

  useEffect(() => {
    const historyRef = ref(database, "/history");
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setHistoryData(val);
    });
    return () => unsubscribe();
  }, []);

  const currentKey = TIME_RANGES[range].key;
  const unit = TIME_RANGES[range].unit;
  const rawData = historyData[currentKey] || {};

  const chartData = Object.entries(rawData)
    .map(([key, val]) => ({
      time: `${key} ${unit}`,
      sortKey: Number(key),
      temperature: val.temperature,
      humidity: val.humidity,
    }))
    .sort((a, b) => a.sortKey - b.sortKey);

  const exportCSV = () => {
    const rows = ["Time,Temperature,Humidity"];
    chartData.forEach((d) => rows.push(`${d.time},${d.temperature},${d.humidity}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ewange-history-${TIME_RANGES[range].label.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 text-xs border border-border">
        <p className="text-muted-foreground mb-1.5">{payload[0]?.payload?.time}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
            {p.name}: {p.value}{p.dataKey === "temperature" ? "°C" : "%"}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Data History</h2>
          <p className="text-sm text-muted-foreground">{chartData.length} data points</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Live Readings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
            <Thermometer className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Live Temperature</p>
            <p className="text-xl font-bold font-mono text-foreground">{liveData.temperature}°C</p>
          </div>
          <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wider ${connected ? "text-success" : "text-muted-foreground"}`}>
            <Activity className="h-3 w-3 inline mr-1" />{connected ? "Live" : "Offline"}
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Live Humidity</p>
            <p className="text-xl font-bold font-mono text-foreground">{liveData.humidity}%</p>
          </div>
          <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wider ${connected ? "text-success" : "text-muted-foreground"}`}>
            <Activity className="h-3 w-3 inline mr-1" />{connected ? "Live" : "Offline"}
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${liveData.gas === "NO" ? "bg-success/15" : "bg-destructive/15"}`}>
            <Activity className={`h-5 w-5 ${liveData.gas === "NO" ? "text-success" : "text-destructive"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gas Sensor</p>
            <p className={`text-xl font-bold font-mono ${liveData.gas === "NO" ? "text-success" : "text-destructive"}`}>
              {liveData.gas === "NO" ? "Safe" : liveData.gas}
            </p>
          </div>
          <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wider ${connected ? "text-success" : "text-muted-foreground"}`}>
            <Activity className="h-3 w-3 inline mr-1" />{connected ? "Live" : "Offline"}
          </span>
        </motion.div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TIME_RANGES.map((tr, i) => (
          <button key={tr.label} onClick={() => setRange(i)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${range === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            <Clock className="h-3.5 w-3.5" /> {tr.label}
          </button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-3 sm:p-6 mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warning" /> Temperature History
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 16%)" />
              <XAxis dataKey="time" tick={{ fill: "hsl(220 12% 50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220 12% 50%)", fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="temperature" name="Temperature" stroke="hsl(38 95% 55%)" strokeWidth={2} dot={{ r: 3 }} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No temperature data in this range</div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-3 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-info" /> Humidity History
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 16%)" />
              <XAxis dataKey="time" tick={{ fill: "hsl(220 12% 50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220 12% 50%)", fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="humidity" name="Humidity" stroke="hsl(210 100% 60%)" strokeWidth={2} dot={{ r: 3 }} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No humidity data in this range</div>
        )}
      </motion.div>
    </div>
  );
};

export default DataHistory;
