const mongoose = require("mongoose");

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES = ["START", "WORKING", "PENDING", "COMPLETED", "HOLD"];

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 20000, default: "" },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workingEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    priority: { type: String, enum: PRIORITIES, default: "MEDIUM" },
    status: { type: String, enum: STATUSES, default: "START" },
    eod: { type: Date, required: true },
    remark: { type: String, trim: true, maxlength: 2000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

projectSchema.index({ status: 1, eod: 1 });
projectSchema.index({ priority: 1, eod: 1 });
projectSchema.index({ reportingManager: 1, eod: 1 });
projectSchema.index({ workingEmployees: 1 });
projectSchema.index({ client: 1 });

const Project = mongoose.model("Project", projectSchema);
Project.PRIORITIES = PRIORITIES;
Project.STATUSES = STATUSES;
module.exports = Project;
