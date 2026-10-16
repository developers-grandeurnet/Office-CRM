const mongoose = require("mongoose");
const DailyReport = require("../models/DailyReport");
const Project = require("../models/Project");
const { uploadReportFile, destroyCloudinaryFile } = require("../config/cloudinary");
const { downlineIds } = require("../utils/reporting");

const parsePagination = (page, limit) => {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

const fail = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    throw error;
};

const isAdmin = (user) => user.userType === "ADMIN";

const cleanHtml = (value, label, required) => {
    const text = String(value || "")
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/\son\w+=("[^"]*"|'[^']*')/gi, "")
        .trim();
    const plain = text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    if (!plain) {
        if (required) fail(`${label} is required`);
        return "";
    }
    if (text.length > 20000) fail(`${label} is too long`);
    return text;
};

const readDay = (value) => {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) fail("Date is required");
    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) fail("Date must be a valid date");
    return date;
};

const idOf = (value) => String(value?._id || value || "");

const loadProject = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) fail("Invalid project ID format");
    const project = await Project.findById(id).select("name reportingManager workingEmployees");
    if (!project) fail("Project not found", 404);
    return project;
};

const onProject = (project, userId) => {
    if (idOf(project.reportingManager) === String(userId)) return true;
    return (project.workingEmployees || []).some((person) => idOf(person) === String(userId));
};

const seniorOf = (downlineSet, authorId) => downlineSet.has(String(authorId));

const canOpen = async (project, user) => {
    if (isAdmin(user) || onProject(project, user._id)) return true;
    const downline = await downlineIds(user._id);
    const ids = new Set(downline.map((item) => String(item)));
    if (ids.has(idOf(project.reportingManager))) return true;
    return (project.workingEmployees || []).some((person) => ids.has(idOf(person)));
};

const accessBag = async (user) => ({
    admin: isAdmin(user),
    userId: String(user._id),
    downline: new Set((await downlineIds(user._id)).map((item) => String(item))),
});

const canManage = (report, project, bag) => {
    const authorId = idOf(report.author);
    if (bag.admin || authorId === bag.userId) return true;
    if (idOf(project.reportingManager) === bag.userId) return true;
    return seniorOf(bag.downline, authorId);
};

const canRead = (report, project, bag) => canManage(report, project, bag);

const person = (user) => {
    if (!user) return null;
    return {
        _id: user._id,
        name: user.name,
        designation: user.designation?.name || "",
    };
};

const presentFiles = (files) => (files || []).map((file) => ({
    _id: file._id,
    name: file.name,
    url: file.url,
}));

const present = (row, project, bag) => ({
    _id: row._id,
    project: row.project?._id || row.project,
    date: row.date,
    report: row.report,
    clientRequirement: row.clientRequirement || "",
    files: presentFiles(row.files),
    author: person(row.author),
    editedBy: row.editedBy && idOf(row.editedBy) !== idOf(row.author) ? person(row.editedBy) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canEdit: canManage(row, project, bag),
});

const withPeople = (query) => query
    .populate({ path: "author", select: "name designation", populate: { path: "designation", select: "name" } })
    .populate({ path: "editedBy", select: "name designation", populate: { path: "designation", select: "name" } });

const storedFile = async (file) => {
    const result = await uploadReportFile(file);
    const name = String(file.originalname || "file").split(/[/\\]/).pop().slice(0, 80);
    return {
        name: name || "file",
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: file.mimetype === "application/pdf" ? "raw" : "image",
        format: result.format || "",
    };
};

const readRemoveIds = (value) => {
    if (Array.isArray(value)) return value.map(String);
    const text = String(value || "").trim();
    if (!text) return [];
    if (text.startsWith("[")) {
        try {
            const parsed = JSON.parse(text);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (error) {
            return [];
        }
    }
    return text.split(",").map((item) => item.trim()).filter(Boolean);
};

const duplicateMessage = (error) => error?.code === 11000;

const listReports = async (req, res, next) => {
    try {
        const project = await loadProject(req.params.id);
        if (!(await canOpen(project, req.user))) return res.status(404).json({ success: false, message: "Project not found" });
        const bag = await accessBag(req.user);
        const { page = 1, limit = 10, date, author } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = { project: project._id };
        if (date) filter.date = readDay(date);
        const seesAllOnProject = bag.admin || idOf(project.reportingManager) === bag.userId;
        const allowedAuthors = new Set([bag.userId, ...bag.downline]);
        if (!seesAllOnProject) filter.author = { $in: [...allowedAuthors] };
        if (author) {
            if (!mongoose.Types.ObjectId.isValid(author)) return res.status(400).json({ success: false, message: "Invalid author" });
            if (!seesAllOnProject && !allowedAuthors.has(String(author))) {
                return res.status(200).json({
                    success: true,
                    canWrite: bag.admin || onProject(project, req.user._id),
                    data: [],
                    pagination: { total: 0, page: pageNum, pages: 1, limit: limitNum },
                });
            }
            filter.author = author;
        }

        const [total, rows] = await Promise.all([
            DailyReport.countDocuments(filter),
            withPeople(DailyReport.find(filter)).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        ]);

        res.status(200).json({
            success: true,
            canWrite: bag.admin || onProject(project, req.user._id),
            canReview: seesAllOnProject || bag.downline.size > 0,
            data: rows.map((row) => present(row, project, bag)),
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, limit: limitNum },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const createReport = async (req, res, next) => {
    const uploaded = [];
    try {
        const project = await loadProject(req.params.id);
        if (!(await canOpen(project, req.user))) return res.status(404).json({ success: false, message: "Project not found" });
        if (!isAdmin(req.user) && !onProject(project, req.user._id)) {
            return res.status(403).json({ success: false, message: "Only people on this project can add a daily report" });
        }
        const files = req.files || [];
        if (files.length > 8) fail("You can add up to 8 files");
        for (const file of files) uploaded.push(await storedFile(file));

        const row = await DailyReport.create({
            project: project._id,
            author: req.user._id,
            date: readDay(req.body.date),
            report: cleanHtml(req.body.report, "Report", true),
            clientRequirement: cleanHtml(req.body.clientRequirement, "Client requirement", false),
            files: uploaded,
        });
        const data = await withPeople(DailyReport.findById(row._id)).lean();
        const bag = await accessBag(req.user);
        res.status(201).json({ success: true, data: present(data, project, bag) });
    } catch (error) {
        await Promise.all(uploaded.map((file) => destroyCloudinaryFile(file.publicId, file.resourceType)));
        if (duplicateMessage(error)) return res.status(400).json({ success: false, message: "You already added a report for this date. Edit that report." });
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const loadOwned = async (projectId, reportId, user) => {
    const project = await loadProject(projectId);
    if (!(await canOpen(project, user))) fail("Project not found", 404);
    if (!mongoose.Types.ObjectId.isValid(reportId)) fail("Invalid report ID format");
    const report = await DailyReport.findOne({ _id: reportId, project: project._id });
    if (!report) fail("Report not found", 404);
    const bag = await accessBag(user);
    if (!canManage(report, project, bag)) fail("You cannot change this report", 403);
    return { project, report, bag };
};

const updateReport = async (req, res, next) => {
    const uploaded = [];
    try {
        const { project, report, bag } = await loadOwned(req.params.id, req.params.reportId, req.user);
        const removeIds = new Set(readRemoveIds(req.body.removeFileIds));
        const kept = (report.files || []).filter((file) => !removeIds.has(String(file._id)));
        const incoming = req.files || [];
        if (kept.length + incoming.length > 8) fail("You can add up to 8 files");
        for (const file of incoming) uploaded.push(await storedFile(file));
        const removed = (report.files || []).filter((file) => removeIds.has(String(file._id)));

        report.date = readDay(req.body.date);
        report.report = cleanHtml(req.body.report, "Report", true);
        report.clientRequirement = cleanHtml(req.body.clientRequirement, "Client requirement", false);
        report.files = [...kept, ...uploaded];
        report.editedBy = idOf(report.author) === String(req.user._id) ? null : req.user._id;
        await report.save();
        await Promise.all(removed.map((file) => destroyCloudinaryFile(file.publicId, file.resourceType)));

        const data = await withPeople(DailyReport.findById(report._id)).lean();
        res.status(200).json({ success: true, data: present(data, project, bag) });
    } catch (error) {
        await Promise.all(uploaded.map((file) => destroyCloudinaryFile(file.publicId, file.resourceType)));
        if (duplicateMessage(error)) return res.status(400).json({ success: false, message: "A report for this date already exists." });
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const deleteReport = async (req, res, next) => {
    try {
        const { report } = await loadOwned(req.params.id, req.params.reportId, req.user);
        await Promise.all((report.files || []).map((file) => destroyCloudinaryFile(file.publicId, file.resourceType)));
        await report.deleteOne();
        res.status(200).json({ success: true, message: "Report deleted" });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const removeProjectReports = async (projectId) => {
    const rows = await DailyReport.find({ project: projectId });
    await Promise.all(rows.flatMap((row) => (row.files || []).map((file) => destroyCloudinaryFile(file.publicId, file.resourceType))));
    await DailyReport.deleteMany({ project: projectId });
};

module.exports = {
    listReports,
    createReport,
    updateReport,
    deleteReport,
    removeProjectReports,
};
