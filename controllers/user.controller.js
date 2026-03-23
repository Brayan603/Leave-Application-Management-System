// controllers/userController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Admin creates a user
export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // 1️⃣ Check if all fields exist
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Check if user already exists
    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3️⃣ Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    // 4️⃣ Create the user
    const user = await User.create({
      firstName,
      lastName,
      email: email.trim(),
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


