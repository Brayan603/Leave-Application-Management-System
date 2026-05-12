import User from "../models/User.js";

const findUserOrFail = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

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

export const closeUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "closed") {
      return res.status(409).json({ message: "User is already closed" });
    }
    user.status = "closed";
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.sessions = [];
    await user.save();
    res.json({ message: "User closed successfully. All sessions terminated.", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

export const disableUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "disabled") {
      return res.status(409).json({ message: "User is already disabled" });
    }
    if (user.status === "closed") {
      return res.status(409).json({ message: "Cannot disable a closed user. Reopen first." });
    }
    user.status = "disabled";
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.sessions = [];
    await user.save();
    res.json({ message: "User disabled successfully. All sessions terminated.", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

export const enableUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "active") {
      return res.status(409).json({ message: "User is already active" });
    }
    if (user.status === "closed") {
      return res.status(409).json({ message: "Cannot enable a closed user. Reopen first." });
    }
    user.status = "active";
    await user.save();
    res.json({ message: "User enabled successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

export const logoutUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    user.sessions = [];
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    res.json({ message: "User logged out successfully", userId: user._id });
  } catch (err) { next(err); }
};

export const logoutAllUsers = async (req, res, next) => {
  try {
    await User.updateMany({}, { $set: { sessions: [] }, $inc: { tokenVersion: 1 } });
    res.json({ message: "All users logged out successfully" });
  } catch (err) { next(err); }
};

export const reopenUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status !== "closed") {
      return res.status(409).json({ message: "Only closed users can be reopened" });
    }
    user.status = "active";
    user.sessions = [];
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    res.json({ message: "User reopened successfully", userId: user._id, status: user.status });
  } catch (err) { next(err); }
};

export const resendCredential = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "closed") {
      return res.status(409).json({ message: "Cannot send credentials to a closed user" });
    }
    res.json({ message: "Credentials resent successfully", userId: user._id });
  } catch (err) { next(err); }
};

export const authorizeUser = async (req, res, next) => {
  try {
    const user = await findUserOrFail(req.params.userId);
    if (user.status === "closed") {
      return res.status(409).json({ message: "Cannot authorize a closed user" });
    }
    if (user.authorized) {
      return res.status(409).json({ message: "User is already authorized" });
    }
    user.authorized = true;
    await user.save();
    res.json({ message: "User authorized successfully", userId: user._id });
  } catch (err) { next(err); }
};
