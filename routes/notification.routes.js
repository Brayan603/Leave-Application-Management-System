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

// Helper: generate ETag from a timestamp (e.g., last modified date)
const generateEtag = (timestamp) => {
  if (!timestamp) return null;
  return crypto.createHash("md5").update(timestamp.toISOString()).digest("hex");
};

// GET /api/notifications?page=1&limit=20&unreadOnly=false
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    // 1. Get the latest notification timestamp for this user (cheap query)
    const latestNotification = await Notification.findOne(
      { recipientId: userId },
      { updatedAt: 1 }
    ).sort({ updatedAt: -1 }).lean();

    const lastModified = latestNotification ? latestNotification.updatedAt : new Date(0);
    const etag = generateEtag(lastModified);

    // 2. Check conditional request
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    // 3. Only now perform the full query
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
    res.setHeader("Cache-Control", "private, max-age=5"); // short client cache
    res.json({ notifications, total, unreadCount, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", async (req, res) => {
  try {
    const userId = req.user.id;

    // Use a separate ETag based on the latest unread change (track via a separate doc or a simple version)
    // For simplicity, we use the same lastModified as above, but you can create a dedicated "user_meta" collection.
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

// Other routes (PATCH, DELETE, admin routes) remain the same
// ... (mark-read, delete, admin/broadcast, etc.)

export default router;
