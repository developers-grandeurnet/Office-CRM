const Client = require("../models/Client");
const Project = require("../models/Project");
const { downlineIds } = require("./reporting");

const getClientForUser = async (user) => {
    if (!user?._id) return null;
    return Client.findOne({ user: user._id }).select("_id name clientId email").lean();
};

const projectMemberIds = (project) => {
    const managerId = String(project.reportingManager?._id || project.reportingManager || "");
    const workers = (project.workingEmployees || []).map((person) => String(person?._id || person));
    return [managerId, ...workers].filter(Boolean);
};

const staffVisiblePeople = async (user) => {
    const downline = await downlineIds(user._id);
    return [user._id, ...downline];
};

const staffVisibleProjectIds = async (user) => {
    const people = await staffVisiblePeople(user);
    const rows = await Project.find({
        $or: [
            { reportingManager: { $in: people } },
            { workingEmployees: { $in: people } },
        ],
    }).select("_id").lean();
    return rows.map((row) => row._id);
};

const isOnProjectTeam = (project, userId) => {
    const id = String(userId);
    return projectMemberIds(project).includes(id);
};

const isSeniorOfProject = async (project, user) => {
    const downline = new Set((await downlineIds(user._id)).map((item) => String(item)));
    return projectMemberIds(project).some((id) => downline.has(id));
};

module.exports = {
    getClientForUser,
    projectMemberIds,
    staffVisiblePeople,
    staffVisibleProjectIds,
    isOnProjectTeam,
    isSeniorOfProject,
};
