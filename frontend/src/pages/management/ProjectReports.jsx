import { useEffect, useRef, useState } from "react";
import { Paperclip, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { FilePicker } from "../../components/ui/FilePicker";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { RichText, plainRichText, richHtmlClass } from "../../components/ui/RichText";
import api from "../../services/api";
import { formatDate, toDateInput } from "./projectOptions";
import { cn } from "../../utils/cn";

const selectClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600";

const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const emptyForm = { date: today(), report: "", clientRequirement: "", files: [], removeFileIds: [] };

const who = (person) => [person?.name, person?.designation].filter(Boolean).join(" · ");

export function ProjectReports({ project, startOpen = false }) {
  const [rows, setRows] = useState([]);
  const [canWrite, setCanWrite] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [date, setDate] = useState("");
  const [author, setAuthor] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const opened = useRef(false);

  const people = [project.reportingManager, ...(project.workingEmployees || [])].filter((person, index, list) => person?._id && list.findIndex((item) => item?._id === person._id) === index);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/projects/${project._id}/reports`, { params: { date, author, page, limit } });
      const writable = Boolean(res.data.canWrite);
      setRows(res.data.data || []);
      setCanWrite(writable);
      setCanReview(Boolean(res.data.canReview));
      if (startOpen && writable && !opened.current) {
        opened.current = true;
        setSelected(null);
        setForm({ ...emptyForm, date: today() });
        setShowForm(true);
      }
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    opened.current = false;
  }, [project._id]);

  useEffect(() => { load(); }, [project._id, date, author, page, limit]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const openCreate = () => {
    setSelected(null);
    setForm({ ...emptyForm, date: today() });
    setShowForm(true);
  };

  const openEdit = (row) => {
    setSelected(row);
    setForm({
      date: toDateInput(row.date),
      report: row.report || "",
      clientRequirement: row.clientRequirement || "",
      files: [],
      removeFileIds: [],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelected(null);
    setForm(emptyForm);
  };

  const toggleRemove = (id) => {
    setForm((current) => ({
      ...current,
      removeFileIds: current.removeFileIds.includes(id)
        ? current.removeFileIds.filter((item) => item !== id)
        : [...current.removeFileIds, id],
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    if (!plainRichText(form.report)) {
      toast.error("Report is required");
      return;
    }
    const kept = selected ? (selected.files || []).filter((file) => !form.removeFileIds.includes(file._id)).length : 0;
    if (kept + form.files.length > 8) {
      toast.error("You can add up to 8 files");
      return;
    }
    const data = new FormData();
    data.append("date", form.date);
    data.append("report", form.report);
    data.append("clientRequirement", plainRichText(form.clientRequirement) ? form.clientRequirement : "");
    form.files.forEach((file) => data.append("files", file));
    if (selected) data.append("removeFileIds", JSON.stringify(form.removeFileIds));
    try {
      setSaving(true);
      if (selected) await api.patch(`/admin/projects/${project._id}/reports/${selected._id}`, data);
      else await api.post(`/admin/projects/${project._id}/reports`, data);
      toast.success(selected ? "Report updated" : "Report submitted");
      closeForm();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the report");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the report for ${formatDate(row.date)}?`)) return;
    try {
      await api.delete(`/admin/projects/${project._id}/reports/${row._id}`);
      toast.success("Report deleted");
      if (selected?._id === row._id) closeForm();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete the report");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Daily reports</h3>
          <p className="text-sm text-slate-500">One report per person for each date.</p>
        </div>
        {canWrite && !showForm && <Button onClick={openCreate}>Add report</Button>}
      </div>

      {showForm && (
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">{selected ? "Edit report" : "Daily report"}</h4>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date *</label>
            <Input type="date" value={form.date} onChange={(event) => setField("date", event.target.value)} disabled={saving} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Report *</label>
            <RichText key={`report-${selected?._id || "new"}`} value={form.report} onChange={(value) => setField("report", value)} placeholder="What was done today?" disabled={saving} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Client requirement</label>
            <RichText key={`client-${selected?._id || "new"}`} value={form.clientRequirement} onChange={(value) => setField("clientRequirement", value)} placeholder="Optional requirement from the client" disabled={saving} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Files</label>
            <FilePicker
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
              disabled={saving}
              files={form.files}
              onChange={(files) => setField("files", files)}
              hint="Optional. PDF or images, up to 8 files, 8 MB each."
            />
            {(selected?.files || []).map((file) => (
              <label key={file._id} className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.removeFileIds.includes(file._id)} onChange={() => toggleRemove(file._id)} disabled={saving} />
                Remove {file.name}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Submit"}</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
          <Input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} />
        </div>
        {canReview && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Person</label>
            <select className={selectClass} value={author} onChange={(event) => { setAuthor(event.target.value); setPage(1); }}>
              <option value="">All people</option>
              {people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">Loading reports...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">No reports found.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row._id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(row.date)}</p>
                  <p className="text-sm text-slate-600">{who(row.author) || "—"}</p>
                  {row.editedBy && <p className="text-xs text-slate-500">Edited by {who(row.editedBy)}</p>}
                </div>
                {row.canEdit && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => remove(row)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                )}
              </div>
              <div className={cn("mt-3 text-sm text-slate-900", richHtmlClass)} dangerouslySetInnerHTML={{ __html: row.report }} />
              {plainRichText(row.clientRequirement) && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client requirement</p>
                  <div className={cn("mt-1 text-sm text-slate-800", richHtmlClass)} dangerouslySetInnerHTML={{ __html: row.clientRequirement }} />
                </div>
              )}
              {(row.files || []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.files.map((file) => (
                    <a key={file._id} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-100 px-3 py-1 text-sm text-emerald-700 hover:underline">
                      <Paperclip className="h-4 w-4" />
                      {file.name}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Pager page={page} pages={totalPages} limit={limit} total={total} onPage={setPage} onLimit={(size) => { setLimit(size); setPage(1); }} />
      </div>
    </section>
  );
}
