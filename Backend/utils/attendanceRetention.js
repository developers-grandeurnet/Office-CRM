const Attendance = require("../models/Attendance");
const { destroyCloudinaryFile } = require("../config/cloudinary");

const retentionDays = () => {
    const days = parseInt(process.env.ATTENDANCE_PHOTO_DAYS, 10);
    if (!Number.isFinite(days)) return 90;
    return Math.min(Math.max(days, 7), 3650);
};

const purgeOldAttendancePhotos = async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays());
    cutoff.setHours(0, 0, 0, 0);
    for (let batch = 0; batch < 20; batch += 1) {
        const rows = await Attendance.find({
            date: { $lt: cutoff },
            $or: [
                { "punchIn.photoPublicId": { $nin: [null, ""] } },
                { "punchOut.photoPublicId": { $nin: [null, ""] } },
            ],
        }).select("punchIn.photoPublicId punchOut.photoPublicId").limit(100).lean();
        if (!rows.length) return;
        for (const row of rows) {
            const update = {};
            if (row.punchIn?.photoPublicId) {
                await destroyCloudinaryFile(row.punchIn.photoPublicId, "image");
                update["punchIn.photoUrl"] = "";
                update["punchIn.photoPublicId"] = "";
            }
            if (row.punchOut?.photoPublicId) {
                await destroyCloudinaryFile(row.punchOut.photoPublicId, "image");
                update["punchOut.photoUrl"] = "";
                update["punchOut.photoPublicId"] = "";
            }
            if (Object.keys(update).length) await Attendance.updateOne({ _id: row._id }, { $set: update });
        }
        if (rows.length < 100) return;
    }
};

module.exports = { purgeOldAttendancePhotos, retentionDays };
