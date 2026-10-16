const mongoose = require("mongoose");

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const fileSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    resourceType: { type: String, default: "image" },
    format: { type: String, default: "" },
}, { _id: false });

const urgentWorkSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    work: { type: String, required: true, trim: true, maxlength: 20000 },
    file: { type: fileSchema, default: null },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    priority: { type: String, enum: PRIORITIES, default: "MEDIUM" },
    eod: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

urgentWorkSchema.index({ project: 1, eod: 1 });
urgentWorkSchema.index({ assignees: 1, eod: 1 });
urgentWorkSchema.index({ priority: 1, eod: 1 });

const UrgentWork = mongoose.model("UrgentWork", urgentWorkSchema);
UrgentWork.PRIORITIES = PRIORITIES;
module.exports = UrgentWork;
