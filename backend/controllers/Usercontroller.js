const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");

// One place to turn database errors into HTTP responses.
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

// When a user is created, Mongoose returns the whole document, password included.
// This helper makes sure we never send the password back.
const removePassword = (user) => {
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

// POST: create a new user
const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "name, email and password are required" });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 6 characters" });
    }

    // Check for a duplicate email so we can give a friendly message
    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email is already registered" });
    }

    // NEVER store a plain password. bcrypt turns it into a one-way hash.
    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await User.create({ name, email, password: hashedPassword, phone, role });

    res.status(201).json({ success: true, data: removePassword(user) });
  } catch (error) {
    handleError(res, error);
  }
};

// GET: list all users (optional filter: ?role=seller)
const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = String(req.query.role);

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    handleError(res, error);
  }
};

// GET: one user by id
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    handleError(res, error);
  }
};

// PUT: update a user (only the fields you send are changed)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    // Only copy the fields we allow to be changed
    const updates = {};
    ["name", "email", "phone", "role", "avatar"].forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field];
    });

    if (body.password !== undefined) {
      if (String(body.password).length < 6) {
        return res
          .status(400)
          .json({ success: false, message: "Password must be at least 6 characters" });
      }
      updates.password = await bcrypt.hash(String(body.password), 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    // If the email is changing, make sure nobody else already uses it
    if (updates.email) {
      const emailTaken = await User.findOne({
        email: String(updates.email).toLowerCase().trim(),
        _id: { $ne: id }, // $ne = "not equal": ignore the user we are updating
      });
      if (emailTaken) {
        return res.status(409).json({ success: false, message: "Email is already registered" });
      }
    }

    // new: true      -> return the updated document (not the old one)
    // runValidators  -> apply the schema rules (enum, minlength...) to the update
    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE: delete a user and their cart + wishlist.
// Orders are kept on purpose: they are business records.
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await Cart.deleteOne({ user: id });
    await Wishlist.deleteOne({ user: id });

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { createUser, getUsers, getUserById, updateUser, deleteUser };