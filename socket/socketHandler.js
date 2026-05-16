// backend/socket/socketHandler.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";

let ioInstance = null;

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "https://leave-management20-systems.vercel.app",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /* ── Auth middleware ── */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id || decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  /* ── Connection ── */
  io.on("connection", (socket) => {
    const { userId, userRole } = socket;
    console.log(`[Socket] User ${userId} connected (${socket.id})`);

    socket.join(`user_${userId}`);

    if (userRole === "admin") socket.join("room_admin");
    if (userRole === "manager") socket.join("room_manager");

    socket.on("notification:read", async (notificationId) => {
      try {
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipientId: userId },
          { isRead: true, readAt: new Date(), "status.in_app": "read" }
        );
      } catch (err) {
        console.error("[Socket] notification:read error:", err.message);
      }
    });

    socket.on("notification:getCount", async () => {
      try {
        const count = await Notification.countDocuments({
          recipientId: userId,
          isRead: false,
        });
        socket.emit("notification:count", { count });
      } catch (err) {
        console.error("[Socket] notification:getCount error:", err.message);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] User ${userId} disconnected: ${reason}`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialised");
  return ioInstance;
};
