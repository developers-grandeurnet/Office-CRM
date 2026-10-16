const jwt = require("jsonwebtoken");
const User = require("../models/User");

const userCache = new Map();

const clearAuthUser = (id) => {
    if (id) userCache.delete(String(id));
};

const loadSessionUser = async (id) => {
    const key = String(id);
    const hit = userCache.get(key);
    if (hit && hit.exp > Date.now()) return hit.user;
    const user = await User.findById(id).select("-password -refreshToken").populate("designation", "name").lean();
    if (!user) return null;
    user.id = user._id;
    userCache.set(key, { exp: Date.now() + 20000, user });
    if (userCache.size > 5000) userCache.clear();
    return user;
};

const authenticate = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized — no token provided",
            });
        }

        // ── Verify token with granular error codes ────────────────────────────
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Access token expired — please refresh",
                    code: "TOKEN_EXPIRED",
                });
            }
            if (err.name === "JsonWebTokenError") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token — please login again",
                    code: "TOKEN_INVALID",
                });
            }
            if (err.name === "NotBeforeError") {
                return res.status(401).json({
                    success: false,
                    message: "Token not yet active",
                    code: "TOKEN_NOT_ACTIVE",
                });
            }
            // Unknown JWT error
            return res.status(401).json({
                success: false,
                message: "Token verification failed",
            });
        }

        // ── Fetch user and attach to request ─────────────────────────────────
        const user = await loadSessionUser(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User belonging to this token no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        if (user.status === "BLOCKED") {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Please contact support.",
                code: "ACCOUNT_BLOCKED",
            });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive. Please contact support.",
                code: "ACCOUNT_INACTIVE",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        if (!roles.includes(req.user.userType)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden — you do not have permission to access this resource",
                code: "FORBIDDEN",
            });
        }

        next();
    };
};

const checkPermission = (requiredPermissions, action = "this") => {
    const keys = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        if (req.user.userType === "ADMIN") {
            return next();
        }

        let userPermissions = req.user.permissions || [];
        if (req.user.userType === "CLIENT" && userPermissions.length === 0) {
            userPermissions = ["CLIENT_VIEW_PROJECTS", "CLIENT_SUPPORT"];
        }
        const hasPerm = keys.some((perm) => userPermissions.includes(perm));

        if (!hasPerm) {
            return res.status(403).json({
                success: false,
                message: `Aapko iski permission nahi hai: ${action}.`,
                code: "PERMISSION_DENIED",
            });
        }

        next();
    };
};

module.exports = { authenticate, authorize, checkPermission, clearAuthUser };

