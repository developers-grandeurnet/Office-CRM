import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Calendar, Pencil, UserRound, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { plainRichText, richHtmlClass } from "../../components/ui/RichText";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatDate, priorityClass, priorityLabel } from "./projectOptions";
import { ProjectStatusControl } from "./ProjectStatus";
import { cn } from "../../utils/cn";

export function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("MANAGE_PROJECTS") || hasPermission("EDIT_PROJECTS");
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/admin/projects/details/${id}`);
        if (!cancelled) setProject(res.data.data);
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.message || "Failed to load project");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading project...</div>;
  }
  if (!project) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Project not found.</div>;
  }

  const workers = (project.workingEmployees || []).map((person) => person?.name).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Project</h1>
            <p className="text-sm text-slate-500">Added {formatDate(project.createdAt)}{project.createdBy?.name ? ` by ${project.createdBy.name}` : ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/dashboard/project-reports/${project._id}`)}>Daily reports</Button>
          {canEdit && (
            <Button onClick={() => navigate("/dashboard/projects", { state: { editId: project._id } })}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-600 px-6 py-8 text-white">
          <h2 className="text-2xl font-semibold">{project.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", priorityClass(project.priority))}>{priorityLabel(project.priority)}</span>
            <ProjectStatusControl project={project} onUpdated={setProject} />
          </div>
        </div>
        <div className="grid gap-3 px-6 py-5 text-sm text-slate-600 sm:grid-cols-2">
          <p className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Client {project.client ? `${project.client.name}${project.client.clientId ? ` (${project.client.clientId})` : ""}` : "—"}</p>
          <p className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Reporting {project.reportingManager?.name || "—"}</p>
          <p className="flex items-start gap-2"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />EOD {formatDate(project.eod)}</p>
          <p className="flex items-start gap-2 sm:col-span-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{workers.length ? workers.join(", ") : "—"}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Description</h3>
        {plainRichText(project.description) ? (
          <div className={cn("mt-3 text-sm text-slate-900", richHtmlClass)} dangerouslySetInnerHTML={{ __html: project.description }} />
        ) : (
          <p className="mt-3 text-sm text-slate-500">No description.</p>
        )}
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Remark</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-900">{project.remark || "—"}</p>
      </section>

    </div>
  );
}
