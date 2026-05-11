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
      role: user.role,
      status: user.status,
      authorized: user.authorized,
    });
  } catch (err) { next(err); }
};

// ------------------- Close User -------------------
export const closeUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "closed") {
      return res.status(409).json({ message: "User is already closed" });
    }
    user.status = "closed";
    user.sessions = [];   // force logout
    await user.save();
    res.json({ message: "User closed successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Disable User -------------------
export const disableUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "disabled") {
      return res.status(409).json({ message: "User is already disabled" });
    }
    user.status = "disabled";
    await user.save();
    res.json({ message: "User disabled successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Enable User -------------------
export const enableUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "active") {
      return res.status(409).json({ message: "User is already active" });
    }
    user.status = "active";
    await user.save();
    res.json({ message: "User enabled successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Logout User (invalidate all sessions) -------------------
export const logoutUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    user.sessions = [];
    await user.save();
    res.json({ message: "User logged out successfully", userId: user._id });
  } catch (err) { next(err); }
};

// ------------------- Logout All (system-wide) -------------------
export const logoutAllUsers = async (req, res, next) => {
  try {
    await User.updateMany({}, { $set: { sessions: [] } });
    res.json({ message: "All users logged out successfully" });
  } catch (err) { next(err); }
};

// ------------------- Reopen User -------------------
export const reopenUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status !== "closed") {
      return res.status(409).json({ message: "Only closed users can be reopened" });
    }
    user.status = "active";
    await user.save();
    res.json({ message: "User reopened successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

// ------------------- Resend Credential -------------------
// Placeholder – integrate with your email service
export const resendCredential = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    // Example: trigger a welcome/reset email
    // await sendActivationEmail(user.email);
    res.json({ message: "Credentials resent successfully", userId: user._id });
  } catch (err) { next(err); }
};

// ------------------- Authorize User -------------------
export const authorizeUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.authorized) {
      return res.status(409).json({ message: "User is already authorized" });
    }
    user.authorized = true;
    await user.save();
    res.json({ message: "User authorized successfully", userId: user._id });
  } catch (err) { next(err); }
};
