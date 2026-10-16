export const STAFF_PERMISSION_GROUPS = [
  {
    category: "Employee & Staff",
    permissions: [
      { key: "VIEW_EMPLOYEES", label: "View Employees", desc: "Employee directory and profiles" },
      { key: "CREATE_EMPLOYEES", label: "Create Employees", desc: "Add new employees" },
      { key: "EDIT_EMPLOYEES", label: "Edit Employees", desc: "Update employee details" },
      { key: "DELETE_EMPLOYEES", label: "Delete Employees", desc: "Deactivate or delete employees" },
      { key: "MANAGE_EMPLOYEES", label: "Manage Employees", desc: "Full employee access" },
    ],
  },
  {
    category: "Departments & Designations",
    permissions: [
      { key: "VIEW_DEPARTMENTS", label: "View Departments", desc: "See departments" },
      { key: "CREATE_DEPARTMENTS", label: "Create Departments", desc: "Add departments" },
      { key: "EDIT_DEPARTMENTS", label: "Edit Departments", desc: "Update departments" },
      { key: "DELETE_DEPARTMENTS", label: "Delete Departments", desc: "Remove departments" },
      { key: "MANAGE_DEPARTMENTS", label: "Manage Departments", desc: "Full department access" },
      { key: "VIEW_DESIGNATIONS", label: "View Designations", desc: "See designations" },
      { key: "CREATE_DESIGNATIONS", label: "Create Designations", desc: "Add designations" },
      { key: "EDIT_DESIGNATIONS", label: "Edit Designations", desc: "Update designations" },
      { key: "DELETE_DESIGNATIONS", label: "Delete Designations", desc: "Remove designations" },
      { key: "MANAGE_DESIGNATIONS", label: "Manage Designations", desc: "Full designation access" },
    ],
  },
  {
    category: "Services",
    permissions: [
      { key: "VIEW_SERVICES", label: "View Services", desc: "See services" },
      { key: "CREATE_SERVICES", label: "Create Services", desc: "Add services" },
      { key: "EDIT_SERVICES", label: "Edit Services", desc: "Update services" },
      { key: "DELETE_SERVICES", label: "Delete Services", desc: "Remove services" },
      { key: "MANAGE_SERVICES", label: "Manage Services", desc: "Full service access" },
    ],
  },
  {
    category: "Clients (CRM)",
    permissions: [
      { key: "VIEW_CLIENTS", label: "View Clients", desc: "See client list" },
      { key: "CREATE_CLIENTS", label: "Create Clients", desc: "Add clients" },
      { key: "EDIT_CLIENTS", label: "Edit Clients", desc: "Update clients" },
      { key: "DELETE_CLIENTS", label: "Delete Clients", desc: "Remove clients" },
      { key: "MANAGE_CLIENTS", label: "Manage Clients", desc: "Full client CRM access" },
    ],
  },
  {
    category: "Leads & Sales",
    permissions: [
      { key: "VIEW_LEADS", label: "View Leads", desc: "See leads, follow-ups, sales, payments, revenue" },
      { key: "CREATE_LEADS", label: "Create Leads", desc: "Add leads" },
      { key: "EDIT_LEADS", label: "Edit Leads", desc: "Update leads" },
      { key: "DELETE_LEADS", label: "Delete Leads", desc: "Remove leads" },
      { key: "MANAGE_LEADS", label: "Manage Leads", desc: "Full lead access" },
    ],
  },
  {
    category: "Projects",
    permissions: [
      { key: "VIEW_PROJECTS", label: "View Projects", desc: "See all projects" },
      { key: "CREATE_PROJECTS", label: "Create Projects", desc: "Add projects" },
      { key: "EDIT_PROJECTS", label: "Edit Projects", desc: "Update projects and team" },
      { key: "DELETE_PROJECTS", label: "Delete Projects", desc: "Remove projects" },
      { key: "MANAGE_PROJECTS", label: "Manage Projects", desc: "Full project access" },
    ],
  },
  {
    category: "Interviews",
    permissions: [
      { key: "VIEW_INTERVIEWS", label: "View Interviews", desc: "See interviews" },
      { key: "CREATE_INTERVIEWS", label: "Create Interviews", desc: "Schedule interviews" },
      { key: "EDIT_INTERVIEWS", label: "Edit Interviews", desc: "Update interviews" },
      { key: "DELETE_INTERVIEWS", label: "Delete Interviews", desc: "Remove interviews" },
      { key: "MANAGE_INTERVIEWS", label: "Manage Interviews", desc: "Full interview access" },
    ],
  },
  {
    category: "Leave",
    permissions: [
      { key: "APPROVE_LEAVE", label: "Approve Leave", desc: "Approve or reject leave requests" },
    ],
  },
  {
    category: "Salary",
    permissions: [
      { key: "VIEW_SALARY", label: "View Own Salary", desc: "See own salary calculated from attendance" },
      { key: "MANAGE_SALARY", label: "Manage Salary", desc: "See every employee's salary for a month" },
    ],
  },
  {
    category: "System",
    permissions: [
      { key: "MANAGE_PERMISSIONS", label: "Manage Permissions", desc: "Grant or revoke permissions" },
      { key: "MANAGE_SETTINGS", label: "Manage Settings", desc: "Company name, logo, ringtone, office location" },
    ],
  },
];

export const CLIENT_PERMISSION_GROUPS = [
  {
    category: "Client portal",
    permissions: [
      { key: "CLIENT_VIEW_PROJECTS", label: "My Projects", desc: "See only their own projects" },
      { key: "CLIENT_SUPPORT", label: "Support Tickets", desc: "Raise and view their own support tickets" },
    ],
  },
];

export const CLIENT_DEFAULT_PERMISSIONS = ["CLIENT_VIEW_PROJECTS", "CLIENT_SUPPORT"];

export const permissionGroupsForUserType = (userType) => (
  userType === "CLIENT" ? CLIENT_PERMISSION_GROUPS : STAFF_PERMISSION_GROUPS
);
