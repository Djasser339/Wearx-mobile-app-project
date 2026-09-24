const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

// Mounted at "/api/cart". The logged-in user's id comes from protect.

router.get("/", protect, getCart); // GET    /api/cart
router.post("/", protect, addToCart); // POST   /api/cart
router.put("/items/:productId", protect, updateCartItem); // PUT    /api/cart/items/:productId
router.delete("/items/:productId", protect, removeFromCart); // DELETE /api/cart/items/:productId
router.delete("/", protect, clearCart); // DELETE /api/cart

module.exports = router;