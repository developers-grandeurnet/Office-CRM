const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { syncDueAlerts } = require("../utils/notify");

const parsePagination = (page, limit) => {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (pageNum - 1) * limitNum;
    return { pageNum, limitNum, skip };
};

const present = (row) => ({
    _id: row._id,
    title: row.title,
    body: row.body || "",
    link: row.link || "",
    type: row.type,
    readAt: row.readAt,
    createdAt: row.createdAt,
    unread: !row.readAt,
});

const listNotifications = async (req, res, next) => {
    try {
        await syncDueAlerts(req.user).catch(() => {});
        const { page = 1, limit = 20, unread } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = { user: req.user._id };
        if (unread === "1") filter.readAt = null;

        const [total, unreadCount, rows] = await Promise.all([
            Notification.countDocuments(filter),
            Notification.countDocuments({ user: req.user._id, readAt: null }),
            Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        ]);

        res.status(200).json({
            success: true,
            data: rows.map(present),
            unreadCount,
            pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, limit: limitNum },
        });
    } catch (error) {
        next(error);
    }
};

const unreadCount = async (req, res, next) => {
    try {
        await syncDueAlerts(req.user).catch(() => {});
        const count = await Notification.countDocuments({ user: req.user._id, readAt: null });
        res.status(200).json({ success: true, data: { count } });
    } catch (error) {
        next(error);
    }
};

const markRead = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid notification" });
        }
        const row = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id, readAt: null },
            { $set: { readAt: new Date() } },
            { returnDocument: "after" }
        ).lean();
        if (!row) {
            const existing = await Notification.findOne({ _id: req.params.id, user: req.user._id }).lean();
            if (!existing) return res.status(404).json({ success: false, message: "Notification not found" });
            return res.status(200).json({ success: true, data: present(existing) });
        }
        res.status(200).json({ success: true, data: present(row) });
    } catch (error) {
        next(error);
    }
};

const markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, readAt: null },
            { $set: { readAt: new Date() } }
        );
        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listNotifications,
    unreadCount,
    markRead,
    markAllRead,
};
