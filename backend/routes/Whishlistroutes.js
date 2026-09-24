const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = require("../controllers/whishlistController");

// Mounted at "/api/wishlist"

router.get("/", protect, getWishlist); // GET    /api/wishlist
router.post("/", protect, addToWishlist); // POST   /api/wishlist
router.delete("/:productId", protect, removeFromWishlist); // DELETE /api/wishlist/:productId
router.delete("/", protect, clearWishlist); // DELETE /api/wishlist

module.exports = router;