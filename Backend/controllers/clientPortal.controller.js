const mongoose = require("mongoose");
const Project = require("../models/Project");
const { getClientForUser } = require("../utils/clientAccess");

const parsePagination = (page, limit) => {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    return { pageNum, limitNum, skip };
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const withProjectPeople = (query) => query
    .populate("reportingManager", "name")
    .populate("workingEmployees", "name")
    .populate("client", "name clientId");

const requireClient = async (user) => {
    const client = await getClientForUser(user);
    if (!client) {
        const error = new Error("Client profile not found");
        error.status = 404;
        throw error;
    }
    return client;
};

const listMyProjects = async (req, res, next) => {
    try {
        const client = await requireClient(req.user);
        const { search, status, page = 1, limit = 10 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = { client: client._id };
        if (status) filter.status = status;
        if (search) {
            const regex = { $regex: escapeRegex(search), $options: "i" };
            filter.$or = [{ name: regex }, { remark: regex }];
        }

        const [total, rows] = await Promise.all([
            Project.countDocuments(filter),
            withProjectPeople(Project.find(filter)).sort({ updatedAt: -1 }).skip(skip).limit(limitNum).lean(),
        ]);

        res.status(200).json({
            success: true,
            data: rows,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, limit: limitNum },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const getMyProject = async (req, res, next) => {
    try {
        const client = await requireClient(req.user);
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID format" });
        }
        const project = await withProjectPeople(Project.findOne({ _id: req.params.id, client: client._id })).lean();
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });
        res.status(200).json({ success: true, data: project });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const listMyProjectOptions = async (req, res, next) => {
    try {
        const client = await requireClient(req.user);
        const rows = await Project.find({ client: client._id })
            .select("name status")
            .sort({ name: 1 })
            .limit(100)
            .lean();
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

module.exports = {
    listMyProjects,
    getMyProject,
    listMyProjectOptions,
};
