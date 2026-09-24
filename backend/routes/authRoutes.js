const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Mounted at "/api/auth"

router.post("/register", register); // POST /api/auth/register
router.post("/login", login); // POST /api/auth/login
router.get("/me", protect, getMe); // GET  /api/auth/me   (needs Authorization: Bearer <token>)

module.exports = router;