import User from "../models/User.js";

// ------------------- Helper -------------------
const findUserOrFail = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

// ------------------- User Details -------------------
export const getUserDetails = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      authorized: user.authorized,
      organization: user.organization,
      department: user.department,
      manager: user.manager,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) { next(err); }
};

// controllers/userMaintenance.controller.js

// ------------------- Disable User -------------------
export const disableUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "Disabled") {
      return res.status(409).json({ message: "User is already disabled" });
    }
    if (user.status === "Closed") {
      return res.status(409).json({ message: "Cannot disable a closed user. Reopen first." });
    }
    
    user.status = "Disabled";
    
    // 🔥 Force invalidate all existing tokens by changing token version
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    
    await user.save();
    
    res.json({ message: "User disabled successfully. All sessions terminated.", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Close User -------------------
export const closeUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "Closed") {
      return res.status(409).json({ message: "User is already closed" });
    }
    
    user.status = "Closed";
    
    // 🔥 Force invalidate all existing tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    
    await user.save();
    
    res.json({ message: "User closed successfully. All sessions terminated.", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Enable User -------------------
export const enableUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "Active") {
      return res.status(409).json({ message: "User is already active" });
    }
    if (user.status === "Closed") {
      return res.status(409).json({ message: "Cannot enable a closed user. Reopen first." });
    }
    user.status = "Active";
    await user.save();
    res.json({ message: "User enabled successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Logout User (invalidate all sessions) -------------------
export const logoutUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    user.sessions = [];
    user.refreshToken = null;
    await user.save();
    res.json({ message: "User logged out successfully", userId: user._id });
  } catch (err) { next(err); }
};

// ------------------- Logout All (system-wide) -------------------
export const logoutAllUsers = async (req, res, next) => {
  try {
    await User.updateMany({}, { $set: { sessions: [], refreshToken: null } });
    res.json({ message: "All users logged out successfully" });
  } catch (err) { next(err); }
};

// ------------------- Reopen User -------------------
export const reopenUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status !== "Closed") {
      return res.status(409).json({ message: "Only closed users can be reopened" });
    }
    user.status = "Active";
    user.sessions = [];
    await user.save();
    res.json({ message: "User reopened successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Resend Credential -------------------
export const resendCredential = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    
    if (user.status === "Closed") {
      return res.status(409).json({ message: "Cannot send credentials to a closed user" });
    }

    // Generate a reset token or temporary password
    // const resetToken = crypto.randomBytes(32).toString("hex");
    // user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    // user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    // await user.save();
    
    // Send email with credentials
    // await sendCredentialEmail(user.email, resetToken);

    res.json({ message: "Credentials resent successfully", userId: user._id });
  } catch (err) { next(err); }
};

// ------------------- Authorize User -------------------
export const authorizeUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    
    if (user.status === "Closed") {
      return res.status(409).json({ message: "Cannot authorize a closed user" });
    }
    
    if (user.authorized) {
      return res.status(409).json({ message: "User is already authorized" });
    }
    
    user.authorized = true;
    await user.save();
    res.json({ message: "User authorized successfully", userId: user._id, authorized: user.authorized });
  } catch (err) { next(err); }
};

// ------------------- Deauthorize User -------------------
export const deauthorizeUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    
    if (!user.authorized) {
      return res.status(409).json({ message: "User is already unauthorized" });
    }
    
    user.authorized = false;
    await user.save();
    res.json({ message: "User unauthorized successfully", userId: user._id, authorized: user.authorized });
  } catch (err) { next(err); }
};

// ------------------- Check User Status (for auth middleware) -------------------
export const isUserBlocked = async (userId) => {
  const user = await User.findById(userId).select("status");
  if (!user) return true;
  return user.status === "Disabled" || user.status === "Closed";
};
