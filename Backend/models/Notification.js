const mongoose = require("mongoose");

const TYPES = [
    "TICKET",
    "LEAVE",
    "LEAD",
    "PROJECT",
    "URGENT",
    "ATTENDANCE",
    "SYSTEM",
];

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, trim: true, maxlength: 500, default: "" },
    link: { type: String, trim: true, maxlength: 300, default: "" },
    type: { type: String, enum: TYPES, default: "SYSTEM" },
    key: { type: String, trim: true, maxlength: 120, default: "" },
    readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ user: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: "string", $gt: "" } } });

const Notification = mongoose.model("Notification", notificationSchema);
Notification.TYPES = TYPES;
module.exports = Notification;
