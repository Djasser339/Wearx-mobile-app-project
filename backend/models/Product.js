const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String, // just text, no separate Brand model
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "T-Shirts",
        "Shirts",
        "Pants",
        "Shorts",
        "Jackets",
        "Shoes",
        "Accessories",
      ],
    },
    price: {
      type: Number,
      required: true,
      min: 0, // a price can't be negative
    },

    // [String] means "an array of strings", e.g. ["Black", "White"]
    colors: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String], // strings because sizes can be "M", "L" or "42"
      default: [],
    },

    // ONE stock number for the whole product (no per-size tracking)
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Image URLs (or paths). The frontend will display them.
    images: {
      type: [String],
      default: [],
    },

    // Placeholders for the future review system
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Optional: not required, and only these two values are allowed
    tag: {
      type: String,
      enum: ["NEW", "POPULAR", "FEATURED"]
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);