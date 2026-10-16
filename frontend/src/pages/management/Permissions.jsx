import { useState, useEffect } from "react";
import {
  ShieldCheck, Users, CheckSquare, Square, Save, Search, CheckCircle2, Lock
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import employeeService from "../../services/employeeService";
import toast from "react-hot-toast";
import { cn } from "../../utils/cn";
import { Pager } from "../../components/ui/Pager";
import { permissionGroupsForUserType } from "../../data/permissionCatalog";

export function Permissions() {
  const [usersList, setUsersList] = useState([]);
  const [userTypeFilter, setUserTypeFilter] = useState("EMPLOYEE");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const permissionGroups = permissionGroupsForUserType(selectedUser?.userType || userTypeFilter);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await employeeService.getEmployees({
        page,
        limit,
        userType: userTypeFilter,
        search: debouncedSearch || undefined,
      });
      const uList = res.data || [];
      setUsersList(uList);
      setPages(res.pagination?.pages || 1);
      setTotal(res.pagination?.total || 0);
      if (uList.length > 0) {
        const stillThere = selectedUser && uList.some((row) => row._id === selectedUser._id);
        const next = stillThere ? uList.find((row) => row._id === selectedUser._id) : uList[0];
        setSelectedUser(next);
        setUserPermissions(next.permissions || []);
      } else {
        setSelectedUser(null);
        setUserPermissions([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setSelectedUser(null);
  }, [userTypeFilter, debouncedSearch, limit]);

  useEffect(() => {
    fetchUsers();
  }, [userTypeFilter, debouncedSearch, page, limit]);

  const handleSelectUser = (usr) => {
    setSelectedUser(usr);
    setUserPermissions(usr.permissions || []);
  };

  const togglePermission = (permKey) => {
    setUserPermissions((prev) => (
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    ));
  };

  const handleSelectAllGroup = (group) => {
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => userPermissions.includes(k));
    if (allSelected) {
      setUserPermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setUserPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  const handleSelectAllSystem = () => {
    const allKeys = permissionGroups.flatMap((g) => g.permissions.map((p) => p.key));
    setUserPermissions(allKeys);
  };

  const handleClearAll = () => setUserPermissions([]);

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await employeeService.updateUserPermissions(selectedUser._id, userPermissions);
      toast.success(`Permissions updated for ${selectedUser.name}`);
      setUsersList((prev) => prev.map((u) => (u._id === selectedUser._id ? { ...u, permissions: userPermissions } : u)));
      setSelectedUser((prev) => (prev ? { ...prev, permissions: userPermissions } : null));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading && usersList.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
          <p className="font-medium text-slate-500">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900">
            <ShieldCheck className="h-7 w-7 text-sky-600" />
            Permissions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Employees get staff modules. Clients only get their own portal options.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleClearAll}>Clear All</Button>
          <Button variant="outline" size="sm" onClick={handleSelectAllSystem}>Select All</Button>
          <Button onClick={handleSavePermissions} disabled={saving || !selectedUser}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Users className="h-4 w-4 text-sky-600" /> Select User
            </h3>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">{total} Total</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[["EMPLOYEE", "Employees"], ["CLIENT", "Clients"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setUserTypeFilter(value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  userTypeFilter === value
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {usersList.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No matching users found.</p>
            ) : usersList.map((usr) => {
              const isSelected = selectedUser?._id === usr._id;
              const permCount = usr.permissions?.length || 0;
              return (
                <button
                  key={usr._id}
                  type="button"
                  onClick={() => handleSelectUser(usr)}
                  className={cn(
                    "w-full space-y-1.5 rounded-lg border p-3 text-left transition-all",
                    isSelected
                      ? "border-sky-300 bg-sky-50/80 shadow-sm ring-1 ring-sky-500/20"
                      : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-slate-900">{usr.name}</span>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold",
                      usr.userType === "CLIENT" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-600"
                    )}>
                      {usr.employeeId || usr.userType}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{usr.email}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span className="truncate">{usr.designation?.name || usr.userType}</span>
                    <span className="rounded bg-sky-100/70 px-1.5 py-0.5 font-semibold text-sky-700">{permCount} perms</span>
                  </div>
                </button>
              );
            })}
          </div>
          <Pager page={page} pages={pages} limit={limit} total={total} onPage={setPage} onLimit={(size) => { setLimit(size); setPage(1); }} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          {selectedUser ? (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 text-white sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{selectedUser.name}</h2>
                    <span className="rounded-full border border-sky-400/30 bg-sky-500/30 px-2.5 py-0.5 text-xs font-semibold text-sky-100">
                      {selectedUser.userType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{selectedUser.email} • {selectedUser.phone}</p>
                </div>
                <div className="text-xs">
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5">
                    <span className="block text-[10px] font-semibold uppercase text-slate-400">Active</span>
                    <span className="font-bold text-sky-300">{userPermissions.length} permissions</span>
                  </div>
                </div>
              </div>

              {selectedUser.userType === "CLIENT" && (
                <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                  Client permissions only control their own portal: projects and support tickets.
                </p>
              )}

              <div className="max-h-[620px] space-y-6 overflow-y-auto pb-4 pr-2">
                {permissionGroups.map((group) => {
                  const groupKeys = group.permissions.map((p) => p.key);
                  const isAllSelected = groupKeys.every((k) => userPermissions.includes(k));
                  return (
                    <div key={group.category} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-900">
                          <CheckCircle2 className="h-4 w-4 text-sky-600" />
                          {group.category}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleSelectAllGroup(group)}
                          className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          {isAllSelected ? "Deselect Group" : "Select Entire Group"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {group.permissions.map((perm) => {
                          const isChecked = userPermissions.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              onClick={() => togglePermission(perm.key)}
                              className={cn(
                                "flex cursor-pointer select-none items-start gap-3 rounded-lg border p-3 transition-all",
                                isChecked
                                  ? "border-sky-300 bg-sky-50/60 text-sky-900"
                                  : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100/60"
                              )}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isChecked ? <CheckSquare className="h-4 w-4 text-sky-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                              </div>
                              <div className="space-y-0.5">
                                <span className="block text-xs font-bold">{perm.label}</span>
                                <span className="block text-[11px] leading-tight text-slate-500">{perm.desc}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              <Lock className="mx-auto h-10 w-10 text-slate-300" />
              <p className="text-base font-semibold">Select a user from the left panel to manage permissions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Permissions;
