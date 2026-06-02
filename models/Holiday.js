import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,               // avoid duplicates for the same date
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,              // null = global holiday for all orgs
    },
  },
  { timestamps: true }
);

// Index to quickly fetch holidays within a date range
holidaySchema.index({ date: 1 });
holidaySchema.index({ organization: 1 });

const Holiday = mongoose.model("Holiday", holidaySchema);
export default Holiday;
