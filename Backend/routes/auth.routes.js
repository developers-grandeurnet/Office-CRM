const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const router = express.Router();

const { registerAdmin, login, refreshToken, logout, getMe, getMyProfile } = require("../controllers/auth.controller");
const { registerValidator, loginValidator } = require("../validators/auth.validator");
const validate = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

// One office shares an IP, so the account limit is per email, with a high network ceiling.
const loginLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,
    max:             10,
    standardHeaders: true,
    legacyHeaders:   false,
    keyGenerator: (req) => `login:${String(req.body?.email || "").toLowerCase().trim() || "unknown"}`,
    message: {
        success: false,
        message: "Too many login attempts for this email. Please try again after 15 minutes.",
    },
});

const loginNetworkLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,
    max:             2000,
    standardHeaders: true,
    legacyHeaders:   false,
    keyGenerator: (req) => `login-ip:${ipKeyGenerator(req.ip)}`,
    message: {
        success: false,
        message: "Too many login attempts from this network. Please try again after 15 minutes.",
    },
});

// Register: max 5 registrations per hour per IP
const registerLimiter = rateLimit({
    windowMs:        60 * 60 * 1000, // 1 hour
    max:             5,
    standardHeaders: true,
    legacyHeaders:   false,
    message: {
        success: false,
        message: "Too many registration attempts from this IP. Please try again after 1 hour.",
    },
});

const refreshLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,
    max:             60,
    standardHeaders: true,
    legacyHeaders:   false,
    keyGenerator: (req) => {
        const token = req.cookies?.refreshToken || req.body?.refreshToken || "";
        return token ? `refresh:${String(token).slice(-24)}` : `refresh-ip:${ipKeyGenerator(req.ip)}`;
    },
    message: {
        success: false,
        message: "Too many token refresh requests. Please try again shortly.",
    },
});

router.post("/admin/register", registerLimiter, registerValidator, validate, registerAdmin);
router.post("/login", loginNetworkLimiter, loginLimiter, loginValidator, validate, login);
router.post("/refresh-token", refreshLimiter, refreshToken);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.get("/profile", authenticate, getMyProfile);

module.exports = router;
