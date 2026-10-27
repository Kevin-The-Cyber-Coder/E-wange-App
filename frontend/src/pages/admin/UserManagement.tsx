import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Search, X, Shield, Eye, UserPlus, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { database, ref, onValue, set, push } from "@/lib/firebase";
import { remove } from "firebase/database";
import { toast } from "sonner";

interface DashboardUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface FirebaseUser {
  key: string;
  name: string;
  id: string;
}

const UserManagement = () => {
  // Supabase users state
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<DashboardUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" as "admin" | "viewer" });
  const [saving, setSaving] = useState(false);

  // Firebase device users state
  const [fbUsers, setFbUsers] = useState<FirebaseUser[]>([]);
  const [fbModalOpen, setFbModalOpen] = useState(false);
  const [fbEditUser, setFbEditUser] = useState<FirebaseUser | null>(null);
  const [fbDeleteConfirm, setFbDeleteConfirm] = useState<string | null>(null);
  const [fbForm, setFbForm] = useState({ name: "", id: "" });
  const [fbSaving, setFbSaving] = useState(false);
  const [fbSearch, setFbSearch] = useState("");

  // Fetch Supabase users
  const fetchUsers = async () => {
    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action: "list_users" },
    });
    if (!error && data?.users) setUsers(data.users);
  };

  useEffect(() => { fetchUsers(); }, []);

  // Listen to Firebase users
  useEffect(() => {
    const usersRef = ref(database, "users");
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FirebaseUser[] = Object.entries(data).map(([key, val]: [string, any]) => ({
          key,
          name: typeof val === "object" ? (val.name || "") : String(val),
          id: key,
        }));
        setFbUsers(list);
      } else {
        setFbUsers([]);
      }
    });
    return () => unsub();
  }, []);

  // --- Supabase user handlers ---
  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "viewer" });
    setModalOpen(true);
  };

  const openEdit = (u: DashboardUser) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role as "admin" | "viewer" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error("Please fill in all fields"); return; }
    setSaving(true);
    try {
      if (editUser) {
        const { error } = await supabase.functions.invoke("admin-api", {
          body: { action: "update_user", user_id: editUser.user_id, name: form.name, email: form.email, role: form.role, status: editUser.status },
        });
        if (error) throw error;
        toast.success("User updated successfully");
      } else {
        if (!form.password) { toast.error("Password required"); setSaving(false); return; }
        const { data, error } = await supabase.functions.invoke("admin-api", {
          body: { action: "create_user", email: form.email, password: form.password, name: form.name, role: form.role },
        });
        if (error) throw error;
        if (data?.error) { toast.error(data.error); setSaving(false); return; }
        toast.success("User created successfully");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to save user");
    } finally { setSaving(false); }
  };

  const handleDelete = async (userId: string) => {
    try {
      await supabase.functions.invoke("admin-api", { body: { action: "delete_user", user_id: userId } });
      toast.success("User deleted");
      setDeleteConfirm(null);
      fetchUsers();
    } catch { toast.error("Failed to delete user"); }
  };

  const toggleStatus = async (u: DashboardUser) => {
    const newStatus = u.status === "active" ? "disabled" : "active";
    await supabase.functions.invoke("admin-api", {
      body: { action: "update_user", user_id: u.user_id, name: u.name, email: u.email, role: u.role, status: newStatus },
    });
    toast.success(`User ${newStatus === "active" ? "enabled" : "disabled"}`);
    fetchUsers();
  };

  // --- Firebase device user handlers ---
  const fbFiltered = fbUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(fbSearch.toLowerCase()) ||
      u.id?.toLowerCase().includes(fbSearch.toLowerCase())
  );

  const openFbCreate = () => {
    setFbEditUser(null);
    setFbForm({ name: "", id: "" });
    setFbModalOpen(true);
  };

  const openFbEdit = (u: FirebaseUser) => {
    setFbEditUser(u);
    setFbForm({ name: u.name, id: u.id });
    setFbModalOpen(true);
  };

  const handleFbSave = async () => {
    if (!fbForm.name.trim() || !fbForm.id.trim()) { toast.error("Please fill in name and ID number"); return; }
    setFbSaving(true);
    try {
      if (fbEditUser) {
        // If ID changed, remove old key and create new one
        if (fbEditUser.key !== fbForm.id.trim()) {
          await remove(ref(database, `users/${fbEditUser.key}`));
        }
        await set(ref(database, `users/${fbForm.id.trim()}`), { name: fbForm.name.trim() });
        toast.success("Device user updated");
      } else {
        await set(ref(database, `users/${fbForm.id.trim()}`), { name: fbForm.name.trim() });
        toast.success("Device user created");
      }
      setFbModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save device user");
    } finally { setFbSaving(false); }
  };

  const handleFbDelete = async (key: string) => {
    try {
      await remove(ref(database, `users/${key}`));
      toast.success("Device user deleted");
      setFbDeleteConfirm(null);
    } catch { toast.error("Failed to delete device user"); }
  };

  return (
    <div className="space-y-10">
      {/* ===== DEVICE USERS (Firebase) ===== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Device Users</h2>
            <p className="text-sm text-muted-foreground">{fbUsers.length} registered device users</p>
          </div>
          <button onClick={openFbCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-all">
            <UserPlus className="h-4 w-4" /> Add Device User
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search device users..." value={fbSearch} onChange={(e) => setFbSearch(e.target.value)}
            className="w-full h-11 rounded-xl bg-secondary border border-border pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ID Number</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {fbFiltered.map((u) => (
                  <motion.tr key={u.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{u.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{u.id}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openFbEdit(u)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-info/15 text-muted-foreground hover:text-info flex items-center justify-center transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setFbDeleteConfirm(u.key)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {fbFiltered.length === 0 && (
                <tr><td colSpan={3} className="text-center py-12 text-sm text-muted-foreground">No device users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          <AnimatePresence>
            {fbFiltered.map((u) => (
              <motion.div key={u.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1"><Hash className="h-3 w-3" />{u.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openFbEdit(u)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-info/15 text-muted-foreground hover:text-info flex items-center justify-center transition-all">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setFbDeleteConfirm(u.key)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {fbFiltered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No device users found</div>
          )}
        </div>
      </div>

      {/* ===== SYSTEM USERS (Supabase) ===== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">System Users</h2>
            <p className="text-sm text-muted-foreground">{users.length} registered system users</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4" /> Add System User
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search system users..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-xl bg-secondary border border-border pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((u) => (
                    <motion.tr key={u.user_id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-foreground">{u.name}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg ${u.role === "admin" ? "bg-accent/15 text-accent" : "bg-info/15 text-info"}`}>
                          {u.role === "admin" ? <Shield className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => toggleStatus(u)} className="cursor-pointer">
                          <span className={`text-xs font-mono px-2.5 py-1 rounded-lg ${u.status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{u.status}</span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-info/15 text-muted-foreground hover:text-info flex items-center justify-center transition-all">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(u.user_id)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          <AnimatePresence>
            {filtered.map((u) => (
              <motion.div key={u.user_id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-info/15 text-muted-foreground hover:text-info flex items-center justify-center transition-all">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(u.user_id)} className="w-8 h-8 rounded-lg bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-lg ${u.role === "admin" ? "bg-accent/15 text-accent" : "bg-info/15 text-info"}`}>
                    {u.role === "admin" ? <Shield className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {u.role}
                  </span>
                  <button onClick={() => toggleStatus(u)}>
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-lg ${u.status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{u.status}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No users found</div>
          )}
        </div>
      </div>

      {/* ===== Supabase Create/Edit Modal ===== */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">{editUser ? "Edit System User" : "Create System User"}</h3>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="user@ewange.com" />
                </div>
                {!editUser && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Password</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="••••••••" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Role</label>
                  <div className="flex gap-3">
                    {(["admin", "viewer"] as const).map((role) => (
                      <button key={role} onClick={() => setForm({ ...form, role })} className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${form.role === role ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                        {role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalOpen(false)} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                  {saving ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto" /> : editUser ? "Update" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Firebase Device User Create/Edit Modal ===== */}
      <AnimatePresence>
        {fbModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFbModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">{fbEditUser ? "Edit Device User" : "Add Device User"}</h3>
                <button onClick={() => setFbModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Name</label>
                  <input type="text" value={fbForm.name} onChange={(e) => setFbForm({ ...fbForm, name: e.target.value })} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">ID Number</label>
                  <input type="text" value={fbForm.id} onChange={(e) => setFbForm({ ...fbForm, id: e.target.value })} className="w-full h-11 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. 12345678" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setFbModalOpen(false)} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all">Cancel</button>
                <button onClick={handleFbSave} disabled={fbSaving} className="flex-1 h-11 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-50">
                  {fbSaving ? <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin mx-auto" /> : fbEditUser ? "Update" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Supabase Delete Confirmation ===== */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete System User?</h3>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Firebase Delete Confirmation ===== */}
      <AnimatePresence>
        {fbDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFbDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Device User?</h3>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setFbDeleteConfirm(null)} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-all">Cancel</button>
                <button onClick={() => handleFbDelete(fbDeleteConfirm)} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
