const mongoose = require("mongoose");
const User = require("../models/User");

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const readIds = (value) => String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => mongoose.Types.ObjectId.isValid(item))
    .slice(0, 30);

const searchPeople = async ({ search = "", ids = "", limit = 20, filter = {} } = {}) => {
    const chosen = readIds(ids);
    const cap = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 30);
    const query = { ...filter };
    const text = String(search || "").trim();
    if (text) {
        const regex = { $regex: escapeRegex(text), $options: "i" };
        query.$or = [{ name: regex }, { employeeId: regex }];
    }
    const rows = await User.find(query).select("name employeeId userType").sort({ name: 1 }).limit(cap).lean();
    const seen = new Set(rows.map((row) => String(row._id)));
    const missing = chosen.filter((id) => !seen.has(String(id)));
    if (!missing.length) return rows;
    const extraFilter = {};
    if (filter._id?.$in) {
        const allowed = new Set(filter._id.$in.map((id) => String(id)));
        extraFilter._id = { $in: missing.filter((id) => allowed.has(String(id))) };
    } else {
        extraFilter._id = { $in: missing };
    }
    if (!extraFilter._id.$in.length) return rows;
    const extra = await User.find(extraFilter).select("name employeeId userType").lean();
    return [...extra, ...rows];
};

module.exports = { searchPeople };
