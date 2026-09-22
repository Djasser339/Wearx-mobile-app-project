const express = require("express");
const router = express.Router();

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = require("../controllers/wishlistController");

// Mounted at "/api/wishlist"

router.get("/:userId", getWishlist); // GET    /api/wishlist/:userId
router.post("/:userId", addToWishlist); // POST   /api/wishlist/:userId
router.delete("/:userId/:productId", removeFromWishlist); // DELETE /api/wishlist/:userId/:productId
router.delete("/:userId", clearWishlist); // DELETE /api/wishlist/:userId

module.exports = router;