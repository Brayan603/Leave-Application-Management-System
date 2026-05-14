// backend/services/emailService.js
const nodemailer = require("nodemailer");

/* ─────────────────────────────────────────────
   Transporter — configure via .env
   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
   Supports Gmail, Outlook, custom SMTP
───────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,  // use App Password for Gmail
  },
});

/* ─────────────────────────────────────────────
   Shared HTML wrapper
───────────────────────────────────────────── */
const wrap = (title, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#f1f5f9; color:#1e293b; }
    .container { max-width:600px; margin:32px auto; background:#fff;
      border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:linear-gradient(135deg,#6366f1,#8b5cf6);
      padding:32px 40px; color:#fff; }
    .header h1 { font-size:22px; font-weight:700; margin-bottom:4px; }
    .header p  { font-size:13px; opacity:.85; }
    .body { padding:32px 40px; }
    .body p  { font-size:15px; line-height:1.7; margin-bottom:16px; }
    .info-box { background:#f8fafc; border-left:4px solid #6366f1;
      padding:16px 20px; border-radius:6px; margin:20px 0; }
    .info-box p { margin:0; font-size:14px; }
    .badge { display:inline-block; padding:4px 12px; border-radius:20px;
      font-size:12px; font-weight:600; }
    .badge-success  { background:#dcfce7; color:#166534; }
    .badge-warning  { background:#fef9c3; color:#854d0e; }
    .badge-danger   { background:#fee2e2; color:#991b1b; }
    .badge-info     { background:#dbeafe; color:#1e40af; }
    .footer { padding:20px 40px; background:#f8fafc;
      border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; text-align:center; }
    .btn { display:inline-block; padding:12px 24px; background:#6366f1;
      color:#fff; text-decoration:none; border-radius:8px;
      font-weight:600; font-size:14px; margin-top:8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Quantura Leave Management</h1>
      <p>Automated Notification System</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      This is an automated message from Quantura Technologies LMS.<br/>
      Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;

/* ─────────────────────────────────────────────
   Templates  (type → { subject, html })
───────────────────────────────────────────── */
const templates = {
  leave_submitted: (d) => ({
    subject: `Leave Request Submitted – ${d.employeeName}`,
    html: wrap(
      "Leave Request Submitted",
      `<p>Hello <strong>${d.recipientName || "Manager"}</strong>,</p>
       <p>A new leave request has been submitted and requires your attention.</p>
       <div class="info-box">
         <p><strong>Employee:</strong> ${d.employeeName}</p>
         <p><strong>Leave Type:</strong> ${d.leaveType}</p>
         <p><strong>From:</strong> ${d.startDate} &nbsp;→&nbsp; <strong>To:</strong> ${d.endDate}</p>
         <p><strong>Days:</strong> ${d.days}</p>
         <p><strong>Reason:</strong> ${d.reason || "—"}</p>
       </div>
       <a class="btn" href="${process.env.APP_URL}/manager/pending-tasks">Review Request</a>`
    ),
  }),

  leave_approved: (d) => ({
    subject: `✅ Leave Approved – ${d.startDate} to ${d.endDate}`,
    html: wrap(
      "Leave Approved",
      `<p>Hello <strong>${d.employeeName}</strong>,</p>
       <p>Your leave request has been <span class="badge badge-success">Approved</span>.</p>
       <div class="info-box">
         <p><strong>Leave Type:</strong> ${d.leaveType}</p>
         <p><strong>Period:</strong> ${d.startDate} → ${d.endDate} (${d.days} days)</p>
         <p><strong>Approved by:</strong> ${d.approvedBy}</p>
         ${d.comment ? `<p><strong>Comment:</strong> ${d.comment}</p>` : ""}
       </div>
       <p>Please ensure your handover is completed before your leave begins.</p>`
    ),
  }),

  leave_rejected: (d) => ({
    subject: `❌ Leave Request Rejected`,
    html: wrap(
      "Leave Rejected",
      `<p>Hello <strong>${d.employeeName}</strong>,</p>
       <p>Your leave request has been <span class="badge badge-danger">Rejected</span>.</p>
       <div class="info-box">
         <p><strong>Leave Type:</strong> ${d.leaveType}</p>
         <p><strong>Period:</strong> ${d.startDate} → ${d.endDate}</p>
         <p><strong>Rejected by:</strong> ${d.rejectedBy}</p>
         <p><strong>Reason:</strong> ${d.reason || "No reason provided"}</p>
       </div>
       <p>If you have concerns, please contact your manager directly.</p>`
    ),
  }),

  leave_balance_low: (d) => ({
    subject: `⚠️ Low Leave Balance Alert`,
    html: wrap(
      "Low Leave Balance",
      `<p>Hello <strong>${d.employeeName}</strong>,</p>
       <p>Your <strong>${d.leaveType}</strong> balance is running low.</p>
       <div class="info-box">
         <p><strong>Remaining Balance:</strong> <span class="badge badge-warning">${d.balance} days</span></p>
         <p><strong>Used:</strong> ${d.used} days &nbsp;|&nbsp; <strong>Entitled:</strong> ${d.entitled} days</p>
       </div>
       <p>Please plan your leave accordingly.</p>`
    ),
  }),

  account_action: (d) => ({
    subject: `🔔 Account Update – ${d.action}`,
    html: wrap(
      "Account Action",
      `<p>Hello <strong>${d.employeeName}</strong>,</p>
       <p>An administrative action has been applied to your account.</p>
       <div class="info-box">
         <p><strong>Action:</strong> <span class="badge badge-info">${d.action}</span></p>
         <p><strong>Performed by:</strong> ${d.adminName}</p>
         <p><strong>Date:</strong> ${d.date}</p>
         ${d.reason ? `<p><strong>Reason:</strong> ${d.reason}</p>` : ""}
       </div>
       <p>If you believe this is an error, contact your administrator.</p>`
    ),
  }),

  broadcast: (d) => ({
    subject: `📢 ${d.title}`,
    html: wrap(
      d.title,
      `<p>Hello <strong>${d.recipientName || "Team Member"}</strong>,</p>
       <p>${d.message}</p>
       ${d.actionUrl ? `<a class="btn" href="${d.actionUrl}">${d.actionLabel || "View"}</a>` : ""}`
    ),
  }),

  announcement: (d) => ({
    subject: `📌 Announcement: ${d.title}`,
    html: wrap(
      d.title,
      `<p>Hello <strong>${d.recipientName || "Team Member"}</strong>,</p>
       <div class="info-box"><p>${d.message}</p></div>
       ${d.actionUrl ? `<a class="btn" href="${d.actionUrl}">Read More</a>` : ""}`
    ),
  }),

  secure_message: (d) => ({
    subject: `🔒 Secure Message from ${d.senderName}`,
    html: wrap(
      "Secure Message",
      `<p>Hello <strong>${d.recipientName}</strong>,</p>
       <p>You have received a secure message from <strong>${d.senderName}</strong>.</p>
       <div class="info-box"><p>${d.message}</p></div>
       <p style="font-size:12px;color:#94a3b8;margin-top:16px;">
         This message is confidential and intended only for the recipient.
       </p>`
    ),
  }),
};

/* ─────────────────────────────────────────────
   sendEmail  – main export
───────────────────────────────────────────── */
const sendEmail = async ({ to, type, data }) => {
  const templateFn = templates[type];
  if (!templateFn) throw new Error(`Unknown email template type: "${type}"`);

  const { subject, html } = templateFn(data);

  const info = await transporter.sendMail({
    from: `"${process.env.APP_NAME || "Quantura LMS"}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`[Email] Sent ${type} to ${to} — messageId: ${info.messageId}`);
  return info;
};

/* Verify transporter on startup (optional) */
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log("[Email] SMTP connection verified ✓");
  } catch (err) {
    console.warn("[Email] SMTP connection failed:", err.message);
  }
};

module.exports = { sendEmail, verifyConnection };
