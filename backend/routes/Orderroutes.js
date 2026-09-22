const express = require("express");
const router = express.Router();

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
// IMPORTANT ORDER OF ROUTES:
// Express checks routes top to bottom and uses the FIRST match.
// "/user/:userId" is written BEFORE "/:id" on purpose.
// If "/:id" came first, a request to /api/orders/user/665f... would
// incorrectly match "/:id" (treating the word "user" as the id).

router.post("/:userId", createOrder); // POST /api/orders/:userId          (checkout)
router.get("/", getOrders); // GET  /api/orders                 (all orders, ?status=)
router.get("/user/:userId", getUserOrders); // GET  /api/orders/user/:userId    (one user's orders)
router.get("/:id", getOrderById); // GET  /api/orders/:id
router.put("/:id/status", updateOrderStatus); // PUT  /api/orders/:id/status       (admin/seller)
router.put("/:id/cancel", cancelOrder); // PUT  /api/orders/:id/cancel       (customer)

module.exports = router;