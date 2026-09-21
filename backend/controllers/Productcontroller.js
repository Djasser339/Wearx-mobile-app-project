const mongoose = require("mongoose");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");

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

// Only these fields can be set from the request.
// rating and reviewCount are NOT here: the future review system will control them.
const ALLOWED_FIELDS = [
  "name",
  "brand",
  "description",
  "category",
  "price",
  "colors",
  "sizes",
  "stock",
  "images",
  "tag",
];

const pickProductFields = (body) => {
  const data = {};
  ALLOWED_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  return data;
};

// Makes user text safe to use inside a regular expression search
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST: create a product
const createProduct = async (req, res) => {
  try {
    const data = pickProductFields(req.body || {});

    if (!data.name || !data.brand || !data.category || data.price === undefined) {
      return res.status(400).json({
        success: false,
        message: "name, brand, category and price are required",
      });
    }

    // Mongoose checks the rest (category enum, price >= 0, tag enum...)
    const product = await Product.create(data);

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    handleError(res, error);
  }
};

// GET: list products with optional filters, sorting and pagination
// Example: /products?category=Shirts&brand=Zara&minPrice=1000&sort=price_asc&page=1&limit=10
const getProducts = async (req, res) => {
  try {
    const { category, brand, tag, search, minPrice, maxPrice, sort } = req.query;

    // Build the MongoDB filter step by step
    const filter = {};
    if (category) filter.category = String(category);
    if (tag) filter.tag = String(tag);
    if (brand) filter.brand = new RegExp(`^${escapeRegex(String(brand))}$`, "i"); // exact, ignore case
    if (search) filter.name = new RegExp(escapeRegex(String(search)), "i"); // contains, ignore case

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        if (isNaN(Number(minPrice))) {
          return res.status(400).json({ success: false, message: "minPrice must be a number" });
        }
        filter.price.$gte = Number(minPrice); // $gte = greater than or equal
      }
      if (maxPrice !== undefined) {
        if (isNaN(Number(maxPrice))) {
          return res.status(400).json({ success: false, message: "maxPrice must be a number" });
        }
        filter.price.$lte = Number(maxPrice); // $lte = less than or equal
      }
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { rating: -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.newest;

    // Pagination: page 1 = first items, page 2 = next items, ...
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// GET: one product by id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    handleError(res, error);
  }
};

// PUT: update a product (only the fields you send are changed)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const updates = pickProductFields(req.body || {});
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true, // return the updated product
      runValidators: true, // enforce enum / min rules on updates too
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE: delete a product.
// We also remove it from every cart and wishlist so nothing points to a missing product.
// Old orders are NOT touched: they keep their own copy of name and price.
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // $pull removes matching entries from an array
    await Cart.updateMany({}, { $pull: { items: { product: id } } });
    await Wishlist.updateMany({}, { $pull: { products: id } });

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};