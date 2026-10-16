import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatDateTime } from "./leadOptions";

const selectClass = "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600";

const shotTime = (shot) => (shot?.at ? formatDateTime(shot.at) : "—");

export function AttendanceReport() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";
  const [params, setParams] = useSearchParams();
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const employee = params.get("employee") || "";
  const status = params.get("status") || "";
  const scope = !isAdmin || params.get("scope") === "mine" ? "mine" : "all";
  const page = Math.max(parseInt(params.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(params.get("limit") || "10", 10) || 10, 1), 100);
  const [payload, setPayload] = useState(null);
  const [people, setPeople] = useState([]);
  const [personSearch, setPersonSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const setQuery = (patch, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete("page");
    setParams(next);
  };

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get("/admin/attendance/employees", { params: { search: personSearch, ids: employee } })
        .then((res) => { if (!cancelled) setPeople(res.data.data || []); })
        .catch(() => { if (!cancelled) toast.error("Failed to load employees"); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isAdmin, personSearch, employee]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/attendance", {
          params: { from, to, employee: scope === "all" ? employee : "", status, scope, page, limit },
        });
        if (!cancelled) setPayload(res.data);
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.message || "Failed to load the attendance report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [from, to, employee, status, scope, page, limit]);

  const rows = payload?.data || [];
  const showPeople = scope === "all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance report</h1>
        <p className="mt-1 text-sm text-slate-500">{isAdmin ? "Every employee's punch in and punch out. Filters stay in the page address." : "Your punch in and punch out. Filters stay in the page address."}</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        {isAdmin && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="attendance-scope">Report</label>
            <select id="attendance-scope" className={selectClass} value={scope} onChange={(event) => setQuery({ scope: event.target.value === "mine" ? "mine" : "", employee: "" })}>
              <option value="all">Everyone</option>
              <option value="mine">My attendance</option>
            </select>
          </div>
        )}
        {showPeople && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="attendance-employee">Employee</label>
            <Input className="mb-2" placeholder="Search name" value={personSearch} onChange={(event) => setPersonSearch(event.target.value)} />
            <select id="attendance-employee" className={selectClass} value={employee} onChange={(event) => setQuery({ employee: event.target.value })}>
              <option value="">All</option>
              {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="attendance-status">Punch</label>
          <select id="attendance-status" className={selectClass} value={status} onChange={(event) => setQuery({ status: event.target.value })}>
            <option value="">All</option>
            <option value="open">Punch in only</option>
            <option value="complete">Punch in and out</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <Input type="date" value={from} onChange={(event) => setQuery({ from: event.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <Input type="date" value={to} onChange={(event) => setQuery({ to: event.target.value })} />
        </div>
      </div>

      {payload?.summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Records</p><p className="mt-1 text-xl font-semibold text-slate-900">{payload.summary.records}</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Punch in only</p><p className="mt-1 text-xl font-semibold text-slate-900">{payload.summary.open}</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Completed</p><p className="mt-1 text-xl font-semibold text-slate-900">{payload.summary.complete}</p></div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {showPeople && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Employee</th>}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Punch in</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">In photo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Punch out</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Out photo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={showPeople ? 8 : 7} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : !rows.length ? (
                <tr><td colSpan={showPeople ? 8 : 7} className="px-4 py-8 text-center text-slate-500">No attendance in this filter.</td></tr>
              ) : rows.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50">
                  {showPeople && <td className="px-4 py-3 text-sm text-slate-700">{row.user?.name || "—"}{row.user?.designation ? <span className="block text-xs text-slate-500">{row.user.designation}</span> : null}</td>}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDate(row.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{shotTime(row.punchIn)}</td>
                  <td className="px-4 py-3">{row.punchIn?.photoUrl ? <a href={row.punchIn.photoUrl} target="_blank" rel="noopener noreferrer"><img src={row.punchIn.photoUrl} alt="Punch in photo" className="h-12 w-12 rounded-md object-cover" /></a> : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{shotTime(row.punchOut)}</td>
                  <td className="px-4 py-3">{row.punchOut?.photoUrl ? <a href={row.punchOut.photoUrl} target="_blank" rel="noopener noreferrer"><img src={row.punchOut.photoUrl} alt="Punch out photo" className="h-12 w-12 rounded-md object-cover" /></a> : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.hours}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.punchIn ? `${row.punchIn.distanceMeters} m` : "—"}{row.punchOut ? ` / ${row.punchOut.distanceMeters} m` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payload?.pagination && (
          <Pager
            page={payload.pagination.page}
            pages={payload.pagination.pages}
            limit={payload.pagination.limit}
            total={payload.pagination.total}
            onPage={(next) => setQuery({ page: next }, false)}
            onLimit={(size) => setQuery({ limit: size })}
          />
        )}
      </div>
    </div>
  );
}
