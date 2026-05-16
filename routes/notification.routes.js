import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import notificationService from "../services/notificationService.js";
const { send, broadcast } = notificationService;
import Notification from "../models/Notification.js";
import crypto from "crypto";

const router = express.Router();

const withIO = (req, res, next) => {
  req.io = req.app.get("io");
  next();
};

router.use(protect);

// Helper: generate ETag from a timestamp
const generateEtag = (timestamp) => {
  if (!timestamp) return null;
  return crypto.createHash("md5").update(timestamp.toISOString()).digest("hex");
};

// ============================
// USER NOTIFICATION ROUTES
// ============================

// GET /api/notifications?page=1&limit=20&unreadOnly=false
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const latestNotification = await Notification.findOne(
      { recipientId: userId },
      { updatedAt: 1 }
    ).sort({ updatedAt: -1 }).lean();
    const lastModified = latestNotification ? latestNotification.updatedAt : new Date(0);
    const etag = generateEtag(lastModified);

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    const query = { recipientId: userId };
    if (unreadOnly === "true") query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, max-age=5");
    res.json({ notifications, total, unreadCount, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", async (req, res) => {
  try {
    const userId = req.user.id;
    const latestUnreadChange = await Notification.findOne(
      { recipientId: userId, isRead: false },
      { updatedAt: 1 }
    ).sort({ updatedAt: -1 }).lean();
    const lastModified = latestUnreadChange ? latestUnreadChange.updatedAt : new Date(0);
    const etag = generateEtag(lastModified);

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    const count = await Notification.countDocuments({ recipientId: userId, isRead: false });
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, max-age=5");
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { isRead: true, readAt: new Date(), "status.in_app": "read" }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/mark-all-read
router.patch("/mark-all-read", async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date(), "status.in_app": "read" }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================
// ADMIN ROUTES
// ============================

// POST /api/notifications/admin/broadcast
router.post("/admin/broadcast", withIO, async (req, res) => {
  try {
    const { title, message, channels = ["in_app", "email"], priority = "normal", recipients, type = "broadcast" } = req.body;
    if (!title || !message || !recipients?.length) {
      return res.status(400).json({ error: "title, message, and recipients are required" });
    }
    const result = await broadcast({
      senderId: req.user.id,
      senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      type,
      title,
      message,
      channels,
      priority,
      recipients,
      io: req.io,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Broadcast error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/admin/secure-message
router.post("/admin/secure-message", withIO, async (req, res) => {
  try {
    const { recipientId, recipientEmail, recipientPhone, recipientName, message, channels = ["in_app", "email"] } = req.body;
    if (!recipientId || !message) {
      return res.status(400).json({ error: "recipientId and message are required" });
    }
    const notification = await send({
      recipientId,
      recipientEmail,
      recipientPhone,
      senderId: req.user.id,
      senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      type: "secure_message",
      title: `Secure message from ${req.user.name || req.user.firstName}`,
      message,
      channels,
      priority: "high",
      metadata: { recipientName, senderName: req.user.name },
      io: req.io,
    });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/admin/announcement
router.post("/admin/announcement", withIO, async (req, res) => {
  try {
    const { title, message, channels = ["in_app", "email"], recipients, actionUrl, actionLabel } = req.body;
    if (!title || !message || !recipients?.length) {
      return res.status(400).json({ error: "title, message, and recipients are required" });
    }
    const result = await broadcast({
      senderId: req.user.id,
      senderName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
      type: "announcement",
      title,
      message,
      channels,
      priority: "normal",
      recipients,
      metadata: { actionUrl, actionLabel },
      io: req.io,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/admin/all (admin view all notifications)
router.get("/admin/all", async (req, res) => {
  try {
    const { page = 1, limit = 50, type, recipientId, dateFrom, dateTo } = req.query;
    const query = {};
    if (type) query.type = type;
    if (recipientId) query.recipientId = recipientId;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query),
    ]);
    res.json({ notifications, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
