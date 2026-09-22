const express = require("express");
const router = express.Router(); // a mini, self-contained set of routes

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
router.get("/", getUsers); // GET    /api/users
router.get("/:id", getUserById); // GET    /api/users/:id
router.put("/:id", updateUser); // PUT    /api/users/:id
router.delete("/:id", deleteUser); // DELETE /api/users/:id

module.exports = router;