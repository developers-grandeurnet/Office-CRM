import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, UserRound, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { plainRichText, richHtmlClass } from "../../components/ui/RichText";
import api from "../../services/api";
import { formatDate, priorityClass, priorityLabel, statusClass, statusLabel } from "../management/projectOptions";
import { cn } from "../../utils/cn";

export function ClientProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/client/projects/details/${id}`)
      .then((res) => { if (!cancelled) setProject(res.data.data); })
      .catch((error) => { if (!cancelled) toast.error(error.response?.data?.message || "Failed to load project"); })
      .finally(() => { if (!cancelled) setLoading(false); });
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/my-projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Project</h1>
          <p className="text-sm text-slate-500">View only — team and status for this work.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-600 px-6 py-8 text-white">
          <h2 className="text-2xl font-semibold">{project.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", priorityClass(project.priority))}>{priorityLabel(project.priority)}</span>
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", statusClass(project.status))}>{statusLabel(project.status)}</span>
          </div>
        </div>
        <div className="grid gap-3 px-6 py-5 text-sm text-slate-600 sm:grid-cols-2">
          <p className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Reporting manager: {project.reportingManager?.name || "—"}</p>
          <p className="flex items-start gap-2"><Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />EOD {formatDate(project.eod)}</p>
          <p className="flex items-start gap-2 sm:col-span-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Working team: {workers.length ? workers.join(", ") : "—"}</p>
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
    </div>
  );
}
