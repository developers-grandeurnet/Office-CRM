import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building, Building2, CalendarCheck, CalendarClock, ClipboardCheck, Contact, FolderKanban, Handshake, IdCard, IndianRupee, Laptop, LifeBuoy, ListTodo, MapPin, RefreshCw, UserPlus, UserSearch, Users } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useBrand } from "../context/BrandContext";
import { AttendanceChart, CompositionChart, HiringChart, LeaveChart, Panel, WorkforceChart } from "../components/dashboard/DashboardCharts";
import { DashboardNotifications } from "../components/dashboard/DashboardNotifications";
import { cn } from "../utils/cn";

const icons = {
  leads: UserPlus,
  follow: CalendarClock,
  sales: Handshake,
  revenue: IndianRupee,
  projects: FolderKanban,
  "projects-late": FolderKanban,
  tickets: LifeBuoy,
  work: ListTodo,
  clients: Contact,
  interviews: UserSearch,
};

const KPI_THEMES = [
  { card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white hover:border-sky-300", iconWrap: "bg-sky-100 text-sky-700", spark: "text-sky-600" },
  { card: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white hover:border-violet-300", iconWrap: "bg-violet-100 text-violet-700", spark: "text-violet-600" },
  { card: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white hover:border-amber-300", iconWrap: "bg-amber-100 text-amber-700", spark: "text-amber-600" },
  { card: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white hover:border-rose-300", iconWrap: "bg-rose-100 text-rose-700", spark: "text-rose-600" },
  { card: "border-orange-200/80 bg-gradient-to-br from-orange-50 to-white hover:border-orange-300", iconWrap: "bg-orange-100 text-orange-700", spark: "text-orange-600" },
  { card: "border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50 to-white hover:border-fuchsia-300", iconWrap: "bg-fuchsia-100 text-fuchsia-700", spark: "text-fuchsia-600" },
  { card: "border-blue-200/80 bg-gradient-to-br from-blue-50 to-white hover:border-blue-300", iconWrap: "bg-blue-100 text-blue-700", spark: "text-blue-600" },
  { card: "border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-white hover:border-cyan-300", iconWrap: "bg-cyan-100 text-cyan-700", spark: "text-cyan-600" },
];

const OP_THEMES = [
  { card: "border-sky-200 bg-gradient-to-br from-sky-50 to-white hover:border-sky-300", icon: "text-sky-600" },
  { card: "border-violet-200 bg-gradient-to-br from-violet-50 to-white hover:border-violet-300", icon: "text-violet-600" },
  { card: "border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:border-amber-300", icon: "text-amber-600" },
  { card: "border-rose-200 bg-gradient-to-br from-rose-50 to-white hover:border-rose-300", icon: "text-rose-600" },
  { card: "border-orange-200 bg-gradient-to-br from-orange-50 to-white hover:border-orange-300", icon: "text-orange-600" },
  { card: "border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white hover:border-fuchsia-300", icon: "text-fuchsia-600" },
  { card: "border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:border-blue-300", icon: "text-blue-600" },
  { card: "border-cyan-200 bg-gradient-to-br from-cyan-50 to-white hover:border-cyan-300", icon: "text-cyan-600" },
];

const ACTION_TONES = [
  "hover:bg-sky-50 text-sky-800",
  "hover:bg-violet-50 text-violet-800",
  "hover:bg-amber-50 text-amber-800",
  "hover:bg-rose-50 text-rose-800",
  "hover:bg-orange-50 text-orange-800",
  "hover:bg-fuchsia-50 text-fuchsia-800",
  "hover:bg-blue-50 text-blue-800",
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function compareYesterday(today, yesterday) {
  if (today == null || yesterday == null) return "";
  const delta = today - yesterday;
  if (delta === 0) return "Same as yesterday";
  if (delta > 0) return `${delta} more than yesterday`;
  return `${Math.abs(delta)} fewer than yesterday`;
}

function Sparkline({ points, className }) {
  if (!points?.length || points.every((value) => value === 0)) return null;
  const max = Math.max(...points, 1);
  const width = 96;
  const height = 28;
  const step = points.length === 1 ? 0 : width / (points.length - 1);
  const path = points.map((value, index) => `${index === 0 ? "M" : "L"} ${index * step} ${height - (value / max) * (height - 2) - 1}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("mt-3 h-7 w-24", className)} aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({ label, value, hint, href, icon: Icon, spark, theme }) {
  const tone = theme || KPI_THEMES[0];
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone.iconWrap)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {spark}
    </>
  );
  const className = cn(
    "block rounded-2xl border px-4 py-4 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600",
    tone.card
  );
  if (!href) return <div className={className}>{body}</div>;
  return <Link to={href} className={className}>{body}</Link>;
}

function formatWhen(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function Dashboard() {
  const { user, hasPermission } = useAuth();
  const { brand } = useBrand();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    api.get("/admin/dashboard/summary")
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load the dashboard"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => { load(false); }, [load]);

  const workforce = data?.workforce;
  const attendanceHint = compareYesterday(workforce?.presentToday, workforce?.presentYesterday);
  const spark = (data?.attendance || []).slice(-7).map((row) => row.present);
  const personal = data?.personal;
  const personalLabel = personal?.state === "out" ? "Punched out" : personal?.state === "in" ? "Punched in" : "Not punched in";
  const company = brand?.companyName || "";

  const actions = [
    hasPermission(["MANAGE_EMPLOYEES", "CREATE_EMPLOYEES"]) && { label: "Add employee", href: "/dashboard/employees/create", icon: Users },
    hasPermission(["MANAGE_DEPARTMENTS", "VIEW_DEPARTMENTS", "CREATE_DEPARTMENTS", "EDIT_DEPARTMENTS", "DELETE_DEPARTMENTS"]) && { label: "Departments", href: "/dashboard/departments", icon: Building },
    hasPermission(["MANAGE_DESIGNATIONS", "VIEW_DESIGNATIONS", "CREATE_DESIGNATIONS", "EDIT_DESIGNATIONS", "DELETE_DESIGNATIONS"]) && { label: "Designations", href: "/dashboard/designations", icon: Briefcase },
    { label: "Leave requests", href: "/dashboard/leave", icon: CalendarCheck },
    data?.admin
      ? { label: "Attendance report", href: "/dashboard/attendance-report", icon: ClipboardCheck }
      : { label: "Attendance", href: "/dashboard/attendance", icon: MapPin },
    hasPermission(["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]) && { label: "Work modes", href: "/dashboard/work-modes", icon: Laptop },
    hasPermission(["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]) && { label: "Employee types", href: "/dashboard/employee-types", icon: IdCard },
  ].filter(Boolean);

  let kpiIndex = 0;
  const nextTheme = () => KPI_THEMES[kpiIndex++ % KPI_THEMES.length];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 bg-gradient-to-br from-sky-500 via-violet-500 to-rose-500 px-5 py-6 text-white shadow-sm sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-amber-300/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-fuchsia-300/30 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/75">Dashboard{company ? ` · ${company}` : ""}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{greeting()}, {user?.name || "there"}</h1>
            <p className="mt-1 max-w-xl text-sm text-white/85">
              {data?.staff ? "Here's your workforce overview for today." : "Here's what needs attention today."}
              {data?.dateLabel ? ` ${data.dateLabel}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" onClick={() => load(false)} className="font-medium underline">Try again</button>
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workforce && (
              <>
                <Kpi label="Total employees" value={workforce.totalEmployees} hint="Everyone on record" href="/dashboard/employees" icon={Users} theme={nextTheme()} />
                <Kpi label="Active employees" value={workforce.activeEmployees} hint="Status is active" href="/dashboard/employees" icon={Building2} theme={nextTheme()} />
                {workforce.presentToday != null && (() => {
                  const theme = nextTheme();
                  return (
                    <Kpi
                      label="Present today"
                      value={workforce.presentToday}
                      hint={attendanceHint || "Punched in"}
                      href="/dashboard/attendance-report"
                      icon={MapPin}
                      theme={theme}
                      spark={<Sparkline points={spark} className={theme.spark} />}
                    />
                  );
                })()}
                {workforce.absentToday != null && (
                  <Kpi label="Absent today" value={workforce.absentToday} hint="No punch and no approved leave" href="/dashboard/attendance-report" icon={Users} theme={nextTheme()} />
                )}
                {workforce.onLeaveToday != null && (
                  <Kpi label="On leave today" value={workforce.onLeaveToday} hint="Approved leave, no punch-in" href="/dashboard/leave" icon={CalendarCheck} theme={nextTheme()} />
                )}
              </>
            )}
            {!data.admin && (
              <Kpi label="Your attendance" value={personalLabel} hint={personal?.at ? `Punch in ${formatWhen(personal.at)}` : "Punch in is still open"} href="/dashboard/attendance" icon={MapPin} theme={nextTheme()} />
            )}
            <Kpi label="Pending leave" value={data.leave.pending} hint={data.admin ? "Waiting for a decision" : "Yours and your team"} href="/dashboard/leave" icon={CalendarCheck} theme={nextTheme()} />
            {workforce?.departments != null && (
              <Kpi label="Departments" value={workforce.departments} hint="Active departments" href="/dashboard/departments" icon={Building} theme={nextTheme()} />
            )}
            {workforce && (
              <Kpi label="New joiners" value={workforce.joinersThisMonth} hint={`${workforce.joinersLastMonth} last month`} href="/dashboard/employees" icon={UserPlus} theme={nextTheme()} />
            )}
          </section>

          {(data.admin || workforce) && (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.admin && <AttendanceChart series={data.attendance} />}
              {workforce && <WorkforceChart rows={workforce.departmentsChart} />}
              {workforce && <CompositionChart employeeTypes={workforce.employeeTypes} workModes={workforce.workModes} />}
              <LeaveChart leave={data.leave} />
              {workforce && <HiringChart rows={workforce.hiring} />}
            </div>
          )}

          {!data.admin && !workforce && <LeaveChart leave={data.leave} />}

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardNotifications />
            <Panel title="Recent activity" subtitle="Taken from employees, leave, and today's punch-ins." accent="from-slate-50 via-white to-sky-50">
              {data.activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Nothing recent to show.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.activity.map((row) => (
                    <li key={row.id}>
                      <Link to={row.href} className="flex items-center justify-between gap-3 py-3 hover:text-sky-700">
                        <span className="truncate text-sm text-slate-800">{row.title}</span>
                        <span className="shrink-0 text-xs text-slate-500">{formatWhen(row.at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Quick actions" accent="from-white to-violet-50/70">
              <div className="grid gap-2 sm:grid-cols-2">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  const tone = ACTION_TONES[index % ACTION_TONES.length];
                  return (
                    <Link
                      key={action.href + action.label}
                      to={action.href}
                      className={cn("flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600", tone)}
                    >
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </Panel>
          </div>

          {data.operations.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Operations</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.operations.map((item, index) => {
                  const Icon = icons[item.key] || FolderKanban;
                  const tone = OP_THEMES[index % OP_THEMES.length];
                  return (
                    <Link key={item.key} to={item.href} className={cn("rounded-2xl border px-4 py-3 shadow-sm transition", tone.card)}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-slate-500">{item.label}</p>
                        <Icon className={cn("h-4 w-4", tone.icon)} />
                      </div>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {data.lists.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.lists.map((list, index) => (
                <section key={list.title} className={cn("overflow-hidden rounded-2xl border shadow-sm", index % 2 === 0 ? "border-sky-200 bg-gradient-to-br from-sky-50 to-white" : "border-violet-200 bg-gradient-to-br from-violet-50 to-white")}>
                  <div className="flex items-center justify-between border-b border-slate-100/80 px-4 py-3">
                    <h2 className="text-sm font-semibold text-slate-900">{list.title}</h2>
                    <Link to={list.href} className="text-sm font-medium text-sky-700">View all</Link>
                  </div>
                  <ul className="divide-y divide-slate-100 bg-white/60">
                    {list.rows.map((row) => (
                      <li key={row.id}>
                        <Link to={row.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/80">
                          <span className="truncate text-sm font-medium text-slate-800">{row.label}</span>
                          <span className="shrink-0 text-xs text-slate-500">{row.meta}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
