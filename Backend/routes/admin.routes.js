const express = require("express");
const router = express.Router();

const { createEmployee, getEmployees, getEmployeeById, updateEmployee, changeEmployeeStatus, deleteEmployee, updateUserPermissions, parseEmployeePayload } = require("../controllers/admin.controller");
const {
    createDepartment,
    getDepartments,
    getDepartmentById,
    updateDepartment,
    changeDepartmentStatus,
    deleteDepartment
} = require("../controllers/department.controller");
const {
    createDesignation,
    getDesignations,
    getDesignationById,
    getDesignationsByDepartment,
    updateDesignation,
    changeDesignationStatus,
    deleteDesignation
} = require("../controllers/designation.controller");
const {
    createEmployeeType,
    getEmployeeTypes,
    getEmployeeTypeById,
    updateEmployeeType,
    changeEmployeeTypeStatus,
    deleteEmployeeType
} = require("../controllers/employeeType.controller");
const {
    createWorkMode,
    getWorkModes,
    getWorkModeById,
    updateWorkMode,
    changeWorkModeStatus,
    deleteWorkMode
} = require("../controllers/workMode.controller");
const {
    createLeaveType,
    getLeaveTypes,
    getLeaveTypeById,
    updateLeaveType,
    changeLeaveTypeStatus,
    deleteLeaveType
} = require("../controllers/leaveType.controller");
const {
    createLeaveAssignment,
    saveLeaveAssignments,
    getLeaveAssignments,
    getLeaveAssignmentById,
    updateLeaveAssignment,
    deleteLeaveAssignment
} = require("../controllers/leaveAssignment.controller");
const {
    createService,
    getServices,
    getServiceById,
    updateService,
    deleteService
} = require("../controllers/service.controller");
const {
    createClient,
    getClients,
    getClientById,
    updateClient,
    deleteClient
} = require("../controllers/client.controller");
const {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
    getLeadAssignees,
    assignLead
} = require("../controllers/lead.controller");
const {
    createFollowUp,
    getLeadFollowUps,
    getDueFollowUps
} = require("../controllers/followUp.controller");
const { listSales, listPayments, listRevenue } = require("../controllers/sale.controller");
const { downloadLeadSample, importLeads, exportLeads } = require("../controllers/leadSheet.controller");
const { getReportCatalog, getReport, getReportOptions } = require("../controllers/report.controller");
const { getDashboard } = require("../controllers/dashboard.controller");
const { getAttendance, punchAttendance, attendanceEmployees } = require("../controllers/attendance.controller");
const { listSalary, salaryEmployees } = require("../controllers/salary.controller");
const rateLimit = require("express-rate-limit");
const { registerValidator } = require("../validators/auth.validator");
const validate = require("../middlewares/validate.middleware");
const { receiveEmployeeDocuments, receiveLeaveDocument, receiveTicketFile, receiveReportFiles, receiveResume, receiveLogo, receiveSettingsMedia, receiveLeadSheet, receiveAttendancePhoto } = require("../config/cloudinary");
const punchLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `punch:${req.user._id}`,
    message: { success: false, message: "Too many punch attempts. Try again in a few minutes." },
});
const { getSettings, updateSettings, clearSettingField } = require("../controllers/settings.controller");
const {
    getOfferLetter,
    generateOfferLetter,
    downloadOfferLetter,
    sendOfferLetterMail
} = require("../controllers/offerLetter.controller");
const {
    createUrgentWork,
    getUrgentWorks,
    getUrgentWorkOptions,
    getUrgentWorkById,
    updateUrgentWork,
    deleteUrgentWork
} = require("../controllers/urgentWork.controller");
const {
    createTicket,
    getTickets,
    getTicketById,
    replyToTicket,
    updateTicketStatus,
    deleteTicket
} = require("../controllers/ticket.controller");
const {
    listReports,
    createReport,
    updateReport,
    deleteReport
} = require("../controllers/dailyReport.controller");
const {
    createProject,
    getProjects,
    getProjectEmployees,
    getProjectClients,
    getProjectById,
    updateProject,
    updateProjectStatus,
    deleteProject
} = require("../controllers/project.controller");
const {
    createInterview,
    getInterviews,
    getInterviewers,
    getInterviewById,
    updateInterview,
    deleteInterview
} = require("../controllers/interview.controller");
const {
    createLeaveRequest,
    listMine,
    myBalance,
    listQueue,
    updateLeaveRequest,
    deleteLeaveRequest,
    reviewLeaveRequest
} = require("../controllers/leaveRequest.controller");
const { authenticate, authorize, checkPermission } = require("../middlewares/auth.middleware");

const allow = (action, ...keys) => checkPermission(keys, action);

const employeeRead = ["VIEW_EMPLOYEES", "CREATE_EMPLOYEES", "EDIT_EMPLOYEES", "DELETE_EMPLOYEES", "MANAGE_EMPLOYEES"];
const employeeWrite = ["CREATE_EMPLOYEES", "MANAGE_EMPLOYEES"];
const employeeEdit = ["EDIT_EMPLOYEES", "MANAGE_EMPLOYEES"];
const employeeDelete = ["DELETE_EMPLOYEES", "MANAGE_EMPLOYEES"];
const departmentRead = ["VIEW_DEPARTMENTS", "CREATE_DEPARTMENTS", "EDIT_DEPARTMENTS", "DELETE_DEPARTMENTS", "MANAGE_DEPARTMENTS", "VIEW_DESIGNATIONS", "CREATE_DESIGNATIONS", "EDIT_DESIGNATIONS", "DELETE_DESIGNATIONS", "MANAGE_DESIGNATIONS", ...employeeRead];
const departmentWrite = ["CREATE_DEPARTMENTS", "MANAGE_DEPARTMENTS"];
const departmentEdit = ["EDIT_DEPARTMENTS", "MANAGE_DEPARTMENTS"];
const departmentDelete = ["DELETE_DEPARTMENTS", "MANAGE_DEPARTMENTS"];
const designationRead = ["VIEW_DESIGNATIONS", "CREATE_DESIGNATIONS", "EDIT_DESIGNATIONS", "DELETE_DESIGNATIONS", "MANAGE_DESIGNATIONS", ...employeeRead];
const designationWrite = ["CREATE_DESIGNATIONS", "MANAGE_DESIGNATIONS"];
const designationEdit = ["EDIT_DESIGNATIONS", "MANAGE_DESIGNATIONS"];
const designationDelete = ["DELETE_DESIGNATIONS", "MANAGE_DESIGNATIONS"];
const serviceRead = ["VIEW_SERVICES", "CREATE_SERVICES", "EDIT_SERVICES", "DELETE_SERVICES", "MANAGE_SERVICES"];
const serviceWrite = ["CREATE_SERVICES", "MANAGE_SERVICES"];
const serviceEdit = ["EDIT_SERVICES", "MANAGE_SERVICES"];
const serviceDelete = ["DELETE_SERVICES", "MANAGE_SERVICES"];
const clientRead = ["VIEW_CLIENTS", "CREATE_CLIENTS", "EDIT_CLIENTS", "DELETE_CLIENTS", "MANAGE_CLIENTS"];
const clientWrite = ["CREATE_CLIENTS", "MANAGE_CLIENTS"];
const clientEdit = ["EDIT_CLIENTS", "MANAGE_CLIENTS"];
const clientDelete = ["DELETE_CLIENTS", "MANAGE_CLIENTS"];
const leadRead = ["VIEW_LEADS", "CREATE_LEADS", "EDIT_LEADS", "DELETE_LEADS", "MANAGE_LEADS"];
const leadWrite = ["CREATE_LEADS", "MANAGE_LEADS"];
const interviewRead = ["VIEW_INTERVIEWS", "CREATE_INTERVIEWS", "EDIT_INTERVIEWS", "DELETE_INTERVIEWS", "MANAGE_INTERVIEWS"];
const interviewWrite = ["CREATE_INTERVIEWS", "MANAGE_INTERVIEWS"];
const interviewEdit = ["EDIT_INTERVIEWS", "MANAGE_INTERVIEWS"];
const interviewDelete = ["DELETE_INTERVIEWS", "MANAGE_INTERVIEWS"];
const projectWrite = ["CREATE_PROJECTS", "MANAGE_PROJECTS"];
const projectEdit = ["EDIT_PROJECTS", "MANAGE_PROJECTS"];
const projectDelete = ["DELETE_PROJECTS", "MANAGE_PROJECTS"];
const projectPeople = ["VIEW_PROJECTS", "CREATE_PROJECTS", "EDIT_PROJECTS", "DELETE_PROJECTS", "MANAGE_PROJECTS"];

router.use(authenticate, authorize("ADMIN", "EMPLOYEE"));

router.post("/employees/create", allow("add employees", ...employeeWrite), receiveEmployeeDocuments, parseEmployeePayload, registerValidator, validate, createEmployee);
router.get("/employees/list", allow("view employees", ...employeeRead), getEmployees);
router.get("/employees/details/:id", allow("view employees", ...employeeRead), getEmployeeById);
router.get("/employees/:id/offer-letter", allow("issue an offer letter", ...employeeEdit), getOfferLetter);
router.post("/employees/:id/offer-letter", allow("issue an offer letter", ...employeeEdit), generateOfferLetter);
router.get("/employees/:id/offer-letter/pdf", allow("issue an offer letter", ...employeeEdit), downloadOfferLetter);
router.post("/employees/:id/offer-letter/send", allow("issue an offer letter", ...employeeEdit), sendOfferLetterMail);
router.patch("/employees/update/:id", allow("edit employees", ...employeeEdit), receiveEmployeeDocuments, parseEmployeePayload, updateEmployee);
router.patch("/employees/status/:id", allow("change employee status", ...employeeDelete), changeEmployeeStatus);
router.delete("/employees/:id", allow("delete employees", ...employeeDelete), deleteEmployee);
router.put("/users/:id/permissions", allow("change permissions", "MANAGE_PERMISSIONS"), updateUserPermissions);

router.post("/departments/create", allow("add departments", ...departmentWrite), createDepartment);
router.get("/departments/list", allow("view departments", ...departmentRead), getDepartments);
router.get("/departments/details/:id", allow("view departments", ...departmentRead), getDepartmentById);
router.patch("/departments/update/:id", allow("edit departments", ...departmentEdit), updateDepartment);
router.patch("/departments/status/:id", allow("change department status", ...departmentDelete), changeDepartmentStatus);
router.delete("/departments/:id", allow("delete departments", ...departmentDelete), deleteDepartment);

router.post("/designations/create", allow("add designations", ...designationWrite), createDesignation);
router.get("/designations/list", allow("view designations", ...designationRead), getDesignations);
router.get("/designations/details/:id", allow("view designations", ...designationRead), getDesignationById);
router.get("/designations/list/department/:departmentId", allow("view designations", ...designationRead), getDesignationsByDepartment);
router.patch("/designations/update/:id", allow("edit designations", ...designationEdit), updateDesignation);
router.patch("/designations/status/:id", allow("change designation status", ...designationDelete), changeDesignationStatus);
router.delete("/designations/:id", allow("delete designations", ...designationDelete), deleteDesignation);

router.post("/employee-types/create", allow("add employee types", ...employeeWrite), createEmployeeType);
router.get("/employee-types/list", allow("view employee types", ...employeeRead), getEmployeeTypes);
router.get("/employee-types/details/:id", allow("view employee types", ...employeeRead), getEmployeeTypeById);
router.patch("/employee-types/update/:id", allow("edit employee types", ...employeeEdit), updateEmployeeType);
router.patch("/employee-types/status/:id", allow("change employee type status", ...employeeDelete), changeEmployeeTypeStatus);
router.delete("/employee-types/:id", allow("delete employee types", ...employeeDelete), deleteEmployeeType);

router.post("/work-modes/create", allow("add work modes", ...employeeWrite), createWorkMode);
router.get("/work-modes/list", allow("view work modes", ...employeeRead), getWorkModes);
router.get("/work-modes/details/:id", allow("view work modes", ...employeeRead), getWorkModeById);
router.patch("/work-modes/update/:id", allow("edit work modes", ...employeeEdit), updateWorkMode);
router.patch("/work-modes/status/:id", allow("change work mode status", ...employeeDelete), changeWorkModeStatus);
router.delete("/work-modes/:id", allow("delete work modes", ...employeeDelete), deleteWorkMode);

router.post("/leave-types/create", allow("add leave types", ...employeeWrite), createLeaveType);
router.get("/leave-types/list", allow("view leave types", ...employeeRead), getLeaveTypes);
router.get("/leave-types/details/:id", allow("view leave types", ...employeeRead), getLeaveTypeById);
router.patch("/leave-types/update/:id", allow("edit leave types", ...employeeEdit), updateLeaveType);
router.patch("/leave-types/status/:id", allow("change leave type status", ...employeeDelete), changeLeaveTypeStatus);
router.delete("/leave-types/:id", allow("delete leave types", ...employeeDelete), deleteLeaveType);

router.post("/leave-assignments/create", allow("assign leave", ...employeeWrite), createLeaveAssignment);
router.post("/leave-assignments/save", allow("assign leave", ...employeeWrite, ...employeeEdit), saveLeaveAssignments);
router.get("/leave-assignments/list", allow("view leave assignments", ...employeeRead), getLeaveAssignments);
router.get("/leave-assignments/details/:id", allow("view leave assignments", ...employeeRead), getLeaveAssignmentById);
router.patch("/leave-assignments/update/:id", allow("edit leave assignments", ...employeeEdit), updateLeaveAssignment);
router.delete("/leave-assignments/:id", allow("delete leave assignments", ...employeeDelete), deleteLeaveAssignment);

router.post("/services/create", allow("add services", ...serviceWrite), createService);
router.get("/services/list", allow("view services", ...serviceRead), getServices);
router.get("/services/details/:id", allow("view services", ...serviceRead), getServiceById);
router.patch("/services/update/:id", allow("edit services", ...serviceEdit), updateService);
router.delete("/services/:id", allow("delete services", ...serviceDelete), deleteService);

router.post("/clients/create", allow("add clients", ...clientWrite), createClient);
router.get("/clients/list", allow("view clients", ...clientRead), getClients);
router.get("/clients/details/:id", allow("view clients", ...clientRead), getClientById);
router.patch("/clients/update/:id", allow("edit clients", ...clientEdit), updateClient);
router.delete("/clients/:id", allow("delete clients", ...clientDelete), deleteClient);

router.post("/leads/create", allow("add leads", ...leadWrite), createLead);
router.get("/leads/sample", allow("add leads", ...leadWrite), downloadLeadSample);
router.get("/leads/export", allow("view leads", ...leadRead), exportLeads);
router.post("/leads/import", allow("add leads", ...leadWrite), receiveLeadSheet, importLeads);
router.get("/leads/list", allow("view leads", ...leadRead), getLeads);
router.get("/leads/assignees", allow("view leads", ...leadRead), getLeadAssignees);
router.get("/leads/details/:id", allow("view leads", ...leadRead), getLeadById);
router.patch("/leads/update/:id", allow("edit leads", ...leadRead), updateLead);
router.patch("/leads/:id/assign", allow("assign leads", ...leadRead), assignLead);
router.delete("/leads/:id", allow("delete leads", ...leadRead), deleteLead);
router.get("/leads/:id/follow-ups", allow("view leads", ...leadRead), getLeadFollowUps);
router.post("/leads/:id/follow-ups", allow("update a follow-up", ...leadRead), createFollowUp);
router.get("/follow-ups/due", allow("view follow-ups", ...leadRead), getDueFollowUps);
router.get("/sales/list", allow("view sales", ...leadRead), listSales);
router.get("/payments/list", allow("view payments", ...leadRead), listPayments);
router.get("/revenue/list", allow("view revenue", ...leadRead), listRevenue);
router.get("/dashboard/summary", getDashboard);
router.get("/reports/catalog", getReportCatalog);
router.get("/reports/options", getReportOptions);
router.get("/reports", getReport);
router.get("/attendance/employees", attendanceEmployees);
router.get("/attendance", getAttendance);
router.post("/attendance/punch", punchLimiter, receiveAttendancePhoto, punchAttendance);
router.get("/salary/employees", allow("pick salary employees", "MANAGE_SALARY"), salaryEmployees);
router.get("/salary", allow("view salary", "VIEW_SALARY", "MANAGE_SALARY"), listSalary);

router.get("/leave-requests/mine", listMine);
router.get("/leave-requests/balance", myBalance);
router.get("/leave-requests/queue", listQueue);
router.post("/leave-requests", receiveLeaveDocument, createLeaveRequest);
router.patch("/leave-requests/:id/review", allow("review leave", "APPROVE_LEAVE"), reviewLeaveRequest);
router.patch("/leave-requests/:id", receiveLeaveDocument, updateLeaveRequest);
router.delete("/leave-requests/:id", deleteLeaveRequest);

router.post("/urgent-works/create", receiveTicketFile, createUrgentWork);
router.get("/urgent-works/list", getUrgentWorks);
router.get("/urgent-works/options", getUrgentWorkOptions);
router.get("/urgent-works/details/:id", getUrgentWorkById);
router.patch("/urgent-works/update/:id", receiveTicketFile, updateUrgentWork);
router.delete("/urgent-works/:id", deleteUrgentWork);

router.post("/tickets/create", receiveTicketFile, createTicket);
router.get("/tickets/list", getTickets);
router.get("/tickets/details/:id", getTicketById);
router.post("/tickets/:id/replies", replyToTicket);
router.patch("/tickets/:id/status", updateTicketStatus);
router.delete("/tickets/:id", deleteTicket);

router.post("/projects/create", allow("add projects", ...projectWrite), createProject);
router.get("/projects/list", getProjects);
router.get("/projects/employees", allow("choose project employees", ...projectPeople), getProjectEmployees);
router.get("/projects/clients", allow("choose project client", ...projectPeople), getProjectClients);
router.get("/projects/details/:id", getProjectById);
router.get("/projects/:id/reports", listReports);
router.post("/projects/:id/reports", receiveReportFiles, createReport);
router.patch("/projects/:id/reports/:reportId", receiveReportFiles, updateReport);
router.delete("/projects/:id/reports/:reportId", deleteReport);
router.patch("/projects/update/:id", allow("edit projects", ...projectEdit), updateProject);
router.patch("/projects/:id/status", updateProjectStatus);
router.delete("/projects/:id", allow("delete projects", ...projectDelete), deleteProject);

router.post("/interviews/create", allow("add interviews", ...interviewWrite), receiveResume, createInterview);
router.get("/interviews/list", allow("view interviews", ...interviewRead), getInterviews);
router.get("/interviews/interviewers", allow("view interviews", ...interviewRead), getInterviewers);
router.get("/interviews/details/:id", allow("view interviews", ...interviewRead), getInterviewById);
router.patch("/interviews/update/:id", allow("edit interviews", ...interviewEdit), receiveResume, updateInterview);
router.delete("/interviews/:id", allow("delete interviews", ...interviewDelete), deleteInterview);

router.get("/settings", allow("open settings", "MANAGE_SETTINGS"), getSettings);
router.patch("/settings", allow("update settings", "MANAGE_SETTINGS"), receiveSettingsMedia, updateSettings);
router.delete("/settings/field/:field", allow("update settings", "MANAGE_SETTINGS"), clearSettingField);

module.exports = router;
