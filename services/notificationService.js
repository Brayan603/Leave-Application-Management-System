// backend/services/notificationService.js
// Central service — call this from anywhere in the app
// (leave controller, user-access controller, admin messenger, etc.)

import notificationService from "../services/notificationService.js";
const { send, broadcast } = notificationService;

const Notification = require("../models/Notification");
const { sendEmail } = require("./emailService");
const { sendSMS, sendBulkSMS } = require("./smsService");

/* ─────────────────────────────────────────────
   send()
   Single-recipient notification across
   any combination of channels
───────────────────────────────────────────── */
const send = async ({
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
  io = null,          // pass in socket.io instance for real-time
}) => {
  /* 1. Persist to DB */
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

  /* 2. Real-time in-app via Socket.io */
  if (channels.includes("in_app") && io) {
    io.to(`user_${recipientId}`).emit("notification:new", {
      id:        notification._id,
      type,
      title,
      message,
      priority,
      isRead:    false,
      createdAt: notification.createdAt,
    });
    // Also bump the unread count
    io.to(`user_${recipientId}`).emit("notification:count", { increment: 1 });
  }

  /* 3. Email */
  if (channels.includes("email") && recipientEmail) {
    try {
      await sendEmail({ to: recipientEmail, type, data: { title, message, ...metadata } });
      await Notification.findByIdAndUpdate(notification._id, { "status.email": "sent" });
    } catch (err) {
      await Notification.findByIdAndUpdate(notification._id, { "status.email": "failed" });
      console.error(`[NotificationService] Email failed for ${recipientEmail}:`, err.message);
    }
  }

  /* 4. SMS */
  if (channels.includes("sms") && recipientPhone) {
    try {
      await sendSMS({ to: recipientPhone, type, data: { title, message, ...metadata } });
      await Notification.findByIdAndUpdate(notification._id, { "status.sms": "sent" });
    } catch (err) {
      await Notification.findByIdAndUpdate(notification._id, { "status.sms": "failed" });
      console.error(`[NotificationService] SMS failed for ${recipientPhone}:`, err.message);
    }
  }

  return notification;
};

/* ─────────────────────────────────────────────
   broadcast()
   Send to multiple users at once
   (admin broadcasts, announcements)
───────────────────────────────────────────── */
const broadcast = async ({ recipients, ...rest }) => {
  /*
    recipients: [
      { id, email, phone, name }
    ]
  */
  const results = await Promise.allSettled(
    recipients.map((r) =>
      send({
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
};

/* ─────────────────────────────────────────────
   Helper shortcuts — use these in controllers
───────────────────────────────────────────── */

const notifyLeaveSubmitted = (employee, manager, leaveData, io) =>
  send({
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
  });

const notifyLeaveApproved = (employee, approver, leaveData, io) =>
  send({
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
  });

const notifyLeaveRejected = (employee, rejector, leaveData, io) =>
  send({
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
  });

const notifyLeaveBalanceLow = (employee, balanceData, io) =>
  send({
    recipientId:    employee.id,
    recipientEmail: employee.email,
    recipientPhone: employee.phone,
    type:    "leave_balance_low",
    title:   "Low Leave Balance",
    message: `Your ${balanceData.leaveType} balance is running low (${balanceData.balance} days left).`,
    channels: ["in_app", "email"],
    metadata: { ...balanceData, employeeName: employee.name },
    io,
  });

const notifyAccountAction = (employee, admin, action, reason, io) =>
  send({
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
  });

module.exports = {
  send,
  broadcast,
  notifyLeaveSubmitted,
  notifyLeaveApproved,
  notifyLeaveRejected,
  notifyLeaveBalanceLow,
  notifyAccountAction,
};
