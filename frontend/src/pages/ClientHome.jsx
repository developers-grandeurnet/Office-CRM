import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, LifeBuoy, Mail, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useBrand } from "../context/BrandContext";
import { DashboardNotifications } from "../components/dashboard/DashboardNotifications";

const addressLine = (address) => {
  if (!address) return "";
  return [address.street, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ");
};

export function ClientHome() {
  const { user, hasPermission } = useAuth();
  const { brand } = useBrand();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const canProjects = hasPermission("CLIENT_VIEW_PROJECTS");
  const canSupport = hasPermission("CLIENT_SUPPORT");

  useEffect(() => {
    let cancelled = false;
    api.get("/auth/profile")
      .then((res) => { if (!cancelled) setProfile(res.data.data); })
      .catch((error) => { if (!cancelled) toast.error(error.response?.data?.message || "Failed to load profile"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading...</div>;
  }

  const data = profile || user || {};
  const services = data.services || data.client?.services || [];
  const address = data.clientAddress || data.client?.address || data.address;
  const clientId = data.clientId || data.employeeId;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-600 p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm text-emerald-100">{brand?.companyName || "Welcome"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Hi {data.name}</h1>
        <p className="mt-2 max-w-xl text-sm text-emerald-50/90">
          Your client account is active. Use the same login page anytime with the email and password sent to you.
        </p>
        {clientId && (
          <p className="mt-4 inline-flex rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur">
            Client ID: {clientId}
          </p>
        )}
      </div>

      {(canProjects || canSupport) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {canProjects && (
            <Link to="/dashboard/my-projects" className="flex items-center gap-3 rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition hover:border-sky-300">
              <FolderKanban className="h-5 w-5 text-sky-600" />
              <div>
                <p className="font-medium text-slate-900">My projects</p>
                <p className="text-xs text-slate-500">Team and status</p>
              </div>
            </Link>
          )}
          {canSupport && (
            <Link to="/dashboard/support" className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white p-4 shadow-sm transition hover:border-violet-300">
              <LifeBuoy className="h-5 w-5 text-violet-600" />
              <div>
                <p className="font-medium text-slate-900">Support</p>
                <p className="text-xs text-slate-500">Raise a ticket</p>
              </div>
            </Link>
          )}
        </div>
      )}

      <DashboardNotifications />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {data.email && (
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-600" />{data.email}</li>
            )}
            {data.phone && (
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" />{data.phone}</li>
            )}
            {data.whatsapp && (
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" />WhatsApp {data.whatsapp}</li>
            )}
            {addressLine(address) && (
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{addressLine(address)}</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your services</h2>
          {services.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No services linked yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {services.map((service) => (
                <li key={service._id || service.name} className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm text-slate-800">
                  <span className="font-medium">{service.name}</span>
                  {service.description && <p className="mt-0.5 text-xs text-slate-500">{service.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
