const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  createOrder,
  getOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");

// Mounted at "/api/orders"
//
router.post("/", protect, createOrder); // POST /api/orders                 (checkout)
router.get("/", protect, getOrders); // GET  /api/orders                 (all orders, ?status=)
router.get("/user", protect, getUserOrders); // GET  /api/orders/user          (one user's orders)
router.get("/:id", protect, getOrderById); // GET  /api/orders/:id
router.put("/:id/status", protect, updateOrderStatus); // PUT  /api/orders/:id/status       (admin/seller)
router.put("/:id/cancel", protect, cancelOrder); // PUT  /api/orders/:id/cancel       (customer)

module.exports = router;