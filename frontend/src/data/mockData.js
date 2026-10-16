import { LayoutDashboard, Building2, Building, Briefcase, ShieldCheck, IdCard, Laptop, CalendarDays, CalendarPlus, CalendarCheck, Layers, Contact, UserPlus, CalendarClock, Handshake, Wallet, IndianRupee, BarChart3, UserSearch, FolderKanban, LifeBuoy, ListTodo, Settings, MapPin, ClipboardCheck } from "lucide-react";

export const navigationData = [
  {
    group: "Dashboard",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard, allowedRoles: ["ADMIN", "EMPLOYEE"] },
      { name: "My account", href: "/dashboard", icon: LayoutDashboard, allowedRoles: ["CLIENT"] },
      { name: "My projects", href: "/dashboard/my-projects", icon: FolderKanban, allowedRoles: ["CLIENT"], permissionsNeeded: ["CLIENT_VIEW_PROJECTS"] },
      { name: "Support", href: "/dashboard/support", icon: LifeBuoy, allowedRoles: ["CLIENT"], permissionsNeeded: ["CLIENT_SUPPORT"] },
    ],
  },
  {
    group: "Organization",
    items: [
      { name: "Departments", href: "/dashboard/departments", icon: Building, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["MANAGE_DEPARTMENTS", "VIEW_DEPARTMENTS", "CREATE_DEPARTMENTS", "EDIT_DEPARTMENTS", "DELETE_DEPARTMENTS"] },
      { name: "Designations", href: "/dashboard/designations", icon: Briefcase, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["MANAGE_DESIGNATIONS", "VIEW_DESIGNATIONS", "CREATE_DESIGNATIONS", "EDIT_DESIGNATIONS", "DELETE_DESIGNATIONS"] },
      { name: "Employee types", href: "/dashboard/employee-types", icon: IdCard, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"] },
      { name: "Work modes", href: "/dashboard/work-modes", icon: Laptop, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"] },
      { name: "Leave types", href: "/dashboard/leave-types", icon: CalendarDays, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"] },
      { name: "Leave assign", href: "/dashboard/leave-assign", icon: CalendarPlus, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"] },
      { name: "Leave", href: "/dashboard/leave", icon: CalendarCheck, allowedRoles: ["ADMIN", "EMPLOYEE"] },
      { name: "Services", href: "/dashboard/services", icon: Layers, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_SERVICES", "MANAGE_SERVICES", "CREATE_SERVICES", "EDIT_SERVICES", "DELETE_SERVICES"] },
      { name: "Clients", href: "/dashboard/clients", icon: Contact, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_CLIENTS", "MANAGE_CLIENTS", "CREATE_CLIENTS", "EDIT_CLIENTS", "DELETE_CLIENTS"] },
      { name: "Leads", href: "/dashboard/leads", icon: UserPlus, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"] },
      { name: "Follow-ups", href: "/dashboard/follow-ups", icon: CalendarClock, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"] },
      { name: "Sales", href: "/dashboard/sales", icon: Handshake, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"] },
      { name: "Payments", href: "/dashboard/payments", icon: Wallet, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"] },
      { name: "Revenue", href: "/dashboard/revenue", icon: IndianRupee, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"] },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3, allowedRoles: ["ADMIN", "EMPLOYEE"] },
      { name: "Attendance", href: "/dashboard/attendance", icon: MapPin, allowedRoles: ["ADMIN", "EMPLOYEE"] },
      { name: "Attendance report", href: "/dashboard/attendance-report", icon: ClipboardCheck, allowedRoles: ["ADMIN", "EMPLOYEE"] },
      { name: "Salary", href: "/dashboard/salary", icon: IndianRupee, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_SALARY", "MANAGE_SALARY"] },
      { name: "Help", href: "/dashboard/help", icon: LifeBuoy, allowedRoles: ["ADMIN", "EMPLOYEE"] },
      { name: "Urgent work", href: "/dashboard/urgent-work", icon: ListTodo, allowedRoles: ["ADMIN", "EMPLOYEE"] },
      {
        name: "Projects",
        icon: FolderKanban,
        allowedRoles: ["ADMIN", "EMPLOYEE"],
        children: [
          { name: "All projects", href: "/dashboard/projects" },
          { name: "Daily reports", href: "/dashboard/project-reports", end: false },
        ],
      },
      { name: "Interviews", href: "/dashboard/interviews", icon: UserSearch, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_INTERVIEWS", "MANAGE_INTERVIEWS", "CREATE_INTERVIEWS", "EDIT_INTERVIEWS", "DELETE_INTERVIEWS"] },
      { name: "Permissions", href: "/dashboard/permissions", icon: ShieldCheck, allowedRoles: ["ADMIN"], permissionsNeeded: ["MANAGE_PERMISSIONS"] },
      { name: "Settings", href: "/dashboard/settings", icon: Settings, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["MANAGE_SETTINGS"] },
      { name: "Employees", href: "/dashboard/employees", icon: Building2, allowedRoles: ["ADMIN", "EMPLOYEE"], permissionsNeeded: ["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"] },
    ],
  },
];
