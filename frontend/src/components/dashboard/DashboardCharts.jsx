import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE = ["#0284c7", "#7c3aed", "#d97706", "#e11d48", "#db2777", "#ea580c", "#2563eb", "#c026d3", "#f59e0b", "#6366f1"];
const DEPT = ["#0284c7", "#7c3aed", "#d97706", "#e11d48", "#db2777", "#ea580c", "#2563eb", "#c026d3", "#f59e0b", "#6366f1"];

export function Panel({ title, subtitle, action, children, accent = "from-slate-50 to-white" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br ${accent} shadow-sm`}>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

export function EmptyChart({ children }) {
  return <p className="flex h-48 items-center justify-center text-center text-sm text-slate-500">{children}</p>;
}

function RangeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white/80 p-0.5 text-xs font-medium shadow-sm">
      {[7, 30].map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
          className={`rounded-md px-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 ${value === days ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
        >
          {days} days
        </button>
      ))}
    </div>
  );
}

const tipStyle = {
  border: "none",
  borderRadius: 12,
  fontSize: 12,
  color: "#0f172a",
  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
  background: "#fff",
};

const axisTick = { fontSize: 11, fill: "#64748b" };
const axisLabel = { fill: "#94a3b8", fontSize: 11 };

export function AttendanceChart({ series }) {
  const [days, setDays] = useState(7);
  const rows = (series || []).slice(-days);
  const empty = rows.every((row) => !row.present && !row.onLeave);
  return (
    <Panel
      title="Attendance"
      subtitle="Present vs approved leave over time. X = date, Y = people."
      action={<RangeToggle value={days} onChange={setDays} />}
      accent="from-sky-50 via-white to-violet-50"
    >
      {empty ? <EmptyChart>No attendance or approved leave in this period.</EmptyChart> : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="leaveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                interval="preserveStartEnd"
                label={{ value: "Date", position: "insideBottom", offset: -2, ...axisLabel }}
              />
              <YAxis
                allowDecimals={false}
                tick={axisTick}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                label={{ value: "People", angle: -90, position: "insideLeft", offset: 8, ...axisLabel }}
                width={42}
              />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="present" name="Punched in" stroke="#0284c7" strokeWidth={2.5} fill="url(#presentFill)" activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="onLeave" name="On leave" stroke="#7c3aed" strokeWidth={2.5} fill="url(#leaveFill)" activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function WorkforceChart({ rows }) {
  const navigate = useNavigate();
  if (!rows?.length) return <Panel title="Departments" accent="from-sky-50 via-white to-cyan-50"><EmptyChart>No active employees yet.</EmptyChart></Panel>;
  return (
    <Panel title="Workforce by department" subtitle="X = headcount, Y = department. Click a bar to open that team." accent="from-sky-50 via-white to-cyan-50">
      <div style={{ height: Math.max(240, rows.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 20 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={axisTick}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={{ stroke: "#cbd5e1" }}
              label={{ value: "Employees", position: "insideBottom", offset: -8, ...axisLabel }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={118}
              tick={{ fontSize: 12, fill: "#334155" }}
              tickFormatter={(value) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
            />
            <Tooltip contentStyle={tipStyle} formatter={(value, _name, item) => [`${value} · ${item.payload.percent}%`, "Employees"]} />
            <Bar
              dataKey="count"
              radius={[0, 8, 8, 0]}
              barSize={16}
              cursor="pointer"
              onClick={(entry) => {
                const id = entry?.id || entry?.payload?.id;
                if (id) navigate(`/dashboard/employees?department=${id}`);
              }}
            >
              {rows.map((row, index) => (
                <Cell key={row.id || row.name} fill={DEPT[index % DEPT.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function CompositionChart({ employeeTypes, workModes }) {
  const hasTypes = employeeTypes?.length > 0;
  const hasModes = workModes?.length > 0;
  const [kind, setKind] = useState(hasTypes ? "type" : "mode");
  const rows = kind === "type" ? employeeTypes : workModes;
  if (!hasTypes && !hasModes) {
    return <Panel title="Employee mix" accent="from-violet-50 via-white to-fuchsia-50"><EmptyChart>No employee type or work mode is assigned yet.</EmptyChart></Panel>;
  }
  return (
    <Panel
      title="Employee mix"
      subtitle="Share of active employees."
      accent="from-violet-50 via-white to-fuchsia-50"
      action={hasTypes && hasModes ? (
        <div className="inline-flex rounded-lg border border-slate-200 bg-white/80 p-0.5 text-xs font-medium shadow-sm">
          {[["type", "Type"], ["mode", "Work mode"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              className={`rounded-md px-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700 ${kind === id ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="count" nameKey="name" innerRadius={54} outerRadius={90} paddingAngle={3} stroke="#fff" strokeWidth={2}>
              {rows.map((row, index) => <Cell key={row.id || row.name} fill={PIE[index % PIE.length]} />)}
            </Pie>
            <Tooltip contentStyle={tipStyle} formatter={(value, _name, item) => [`${value} · ${item.payload.percent}%`, item.payload.name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function LeaveChart({ leave }) {
  const [days, setDays] = useState(7);
  const rows = (leave?.series || []).slice(-days);
  const empty = rows.every((row) => !row.pending && !row.approved && !row.rejected);
  const totals = rows.reduce((sum, row) => ({
    pending: sum.pending + row.pending,
    approved: sum.approved + row.approved,
    rejected: sum.rejected + row.rejected,
  }), { pending: 0, approved: 0, rejected: 0 });
  return (
    <Panel
      title="Leave requests"
      subtitle="X = date, Y = requests. Stacked by status."
      action={<RangeToggle value={days} onChange={setDays} />}
      accent="from-amber-50 via-white to-orange-50"
    >
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">Pending {totals.pending}</span>
        <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-800">Approved {totals.approved}</span>
        <span className="rounded-full bg-rose-100 px-2.5 py-1 font-medium text-rose-800">Rejected {totals.rejected}</span>
      </div>
      {empty ? <EmptyChart>No leave requests in this period.</EmptyChart> : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                interval="preserveStartEnd"
                label={{ value: "Date", position: "insideBottom", offset: -2, ...axisLabel }}
              />
              <YAxis
                allowDecimals={false}
                tick={axisTick}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                label={{ value: "Requests", angle: -90, position: "insideLeft", offset: 8, ...axisLabel }}
                width={48}
              />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="pending" name="Pending" stackId="leave" fill="#f59e0b" maxBarSize={22} />
              <Bar dataKey="approved" name="Approved" stackId="leave" fill="#0284c7" maxBarSize={22} />
              <Bar dataKey="rejected" name="Rejected" stackId="leave" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function HiringChart({ rows }) {
  const empty = !rows?.length || rows.every((row) => !row.count);
  return (
    <Panel title="Hiring" subtitle="X = month, Y = joiners in the last 6 months." accent="from-rose-50 via-white to-orange-50">
      {empty ? <EmptyChart>No joining dates in the last 6 months.</EmptyChart> : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id="hireFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                label={{ value: "Month", position: "insideBottom", offset: -2, ...axisLabel }}
              />
              <YAxis
                allowDecimals={false}
                tick={axisTick}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={{ stroke: "#cbd5e1" }}
                label={{ value: "Joined", angle: -90, position: "insideLeft", offset: 8, ...axisLabel }}
                width={42}
              />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="count" stroke="none" fill="url(#hireFill)" />
              <Line type="monotone" dataKey="count" name="Joined" stroke="#e11d48" strokeWidth={3} dot={{ r: 4, fill: "#fff", stroke: "#e11d48", strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
