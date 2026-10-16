const express = require("express");
const router = express.Router();

const { authenticate, authorize, checkPermission } = require("../middlewares/auth.middleware");
const { receiveTicketFile } = require("../config/cloudinary");
const {
    listMyProjects,
    getMyProject,
    listMyProjectOptions,
} = require("../controllers/clientPortal.controller");
const {
    createClientTicket,
    getTickets,
    getTicketById,
    replyToTicket,
} = require("../controllers/ticket.controller");

const allow = (action, ...keys) => checkPermission(keys, action);

router.use(authenticate, authorize("CLIENT"));

router.get("/projects/list", allow("view own projects", "CLIENT_VIEW_PROJECTS"), listMyProjects);
router.get("/projects/options", allow("view own projects", "CLIENT_VIEW_PROJECTS"), listMyProjectOptions);
router.get("/projects/details/:id", allow("view own projects", "CLIENT_VIEW_PROJECTS"), getMyProject);

router.post("/tickets/create", allow("open support", "CLIENT_SUPPORT"), receiveTicketFile, createClientTicket);
router.get("/tickets/list", allow("open support", "CLIENT_SUPPORT"), getTickets);
router.get("/tickets/details/:id", allow("open support", "CLIENT_SUPPORT"), getTicketById);
router.post("/tickets/:id/replies", allow("open support", "CLIENT_SUPPORT"), replyToTicket);

module.exports = router;
