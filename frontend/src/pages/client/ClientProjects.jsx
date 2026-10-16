import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import api from "../../services/api";
import { formatDate, priorityClass, priorityLabel, PROJECT_STATUSES, statusClass, statusLabel } from "../management/projectOptions";
import { cn } from "../../utils/cn";

const selectClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600";

export function ClientProjects() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/client/projects/list", { params: { search, status, page, limit } });
        if (cancelled) return;
        setRows(res.data.data || []);
        setTotal(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.pages || 1);
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.message || "Failed to load projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [search, status, page, limit]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My projects</h1>
        <p className="mt-1 text-sm text-slate-500">Projects linked to you, with the reporting manager and working team.</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search project..." className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <select className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Project", "Status", "Priority", "EOD", "Reporting manager", "Working team", ""].map((heading) => (
                  <th key={heading || "actions"} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No projects yet.</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusClass(row.status))}>{statusLabel(row.status)}</span></td>
                  <td className="px-4 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", priorityClass(row.priority))}>{priorityLabel(row.priority)}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDate(row.eod)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.reportingManager?.name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{(row.workingEmployees || []).map((person) => person.name).filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" title="View" onClick={() => navigate(`/dashboard/my-projects/${row._id}`)}>
                      <Eye className="h-4 w-4 text-slate-500" />
                    </Button>
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
