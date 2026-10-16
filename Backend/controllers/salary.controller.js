const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");

const fail = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    throw error;
};

const hasPerm = (user, keys) => {
    if (user.userType === "ADMIN") return true;
    const granted = user.permissions || [];
    return keys.some((key) => granted.includes(key));
};

const canManageSalary = (user) => hasPerm(user, ["MANAGE_SALARY"]);
const canViewSalary = (user) => hasPerm(user, ["VIEW_SALARY", "MANAGE_SALARY"]);

const monthBounds = (monthText) => {
    const text = String(monthText || "").trim();
    if (!/^\d{4}-\d{2}$/.test(text)) fail("Month must be YYYY-MM");
    const [year, month] = text.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);
    const daysInMonth = end.getDate();
    return { start, end, daysInMonth, year, month, label: text };
};

const dayKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const eachDay = (start, end) => {
    const days = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor <= last) {
        days.push(dayKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
};

const expandLeaveDays = (leave, monthStart, monthEnd) => {
    const map = new Map();
    const start = new Date(Math.max(new Date(leave.startDate).getTime(), monthStart.getTime()));
    const end = new Date(Math.min(new Date(leave.endDate).getTime(), monthEnd.getTime()));
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (start > end) return map;

    if (leave.duration === "HALF_DAY") {
        map.set(dayKey(start), 0.5);
        return map;
    }

    const cursor = new Date(start);
    while (cursor <= end) {
        map.set(dayKey(cursor), 1);
        cursor.setDate(cursor.getDate() + 1);
    }
    return map;
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const buildEmployeeSalary = ({ employee, month, attendanceRows, leaveRows }) => {
    const presentMap = new Map();
    attendanceRows.forEach((row) => {
        if (!row.punchIn?.at) return;
        presentMap.set(dayKey(row.date), 1);
    });

    const leaveMap = new Map();
    leaveRows.forEach((leave) => {
        expandLeaveDays(leave, month.start, month.end).forEach((value, key) => {
            leaveMap.set(key, Math.max(leaveMap.get(key) || 0, value));
        });
    });

    let presentDays = 0;
    let paidLeaveDays = 0;
    presentMap.forEach((value) => { presentDays += value; });
    leaveMap.forEach((value, key) => {
        if (presentMap.has(key)) return;
        paidLeaveDays += value;
    });

    const payableDays = presentDays + paidLeaveDays;
    const workingDays = month.daysInMonth;
    const absentDays = Math.max(0, roundMoney(workingDays - payableDays));
    const monthlySalary = Number(employee.salary) || 0;
    const perDay = workingDays > 0 ? monthlySalary / workingDays : 0;
    const payable = roundMoney(perDay * payableDays);

    return {
        employee: {
            _id: employee._id,
            name: employee.name,
            employeeId: employee.employeeId || "",
            email: employee.email,
            department: employee.department || null,
            designation: employee.designation || null,
        },
        month: month.label,
        workingDays,
        presentDays: roundMoney(presentDays),
        paidLeaveDays: roundMoney(paidLeaveDays),
        payableDays: roundMoney(payableDays),
        absentDays,
        monthlySalary,
        perDay: roundMoney(perDay),
        payable,
        hasSalary: monthlySalary > 0,
    };
};

const listSalary = async (req, res, next) => {
    try {
        if (!canViewSalary(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Aapko iski permission nahi hai: salary.",
                code: "PERMISSION_DENIED",
            });
        }

        const month = monthBounds(req.query.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
        const manage = canManageSalary(req.user);
        const scope = !manage || req.query.scope === "mine" ? "mine" : "all";

        let employees;
        if (scope === "mine") {
            const me = await User.findById(req.user._id)
                .select("name email employeeId salary department designation")
                .populate("department", "name")
                .populate("designation", "name")
                .lean();
            employees = me ? [me] : [];
        } else {
            const filter = { userType: "EMPLOYEE", status: "ACTIVE" };
            if (req.query.employee && mongoose.Types.ObjectId.isValid(req.query.employee)) {
                filter._id = req.query.employee;
            }
            employees = await User.find(filter)
                .select("name email employeeId salary department designation")
                .populate("department", "name")
                .populate("designation", "name")
                .sort({ name: 1 })
                .lean();
        }

        const ids = employees.map((row) => row._id);
        if (!ids.length) {
            return res.status(200).json({
                success: true,
                data: [],
                meta: { month: month.label, workingDays: month.daysInMonth, scope, canManage: manage },
            });
        }

        const [attendanceRows, leaveRows] = await Promise.all([
            Attendance.find({
                user: { $in: ids },
                date: { $gte: month.start, $lte: month.end },
            }).select("user date punchIn").lean(),
            LeaveRequest.find({
                employee: { $in: ids },
                status: "APPROVED",
                startDate: { $lte: month.end },
                endDate: { $gte: month.start },
            }).select("employee duration startDate endDate days").lean(),
        ]);

        const attendanceByUser = new Map();
        attendanceRows.forEach((row) => {
            const key = String(row.user);
            if (!attendanceByUser.has(key)) attendanceByUser.set(key, []);
            attendanceByUser.get(key).push(row);
        });

        const leaveByUser = new Map();
        leaveRows.forEach((row) => {
            const key = String(row.employee);
            if (!leaveByUser.has(key)) leaveByUser.set(key, []);
            leaveByUser.get(key).push(row);
        });

        const data = employees.map((employee) => buildEmployeeSalary({
            employee,
            month,
            attendanceRows: attendanceByUser.get(String(employee._id)) || [],
            leaveRows: leaveByUser.get(String(employee._id)) || [],
        }));

        res.status(200).json({
            success: true,
            data,
            meta: {
                month: month.label,
                workingDays: month.daysInMonth,
                scope,
                canManage: manage,
                formula: "Payable = (monthly salary ÷ calendar days) × (present days + approved leave days without punch)",
            },
        });
    } catch (error) {
        next(error);
    }
};

const salaryEmployees = async (req, res, next) => {
    try {
        if (!canManageSalary(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Aapko iski permission nahi hai: salary.",
                code: "PERMISSION_DENIED",
            });
        }
        const { searchPeople } = require("../utils/peopleQuery");
        const people = await searchPeople({
            search: req.query.search,
            ids: req.query.ids,
            limit: req.query.limit,
            filter: { userType: "EMPLOYEE", status: "ACTIVE" },
        });
        res.status(200).json({ success: true, data: people });
    } catch (error) {
        next(error);
    }
};

module.exports = { listSalary, salaryEmployees, eachDay };
