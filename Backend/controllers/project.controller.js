const mongoose = require("mongoose");
const Project = require("../models/Project");
const { PRIORITIES, STATUSES } = require("../models/Project");
const User = require("../models/User");
const Client = require("../models/Client");
const { downlineIds } = require("../utils/reporting");
const { removeProjectReports } = require("./dailyReport.controller");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (page, limit) => {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    return { pageNum, limitNum, skip };
};

const fail = (message) => {
    const error = new Error(message);
    error.status = 400;
    throw error;
};

const cleanHtml = (value) => {
    const text = String(value || "")
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/\son\w+=("[^"]*"|'[^']*')/gi, "")
        .trim();
    const plain = text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    if (!plain) return "";
    if (text.length > 20000) fail("Description is too long");
    return text;
};

const readText = (value, max, label) => {
    const text = String(value || "").trim();
    if (text.length > max) fail(`${label} cannot be longer than ${max} characters`);
    return text;
};

const readDay = (value, label) => {
    const text = String(value || "").trim();
    if (!text) fail(`${label} is required`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) fail(`${label} must be a valid date`);
    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) fail(`${label} must be a valid date`);
    return date;
};

const dayRange = (value) => {
    const start = readDay(value, "EOD");
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { $gte: start, $lt: end };
};

const activePeople = async (ids) => {
    if (!ids.length) return [];
    return User.find({
        _id: { $in: ids },
        status: "ACTIVE",
        userType: { $in: ["ADMIN", "EMPLOYEE"] },
    }).select("_id");
};

const readPeople = async (value, label, { min, allowed = [] }) => {
    const raw = Array.isArray(value) ? value : String(value || "").split(",").filter(Boolean);
    const ids = [...new Set(raw.map((item) => String(item || "").trim()).filter(Boolean))];
    if (ids.length < min) fail(label === "reporting manager" ? "Select a reporting manager" : "Select at least one working employee");
    if (ids.length > 50) fail("You can select up to 50 employees");
    if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) fail(label === "reporting manager" ? "Select a reporting manager" : "Select valid working employees");

    const kept = new Set(allowed.map((id) => String(id)));
    const fresh = ids.filter((id) => !kept.has(id));
    const found = await activePeople(fresh);
    if (found.length !== fresh.length) fail("Select active employees");
    return ids;
};

const readClient = async (value) => {
    const id = String(value || "").trim();
    if (!id) return null;
    if (!mongoose.Types.ObjectId.isValid(id)) fail("Select a valid client");
    const client = await Client.findById(id).select("_id").lean();
    if (!client) fail("Client not found");
    return client._id;
};

const readProject = async (body, current = {}) => {
    const name = readText(body.name, 120, "Project name");
    if (name.length < 2) fail("Project name must be at least 2 characters");
    const priority = body.priority || "MEDIUM";
    if (!PRIORITIES.includes(priority)) fail("Select a valid priority");

    const reportingManager = (await readPeople(body.reportingManager, "reporting manager", {
        min: 1,
        allowed: current.reportingManager ? [current.reportingManager] : [],
    }))[0];
    const workingEmployees = await readPeople(body.workingEmployees, "working employee", {
        min: 1,
        allowed: current.workingEmployees || [],
    });

    return {
        name,
        description: cleanHtml(body.description),
        client: await readClient(body.client),
        reportingManager,
        workingEmployees,
        priority,
        eod: readDay(body.eod, "EOD"),
        remark: readText(body.remark, 2000, "Remark"),
    };
};

const PROJECT_ACCESS = ["VIEW_PROJECTS", "MANAGE_PROJECTS", "CREATE_PROJECTS", "EDIT_PROJECTS", "DELETE_PROJECTS"];

const seesEveryProject = (user) => {
    if (user.userType === "ADMIN") return true;
    const granted = user.permissions || [];
    return PROJECT_ACCESS.some((key) => granted.includes(key));
};

const isOnProject = (project, userId) => {
    const managerId = project.reportingManager?._id || project.reportingManager;
    if (String(managerId) === String(userId)) return true;
    return (project.workingEmployees || []).some((person) => String(person?._id || person) === String(userId));
};

const canSeeProject = (project, user) => {
    if (!project) return false;
    if (seesEveryProject(user)) return true;
    return isOnProject(project, user._id);
};

const memberIds = (project) => {
    const managerId = String(project.reportingManager?._id || project.reportingManager || "");
    const workers = (project.workingEmployees || []).map((person) => String(person?._id || person));
    return [managerId, ...workers].filter(Boolean);
};

const isSeniorOf = (project, downline) => memberIds(project).some((id) => downline.has(id));

const canUpdateStatus = (project, user, downline) => {
    if (!project) return false;
    if (user.userType === "ADMIN") return true;
    if (isOnProject(project, user._id)) return true;
    return isSeniorOf(project, downline);
};

const canOpenProject = async (project, user) => {
    if (canSeeProject(project, user)) return true;
    if (!project) return false;
    const downline = new Set((await downlineIds(user._id)).map((item) => String(item)));
    return isSeniorOf(project, downline);
};

const presentProject = (project, extra = {}) => ({
    ...project,
    status: STATUSES.includes(project?.status) ? project.status : "START",
    ...extra,
});

const withPeople = (query) => query
    .populate("client", "name clientId email phone")
    .populate("reportingManager", "name")
    .populate("workingEmployees", "name")
    .populate("createdBy", "name");

const createProject = async (req, res, next) => {
    try {
        const fields = await readProject(req.body);
        const project = await Project.create({ ...fields, status: "START", createdBy: req.user._id });
        const data = await withPeople(Project.findById(project._id)).lean();
        const downline = req.user.userType === "ADMIN"
            ? new Set()
            : new Set((await downlineIds(req.user._id)).map((item) => String(item)));
        res.status(201).json({
            success: true,
            data: presentProject(data, { canUpdateStatus: canUpdateStatus(data, req.user, downline) }),
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const getProjects = async (req, res, next) => {
    try {
        const { search, priority, status, reportingManager, employee, client, eod, page = 1, limit = 10 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = {};
        const clauses = [];
        if (!seesEveryProject(req.user)) {
            const downline = await downlineIds(req.user._id);
            const visiblePeople = [req.user._id, ...downline];
            clauses.push({
                $or: [
                    { reportingManager: { $in: visiblePeople } },
                    { workingEmployees: { $in: visiblePeople } },
                ],
            });
        }

        if (priority) {
            if (!PRIORITIES.includes(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });
            filter.priority = priority;
        }
        if (status) {
            if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
            if (status === "START") {
                clauses.push({ $or: [{ status: "START" }, { status: { $exists: false } }, { status: null }] });
            } else {
                filter.status = status;
            }
        }
        if (reportingManager && seesEveryProject(req.user)) {
            if (!mongoose.Types.ObjectId.isValid(reportingManager)) {
                return res.status(400).json({ success: false, message: "Invalid reporting manager" });
            }
            filter.reportingManager = reportingManager;
        }
        if (employee) {
            if (!mongoose.Types.ObjectId.isValid(employee)) {
                return res.status(400).json({ success: false, message: "Invalid employee" });
            }
            filter.workingEmployees = employee;
        }
        if (client) {
            if (!mongoose.Types.ObjectId.isValid(client)) {
                return res.status(400).json({ success: false, message: "Invalid client" });
            }
            filter.client = client;
        }
        if (eod) filter.eod = dayRange(eod);
        if (search) {
            const regex = { $regex: escapeRegex(search), $options: "i" };
            clauses.push({ $or: [{ name: regex }, { remark: regex }] });
        }
        if (clauses.length) filter.$and = clauses;

        const [total, rows, downlineList] = await Promise.all([
            Project.countDocuments(filter),
            withPeople(Project.find(filter)).sort({ eod: 1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
            req.user.userType === "ADMIN" ? Promise.resolve([]) : downlineIds(req.user._id),
        ]);
        const downline = new Set(downlineList.map((item) => String(item)));

        res.status(200).json({
            success: true,
            data: rows.map((row) => presentProject(row, { canUpdateStatus: canUpdateStatus(row, req.user, downline) })),
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, limit: limitNum },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const getProjectEmployees = async (req, res, next) => {
    try {
        const { searchPeople } = require("../utils/peopleQuery");
        const people = await searchPeople({
            search: req.query.search,
            ids: req.query.ids,
            limit: req.query.limit,
            filter: { status: "ACTIVE", userType: { $in: ["ADMIN", "EMPLOYEE"] } },
        });
        res.status(200).json({ success: true, data: people });
    } catch (error) {
        next(error);
    }
};

const getProjectClients = async (req, res, next) => {
    try {
        const cap = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 30);
        const chosen = String(req.query.ids || "")
            .split(",")
            .map((item) => item.trim())
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .slice(0, 30);
        const text = String(req.query.search || "").trim();
        const filter = {};
        if (text) {
            const regex = { $regex: escapeRegex(text), $options: "i" };
            filter.$or = [{ name: regex }, { email: regex }, { phone: regex }, { clientId: regex }];
        }
        const rows = await Client.find(filter).select("name clientId email phone").sort({ name: 1 }).limit(cap).lean();
        const seen = new Set(rows.map((row) => String(row._id)));
        const missing = chosen.filter((id) => !seen.has(String(id)));
        const extra = missing.length
            ? await Client.find({ _id: { $in: missing } }).select("name clientId email phone").lean()
            : [];
        res.status(200).json({ success: true, data: [...extra, ...rows] });
    } catch (error) {
        next(error);
    }
};

const getProjectById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID format" });
        }
        const project = await withPeople(Project.findById(req.params.id)).lean();
        if (!(await canOpenProject(project, req.user))) return res.status(404).json({ success: false, message: "Project not found" });
        const downline = req.user.userType === "ADMIN"
            ? new Set()
            : new Set((await downlineIds(req.user._id)).map((item) => String(item)));
        res.status(200).json({
            success: true,
            data: presentProject(project, { canUpdateStatus: canUpdateStatus(project, req.user, downline) }),
        });
    } catch (error) {
        next(error);
    }
};

const updateProject = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID format" });
        }
        const project = await Project.findById(req.params.id);
        if (!canSeeProject(project, req.user)) return res.status(404).json({ success: false, message: "Project not found" });

        const fields = await readProject(req.body, {
            reportingManager: project.reportingManager,
            workingEmployees: project.workingEmployees,
        });
        Object.assign(project, fields);
        await project.save();

        const data = await withPeople(Project.findById(project._id)).lean();
        const downline = req.user.userType === "ADMIN"
            ? new Set()
            : new Set((await downlineIds(req.user._id)).map((item) => String(item)));
        res.status(200).json({
            success: true,
            data: presentProject(data, { canUpdateStatus: canUpdateStatus(data, req.user, downline) }),
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const updateProjectStatus = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID format" });
        }
        const status = String(req.body.status || "").trim();
        if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Select a valid status" });

        const project = await Project.findById(req.params.id);
        if (!(await canOpenProject(project, req.user))) return res.status(404).json({ success: false, message: "Project not found" });
        const downline = req.user.userType === "ADMIN"
            ? new Set()
            : new Set((await downlineIds(req.user._id)).map((item) => String(item)));
        if (!canUpdateStatus(project, req.user, downline)) {
            return res.status(403).json({ success: false, message: "You cannot update this project status" });
        }

        project.status = status;
        await project.save();
        const data = await withPeople(Project.findById(project._id)).lean();
        res.status(200).json({ success: true, data: presentProject(data, { canUpdateStatus: true }) });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID format" });
        }
        const project = await Project.findById(req.params.id);
        if (!canSeeProject(project, req.user)) return res.status(404).json({ success: false, message: "Project not found" });
        await removeProjectReports(project._id);
        await project.deleteOne();
        res.status(200).json({ success: true, message: "Project deleted" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectEmployees,
    getProjectClients,
    getProjectById,
    updateProject,
    updateProjectStatus,
    deleteProject,
};
