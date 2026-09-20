const mongoose = require("mongoose");

// A small schema used INSIDE the cart for each line of the cart.
// _id: false means Mongoose won't give each item its own separate id.
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId, // stores the _id of a Product
      ref: "Product", // tells Mongoose which model that id belongs to
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    // Clothing needs a size/color choice, so we store what the user picked.
    selectedSize: { type: String },
    selectedColor: { type: String },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // each user has exactly ONE cart
    },
    items: {
      type: [cartItemSchema], // an array of cart items
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cart", cartSchema);