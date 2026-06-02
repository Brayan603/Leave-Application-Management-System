import Holiday from "../models/Holiday.js";

// ──────────────────────────────────────────
// ✅ GET ALL HOLIDAYS (protected, any logged-in user)
//    Returns an array of date strings "YYYY-MM-DD"
// ──────────────────────────────────────────
export const getHolidays = async (req, res) => {
  try {
    const { start, end, organization } = req.query;

    const filter = {};

    // Optional date range filter
    if (start) {
      const s = new Date(start);
      if (isNaN(s.getTime())) return res.status(400).json({ message: "Invalid start date" });
      filter.date = { ...filter.date, $gte: s };
    }
    if (end) {
      const e = new Date(end);
      if (isNaN(e.getTime())) return res.status(400).json({ message: "Invalid end date" });
      filter.date = { ...filter.date, $lte: e };
    }

    // Optional organisation filtering
    if (organization) {
      filter.$or = [
        { organization: organization },
        { organization: null },  // global holidays
      ];
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });

    // Return only the date strings (frontend expects an array of "YYYY-MM-DD")
    const dates = holidays.map((h) => {
      const d = new Date(h.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });

    res.json(dates);
  } catch (err) {
    console.error("GET HOLIDAYS ERROR:", err);
    res.status(500).json({ message: "Server error while fetching holidays" });
  }
};

// ──────────────────────────────────────────
// ✅ ADD A NEW HOLIDAY (admin only)
// ──────────────────────────────────────────
export const addHoliday = async (req, res) => {
  try {
    const { date, name, description, recurring, organization } = req.body;

    if (!date || !name) {
      return res.status(400).json({ message: "Date and name are required" });
    }

    const existing = await Holiday.findOne({ date });
    if (existing) {
      return res.status(409).json({ message: "A holiday already exists on this date" });
    }

    const holiday = await Holiday.create({
      date,
      name,
      description,
      recurring: recurring || false,
      organization: organization || null,
    });

    res.status(201).json({ message: "Holiday added", holiday });
  } catch (err) {
    console.error("ADD HOLIDAY ERROR:", err);
    res.status(500).json({ message: "Server error while adding holiday" });
  }
};

// ──────────────────────────────────────────
// ✅ UPDATE A HOLIDAY (admin only)
// ──────────────────────────────────────────
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const holiday = await Holiday.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    res.json({ message: "Holiday updated", holiday });
  } catch (err) {
    console.error("UPDATE HOLIDAY ERROR:", err);
    res.status(500).json({ message: "Server error while updating holiday" });
  }
};

// ──────────────────────────────────────────
// ✅ DELETE A HOLIDAY (admin only)
// ──────────────────────────────────────────
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    res.json({ message: "Holiday deleted" });
  } catch (err) {
    console.error("DELETE HOLIDAY ERROR:", err);
    res.status(500).json({ message: "Server error while deleting holiday" });
  }
};
