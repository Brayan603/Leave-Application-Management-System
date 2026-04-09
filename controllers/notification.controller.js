import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

export const createNotification = async (req, res) => {
  const { message } = req.body; 
    if (!message) {
        return res.status(400).json({ message: "Message is required" });    
    }

  try {
    const newNotification = new Notification({
      userId: req.user.id,
      message,
    });
    await newNotification.save();
    res.status(201).json(newNotification);
  } catch (error) {
    res.status(500).json({ message: "Error creating notification" });
  }
};
