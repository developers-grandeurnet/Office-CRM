const mongoose = require("mongoose");
const User = require("../models/User");

const downlineCache = new Map();

const downlineIds = async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];
    const key = String(userId);
    const hit = downlineCache.get(key);
    if (hit && hit.exp > Date.now()) return hit.ids;
    const [row] = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } },
        {
            $graphLookup: {
                from: User.collection.name,
                startWith: "$_id",
                connectFromField: "_id",
                connectToField: "reportingManager",
                as: "downline",
                maxDepth: 15,
            },
        },
        { $project: { _id: 0, ids: "$downline._id" } },
    ]);
    const ids = row?.ids || [];
    downlineCache.set(key, { exp: Date.now() + 60000, ids });
    if (downlineCache.size > 5000) downlineCache.clear();
    return ids;
};

const clearDownline = (userId) => {
    if (userId) downlineCache.delete(String(userId));
    else downlineCache.clear();
};

module.exports = { downlineIds, clearDownline };
