const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const { PRIORITIES, STATUSES } = require("../models/Ticket");
const TicketReply = require("../models/TicketReply");
const Project = require("../models/Project");
const { uploadTicketFile, destroyCloudinaryFile } = require("../config/cloudinary");
const { downlineIds } = require("../utils/reporting");
const {
    getClientForUser,
    staffVisibleProjectIds,
    isOnProjectTeam,
    isSeniorOfProject,
} = require("../utils/clientAccess");
const { pushToUsers, recipientsForProject, adminIds, walkSeniors } = require("../utils/notify");

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

const cleanHtml = (value, label) => {
    const text = String(value || "")
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/\son\w+=("[^"]*"|'[^']*')/gi, "")
        .trim();
    const plain = text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    if (!plain) fail(`${label} is required`);
    if (text.length > 20000) fail(`${label} is too long`);
    return text;
};

const isAdmin = (user) => user.userType === "ADMIN";
const isClient = (user) => user.userType === "CLIENT";

const teamIds = async (user) => {
    const downline = await downlineIds(user._id);
    return [user._id, ...downline];
};

const ticketKind = (ticket) => (ticket?.kind === "CLIENT" ? "CLIENT" : "HELP");

const loadProject = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Project.findById(id).select("name client reportingManager workingEmployees").lean();
};

const canSeeTicket = async (ticket, user) => {
    if (!ticket) return false;
    if (isAdmin(user)) return true;
    const raiserId = String(ticket.raisedBy?._id || ticket.raisedBy);
    if (raiserId === String(user._id)) return true;

    if (ticketKind(ticket) === "CLIENT") {
        if (isClient(user)) {
            const mine = await getClientForUser(user);
            return mine && String(ticket.client?._id || ticket.client) === String(mine._id);
        }
        const project = await loadProject(ticket.project?._id || ticket.project);
        if (!project) return false;
        if (isOnProjectTeam(project, user._id)) return true;
        return isSeniorOfProject(project, user);
    }

    if (isClient(user)) return false;
    const allowed = await teamIds(user);
    return allowed.some((id) => String(id) === raiserId);
};

const canChangeStatus = async (ticket, user) => {
    if (!ticket) return false;
    if (isAdmin(user)) return true;
    const raiserId = String(ticket.raisedBy?._id || ticket.raisedBy);
    if (raiserId === String(user._id)) return false;

    if (ticketKind(ticket) === "CLIENT") {
        if (isClient(user)) return false;
        const project = await loadProject(ticket.project?._id || ticket.project);
        if (!project) return false;
        if (isOnProjectTeam(project, user._id)) return true;
        return isSeniorOfProject(project, user);
    }

    if (isClient(user)) return false;
    const downline = await downlineIds(user._id);
    return downline.some((id) => String(id) === raiserId);
};

const presentFile = (file) => (file?.url ? { name: file.name, url: file.url } : null);

const presentTicket = (ticket, extra = {}) => ({
    ...ticket,
    kind: ticketKind(ticket),
    file: presentFile(ticket.file),
    ...extra,
});

const withTicketPeople = (query) => query
    .populate("raisedBy", "name userType")
    .populate("project", "name")
    .populate("client", "name clientId");

const saveFile = async (file) => {
    const result = await uploadTicketFile(file);
    const name = String(file.originalname || "file").split(/[/\\]/).pop().slice(0, 80);
    return {
        name: name || "file",
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: file.mimetype === "application/pdf" ? "raw" : "image",
        format: result.format || "",
    };
};

const readTicketBody = async (req) => {
    const subject = String(req.body.subject || "").trim();
    if (subject.length < 2) fail("Subject must be at least 2 characters");
    if (subject.length > 160) fail("Subject cannot be longer than 160 characters");
    const priority = req.body.priority || "MEDIUM";
    if (!PRIORITIES.includes(priority)) fail("Select a valid priority");
    const content = cleanHtml(req.body.content, "Content");
    return { subject, priority, content };
};

const createHelpTicket = async (req, res, next) => {
    let stored = null;
    try {
        if (isClient(req.user)) {
            return res.status(403).json({ success: false, message: "Clients raise support tickets from the client portal" });
        }
        const fields = await readTicketBody(req);
        if (req.file) stored = await saveFile(req.file);

        const ticket = await Ticket.create({
            ...fields,
            status: "OPEN",
            kind: "HELP",
            file: stored,
            raisedBy: req.user._id,
        });
        const data = await withTicketPeople(Ticket.findById(ticket._id)).lean();
        const seniors = await walkSeniors(req.user._id);
        pushToUsers([...(await adminIds()), ...seniors], {
            title: `Help ticket: ${fields.subject}`,
            body: `${req.user.name || "Someone"} raised a ticket`,
            link: `/dashboard/help/${ticket._id}`,
            type: "TICKET",
            exclude: [req.user._id],
        }).catch(() => {});
        res.status(201).json({
            success: true,
            data: presentTicket(data, { canReply: true, canChangeStatus: false, canDelete: isAdmin(req.user) }),
        });
    } catch (error) {
        if (stored?.publicId) await destroyCloudinaryFile(stored.publicId, stored.resourceType);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const createClientTicket = async (req, res, next) => {
    let stored = null;
    try {
        if (!isClient(req.user)) {
            return res.status(403).json({ success: false, message: "Only a client can raise a client ticket here" });
        }
        const mine = await getClientForUser(req.user);
        if (!mine) return res.status(404).json({ success: false, message: "Client profile not found" });

        const fields = await readTicketBody(req);
        const projectId = String(req.body.project || "").trim();
        if (!mongoose.Types.ObjectId.isValid(projectId)) fail("Select a project");
        const project = await Project.findById(projectId).select("name client reportingManager workingEmployees").lean();
        if (!project || String(project.client || "") !== String(mine._id)) {
            fail("Select one of your projects");
        }
        if (req.file) stored = await saveFile(req.file);

        const ticket = await Ticket.create({
            ...fields,
            status: "OPEN",
            kind: "CLIENT",
            project: project._id,
            client: mine._id,
            file: stored,
            raisedBy: req.user._id,
        });
        const data = await withTicketPeople(Ticket.findById(ticket._id)).lean();
        pushToUsers(await recipientsForProject(project), {
            title: `Client ticket: ${fields.subject}`,
            body: `${req.user.name || "Client"} on ${project.name}`,
            link: `/dashboard/help/${ticket._id}`,
            type: "TICKET",
            exclude: [req.user._id],
        }).catch(() => {});
        res.status(201).json({
            success: true,
            data: presentTicket(data, { canReply: true, canChangeStatus: false, canDelete: false }),
        });
    } catch (error) {
        if (stored?.publicId) await destroyCloudinaryFile(stored.publicId, stored.resourceType);
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const buildTicketFilter = async (user, query) => {
    const filter = {};
    const clauses = [];

    if (isClient(user)) {
        filter.kind = "CLIENT";
        filter.raisedBy = user._id;
    } else if (!isAdmin(user)) {
        const [team, projectIds] = await Promise.all([
            teamIds(user),
            staffVisibleProjectIds(user),
        ]);
        clauses.push({
            $or: [
                { $and: [{ kind: { $ne: "CLIENT" } }, { raisedBy: { $in: team } }] },
                { kind: "CLIENT", project: { $in: projectIds } },
            ],
        });
    }

    if (query.status) {
        if (!STATUSES.includes(query.status)) {
            const error = new Error("Invalid ticket status");
            error.status = 400;
            throw error;
        }
        filter.status = query.status;
    }
    if (query.priority) {
        if (!PRIORITIES.includes(query.priority)) {
            const error = new Error("Invalid priority");
            error.status = 400;
            throw error;
        }
        filter.priority = query.priority;
    }
    if (query.kind === "CLIENT" || query.kind === "HELP") filter.kind = query.kind;
    if (query.search) filter.subject = { $regex: escapeRegex(query.search), $options: "i" };
    if (clauses.length) filter.$and = clauses;
    return filter;
};

const getTickets = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = await buildTicketFilter(req.user, req.query);

        const [total, rows] = await Promise.all([
            Ticket.countDocuments(filter),
            withTicketPeople(Ticket.find(filter)).sort({ updatedAt: -1 }).skip(skip).limit(limitNum).lean(),
        ]);

        res.status(200).json({
            success: true,
            data: rows.map((row) => presentTicket(row)),
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, limit: limitNum },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const loadVisible = async (id, user) => {
    if (!mongoose.Types.ObjectId.isValid(id)) fail("Invalid ticket ID format");
    const ticket = await withTicketPeople(Ticket.findById(id));
    if (!ticket || !(await canSeeTicket(ticket, user))) {
        const error = new Error("Ticket not found");
        error.status = 404;
        throw error;
    }
    return ticket;
};

const getTicketById = async (req, res, next) => {
    try {
        const ticket = await loadVisible(req.params.id, req.user);
        const replies = await TicketReply.find({ ticket: ticket._id }).populate("author", "name").sort({ createdAt: 1 }).lean();
        const data = presentTicket(ticket.toObject(), {
            replies: replies.map((reply) => ({
                _id: reply._id,
                message: reply.message,
                author: reply.author,
                createdAt: reply.createdAt,
            })),
            canReply: true,
            canChangeStatus: await canChangeStatus(ticket, req.user),
            canDelete: isAdmin(req.user),
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const replyToTicket = async (req, res, next) => {
    try {
        const ticket = await loadVisible(req.params.id, req.user);
        const message = cleanHtml(req.body.message, "Reply");
        const reply = await TicketReply.create({ ticket: ticket._id, message, author: req.user._id });
        await Ticket.updateOne({ _id: ticket._id }, { $currentDate: { updatedAt: true } });
        const data = await TicketReply.findById(reply._id).populate("author", "name").lean();
        const raiserId = ticket.raisedBy?._id || ticket.raisedBy;
        const clientTicket = ticketKind(ticket) === "CLIENT";
        if (clientTicket) {
            const staff = (await recipientsForProject(ticket.project?._id || ticket.project))
                .filter((id) => String(id) !== String(raiserId));
            pushToUsers(staff, {
                title: `Reply on: ${ticket.subject}`,
                body: `${req.user.name || "Someone"} replied`,
                link: `/dashboard/help/${ticket._id}`,
                type: "TICKET",
                exclude: [req.user._id],
            }).catch(() => {});
            if (String(raiserId) !== String(req.user._id)) {
                pushToUsers([raiserId], {
                    title: `Reply on: ${ticket.subject}`,
                    body: `${req.user.name || "Someone"} replied`,
                    link: `/dashboard/support/${ticket._id}`,
                    type: "TICKET",
                }).catch(() => {});
            }
        } else {
            const targets = [...(await walkSeniors(raiserId)), ...(await adminIds()), raiserId];
            pushToUsers(targets, {
                title: `Reply on: ${ticket.subject}`,
                body: `${req.user.name || "Someone"} replied`,
                link: `/dashboard/help/${ticket._id}`,
                type: "TICKET",
                exclude: [req.user._id],
            }).catch(() => {});
        }

        res.status(201).json({
            success: true,
            data: { _id: data._id, message: data.message, author: data.author, createdAt: data.createdAt },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const updateTicketStatus = async (req, res, next) => {
    try {
        const ticket = await loadVisible(req.params.id, req.user);
        if (!(await canChangeStatus(ticket, req.user))) {
            return res.status(403).json({ success: false, message: "You cannot change this ticket status" });
        }
        const status = String(req.body.status || "");
        if (!STATUSES.includes(status)) fail("Select a valid ticket status");
        ticket.status = status;
        await ticket.save();
        const data = await withTicketPeople(Ticket.findById(ticket._id)).lean();
        const raiserId = ticket.raisedBy?._id || ticket.raisedBy;
        const clientTicket = ticketKind(ticket) === "CLIENT";
        pushToUsers([raiserId], {
            title: `Ticket ${status.toLowerCase()}: ${ticket.subject}`,
            body: `${req.user.name || "Someone"} updated the status`,
            link: clientTicket ? `/dashboard/support/${ticket._id}` : `/dashboard/help/${ticket._id}`,
            type: "TICKET",
            exclude: [req.user._id],
        }).catch(() => {});
        res.status(200).json({
            success: true,
            data: presentTicket(data, { canChangeStatus: true, canDelete: isAdmin(req.user), canReply: true }),
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

const deleteTicket = async (req, res, next) => {
    try {
        if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: "Only an admin can delete a ticket" });
        const ticket = await loadVisible(req.params.id, req.user);
        if (ticket.file?.publicId) await destroyCloudinaryFile(ticket.file.publicId, ticket.file.resourceType);
        await TicketReply.deleteMany({ ticket: ticket._id });
        await ticket.deleteOne();
        res.status(200).json({ success: true, message: "Ticket deleted" });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

module.exports = {
    createTicket: createHelpTicket,
    createClientTicket,
    getTickets,
    getTicketById,
    replyToTicket,
    updateTicketStatus,
    deleteTicket,
};
