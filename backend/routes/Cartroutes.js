const express = require("express");
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

// Mounted at "/api/cart"
// Every cart belongs to a user, so :userId appears in every route.
// (Once login/JWT exists, :userId will be replaced by the logged-in user
// and these paths will get shorter — see the note at the end.)

router.get("/:userId", getCart); // GET    /api/cart/:userId
router.post("/:userId", addToCart); // POST   /api/cart/:userId
router.put("/:userId/items/:productId", updateCartItem); // PUT    /api/cart/:userId/items/:productId
router.delete("/:userId/items/:productId", removeFromCart); // DELETE /api/cart/:userId/items/:productId
router.delete("/:userId", clearCart); // DELETE /api/cart/:userId

module.exports = router;