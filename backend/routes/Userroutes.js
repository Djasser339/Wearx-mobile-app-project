const express = require("express");
const router = express.Router(); // a mini, self-contained set of routes
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

// Each line: HTTP method + path -> controller function to run.
// The full path will be "/api/users" + whatever is written here,
// once this router is mounted in app.js (see the explanation below).

router.post("/", createUser); // POST   /api/users
router.get("/", protect, authorize("admin"), getUsers); // GET    /api/users
router.get("/:id", protect, authorize("admin"), getUserById); // GET    /api/users/:id
router.put("/:id", protect, authorize("admin"), updateUser); // PUT    /api/users/:id
router.delete("/:id", protect, authorize("admin"), deleteUser); // DELETE /api/users/:id

module.exports = router;