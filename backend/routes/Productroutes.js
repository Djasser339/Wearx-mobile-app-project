const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// Mounted at "/api/products"

router.post("/", protect, authorize("admin", "seller"), createProduct); // POST   /api/products
router.get("/", getProducts); // GET    /api/products  (?category=, ?search=, ...)
router.get("/:id", getProductById); // GET    /api/products/:id
router.put("/:id", protect, authorize("admin", "seller"), updateProduct); // PUT    /api/products/:id
router.delete("/:id", protect, authorize("admin", "seller"), deleteProduct); // DELETE /api/products/:id

module.exports = router;