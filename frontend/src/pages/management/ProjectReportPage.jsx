import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Calendar, UserRound, Users } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { plainRichText, richHtmlClass } from "../../components/ui/RichText";
import { formatDate, priorityClass, priorityLabel } from "./projectOptions";
import { cn } from "../../utils/cn";
import { ProjectReports } from "./ProjectReports";
import { ProjectStatusControl } from "./ProjectStatus";

const selectClass = "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600";

export function ProjectReportPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const startOpen = Boolean(location.state?.compose);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingList(true);
        const res = await api.get("/admin/projects/list", { params: { limit: 100 } });
        if (!cancelled) setProjects(res.data.data || []);
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.message || "Failed to load projects");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setProject(null);
        setLoadingProject(true);
        const res = await api.get(`/admin/projects/details/${projectId}`);
        if (!cancelled) setProject(res.data.data);
      } catch (error) {
        if (!cancelled) {
          setProject(null);
          toast.error(error.response?.data?.message || "Failed to load project");
        }
      } finally {
        if (!cancelled) setLoadingProject(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  const options = useMemo(() => {
    if (!project || projects.some((item) => item._id === project._id)) return projects;
    return [{ _id: project._id, name: project.name }, ...projects];
  }, [projects, project]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily reports</h1>
        <p className="mt-1 text-sm text-slate-500">Pick a project to see its complete daily reports.</p>
      </div>

      <div className="max-w-xl">
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="report-project">Project</label>
        <select
          id="report-project"
          className={selectClass}
          value={projectId || ""}
          disabled={loadingList}
          onChange={(event) => {
            const next = event.target.value;
            navigate(next ? `/dashboard/project-reports/${next}` : "/dashboard/project-reports", { state: null });
          }}
        >
          <option value="">{loadingList ? "Loading projects..." : "Select a project"}</option>
          {options.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
      </div>

      {!projectId && <p className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">Select a project to open its reports.</p>}
      {projectId && loadingProject && <p className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">Loading project...</p>}
      {project && (
        <>
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-600 px-5 py-5 text-white">
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", priorityClass(project.priority))}>{priorityLabel(project.priority)}</span>
            </div>
            <div className="grid gap-3 px-5 py-4 text-sm text-slate-600 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Status</span>
                <ProjectStatusControl project={project} onUpdated={setProject} />
              </div>
              <p className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Reporting {project.reportingManager?.name || "—"}</p>
              <p className="flex items-start gap-2"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />EOD {formatDate(project.eod)}</p>
              <p className="flex items-start gap-2 sm:col-span-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{(project.workingEmployees || []).map((person) => person?.name).filter(Boolean).join(", ") || "—"}</p>
            </div>
            {plainRichText(project.description) && (
              <div className={cn("border-t border-slate-100 px-5 py-4 text-sm text-slate-800", richHtmlClass)} dangerouslySetInnerHTML={{ __html: project.description }} />
            )}
          </div>
          <ProjectReports project={project} startOpen={startOpen} />
        </>
      )}
    </div>
  );
}
