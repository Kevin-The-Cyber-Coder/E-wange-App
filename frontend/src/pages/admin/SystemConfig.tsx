import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, RotateCcw, Thermometer, Flame, Car, Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  thermometer: Thermometer,
  flame: Flame,
  car: Car,
  bell: Bell,
};

const colorMap: Record<string, string> = {
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  accent: "text-accent",
};

interface ConfigItem {
  key: string;
  current: any;
  label: string;
  description: string;
  type: "range" | "select" | "toggle" | "counter";
  group: string;
  group_icon: string;
  group_color: string;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  order: number;
}

interface ConfigGroup {
  title: string;
  icon: React.ElementType;
  color: string;
  items: ConfigItem[];
}

const SystemConfig = () => {
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [original, setOriginal] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasChanges = JSON.stringify(items.map(i => i.current)) !== JSON.stringify(original.map(i => i.current));

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("system_config").select("key, value");
      if (error) {
        toast.error("Failed to load configuration");
        setLoading(false);
        return;
      }
      const parsed: ConfigItem[] = (data || []).map((row: any) => {
        const v = row.value as any;
        return {
          key: row.key,
          current: v.current,
          label: v.label || row.key,
          description: v.description || "",
          type: v.type || "toggle",
          group: v.group || "General",
          group_icon: v.group_icon || "bell",
          group_color: v.group_color || "accent",
          options: v.options,
          min: v.min,
          max: v.max,
          unit: v.unit,
          order: v.order ?? 99,
        };
      }).sort((a, b) => a.order - b.order);

      setItems(parsed);
      setOriginal(JSON.parse(JSON.stringify(parsed)));
      setLoading(false);
    };
    fetch();
  }, []);

  const updateItem = (key: string, value: any) => {
    setItems(prev => prev.map(i => i.key === key ? { ...i, current: value } : i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = items.map(item => {
        // Rebuild the full value JSON, keeping metadata, updating current
        const orig = original.find(o => o.key === item.key);
        const fullValue: any = {
          current: item.current,
          label: item.label,
          description: item.description,
          type: item.type,
          group: item.group,
          group_icon: item.group_icon,
          group_color: item.group_color,
          order: item.order,
        };
        if (item.options) fullValue.options = item.options;
        if (item.min !== undefined) fullValue.min = item.min;
        if (item.max !== undefined) fullValue.max = item.max;
        if (item.unit) fullValue.unit = item.unit;

        return supabase
          .from("system_config")
          .update({ value: fullValue, updated_at: new Date().toISOString() })
          .eq("key", item.key);
      });
      await Promise.all(updates);
      setOriginal(JSON.parse(JSON.stringify(items)));
      toast.success("Configuration saved successfully");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setItems(JSON.parse(JSON.stringify(original)));
  };

  // Group items
  const groups: ConfigGroup[] = [];
  items.forEach(item => {
    let group = groups.find(g => g.title === item.group);
    if (!group) {
      group = {
        title: item.group,
        icon: iconMap[item.group_icon] || Bell,
        color: colorMap[item.group_color] || "text-accent",
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  });

  const renderControl = (item: ConfigItem) => {
    switch (item.type) {
      case "range":
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={item.min ?? 0}
              max={item.max ?? 100}
              value={Number(item.current)}
              onChange={(e) => updateItem(item.key, Number(e.target.value))}
              className="flex-1 accent-warning"
            />
            <span className="text-sm font-mono text-foreground w-14 text-right">
              {item.current}{item.unit || ""}
            </span>
          </div>
        );
      case "select":
        return (
          <div className="flex gap-2">
            {(item.options || []).map((opt) => (
              <button
                key={opt}
                onClick={() => updateItem(item.key, opt)}
                className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all ${
                  item.current === opt
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case "counter":
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateItem(item.key, Math.max(item.min ?? 0, Number(item.current) - 1))}
              className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-all"
            >
              −
            </button>
            <span className="text-lg font-mono text-foreground w-8 text-center">{item.current}</span>
            <button
              onClick={() => updateItem(item.key, Math.min(item.max ?? 99, Number(item.current) + 1))}
              className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-all"
            >
              +
            </button>
          </div>
        );
      case "toggle":
        return (
          <button
            onClick={() => updateItem(item.key, !item.current)}
            className={`w-12 h-7 rounded-full relative transition-all duration-300 ${
              item.current ? "bg-success" : "bg-muted"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-foreground absolute top-1 transition-all duration-300 ${
                item.current ? "left-6" : "left-1"
              }`}
            />
          </button>
        );
      default:
        return <span className="text-sm text-muted-foreground">{String(item.current)}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">System Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure thresholds and automation behavior</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-muted-foreground text-sm">No configuration items found. Add items via the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.08, duration: 0.4 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                  <group.icon className={`h-4.5 w-4.5 ${group.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              <div className="space-y-5">
                {group.items.map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    {renderControl(item)}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemConfig;
