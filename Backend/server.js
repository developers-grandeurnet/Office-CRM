const cluster = require("cluster");

const workers = Number(process.env.WEB_CONCURRENCY || (process.env.NODE_ENV === "production" ? 2 : 1));

const start = () => {
    const app = require("./app");
    const { purgeOldAttendancePhotos } = require("./utils/attendanceRetention");
    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}] pid ${process.pid}`);
    });

    const cleanup = () => {
        purgeOldAttendancePhotos().catch((error) => {
            console.error(`[${new Date().toISOString()}] Attendance photo cleanup failed:`, error.message);
        });
    };
    setTimeout(cleanup, 15000);
    setInterval(cleanup, 24 * 60 * 60 * 1000);

    process.on("unhandledRejection", (reason) => {
        console.error(`[${new Date().toISOString()}] UNHANDLED REJECTION:`, reason);
    });

    process.on("uncaughtException", (err) => {
        console.error(`[${new Date().toISOString()}] UNCAUGHT EXCEPTION:`, err.stack || err.message);
        server.close(() => process.exit(1));
    });

    process.on("SIGTERM", () => {
        console.log(`[${new Date().toISOString()}] SIGTERM received. Shutting down gracefully...`);
        server.close(() => process.exit(0));
    });
};

if (workers > 1 && cluster.isPrimary) {
    for (let index = 0; index < workers; index += 1) cluster.fork();
    cluster.on("exit", (worker, code) => {
        console.error(`Worker ${worker.process.pid} exited (${code}). Starting another.`);
        cluster.fork();
    });
} else {
    start();
}
