import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ClipboardList, Edit2, Eye, Plus, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { RichText, plainRichText } from "../../components/ui/RichText";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { PROJECT_PRIORITIES, PROJECT_STATUSES, formatDate, priorityClass, priorityLabel, toDateInput } from "./projectOptions";
import { ProjectStatusControl } from "./ProjectStatus";
import { cn } from "../../utils/cn";

const selectClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600";

const emptyForm = {
  name: "",
  description: "",
  client: "",
  reportingManager: "",
  workingEmployees: [],
  priority: "MEDIUM",
  eod: "",
  remark: "",
};

const clientLabel = (client) => {
  if (!client) return "";
  return client.clientId ? `${client.name} (${client.clientId})` : client.name;
};

const names = (people) => (people || []).map((person) => person?.name).filter(Boolean);

export function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const seesAll = hasPermission(["VIEW_PROJECTS", "MANAGE_PROJECTS", "CREATE_PROJECTS", "EDIT_PROJECTS", "DELETE_PROJECTS"]);
  const canCreate = hasPermission("MANAGE_PROJECTS") || hasPermission("CREATE_PROJECTS");
  const canEdit = hasPermission("MANAGE_PROJECTS") || hasPermission("EDIT_PROJECTS");
  const canDelete = hasPermission("MANAGE_PROJECTS") || hasPermission("DELETE_PROJECTS");
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [reportingManager, setReportingManager] = useState("");
  const [employee, setEmployee] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [eod, setEod] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/projects/list", {
        params: { search, priority, status, reportingManager, employee, client: clientFilter, eod, page, limit },
      });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, priority, status, reportingManager, employee, clientFilter, eod, page, limit]);

  useEffect(() => {
    if (!seesAll && !canCreate && !canEdit) return undefined;
    const ids = [form.reportingManager, ...form.workingEmployees].filter(Boolean).join(",");
    const timer = setTimeout(() => {
      api.get("/admin/projects/employees", { params: { search: memberSearch, ids } })
        .then((res) => setPeople(res.data.data || []))
        .catch(() => toast.error("Failed to load employees"));
    }, 250);
    return () => clearTimeout(timer);
  }, [seesAll, canCreate, canEdit, memberSearch, form.reportingManager, form.workingEmployees]);

  useEffect(() => {
    if (!seesAll && !canCreate && !canEdit) return undefined;
    const ids = [form.client, clientFilter].filter(Boolean).join(",");
    const timer = setTimeout(() => {
      api.get("/admin/projects/clients", { params: { search: clientSearch, ids } })
        .then((res) => setClients(res.data.data || []))
        .catch(() => toast.error("Failed to load clients"));
    }, 250);
    return () => clearTimeout(timer);
  }, [seesAll, canCreate, canEdit, clientSearch, form.client, clientFilter]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const toggleEmployee = (id) => {
    setForm((current) => ({
      ...current,
      workingEmployees: current.workingEmployees.includes(id)
        ? current.workingEmployees.filter((item) => item !== id)
        : [...current.workingEmployees, id],
    }));
  };

  const openCreate = () => {
    setSelected(null);
    setMemberSearch("");
    setClientSearch("");
    setPickerOpen(false);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (row) => {
    setSelected(row);
    setMemberSearch("");
    setClientSearch("");
    setPickerOpen(false);
    setForm({
      name: row.name || "",
      description: row.description || "",
      client: row.client?._id || "",
      reportingManager: row.reportingManager?._id || "",
      workingEmployees: (row.workingEmployees || []).map((person) => person._id),
      priority: row.priority || "MEDIUM",
      eod: toDateInput(row.eod),
      remark: row.remark || "",
    });
    setShowForm(true);
  };

  useEffect(() => {
    const editId = location.state?.editId;
    if (!editId) return;
    const open = async () => {
      try {
        const res = await api.get(`/admin/projects/details/${editId}`);
        openEdit(res.data.data);
        navigate("/dashboard/projects", { replace: true, state: null });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to open project");
      }
    };
    open();
  }, [location.state]);

  const closeForm = () => {
    setShowForm(false);
    setSelected(null);
    setForm(emptyForm);
    setMemberSearch("");
    setClientSearch("");
    setPickerOpen(false);
  };

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onPointer = (event) => {
      if (!pickerRef.current?.contains(event.target)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [pickerOpen]);

  const options = useMemo(() => {
    const map = new Map(people.map((person) => [person._id, person]));
    const extras = [selected?.reportingManager, ...(selected?.workingEmployees || [])];
    extras.forEach((person) => {
      if (person?._id && !map.has(person._id)) map.set(person._id, person);
    });
    return [...map.values()];
  }, [people, selected]);

  const clientOptions = useMemo(() => {
    const map = new Map(clients.map((item) => [item._id, item]));
    if (selected?.client?._id && !map.has(selected.client._id)) map.set(selected.client._id, selected.client);
    return [...map.values()];
  }, [clients, selected]);

  const visibleMembers = options.filter((person) => person.name?.toLowerCase().includes(memberSearch.trim().toLowerCase()));

  const save = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Project name must be at least 2 characters");
      return;
    }
    if (!form.reportingManager) {
      toast.error("Select a reporting manager");
      return;
    }
    if (!form.workingEmployees.length) {
      toast.error("Select at least one working employee");
      return;
    }
    if (!form.eod) {
      toast.error("EOD is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: plainRichText(form.description) ? form.description : "",
      client: form.client || "",
      reportingManager: form.reportingManager,
      workingEmployees: form.workingEmployees,
      priority: form.priority,
      eod: form.eod,
      remark: form.remark.trim(),
    };

    try {
      setSaving(true);
      if (selected) {
        await api.patch(`/admin/projects/update/${selected._id}`, payload);
        toast.success("Project updated");
      } else {
        await api.post("/admin/projects/create", payload);
        toast.success("Project added");
      }
      closeForm();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete project ${row.name}?`)) return;
    try {
      await api.delete(`/admin/projects/${row._id}`);
      toast.success("Project deleted");
      if (selected?._id === row._id) closeForm();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete project");
    }
  };

  const workingLabel = (row) => {
    const list = names(row.workingEmployees);
    if (!list.length) return "—";
    if (list.length <= 2) return list.join(", ");
    return `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">{seesAll ? "Project name, who reports it, who is working, priority, and EOD." : "Projects where you are the reporting manager or a working employee."}</p>
        </div>
        {canCreate && !showForm && (
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add project</Button>
        )}
      </div>

      {showForm && (selected ? canEdit : canCreate) && (
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{selected ? "Edit project" : "Add project"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Project name *</label>
              <Input maxLength={120} value={form.name} onChange={(event) => setField("name", event.target.value)} disabled={saving} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Client</label>
              <Input className="mb-2" placeholder="Search client by name, id, email" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} disabled={saving} />
              <select className={selectClass} value={form.client} onChange={(event) => setField("client", event.target.value)} disabled={saving}>
                <option value="">No client</option>
                {clientOptions.map((item) => <option key={item._id} value={item._id}>{clientLabel(item)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reporting manager *</label>
              <Input className="mb-2" placeholder="Search by name" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} disabled={saving} />
              <select className={selectClass} value={form.reportingManager} onChange={(event) => setField("reportingManager", event.target.value)} disabled={saving}>
                <option value="">Select manager</option>
                {options.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority *</label>
              <select className={selectClass} value={form.priority} onChange={(event) => setField("priority", event.target.value)} disabled={saving}>
                {PROJECT_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">EOD *</label>
              <Input type="date" value={form.eod} onChange={(event) => setField("eod", event.target.value)} disabled={saving} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <RichText key={selected?._id || "new"} value={form.description} onChange={(value) => setField("description", value)} placeholder="What is this project about?" disabled={saving} />
          </div>

          <div ref={pickerRef} className="relative">
            <p className="mb-1 text-sm font-medium text-slate-700">Working employees *</p>
            <div className={cn("flex min-h-10 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm", saving && "opacity-50")}>
              <div className="flex max-h-16 min-w-0 flex-1 flex-wrap gap-1 overflow-auto" onClick={() => !saving && setPickerOpen(true)}>
                {form.workingEmployees.length === 0 ? (
                  <span className="text-slate-400">Select employees</span>
                ) : options.filter((person) => form.workingEmployees.includes(person._id)).map((person) => (
                  <span key={person._id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {person.name}
                    <button
                      type="button"
                      aria-label={`Remove ${person.name}`}
                      disabled={saving}
                      onClick={(event) => { event.stopPropagation(); toggleEmployee(person._id); }}
                      className="rounded-full text-emerald-500 hover:text-emerald-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button type="button" disabled={saving} aria-label="Choose employees" onClick={() => setPickerOpen((open) => !open)} className="shrink-0 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            {pickerOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                <Input placeholder="Search employees" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} disabled={saving} autoFocus />
                <div className="mt-2 max-h-48 overflow-auto">
                  {options.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">No active employees found.</p>
                  ) : visibleMembers.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">No employee matches that search.</p>
                  ) : visibleMembers.map((person) => (
                    <label key={person._id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" checked={form.workingEmployees.includes(person._id)} onChange={() => toggleEmployee(person._id)} disabled={saving} />
                      {person.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Remark</label>
            <textarea
              value={form.remark}
              maxLength={2000}
              rows={3}
              disabled={saving}
              onChange={(event) => setField("remark", event.target.value)}
              className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2 xl:col-span-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search project name or remark..." className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <select className={selectClass} value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }}>
          <option value="">All priorities</option>
          {PROJECT_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {seesAll && (
          <>
            <select className={selectClass} value={reportingManager} onChange={(event) => { setReportingManager(event.target.value); setPage(1); }}>
              <option value="">All reporting managers</option>
              {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
            <select className={selectClass} value={employee} onChange={(event) => { setEmployee(event.target.value); setPage(1); }}>
              <option value="">All working employees</option>
              {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
            <div>
              <Input className="mb-2" placeholder="Find client" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} />
              <select className={selectClass} value={clientFilter} onChange={(event) => { setClientFilter(event.target.value); setPage(1); }}>
                <option value="">All clients</option>
                {clientOptions.map((item) => <option key={item._id} value={item._id}>{clientLabel(item)}</option>)}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">EOD</label>
          <Input type="date" value={eod} onChange={(event) => { setEod(event.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Project", "Client", "Status", "Priority", "EOD", "Reporting manager", "Working", "Actions"].map((heading) => (
                  <th key={heading} className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500", heading === "Actions" && "text-right")}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-500">No projects found.</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <button type="button" className="text-left font-medium text-slate-900 hover:text-emerald-700" onClick={() => navigate(`/dashboard/projects/${row._id}`)}>{row.name}</button>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.client ? clientLabel(row.client) : "—"}</td>
                  <td className="px-4 py-3">
                    <ProjectStatusControl
                      project={row}
                      compact
                      onUpdated={(next) => setRows((current) => current.map((item) => item._id === row._id ? { ...item, ...next } : item))}
                    />
                  </td>
                  <td className="px-4 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", priorityClass(row.priority))}>{priorityLabel(row.priority)}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDate(row.eod)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.reportingManager?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{workingLabel(row)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Reports" onClick={() => navigate(`/dashboard/project-reports/${row._id}`, { state: { compose: true } })}><ClipboardList className="h-4 w-4 text-emerald-600" /></Button>
                      <Button variant="ghost" size="icon" title="View" onClick={() => navigate(`/dashboard/projects/${row._id}`)}><Eye className="h-4 w-4 text-slate-500" /></Button>
                      {canEdit && <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row)}><Edit2 className="h-4 w-4 text-slate-500" /></Button>}
                      {canDelete && <Button variant="ghost" size="icon" title="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
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
