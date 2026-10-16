import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useBrand } from "../../context/BrandContext";
import { cn } from "../../utils/cn";
import {
  notifyNotificationsChanged,
  stopNotificationRing,
  syncNotificationRing,
  unlockNotificationAudio,
} from "../../utils/notificationRing";

const whenLabel = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { brand } = useBrand();
  const ringtoneUrl = brand?.ringtoneUrl || "";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const ringtoneRef = useRef(ringtoneUrl);
  const countRef = useRef(0);

  useEffect(() => {
    ringtoneRef.current = ringtoneUrl;
    syncNotificationRing(ringtoneUrl, countRef.current > 0);
  }, [ringtoneUrl]);

  const applyCount = useCallback((next) => {
    const value = Number(next) || 0;
    countRef.current = value;
    setCount(value);
    syncNotificationRing(ringtoneRef.current, value > 0);
  }, []);

  const refreshCount = useCallback(() => {
    api.get("/notifications/unread-count")
      .then((res) => applyCount(res.data.data?.count || 0))
      .catch(() => {});
  }, [applyCount]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications", { params: { limit: 12 } });
      setItems(res.data.data || []);
      applyCount(res.data.unreadCount || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, [applyCount]);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, 15000);
    const onChanged = () => refreshCount();
    window.addEventListener("crm:notifications-changed", onChanged);
    return () => {
      clearInterval(timer);
      window.removeEventListener("crm:notifications-changed", onChanged);
      stopNotificationRing();
    };
  }, [refreshCount]);

  useEffect(() => {
    const unlock = () => unlockNotificationAudio(ringtoneRef.current);
    document.addEventListener("pointerdown", unlock);
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    loadList();
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, loadList]);

  const openItem = async (item) => {
    if (item.unread) {
      try {
        await api.patch(`/notifications/${item._id}/read`);
        const next = Math.max(countRef.current - 1, 0);
        applyCount(next);
        setItems((current) => current.map((row) => (row._id === item._id ? { ...row, unread: false, readAt: new Date().toISOString() } : row)));
        notifyNotificationsChanged();
      } catch (_) { /* ignore */ }
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      applyCount(0);
      setItems((current) => current.map((row) => ({ ...row, unread: false, readAt: row.readAt || new Date().toISOString() })));
      notifyNotificationsChanged();
      toast.success("All marked as read");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update notifications");
    }
  };

  return (
    <div className="relative mr-2" ref={ref}>
      <button
        type="button"
        className="relative rounded-md p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {count > 0 && (
              <button type="button" className="text-xs font-medium text-sky-700 hover:underline" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Loading...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : items.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => openItem(item)}
                className={cn(
                  "block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50",
                  item.unread && "bg-sky-50/70"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm text-slate-900", item.unread ? "font-semibold" : "font-medium")}>{item.title}</p>
                  {item.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
                </div>
                {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>}
                <p className="mt-1 text-[11px] text-slate-400">{whenLabel(item.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
