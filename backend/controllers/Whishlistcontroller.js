const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const User = require("../models/User");

const handleError = (res, error) => {
  console.error(error);
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid value for ${error.path}` });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "This record already exists" });
  }
  return res.status(500).json({ success: false, message: "Server error" });
};

const PRODUCT_FIELDS = "name brand price images category tag rating";

// GET: show a user's wishlist (empty if they don't have one yet)
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const wishlist = await Wishlist.findOne({ user: userId }).populate("products", PRODUCT_FIELDS);

    if (!wishlist) {
      return res.status(200).json({ success: true, data: { user: userId, products: [] } });
    }

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    handleError(res, error);
  }
};

// POST: save a product to the wishlist. Body: { productId }
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body || {};

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!(await Product.exists({ _id: productId }))) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // $addToSet adds the product ONLY if it is not already in the array,
    // so the same product can never be saved twice.
    // upsert: true creates the wishlist if the user doesn't have one yet.
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $addToSet: { products: productId } },
      { new: true, upsert: true }
    ).populate("products", PRODUCT_FIELDS);

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE: remove one product from the wishlist
// URL: /:productId
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid user or product id" });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { products: productId } }, // $pull removes it from the array
      { new: true }
    ).populate("products", PRODUCT_FIELDS);

    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE: remove everything from the wishlist
const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $set: { products: [] } },
      { new: true }
    );
    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    res.status(200).json({ success: true, message: "Wishlist cleared", data: wishlist });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, clearWishlist };