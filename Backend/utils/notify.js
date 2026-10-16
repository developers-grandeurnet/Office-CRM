const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Project = require("../models/Project");
const Lead = require("../models/Lead");
const LeaveRequest = require("../models/LeaveRequest");
const UrgentWork = require("../models/UrgentWork");
const Attendance = require("../models/Attendance");
const { projectMemberIds } = require("./clientAccess");

const asId = (value) => String(value?._id || value || "");

const uniqueIds = (values) => {
    const seen = new Set();
    const out = [];
    values.forEach((value) => {
        const id = asId(value);
        if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id) || seen.has(id)) return;
        seen.add(id);
        out.push(id);
    });
    return out;
};

const dayKey = (date = new Date()) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
};

const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const adminIds = async () => {
    const rows = await User.find({ userType: "ADMIN", status: "ACTIVE" }).select("_id").lean();
    return rows.map((row) => row._id);
};

const walkSeniors = async (userId, maxDepth = 15) => {
    const ids = [];
    let current = asId(userId);
    for (let index = 0; index < maxDepth; index += 1) {
        if (!mongoose.Types.ObjectId.isValid(current)) break;
        const person = await User.findById(current).select("reportingManager").lean();
        if (!person?.reportingManager) break;
        ids.push(person.reportingManager);
        current = asId(person.reportingManager);
    }
    return ids;
};

const recipientsForProject = async (project) => {
    const row = project?.reportingManager
        ? project
        : await Project.findById(project).select("reportingManager workingEmployees").lean();
    if (!row) return adminIds();
    const members = projectMemberIds(row);
    const seniors = [];
    for (const memberId of members) {
        seniors.push(...(await walkSeniors(memberId)));
    }
    return uniqueIds([...members, ...seniors, ...(await adminIds())]);
};

const leaveApproverIds = async (employeeId) => {
    const [admins, reviewers, seniors] = await Promise.all([
        adminIds(),
        User.find({
            status: "ACTIVE",
            userType: { $in: ["ADMIN", "EMPLOYEE"] },
            permissions: "APPROVE_LEAVE",
        }).select("_id").lean(),
        walkSeniors(employeeId),
    ]);
    return uniqueIds([
        ...admins,
        ...reviewers.map((row) => row._id),
        ...seniors,
    ]).filter((id) => id !== asId(employeeId));
};

const pushToUsers = async (userIds, { title, body = "", link = "", type = "SYSTEM", key = "", exclude = [] } = {}) => {
    const blocked = new Set(uniqueIds(exclude).map(asId));
    const targets = uniqueIds(userIds).filter((id) => !blocked.has(id));
    if (!targets.length || !title) return { created: 0 };

    if (key) {
        const ops = targets.map((userId) => ({
            updateOne: {
                filter: { user: userId, key },
                update: {
                    $setOnInsert: {
                        user: userId,
                        title: String(title).slice(0, 160),
                        body: String(body || "").slice(0, 500),
                        link: String(link || "").slice(0, 300),
                        type,
                        key,
                        readAt: null,
                    },
                },
                upsert: true,
            },
        }));
        const result = await Notification.bulkWrite(ops, { ordered: false });
        return { created: result.upsertedCount || 0 };
    }

    const docs = targets.map((userId) => ({
        user: userId,
        title: String(title).slice(0, 160),
        body: String(body || "").slice(0, 500),
        link: String(link || "").slice(0, 300),
        type,
        key: "",
        readAt: null,
    }));
    const inserted = await Notification.insertMany(docs, { ordered: false });
    return { created: inserted.length };
};

const syncDueAlerts = async (user) => {
    if (!user?._id || user.userType === "CLIENT") return;
    const today = startOfToday();
    const todayKey = dayKey(today);
    const userId = user._id;
    const jobs = [];

    if (user.userType === "ADMIN" || (user.permissions || []).includes("APPROVE_LEAVE")) {
        const pending = await LeaveRequest.countDocuments({
            status: "PENDING",
            ...(user.userType === "ADMIN" ? {} : { employee: { $ne: userId } }),
        });
        if (pending > 0) {
            jobs.push(pushToUsers([userId], {
                title: `${pending} leave request${pending === 1 ? "" : "s"} waiting`,
                body: "Open Leave to approve or reject.",
                link: "/dashboard/leave",
                type: "LEAVE",
                key: `leave-pending:${todayKey}`,
            }));
        }
    }

    const leadFilter = {
        nextFollowUpAt: { $ne: null, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        status: { $nin: ["LOST", "CONVERTED", "PAYMENT"] },
        assignedTo: userId,
    };
    const dueLeads = await Lead.find(leadFilter).select("name nextFollowUpAt").sort({ nextFollowUpAt: 1 }).limit(5).lean();
    dueLeads.forEach((lead) => {
        const overdue = new Date(lead.nextFollowUpAt) < today;
        jobs.push(pushToUsers([userId], {
            title: overdue ? `Overdue follow-up: ${lead.name}` : `Follow-up today: ${lead.name}`,
            body: "Open the lead to continue.",
            link: `/dashboard/leads/${lead._id}`,
            type: "LEAD",
            key: `lead-follow:${lead._id}:${todayKey}`,
        }));
    });

    const projectFilter = {
        status: { $ne: "COMPLETED" },
        eod: { $lt: today },
        $or: [{ reportingManager: userId }, { workingEmployees: userId }],
    };
    const lateProjects = await Project.find(projectFilter).select("name").limit(5).lean();
    lateProjects.forEach((project) => {
        jobs.push(pushToUsers([userId], {
            title: `Project EOD passed: ${project.name}`,
            body: "Check status and daily reports.",
            link: `/dashboard/projects/${project._id}`,
            type: "PROJECT",
            key: `project-eod:${project._id}:${todayKey}`,
        }));
    });

    const lateWork = await UrgentWork.find({
        eod: { $lt: today },
        assignees: userId,
    }).select("work").limit(5).lean();
    lateWork.forEach((row) => {
        jobs.push(pushToUsers([userId], {
            title: "Urgent work EOD passed",
            body: "Open urgent work to update it.",
            link: `/dashboard/urgent-work/${row._id}`,
            type: "URGENT",
            key: `urgent-eod:${row._id}:${todayKey}`,
        }));
    });

    if (user.userType === "ADMIN") {
        const [activeCount, presentCount] = await Promise.all([
            User.countDocuments({ userType: "EMPLOYEE", status: "ACTIVE" }),
            Attendance.countDocuments({ date: today }),
        ]);
        const missing = Math.max(activeCount - presentCount, 0);
        if (missing > 0) {
            jobs.push(pushToUsers([userId], {
                title: `${missing} employee${missing === 1 ? "" : "s"} still not punched in`,
                body: "Check the attendance report.",
                link: "/dashboard/attendance-report",
                type: "ATTENDANCE",
                key: `attendance-absent:${todayKey}`,
            }));
        }
    }

    await Promise.all(jobs);
};

module.exports = {
    pushToUsers,
    recipientsForProject,
    leaveApproverIds,
    adminIds,
    walkSeniors,
    syncDueAlerts,
    dayKey,
};
