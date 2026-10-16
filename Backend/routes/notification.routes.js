const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const {
    listNotifications,
    unreadCount,
    markRead,
    markAllRead,
} = require("../controllers/notification.controller");

router.use(authenticate);

router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

module.exports = router;
