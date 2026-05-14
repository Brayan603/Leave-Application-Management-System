// backend/routes/notificationRoutes.js
const express = require("express");
const router  = express.Router();
const Notification = require("../models/Notification");
const { send, broadcast } = require("../services/notificationService");

// Middleware: attach io from app
const withIO = (req, res, next) => {
  req.io = req.app.get("io");
  next();
};

/* ─────────────────────────────────────────────
   GET /api/notifications
   Fetch notifications for the logged-in user
───────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id; // from your auth middleware
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

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

    res.json({ notifications, total, unreadCount, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/notifications/unread-count
───────────────────────────────────────────── */
router.get("/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   PATCH /api/notifications/:id/read
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   PATCH /api/notifications/mark-all-read
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   DELETE /api/notifications/:id
───────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user.id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════
   ADMIN ROUTES  (require admin role)
══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   POST /api/notifications/admin/broadcast
   Send a message to all users (or specific dept)
───────────────────────────────────────────── */
router.post("/admin/broadcast", withIO, async (req, res) => {
  try {
    const {
      title,
      message,
      channels = ["in_app", "email"],
      priority = "normal",
      recipients,  // [{ id, email, phone, name }]
      type = "broadcast",
    } = req.body;

    if (!title || !message || !recipients?.length) {
      return res.status(400).json({ error: "title, message, and recipients are required" });
    }

    const result = await broadcast({
      senderId:   req.user.id,
      senderName: req.user.name,
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
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   POST /api/notifications/admin/secure-message
   Admin → specific user (back-office secure msg)
───────────────────────────────────────────── */
router.post("/admin/secure-message", withIO, async (req, res) => {
  try {
    const {
      recipientId,
      recipientEmail,
      recipientPhone,
      recipientName,
      message,
      channels = ["in_app", "email"],
    } = req.body;

    if (!recipientId || !message) {
      return res.status(400).json({ error: "recipientId and message are required" });
    }

    const notification = await send({
      recipientId,
      recipientEmail,
      recipientPhone,
      senderId:   req.user.id,
      senderName: req.user.name,
      type:    "secure_message",
      title:   `Secure message from ${req.user.name}`,
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

/* ─────────────────────────────────────────────
   POST /api/notifications/admin/announcement
───────────────────────────────────────────── */
router.post("/admin/announcement", withIO, async (req, res) => {
  try {
    const {
      title,
      message,
      channels = ["in_app", "email"],
      recipients,
      actionUrl,
      actionLabel,
      expiresAt,
    } = req.body;

    const result = await broadcast({
      senderId:   req.user.id,
      senderName: req.user.name,
      type:    "announcement",
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

/* ─────────────────────────────────────────────
   GET /api/notifications/admin/all
   Admin view — all notifications with filters
───────────────────────────────────────────── */
router.get("/admin/all", async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      type, recipientId,
      dateFrom, dateTo,
      status,
    } = req.query;

    const query = {};
    if (type)        query.type = type;
    if (recipientId) query.recipientId = recipientId;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(dateTo);
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

module.exports = router;
