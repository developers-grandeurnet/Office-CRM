const nodemailer = require("nodemailer");

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const crmLink = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const smtpUser = () => String(process.env.SMTP_USER || "").trim();
const smtpPass = () => String(process.env.SMTP_PASS || "").replace(/\s/g, "");

const missingSmtp = () => {
    const missing = [];
    if (!String(process.env.SMTP_HOST || "").trim()) missing.push("SMTP_HOST");
    if (!smtpUser()) missing.push("SMTP_USER");
    if (!smtpPass()) missing.push("SMTP_PASS");
    return missing;
};

const createTransport = () => {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: smtpUser(),
            pass: smtpPass(),
        },
    });
};

const sendEmployeeWelcome = async ({ name, email, password }) => {
    const missing = missingSmtp();
    if (missing.length) {
        return { sent: false, reason: `SMTP is not configured (${missing.join(", ")} missing). Restart the server after saving .env` };
    }

    const link = crmLink();
    const transporter = createTransport();

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePassword = escapeHtml(password);
    const safeLink = escapeHtml(link);

    await transporter.sendMail({
        from: process.env.MAIL_FROM || smtpUser(),
        to: email,
        subject: "Welcome to CRM — your login details",
        text: [
            `Hi ${name},`,
            "",
            "Welcome. Your employee account is ready.",
            "",
            `Open the CRM: ${link}`,
            "",
            `Login email: ${email}`,
            `Password: ${password}`,
            "",
            "Sign in with these details and keep the password private.",
        ].join("\n"),
        html: `
            <p>Hi ${safeName},</p>
            <p>Welcome. Your employee account is ready.</p>
            <p><a href="${safeLink}">Open the CRM</a></p>
            <p><strong>Login email:</strong> ${safeEmail}<br/>
            <strong>Password:</strong> ${safePassword}</p>
            <p>Sign in with these details and keep the password private.</p>
        `,
    });

    return { sent: true };
};

const sendOfferLetter = async ({ name, email, companyName, refNumber, pdf }) => {
    const missing = missingSmtp();
    if (missing.length) {
        return { sent: false, reason: `SMTP is not configured (${missing.join(", ")} missing). Restart the server after saving .env` };
    }

    const company = companyName || "CRM";
    const safeName = escapeHtml(name);
    const safeCompany = escapeHtml(company);
    const safeRef = escapeHtml(refNumber);
    const filename = `Joining-Letter-${String(refNumber).replace(/\//g, "-")}.pdf`;

    const transporter = createTransport();
    await transporter.sendMail({
        from: process.env.MAIL_FROM || smtpUser(),
        to: email,
        subject: `Joining letter ${refNumber} — ${company}`,
        text: [
            `Hi ${name},`,
            "",
            `Please find your joining letter from ${company} attached.`,
            `Reference: ${refNumber}`,
            "",
            "Open the PDF for the appointment details.",
        ].join("\n"),
        html: `
            <p>Hi ${safeName},</p>
            <p>Please find your joining letter from <strong>${safeCompany}</strong> attached.</p>
            <p>Reference: ${safeRef}</p>
            <p>Open the PDF for the appointment details.</p>
        `,
        attachments: [{
            filename,
            content: pdf,
            contentType: "application/pdf",
        }],
    });

    return { sent: true };
};

const sendClientWelcome = async ({ name, email, password, clientId }) => {
    const missing = missingSmtp();
    if (missing.length) {
        return { sent: false, reason: `SMTP is not configured (${missing.join(", ")} missing). Restart the server after saving .env` };
    }

    const link = crmLink();
    const transporter = createTransport();
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePassword = escapeHtml(password);
    const safeClientId = escapeHtml(clientId || "");
    const safeLink = escapeHtml(link);

    await transporter.sendMail({
        from: process.env.MAIL_FROM || smtpUser(),
        to: email,
        subject: "Welcome — your client login details",
        text: [
            `Hi ${name},`,
            "",
            "Welcome. Your client account is ready.",
            "",
            `Open the portal: ${link}`,
            "",
            `Client ID: ${clientId || "—"}`,
            `Login email: ${email}`,
            `Password: ${password}`,
            "",
            "Sign in with the same login page using this email and password. Keep the password private.",
        ].join("\n"),
        html: `
            <p>Hi ${safeName},</p>
            <p>Welcome. Your client account is ready.</p>
            <p><a href="${safeLink}">Open the portal</a></p>
            <p><strong>Client ID:</strong> ${safeClientId}<br/>
            <strong>Login email:</strong> ${safeEmail}<br/>
            <strong>Password:</strong> ${safePassword}</p>
            <p>Sign in with the same login page using this email and password. Keep the password private.</p>
        `,
    });

    return { sent: true };
};

module.exports = { sendEmployeeWelcome, sendOfferLetter, sendClientWelcome };
