// backend/routes/notification.routes.js
import express from "express";
import jwt from "jsonwebtoken";
const router = express.Router();

// ESM imports – import the whole service object then destructure
import notificationService from "../services/notificationService.js";
const { send, broadcast } = notificationService;
import Notification from "../models/Notification.js";

/* ─────────────────────────────────────────────
   Authentication middleware
───────────────────────────────────────────── */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated, token missing" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user from token payload (adjust fields to match your token)
    req.user = {
      id: decoded.id || decoded.userId,
      role: decoded.role,
      name: decoded.name || decoded.username || "User",
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid or expired" });
  }
};

/* ─────────────────────────────────────────────
   Socket.IO middleware – inject io instance
───────────────────────────────────────────── */
const withIO = (req, res, next) => {
  req.io = req.app.get("io");
  next();
};

/* ─────────────────────────────────────────────
   Apply authentication to ALL routes in this file
───────────────────────────────────────────── */
router.use(protect);

/* ─────────────────────────────────────────────
   GET /api/notifications
───────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
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
   ADMIN ROUTES (need io)
══════════════════════════════════════════════ */

router.post("/admin/broadcast", withIO, async (req, res) => {
  try {
    const {
      title,
      message,
      channels = ["in_app", "email"],
      priority = "normal",
      recipients,
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

router.post("/admin/announcement", withIO, async (req, res) => {
  try {
    const {
      title,
      message,
      channels = ["in_app", "email"],
      recipients,
      actionUrl,
      actionLabel,
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

router.get("/admin/all", async (req, res) => {
  try {
    const { page = 1, limit = 50, type, recipientId, dateFrom, dateTo } = req.query;

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

export default router;
