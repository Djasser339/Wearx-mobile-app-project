const mongoose = require("mongoose");
const Cart = require("../models/Cart");
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

// Which product fields we send back when showing the cart
const PRODUCT_FIELDS = "name brand price images stock";

// A cart item is identified by product + size + color.
// (The same shirt in size M and size L are two separate lines.)
const isSameItem = (item, productId, selectedSize, selectedColor) =>
  item.product.toString() === String(productId) &&
  (item.selectedSize || null) === (selectedSize || null) &&
  (item.selectedColor || null) === (selectedColor || null);

// Returns an error message if the chosen size/color isn't offered by the product
const getVariantError = (product, selectedSize, selectedColor) => {
  if (product.sizes.length > 0 && !product.sizes.includes(selectedSize)) {
    return `Please choose a valid size: ${product.sizes.join(", ")}`;
  }
  if (product.colors.length > 0 && !product.colors.includes(selectedColor)) {
    return `Please choose a valid color: ${product.colors.join(", ")}`;
  }
  return null;
};

// For update/remove, size and color can come from the body or the URL query
const readVariant = (req) => {
  const body = req.body || {};
  return {
    selectedSize: body.selectedSize ?? req.query.selectedSize,
    selectedColor: body.selectedColor ?? req.query.selectedColor,
  };
};

// GET: show a user's cart (an empty cart if they don't have one yet)
const getCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // populate replaces each product id with the real product data
    const cart = await Cart.findOne({ user: userId }).populate("items.product", PRODUCT_FIELDS);

    if (!cart) {
      return res.status(200).json({ success: true, data: { user: userId, items: [] } });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    handleError(res, error);
  }
};

// POST: add a product to the cart
// Body: { productId, quantity (default 1), selectedSize, selectedColor }
const addToCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity = 1, selectedSize, selectedColor } = req.body || {};

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be a whole number of at least 1" });
    }

    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const variantError = getVariantError(product, selectedSize, selectedColor);
    if (variantError) {
      return res.status(400).json({ success: false, message: variantError });
    }

    // Find the user's cart, or prepare a new empty one
    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const existingItem = cart.items.find((item) =>
      isSameItem(item, productId, selectedSize, selectedColor)
    );

    // Total quantity of this item after adding must not exceed stock
    const newQuantity = (existingItem ? existingItem.quantity : 0) + qty;
    if (newQuantity > product.stock) {
      return res
        .status(400)
        .json({ success: false, message: `Only ${product.stock} in stock` });
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity: qty, selectedSize, selectedColor });
    }

    await cart.save();
    await cart.populate("items.product", PRODUCT_FIELDS);

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    handleError(res, error);
  }
};

// PUT: change the quantity of one cart line
// URL: /:userId/items/:productId   Body: { quantity, selectedSize, selectedColor }
const updateCartItem = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body || {};
    const { selectedSize, selectedColor } = readVariant(req);

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid user or product id" });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a whole number of at least 1 (use remove to delete an item)",
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find((i) => isSameItem(i, productId, selectedSize, selectedColor));
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product no longer exists" });
    }
    if (qty > product.stock) {
      return res
        .status(400)
        .json({ success: false, message: `Only ${product.stock} in stock` });
    }

    item.quantity = qty;
    await cart.save();
    await cart.populate("items.product", PRODUCT_FIELDS);

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE: remove one line from the cart
// URL: /:userId/items/:productId?selectedSize=M&selectedColor=Blue
const removeFromCart = async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { selectedSize, selectedColor } = readVariant(req);

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid user or product id" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const index = cart.items.findIndex((i) =>
      isSameItem(i, productId, selectedSize, selectedColor)
    );
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    cart.items.splice(index, 1); // remove 1 element at that position
    await cart.save();
    await cart.populate("items.product", PRODUCT_FIELDS);

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE: empty the whole cart
const clearCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, message: "Cart cleared", data: cart });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };