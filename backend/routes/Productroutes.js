const express = require("express");
const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// Mounted at "/api/products"

router.post("/", createProduct); // POST   /api/products
router.get("/", getProducts); // GET    /api/products  (?category=, ?search=, ...)
router.get("/:id", getProductById); // GET    /api/products/:id
router.put("/:id", updateProduct); // PUT    /api/products/:id
router.delete("/:id", deleteProduct); // DELETE /api/products/:id

module.exports = router;