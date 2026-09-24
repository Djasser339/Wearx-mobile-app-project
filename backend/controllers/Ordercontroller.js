const mongoose = require("mongoose");
const Order = require("../models/Order");
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

// Give stock back to products (used when an order is cancelled or fails halfway)
const restoreStock = async (items) => {
  for (const item of items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
};

// POST: place an order from the user's current cart ("checkout")
// Body: { shippingAddress: { fullName, phone, address, city, postalCode } }
//
// The server builds the order from the CART and the real product prices,
// so the client can never send a fake price or total.
const createOrder = async (req, res) => {
  const reservedItems = []; // stock we already took, so we can give it back on failure
  let order = null;

  try {
    const userId = req.user.id;
    const { shippingAddress } = req.body || {};

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city
    ) {
      return res.status(400).json({
        success: false,
        message: "shippingAddress needs fullName, phone, address and city",
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const orderItems = [];
    let totalPrice = 0;

    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product);
      if (!product) {
        await restoreStock(reservedItems);
        return res
          .status(400)
          .json({ success: false, message: "A product in your cart no longer exists" });
      }

      // Reduce stock ONLY IF enough is left. Doing the check and the update in one
      // query stops two customers from buying the last item at the same time.
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: cartItem.quantity } },
        { $inc: { stock: -cartItem.quantity } }
      );
      if (!updated) {
        await restoreStock(reservedItems);
        return res
          .status(400)
          .json({ success: false, message: `Not enough stock for "${product.name}"` });
      }
      reservedItems.push({ product: product._id, quantity: cartItem.quantity });

      // Copy name and price NOW: this is the "price at the time of ordering"
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity,
        selectedSize: cartItem.selectedSize,
        selectedColor: cartItem.selectedColor,
      });
      totalPrice += product.price * cartItem.quantity;
    }

    order = await Order.create({
      user: userId,
      items: orderItems,
      totalPrice,
      shippingAddress,
    });

    // The order is saved, so the cart is now empty
    cart.items = [];
    await cart.save();

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    // If something failed before the order existed, give the stock back
    if (!order && reservedItems.length > 0) {
      await restoreStock(reservedItems);
    }
    handleError(res, error);
  }
};

// GET: list ALL orders (meant for admin/seller later). Optional: ?status=pending
const getOrders = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      const validStatuses = Order.schema.path("status").enumValues;
      if (!validStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${validStatuses.join(", ")}`,
        });
      }
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    handleError(res, error);
  }
};

// GET: list one user's orders (their order history)
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    handleError(res, error);
  }
};

// GET: one order by id
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(id).populate("user", "name email");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (
      req.user.role !== "admin" &&
      req.user.role !== "seller" &&
      order.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to view this order" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error);
  }
};

// PUT: change the order status (meant for admin/seller later). Body: { status }
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    // Read the allowed values straight from the model, so they never get out of sync
    const validStatuses = Order.schema.path("status").enumValues;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // delivered and cancelled are final
    if (order.status === "delivered" || order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `A ${order.status} order can no longer be changed`,
      });
    }

    // Cancelling gives the products back to stock
    if (status === "cancelled") {
      await restoreStock(order.items);
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error);
  }
};

// PUT: a customer cancels their own order.
// Only allowed while the order is still pending or confirmed.
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "pending" && order.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: `A ${order.status} order cannot be cancelled`,
      });
    }

    await restoreStock(order.items);

    order.status = "cancelled";
    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled", data: order });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};