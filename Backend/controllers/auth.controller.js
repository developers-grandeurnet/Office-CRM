const crypto = require("crypto");
const User = require("../models/User");
const { clearAuthUser } = require("../middlewares/auth.middleware");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/tokenUtils");
const { loadUserProfile } = require("../utils/userProfile");

// ─── Helper ───────────────────────────────────────────────────────────────────
// Timing-safe string comparison — prevents timing attacks on secret comparison
const timingSafeCompare = (a, b) => {
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false; // buffers different length — definitely not equal
    }
};

const hashToken = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const accessMaxAge = () => {
    const match = String(process.env.ACCESS_TOKEN_EXPIRY || "15m").match(/^(\d+)([mhd])$/);
    if (!match) return 15 * 60 * 1000;
    const amount = Number(match[1]);
    const unit = match[2] === "h" ? 60 * 60 * 1000 : match[2] === "d" ? 24 * 60 * 60 * 1000 : 60 * 1000;
    return amount * unit;
};

const cookieBase = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
});

const setAuthCookies = (res, accessToken, refreshToken) => {
    const base = cookieBase();
    res.cookie("accessToken", accessToken, { ...base, maxAge: accessMaxAge() });
    res.cookie("refreshToken", refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const clearAuthCookies = (res) => {
    const base = cookieBase();
    res.clearCookie("accessToken", base);
    res.clearCookie("refreshToken", base);
};

// @desc    Register Admin
// @route   POST /api/v1/auth/admin/register
// @access  Public (Requires Secret)
const registerAdmin = async (req, res, next) => {
    try {
        const { admin_secret, name, email, phone, password, address } = req.body;

        // Timing-safe secret comparison — no brute-force timing leak
        if (!admin_secret || !timingSafeCompare(admin_secret, process.env.ADMIN_CREATION_SECRET)) {
            return res.status(403).json({ success: false, message: "Invalid admin creation secret" });
        }

        // Check if admin already exists with email or phone
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User with email or phone already exists" });
        }

        const newAdmin = await User.create({
            name, email, phone, password, address, userType: "ADMIN",
        });

        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email })
            .populate("department", "name")
            .populate("designation", "name")
            .populate("employeeType", "name")
            .populate("workMode", "name");

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        if (user.status === "BLOCKED") {
            return res.status(403).json({ success: false, message: "Account is blocked. Contact support." });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({ success: false, message: "Account is not active. Contact support." });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const accessToken  = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = hashToken(refreshToken);
        await user.save();
        setAuthCookies(res, accessToken, refreshToken);

        const userData = {
            id:       user._id,
            userType: user.userType,
            name:     user.name,
            email:    user.email,
            phone:    user.phone,
            ...(user.employeeId  && { employeeId:  user.employeeId }),
            ...(user.userType === "CLIENT" && user.employeeId && { clientId: user.employeeId }),
            ...(user.department  && { department:  user.department }),
            ...(user.designation && { designation: user.designation }),
            ...(user.employeeType && { employeeType: user.employeeType }),
            ...(user.workMode && { workMode: user.workMode }),
            ...(user.permissions?.length && { permissions: user.permissions }),
        };

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: { user: userData },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ success: false, message: "No refresh token provided" });
        }

        // Verify token
        let decoded;
        try {
            decoded = verifyRefreshToken(token);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token expired — please login again",
                    code: "REFRESH_TOKEN_EXPIRED",
                });
            }
            return res.status(401).json({ success: false, message: "Invalid refresh token" });
        }

        const user = await User.findById(decoded.id);
        const presented = hashToken(token);

        if (!user || !user.refreshToken || !timingSafeCompare(user.refreshToken, presented)) {
            // Possible token reuse attack — invalidate all sessions
            if (user) {
                user.refreshToken = null;
                await user.save();
            }
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token — please login again",
                code: "TOKEN_REUSE_DETECTED",
            });
        }

        const newAccessToken  = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        user.refreshToken = hashToken(newRefreshToken);
        await user.save();
        setAuthCookies(res, newAccessToken, newRefreshToken);

        res.status(200).json({
            success: true,
            message: "Token refreshed",
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = async (req, res, next) => {
    try {
        // req.user is already populated by authenticate middleware — no extra DB call needed
        await User.updateOne({ _id: req.user._id }, { $unset: { refreshToken: "" } });
        clearAuthUser(req.user._id);
        clearAuthCookies(res);

        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password -refreshToken")
            .populate("department", "name")
            .populate("designation", "name")
            .populate("employeeType", "name")
            .populate("workMode", "name");

        // Guard: user could be deleted after token was issued
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

const getMyProfile = async (req, res, next) => {
    try {
        const profile = await loadUserProfile(req.user._id || req.user.id);
        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }
        res.status(200).json({ success: true, ...profile });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

module.exports = { registerAdmin, login, refreshToken, logout, getMe, getMyProfile };
