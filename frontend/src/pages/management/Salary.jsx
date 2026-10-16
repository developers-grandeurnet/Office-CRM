import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "../../components/ui/Input";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const selectClass = "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-600";
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const showMoney = (value) => money.format(Number(value) || 0);

const defaultMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export function Salary() {
  const { user, hasPermission } = useAuth();
  const canManage = user?.userType === "ADMIN" || hasPermission("MANAGE_SALARY");
  const [params, setParams] = useSearchParams();
  const month = params.get("month") || defaultMonth();
  const employee = params.get("employee") || "";
  const scope = !canManage || params.get("scope") === "mine" ? "mine" : "all";
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [people, setPeople] = useState([]);
  const [personSearch, setPersonSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const setQuery = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next);
  };

  useEffect(() => {
    if (!canManage || scope !== "all") return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get("/admin/salary/employees", { params: { search: personSearch, ids: employee } })
        .then((res) => { if (!cancelled) setPeople(res.data.data || []); })
        .catch(() => { if (!cancelled) toast.error("Failed to load employees"); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [canManage, scope, personSearch, employee]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/salary", {
          params: { month, employee: scope === "all" ? employee : "", scope },
        });
        if (!cancelled) {
          setRows(res.data.data || []);
          setMeta(res.data.meta || null);
        }
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.message || "Failed to load salary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [month, employee, scope]);

  const totalPayable = rows.reduce((sum, row) => sum + (Number(row.payable) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <IndianRupee className="h-7 w-7 text-sky-600" />
          Salary
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Calculated from punch attendance and approved leave for the selected month.
        </p>
        {meta?.formula && <p className="mt-1 text-xs text-slate-400">{meta.formula}</p>}
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        {canManage && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="salary-scope">Report</label>
            <select
              id="salary-scope"
              className={selectClass}
              value={scope}
              onChange={(event) => setQuery({ scope: event.target.value === "mine" ? "mine" : "", employee: "" })}
            >
              <option value="all">Everyone</option>
              <option value="mine">My salary</option>
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="salary-month">Month</label>
          <Input id="salary-month" type="month" value={month} onChange={(event) => setQuery({ month: event.target.value })} />
        </div>
        {canManage && scope === "all" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="salary-employee">Employee</label>
            <Input className="mb-2" placeholder="Search name" value={personSearch} onChange={(event) => setPersonSearch(event.target.value)} />
            <select id="salary-employee" className={selectClass} value={employee} onChange={(event) => setQuery({ employee: event.target.value })}>
              <option value="">All</option>
              {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
          </div>
        )}
        <div className="rounded-lg bg-sky-50 px-3 py-2">
          <p className="text-xs font-medium text-sky-700">Working days in month</p>
          <p className="text-lg font-semibold text-sky-900">{meta?.workingDays ?? "—"}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{rows.length} employee{rows.length === 1 ? "" : "s"}</p>
          <p className="text-sm font-semibold text-slate-900">Total payable {showMoney(totalPayable)}</p>
        </div>
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No employees found for this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Base salary</th>
                  <th className="px-4 py-3 font-semibold">Present</th>
                  <th className="px-4 py-3 font-semibold">Paid leave</th>
                  <th className="px-4 py-3 font-semibold">Absent</th>
                  <th className="px-4 py-3 font-semibold">Per day</th>
                  <th className="px-4 py-3 font-semibold">Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.employee._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.employee.name}</p>
                      <p className="text-xs text-slate-500">{row.employee.employeeId || row.employee.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.hasSalary ? showMoney(row.monthlySalary) : <span className="text-amber-700">Not set</span>}</td>
                    <td className="px-4 py-3 text-slate-700">{row.presentDays}</td>
                    <td className="px-4 py-3 text-slate-700">{row.paidLeaveDays}</td>
                    <td className="px-4 py-3 text-slate-700">{row.absentDays}</td>
                    <td className="px-4 py-3 text-slate-700">{showMoney(row.perDay)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{showMoney(row.payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
