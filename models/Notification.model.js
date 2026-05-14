// backend/models/Notification.js
import mongoose from "mongoose";

const deliveryStatusSchema = new mongoose.Schema(
  {
    in_app: {
      type: String,
      enum: ["pending", "delivered", "read"],
      default: "pending",
    },
    email: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "skipped",
    },
    sms: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "skipped",
    },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    /* ── Recipients ── */
    recipientId:    { type: String, required: true, index: true },
    recipientEmail: { type: String, default: null },
    recipientPhone: { type: String, default: null },

    /* ── Sender ── */
    senderId:   { type: String, default: null },
    senderName: { type: String, default: "System" },

    /* ── Content ── */
    type: {
      type: String,
      enum: [
        "leave_submitted",
        "leave_approved",
        "leave_rejected",
        "leave_balance_low",
        "account_action",
        "broadcast",
        "announcement",
        "secure_message",
      ],
      required: true,
    },
    title:   { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 2000 },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    /* ── Channels ── */
    channels: {
      type: [{ type: String, enum: ["in_app", "email", "sms"] }],
      default: ["in_app"],
    },

    /* ── Delivery status ── */
    status: { type: deliveryStatusSchema, default: () => ({}) },

    /* ── Read state ── */
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date,    default: null },

    /* ── Extra payload ── */
    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
