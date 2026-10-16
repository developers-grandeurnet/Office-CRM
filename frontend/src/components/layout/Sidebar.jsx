import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../../utils/cn";
import { navigationData } from "../../data/mockData";
import { BrandMark } from "../brand/BrandMark";
import { useAuth } from "../../context/AuthContext";

function NavEntry({ item, collapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const childActive = item.children?.some((child) => location.pathname === child.href || location.pathname.startsWith(`${child.href}/`));
  const [open, setOpen] = useState(Boolean(childActive));

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  if (!item.children?.length) {
    return (
      <li>
        <NavLink
          to={item.href}
          end={item.href === "/dashboard"}
          className={({ isActive }) =>
            cn(
              "group flex items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-gradient-to-r from-sky-400 to-violet-400 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
              collapsed && "justify-center px-2"
            )
          }
          title={collapsed ? item.name : undefined}
        >
          <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "mr-3 h-5 w-5")} />
          {!collapsed && <span>{item.name}</span>}
        </NavLink>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        title={collapsed ? item.name : undefined}
        onClick={() => {
          if (collapsed) {
            navigate(item.children[0].href);
            return;
          }
          setOpen((current) => !current);
        }}
        className={cn(
          "flex w-full items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          childActive
            ? "bg-gradient-to-r from-sky-400/90 to-violet-400/90 text-slate-950 shadow-sm"
            : "text-slate-300 hover:bg-white/10 hover:text-white",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "mr-3 h-5 w-5")} />
        {!collapsed && <span className="flex-1 text-left">{item.name}</span>}
        {!collapsed && <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />}
      </button>
      {!collapsed && open && (
        <ul className="mt-1 space-y-1 border-l border-white/10 pl-4 ml-4">
          {item.children.map((child) => (
            <li key={child.href}>
              <NavLink
                to={child.href}
                end={child.end !== false}
                className={({ isActive }) =>
                  cn(
                    "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-white/15 font-medium text-sky-200"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                {child.name}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({ collapsed, setCollapsed }) {
  const { hasRole, hasPermission } = useAuth();

  const visibleGroups = navigationData
    .map((group) => {
      const filteredItems = group.items.flatMap((item) => {
        if (item.allowedRoles && !hasRole(item.allowedRoles)) return [];
        if (item.children?.length) {
          const children = item.children.filter((child) => !child.permissionsNeeded || hasPermission(child.permissionsNeeded));
          return children.length ? [{ ...item, children }] : [];
        }
        if (item.permissionsNeeded && !hasPermission(item.permissionsNeeded)) return [];
        return [item];
      });
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex h-full flex-col border-r border-white/10 bg-gradient-to-b from-slate-950 via-violet-950 to-sky-950 transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-24 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -right-10 bottom-32 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && <BrandMark tone="dark" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="relative flex-1 overflow-y-auto py-4 scrollbar-hide">
        <nav className="space-y-6 px-3">
          {visibleGroups.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <h4 className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-sky-200/60">
                  {group.group}
                </h4>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <NavEntry key={item.name} item={item} collapsed={collapsed} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
