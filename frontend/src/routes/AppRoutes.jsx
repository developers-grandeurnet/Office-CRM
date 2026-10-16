import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Dashboard } from "../pages/Dashboard";
import { ClientHome } from "../pages/ClientHome";
import { ClientProjects } from "../pages/client/ClientProjects";
import { ClientProjectView } from "../pages/client/ClientProjectView";
import { ClientTickets } from "../pages/client/ClientTickets";
import { Login } from "../pages/Login";
import { Departments } from "../pages/organization/Departments";
import { Designations } from "../pages/organization/Designations";
import { EmployeeTypes } from "../pages/organization/EmployeeTypes";
import { WorkModes } from "../pages/organization/WorkModes";
import { LeaveTypes } from "../pages/organization/LeaveTypes";
import { LeaveAssign } from "../pages/organization/LeaveAssign";
import { Leave } from "../pages/organization/Leave";
import { Services } from "../pages/organization/Services";
import { Clients } from "../pages/management/Clients";
import { ClientView } from "../pages/management/ClientView";
import { Leads } from "../pages/management/Leads";
import { LeadView } from "../pages/management/LeadView";
import { FollowUps } from "../pages/management/FollowUps";
import { Payments, Revenue, Sales } from "../pages/management/DealList";
import { Reports } from "../pages/management/Reports";
import { UrgentWorks } from "../pages/management/UrgentWorks";
import { UrgentWorkView } from "../pages/management/UrgentWorkView";
import { Tickets } from "../pages/management/Tickets";
import { TicketView } from "../pages/management/TicketView";
import { Projects } from "../pages/management/Projects";
import { ProjectView } from "../pages/management/ProjectView";
import { ProjectReportPage } from "../pages/management/ProjectReportPage";
import { Interviews } from "../pages/management/Interviews";
import { InterviewView } from "../pages/management/InterviewView";
import { Employees } from "../pages/management/Employees";
import { EmployeeForm } from "../pages/management/EmployeeForm";
import { EmployeeProfile } from "../pages/management/EmployeeProfile";
import { OfferLetter } from "../pages/management/OfferLetter";
import { Permissions } from "../pages/management/Permissions";
import { SoftwareSettings } from "../pages/management/SoftwareSettings";
import { Attendance } from "../pages/management/Attendance";
import { AttendanceReport } from "../pages/management/AttendanceReport";
import { Salary } from "../pages/management/Salary";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  const isAuthenticated = token && token !== "undefined" && token !== "null" && token !== "";
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

const AuthRoute = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  const isAuthenticated = token && token !== "undefined" && token !== "null" && token !== "";
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const HomeRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (user?.userType === "CLIENT") return <ClientHome />;
  return <Dashboard />;
};

const ProfileRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (user?.userType === "CLIENT") return <ClientHome />;
  return <EmployeeProfile />;
};

const RoleRoute = ({ children, allowedRoles = [], permissionsNeeded = [] }) => {
  const { hasRole, hasPermission, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  const roleAllowed = allowedRoles.length === 0 || hasRole(allowedRoles);
  const permissionAllowed = permissionsNeeded.length === 0 || hasPermission(permissionsNeeded);

  if (!roleAllowed || !permissionAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AuthRoute><Login /></AuthRoute>} />

      <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route index element={<HomeRoute />} />
        <Route path="profile" element={<ProfileRoute />} />

        <Route path="departments" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["MANAGE_DEPARTMENTS", "VIEW_DEPARTMENTS", "CREATE_DEPARTMENTS", "EDIT_DEPARTMENTS", "DELETE_DEPARTMENTS"]}><Departments /></RoleRoute>} />
        <Route path="designations" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["MANAGE_DESIGNATIONS", "VIEW_DESIGNATIONS", "CREATE_DESIGNATIONS", "EDIT_DESIGNATIONS", "DELETE_DESIGNATIONS"]}><Designations /></RoleRoute>} />
        <Route path="employee-types" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]}><EmployeeTypes /></RoleRoute>} />
        <Route path="work-modes" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]}><WorkModes /></RoleRoute>} />
        <Route path="leave-types" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]}><LeaveTypes /></RoleRoute>} />
        <Route path="leave-assign" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]}><LeaveAssign /></RoleRoute>} />
        <Route path="leave" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><Leave /></RoleRoute>} />
        <Route path="services" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_SERVICES", "MANAGE_SERVICES", "CREATE_SERVICES", "EDIT_SERVICES", "DELETE_SERVICES"]}><Services /></RoleRoute>} />
        <Route path="clients" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_CLIENTS", "MANAGE_CLIENTS", "CREATE_CLIENTS", "EDIT_CLIENTS", "DELETE_CLIENTS"]}><Clients /></RoleRoute>} />
        <Route path="clients/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_CLIENTS", "MANAGE_CLIENTS", "CREATE_CLIENTS", "EDIT_CLIENTS", "DELETE_CLIENTS"]}><ClientView /></RoleRoute>} />
        <Route path="follow-ups" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"]}><FollowUps /></RoleRoute>} />
        <Route path="sales" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"]}><Sales /></RoleRoute>} />
        <Route path="payments" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"]}><Payments /></RoleRoute>} />
        <Route path="revenue" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"]}><Revenue /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><Reports /></RoleRoute>} />
        <Route path="attendance" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><Attendance /></RoleRoute>} />
        <Route path="attendance-report" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><AttendanceReport /></RoleRoute>} />
        <Route path="salary" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_SALARY", "MANAGE_SALARY"]}><Salary /></RoleRoute>} />
        <Route path="urgent-work" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><UrgentWorks /></RoleRoute>} />
        <Route path="urgent-work/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><UrgentWorkView /></RoleRoute>} />
        <Route path="help" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><Tickets /></RoleRoute>} />
        <Route path="help/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><TicketView /></RoleRoute>} />
        <Route path="my-projects" element={<RoleRoute allowedRoles={["CLIENT"]} permissionsNeeded={["CLIENT_VIEW_PROJECTS"]}><ClientProjects /></RoleRoute>} />
        <Route path="my-projects/:id" element={<RoleRoute allowedRoles={["CLIENT"]} permissionsNeeded={["CLIENT_VIEW_PROJECTS"]}><ClientProjectView /></RoleRoute>} />
        <Route path="support" element={<RoleRoute allowedRoles={["CLIENT"]} permissionsNeeded={["CLIENT_SUPPORT"]}><ClientTickets /></RoleRoute>} />
        <Route path="support/:id" element={<RoleRoute allowedRoles={["CLIENT"]} permissionsNeeded={["CLIENT_SUPPORT"]}><TicketView /></RoleRoute>} />
        <Route path="project-reports" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><ProjectReportPage /></RoleRoute>} />
        <Route path="project-reports/:projectId" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><ProjectReportPage /></RoleRoute>} />
        <Route path="projects" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><Projects /></RoleRoute>} />
        <Route path="projects/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]}><ProjectView /></RoleRoute>} />
        <Route path="interviews" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_INTERVIEWS", "MANAGE_INTERVIEWS", "CREATE_INTERVIEWS", "EDIT_INTERVIEWS", "DELETE_INTERVIEWS"]}><Interviews /></RoleRoute>} />
        <Route path="interviews/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_INTERVIEWS", "MANAGE_INTERVIEWS", "CREATE_INTERVIEWS", "EDIT_INTERVIEWS", "DELETE_INTERVIEWS"]}><InterviewView /></RoleRoute>} />
        <Route path="leads" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"]}><Leads /></RoleRoute>} />
        <Route path="leads/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_LEADS", "MANAGE_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS"]}><LeadView /></RoleRoute>} />
        <Route path="permissions" element={<RoleRoute allowedRoles={["ADMIN"]} permissionsNeeded={["MANAGE_PERMISSIONS"]}><Permissions /></RoleRoute>} />
        <Route path="settings" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["MANAGE_SETTINGS"]}><SoftwareSettings /></RoleRoute>} />

        <Route path="employees" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]}><Employees /></RoleRoute>} />
        <Route path="employees/create" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["CREATE_EMPLOYEES", "MANAGE_EMPLOYEES", "EDIT_EMPLOYEES"]}><EmployeeForm /></RoleRoute>} />
        <Route path="employees/edit/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["EDIT_EMPLOYEES", "MANAGE_EMPLOYEES"]}><EmployeeForm /></RoleRoute>} />
        <Route path="employees/:id/offer-letter" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["EDIT_EMPLOYEES", "MANAGE_EMPLOYEES"]}><OfferLetter /></RoleRoute>} />
        <Route path="employees/:id" element={<RoleRoute allowedRoles={["ADMIN", "EMPLOYEE"]} permissionsNeeded={["VIEW_EMPLOYEES", "MANAGE_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES"]}><EmployeeProfile /></RoleRoute>} />

        <Route path="*" element={<div className="p-4">404 Not Found</div>} />
      </Route>
    </Routes>
  );
};
