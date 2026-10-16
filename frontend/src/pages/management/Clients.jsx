import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Edit2, Eye, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const emptyAddress = { street: "", city: "", state: "", pincode: "", landmark: "" };

const digits = (value, max) => value.replace(/\D/g, "").slice(0, max);

export function Clients() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("MANAGE_CLIENTS") || hasPermission("CREATE_CLIENTS");
  const canEdit = hasPermission("MANAGE_CLIENTS") || hasPermission("EDIT_CLIENTS");
  const canDelete = hasPermission("MANAGE_CLIENTS") || hasPermission("DELETE_CLIENTS");
  const [rows, setRows] = useState([]);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    password: "",
    address: emptyAddress,
    remark: "",
    services: [],
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/clients/list", { params: { search, page, limit } });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, page, limit]);

  useEffect(() => {
    const editId = location.state?.editId;
    if (!editId) return;
    const open = async () => {
      try {
        const res = await api.get(`/admin/clients/details/${editId}`);
        openEdit(res.data.data);
        navigate("/dashboard/clients", { replace: true, state: null });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to open client");
      }
    };
    open();
  }, [location.state]);

  useEffect(() => {
    api.get("/admin/services/list", { params: { limit: 100 } })
      .then((res) => setServiceOptions(res.data.data || []))
      .catch(() => toast.error("Failed to load services"));
  }, []);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const setAddress = (name, value) => setForm((current) => ({ ...current, address: { ...current.address, [name]: value } }));

  const openCreate = () => {
    setSelected(null);
    setForm({ name: "", email: "", phone: "", whatsapp: "", password: "", address: { ...emptyAddress }, remark: "", services: [] });
    setShowForm(true);
  };

  const openEdit = (row) => {
    setSelected(row);
    setForm({
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      whatsapp: row.whatsapp || "",
      password: "",
      address: { ...emptyAddress, ...(row.address || {}) },
      remark: row.remark || "",
      services: (row.services || []).map((service) => service._id),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelected(null);
  };

  const toggleService = (id) => {
    setForm((current) => ({
      ...current,
      services: current.services.includes(id)
        ? current.services.filter((item) => item !== id)
        : [...current.services, id],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Client name must be at least 2 characters");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      toast.error("Email is required for client login");
      return;
    }
    if (!/^[0-9]{10}$/.test(form.phone)) {
      toast.error("Phone number must be 10 digits");
      return;
    }
    if (form.whatsapp && !/^[0-9]{10}$/.test(form.whatsapp)) {
      toast.error("WhatsApp number must be 10 digits");
      return;
    }
    if (!selected && form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (selected && form.password && form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.address.pincode && !/^[0-9]{6}$/.test(form.address.pincode)) {
      toast.error("Pincode must be 6 digits");
      return;
    }
    if (!form.services.length) {
      toast.error("Select at least one service");
      return;
    }

    try {
      setSaving(true);
      const payload = { ...form };
      if (selected && !payload.password) delete payload.password;
      if (selected) {
        await api.patch(`/admin/clients/update/${selected._id}`, payload);
        toast.success("Client updated");
      } else {
        const res = await api.post("/admin/clients/create", payload);
        toast.success(res.data.message || "Client created");
      }
      closeForm();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/clients/${row._id}`);
      toast.success("Client deleted");
      if (selected?._id === row._id) closeForm();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete client");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">Client details and the services they take.</p>
        </div>
        {canCreate && !showForm && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add client
          </Button>
        )}
      </div>

      {showForm && (selected ? canEdit : canCreate) && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{selected ? "Edit client" : "Add client"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client name *</label>
              <Input value={form.name} maxLength={120} onChange={(event) => setField("name", event.target.value)} disabled={saving} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
              <Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} disabled={saving} />
              <p className="mt-1 text-xs text-slate-500">Login id for the client. Welcome mail goes here.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone number *</label>
              <Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(event) => setField("phone", digits(event.target.value, 10))} disabled={saving} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp number</label>
              <Input inputMode="numeric" maxLength={10} value={form.whatsapp} onChange={(event) => setField("whatsapp", digits(event.target.value, 10))} disabled={saving} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{selected ? "New password" : "Password *"}</label>
              <Input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} disabled={saving} autoComplete="new-password" />
              <p className="mt-1 text-xs text-slate-500">{selected ? "Leave blank to keep the current password." : "Sent on email with the welcome message. Min 6 characters."}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Address</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Street" value={form.address.street} maxLength={200} onChange={(event) => setAddress("street", event.target.value)} disabled={saving} />
              <Input placeholder="Landmark" value={form.address.landmark} maxLength={120} onChange={(event) => setAddress("landmark", event.target.value)} disabled={saving} />
              <Input placeholder="City" value={form.address.city} maxLength={80} onChange={(event) => setAddress("city", event.target.value)} disabled={saving} />
              <Input placeholder="State" value={form.address.state} maxLength={80} onChange={(event) => setAddress("state", event.target.value)} disabled={saving} />
              <Input placeholder="Pincode" inputMode="numeric" maxLength={6} value={form.address.pincode} onChange={(event) => setAddress("pincode", digits(event.target.value, 6))} disabled={saving} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Remark / extra note</label>
            <textarea
              value={form.remark}
              maxLength={2000}
              rows={3}
              disabled={saving}
              onChange={(event) => setField("remark", event.target.value)}
              className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Services *</p>
            {serviceOptions.length === 0 ? (
              <p className="text-sm text-slate-500">Add a service first.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {serviceOptions.map((service) => (
                  <label key={service._id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.services.includes(service._id)}
                      onChange={() => toggleService(service._id)}
                      disabled={saving}
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search name, email, or phone..." className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Services</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No clients found.</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm">
                    <button type="button" className="text-left font-medium text-slate-900 hover:text-emerald-700" onClick={() => navigate(`/dashboard/clients/${row._id}`)}>{row.name}</button>
                    {row.clientId && <div className="text-xs text-slate-400">{row.clientId}</div>}
                    {row.email && <div className="text-slate-500">{row.email}</div>}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{row.phone}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{(row.services || []).map((service) => service.name).join(", ") || "—"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" title="View" onClick={() => navigate(`/dashboard/clients/${row._id}`)}>
                        <Eye className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row)}>
                          <Edit2 className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(row)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pages={totalPages} limit={limit} total={total} onPage={setPage} onLimit={(size) => { setLimit(size); setPage(1); }} />
      </div>
    </div>
  );
}
