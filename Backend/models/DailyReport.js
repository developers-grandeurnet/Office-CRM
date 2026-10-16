const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    resourceType: { type: String, default: "image" },
    format: { type: String, default: "" },
});

const dailyReportSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    report: { type: String, required: true, trim: true, maxlength: 20000 },
    clientRequirement: { type: String, trim: true, maxlength: 20000, default: "" },
    files: { type: [fileSchema], default: [] },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

dailyReportSchema.index({ project: 1, author: 1, date: 1 }, { unique: true });
dailyReportSchema.index({ project: 1, date: -1 });

module.exports = mongoose.model("DailyReport", dailyReportSchema);
