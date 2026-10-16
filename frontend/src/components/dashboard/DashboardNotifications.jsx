import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Panel } from "./DashboardCharts";
import { cn } from "../../utils/cn";
import { notifyNotificationsChanged } from "../../utils/notificationRing";

const whenLabel = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export function DashboardNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get("/notifications", { params: { limit: 8 } })
      .then((res) => { if (!cancelled) setItems(res.data.data || []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openItem = async (item) => {
    if (item.unread) {
      api.patch(`/notifications/${item._id}/read`)
        .then(() => notifyNotificationsChanged())
        .catch(() => {});
      setItems((current) => current.map((row) => (row._id === item._id ? { ...row, unread: false } : row)));
    }
    if (item.link) navigate(item.link);
  };

  return (
    <Panel title="Notifications" subtitle="Latest alerts after login. Use the bell for the full list." accent="from-amber-50 via-white to-rose-50">
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item._id}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className={cn("flex w-full items-start justify-between gap-3 py-3 text-left hover:text-sky-700", item.unread && "font-semibold")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-800">{item.title}</span>
                  {item.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{item.body}</span>}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{whenLabel(item.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">More alerts are in the bell icon at the top.</p>
    </Panel>
  );
}
