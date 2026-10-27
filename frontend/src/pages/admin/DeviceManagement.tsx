import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Search, X, Cpu, Power, Shield, Eye } from "lucide-react";
import { database, ref, onValue, set } from "@/lib/firebase";
import { toast } from "sonner";

interface Device {
  id: string;
  name: string;
  label: string;
  type: "relay" | "sensor";
  firebaseKey: string;
  enabled: boolean;
  controlPermission: "admin" | "all";
  state: string;
}

const DeviceManagement = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    label: "",
    type: "relay" as "relay" | "sensor",
    firebaseKey: "",
    controlPermission: "all" as "admin" | "all",
  });

  useEffect(() => {
    const devicesRef = ref(database, "/devices");
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list: Device[] = Object.entries(val).map(([id, d]: [string, any]) => ({
          id,
          name: d.name || id,
          label: d.label || id,
          type: d.type || "relay",
          firebaseKey: d.firebaseKey || id,
          enabled: d.enabled !== false,
          controlPermission: d.controlPermission || "all",
          state: d.state || "OFF",
        }));
        setDevices(list);
      } else {
        setDevices([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const filtered = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.label.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditDevice(null);
    setForm({ name: "", label: "", type: "relay", firebaseKey: "", controlPermission: "all" });
    setModalOpen(true);
  };

  const openEdit = (d: Device) => {
    setEditDevice(d);
    setForm({ name: d.name, label: d.label, type: d.type, firebaseKey: d.firebaseKey, controlPermission: d.controlPermission });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.firebaseKey) {
      toast.error("Name and Firebase key are required");
      return;
    }
    try {
      const id = editDevice ? editDevice.id : form.firebaseKey.replace(/[.#$/[\]]/g, "_");
      const deviceData = {
        name: form.name,
        label: form.label || form.name,
        type: form.type,
        firebaseKey: form.firebaseKey,
        enabled: editDevice ? editDevice.enabled : true,
        controlPermission: form.controlPermission,
        state: editDevice ? editDevice.state : (form.type === "relay" ? "OFF" : "—"),
      };
      await set(ref(database, `/devices/${id}`), deviceData);
      toast.success(editDevice ? "Device updated" : "Device added");
      setModalOpen(false);
    } catch {
      toast.error("Failed to save device");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await set(ref(database, `/devices/${id}`), null);
      toast.success("Device deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete device");
    }
  };

  const toggleEnabled = async (d: Device) => {
    await set(ref(database, `/devices/${d.id}/enabled`), !d.enabled);
    toast.success(`Device ${!d.enabled ? "enabled" : "disabled"}`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Device Management</h2>
          <p className="text-sm text-muted-foreground">{devices.length} devices configured</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all">
          <Plus className="h-4 w-4" /> Add Device
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 rounded-xl bg-secondary border border-border pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Firebase Key</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Permission</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((d) => (
                  <motion.tr key={d.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{d.label}</p>
                          <p className="text-[11px] text-muted-foreground">{d.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-mono px-2.5 py-1 rounded-lg ${d.type === "relay" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>{d.type}</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{d.firebaseKey}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg ${d.controlPermission === "admin" ? "bg-accent/15 text-accent" : "bg-info/15 text-info"}`}>
                        {d.controlPermission === "admin" ? <Shield className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {d.controlPermission}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleEnabled(d)} className="cursor-pointer">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg ${d.enabled ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                          <Power className="h-3 w-3" />
                          {d.enabled ? "enabled" : "disabled"}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(d)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-info/15 text-muted-foreground hover:text-info flex items-center justify-center transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(d.id)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No devices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        <AnimatePresence>
          {filtered.map((d) => (
            <motion.div key={d.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.label}</p>
                    <p className="text-[11px] text-muted-foreground">{d.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(d)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-info/15 text-muted-foreground hover:text-info flex items-center justify-center transition-all">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(d.id)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs font-mono px-2.5 py-1 rounded-lg ${d.type === "relay" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>{d.type}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-lg ${d.controlPermission === "admin" ? "bg-accent/15 text-accent" : "bg-info/15 text-info"}`}>
                  {d.controlPermission === "admin" ? <Shield className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {d.controlPermission}
                </span>
                <button onClick={() => toggleEnabled(d)}>
                  <span className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-lg ${d.enabled ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    <Power className="h-3 w-3" />
                    {d.enabled ? "enabled" : "disabled"}
                  </span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-2">Key: {d.firebaseKey}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">No devices found</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">{editDevice ? "Edit Device" : "Add Device"}</h3>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Living Room Lamp" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Label</label>
                  <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Lamp" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Firebase Key</label>
                  <input type="text" value={form.firebaseKey} onChange={(e) => setForm({ ...form, firebaseKey: e.target.value })} disabled={!!editDevice} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50" placeholder="lamp" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Type</label>
                  <div className="flex gap-3">
                    {(["relay", "sensor"] as const).map((type) => (
                      <button key={type} onClick={() => setForm({ ...form, type })} className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${form.type === type ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                        {type === "relay" ? <Power className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Control Permission</label>
                  <div className="flex gap-3">
                    {(["all", "admin"] as const).map((perm) => (
                      <button key={perm} onClick={() => setForm({ ...form, controlPermission: perm })} className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${form.controlPermission === perm ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                        {perm === "admin" ? <Shield className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {perm === "all" ? "All Users" : "Admin Only"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all">Cancel</button>
                <button onClick={handleSave} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all">
                  {editDevice ? "Update" : "Add Device"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Device?</h3>
              <p className="text-sm text-muted-foreground mb-6">This will remove the device from the system.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeviceManagement;
