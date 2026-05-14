// backend/services/notificationService.js
import Notification from "../models/Notification.js";
import emailService from "./emailService.js";
const { sendEmail } = emailService;
import smsService from "./smsService.js";
const { sendSMS, sendBulkSMS } = smsService;

/* ── Timeout wrapper ── */
const withTimeout = (promise, ms, label = "Operation") =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

const notificationService = {
  send: async ({
    recipientId,
    recipientEmail = null,
    recipientPhone = null,
    senderId = null,
    senderName = "System",
    type,
    title,
    message,
    channels = ["in_app"],
    priority = "normal",
    metadata = {},
    io = null,
  }) => {
    const notification = await Notification.create({
      recipientId,
      recipientEmail,
      recipientPhone,
      senderId,
      senderName,
      type,
      title,
      message,
      priority,
      channels,
      status: {
        in_app: channels.includes("in_app") ? "delivered" : "skipped",
        email:  channels.includes("email")  ? "pending"   : "skipped",
        sms:    channels.includes("sms")    ? "pending"   : "skipped",
      },
      metadata,
    });

    if (channels.includes("in_app") && io) {
      io.to(`user_${recipientId}`).emit("notification:new", {
        id: notification._id,
        type,
        title,
        message,
        priority,
        isRead: false,
        createdAt: notification.createdAt,
      });
      io.to(`user_${recipientId}`).emit("notification:count", { increment: 1 });
    }

    if (channels.includes("email") && recipientEmail) {
      withTimeout(
        sendEmail({ to: recipientEmail, type, data: { title, message, ...metadata } }),
        5000,
        "Email send"
      )
        .then(async () => {
          await Notification.findByIdAndUpdate(notification._id, { "status.email": "sent" });
          console.log(`[NotificationService] Email sent to ${recipientEmail}`);
        })
        .catch(async (err) => {
          await Notification.findByIdAndUpdate(notification._id, { "status.email": "failed" });
          console.error(`[NotificationService] Email failed for ${recipientEmail}:`, err.message);
        });
    }

    if (channels.includes("sms") && recipientPhone) {
      withTimeout(
        sendSMS({ to: recipientPhone, type, data: { title, message, ...metadata } }),
        5000,
        "SMS send"
      )
        .then(async () => {
          await Notification.findByIdAndUpdate(notification._id, { "status.sms": "sent" });
          console.log(`[NotificationService] SMS sent to ${recipientPhone}`);
        })
        .catch(async (err) => {
          await Notification.findByIdAndUpdate(notification._id, { "status.sms": "failed" });
          console.error(`[NotificationService] SMS failed for ${recipientPhone}:`, err.message);
        });
    }

    return notification;
  },

  broadcast: async ({ recipients, ...rest }) => {
    const results = await Promise.allSettled(
      recipients.map((r) =>
        notificationService.send({
          recipientId:    r.id,
          recipientEmail: r.email || null,
          recipientPhone: r.phone || null,
          metadata:       { ...rest.metadata, recipientName: r.name },
          ...rest,
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed    = results.filter((r) => r.status === "rejected").length;
    console.log(`[NotificationService] Broadcast: ${succeeded} sent, ${failed} failed`);
    return { succeeded, failed, results };
  },

  notifyLeaveSubmitted: (employee, manager, leaveData, io) =>
    notificationService.send({
      recipientId:    manager.id,
      recipientEmail: manager.email,
      recipientPhone: manager.phone,
      type:    "leave_submitted",
      title:   "New Leave Request",
      message: `${employee.name} has submitted a ${leaveData.leaveType} request.`,
      channels: ["in_app", "email", "sms"],
      metadata: {
        employeeName: employee.name,
        leaveType:    leaveData.leaveType,
        startDate:    leaveData.startDate,
        endDate:      leaveData.endDate,
        days:         leaveData.days,
        reason:       leaveData.reason,
        recipientName: manager.name,
      },
      io,
    }),

  notifyLeaveApproved: (employee, approver, leaveData, io) =>
    notificationService.send({
      recipientId:    employee.id,
      recipientEmail: employee.email,
      recipientPhone: employee.phone,
      type:    "leave_approved",
      title:   "Leave Approved ✅",
      message: `Your ${leaveData.leaveType} from ${leaveData.startDate} to ${leaveData.endDate} has been approved.`,
      channels: ["in_app", "email", "sms"],
      metadata: {
        employeeName: employee.name,
        leaveType:    leaveData.leaveType,
        startDate:    leaveData.startDate,
        endDate:      leaveData.endDate,
        days:         leaveData.days,
        approvedBy:   approver.name,
        comment:      leaveData.comment,
      },
      io,
    }),

  notifyLeaveRejected: (employee, rejector, leaveData, io) =>
    notificationService.send({
      recipientId:    employee.id,
      recipientEmail: employee.email,
      recipientPhone: employee.phone,
      type:    "leave_rejected",
      title:   "Leave Request Rejected",
      message: `Your ${leaveData.leaveType} request has been rejected.`,
      channels: ["in_app", "email", "sms"],
      priority: "high",
      metadata: {
        employeeName: employee.name,
        leaveType:    leaveData.leaveType,
        startDate:    leaveData.startDate,
        endDate:      leaveData.endDate,
        rejectedBy:   rejector.name,
        reason:       leaveData.reason,
      },
      io,
    }),

  notifyLeaveBalanceLow: (employee, balanceData, io) =>
    notificationService.send({
      recipientId:    employee.id,
      recipientEmail: employee.email,
      recipientPhone: employee.phone,
      type:    "leave_balance_low",
      title:   "Low Leave Balance",
      message: `Your ${balanceData.leaveType} balance is running low (${balanceData.balance} days left).`,
      channels: ["in_app", "email"],
      metadata: { ...balanceData, employeeName: employee.name },
      io,
    }),

  notifyAccountAction: (employee, admin, action, reason, io) =>
    notificationService.send({
      recipientId:    employee.id,
      recipientEmail: employee.email,
      recipientPhone: employee.phone,
      type:    "account_action",
      title:   `Account ${action}`,
      message: `Your account has been ${action.toLowerCase()} by an administrator.`,
      channels: ["in_app", "email", "sms"],
      priority: "urgent",
      metadata: {
        employeeName: employee.name,
        action,
        reason,
        adminName: admin.name,
        date: new Date().toLocaleDateString(),
      },
      io,
    }),
};

export default notificationService;
