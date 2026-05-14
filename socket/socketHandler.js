// backend/socket/socketHandler.js
// Attach to your Express server:
//
//   const { createServer } = require("http");
//   const { initSocket }   = require("./socket/socketHandler");
//   const httpServer = createServer(app);
//   const io = initSocket(httpServer);
//   app.set("io", io);          ← makes io available in routes
//   httpServer.listen(PORT);

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken"); // npm install jsonwebtoken

let ioInstance = null;

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || "http://localhost:3000",
      methods:     ["GET", "POST"],
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  /* ── Auth middleware ── */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = decoded.id || decoded.sub;
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

    /* Join personal room → used by notificationService to target user */
    socket.join(`user_${userId}`);

    /* Admins also join the admin room for admin-only broadcasts */
    if (userRole === "admin") {
      socket.join("room_admin");
    }
    if (userRole === "manager") {
      socket.join("room_manager");
    }

    /* Client acknowledges notification was read */
    socket.on("notification:read", async (notificationId) => {
      try {
        const Notification = require("../models/Notification");
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipientId: userId },
          { isRead: true, readAt: new Date(), "status.in_app": "read" }
        );
      } catch (err) {
        console.error("[Socket] notification:read error:", err.message);
      }
    });

    /* Client requests unread count on reconnect */
    socket.on("notification:getCount", async () => {
      try {
        const Notification = require("../models/Notification");
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

/* Access io instance outside of route context */
const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialised");
  return ioInstance;
};

module.exports = { initSocket, getIO };
