const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const handleError = (res, error) => {
  console.error(error);
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "Email is already registered" });
  }
  return res.status(500).json({ success: false, message: "Server error" });
};

// Mongoose documents come with extra helper methods attached; toObject()
// gives us a plain object, then we manually strip the password before
// sending anything back to the client.
const removePassword = (user) => {
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

// POST /api/auth/register — public signup
const register = async (req, res) => {
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

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    // Anyone can sign up as "customer" or "seller", but NOT as "admin".
    // Admin accounts should be created deliberately (e.g. directly in the
    // database, or by another admin later), never through open signup.
    const safeRole = role === "seller" ? "seller" : "customer";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: safeRole,
    });

    const token = generateToken(user._id);

    res.status(201).json({ success: true, token, data: removePassword(user) });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    // The User model has `select: false` on password, so normal queries
    // never return it. Here we explicitly ask for it with .select("+password"),
    // because we need it to check the login attempt.
    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
      "+password"
    );
    if (!user) {
      // Same message as a wrong password, on purpose: this stops an
      // attacker from figuring out which emails are registered.
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.status(200).json({ success: true, token, data: removePassword(user) });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/auth/me — protected: needs a valid token
const getMe = async (req, res) => {
  // req.user was already fetched and attached by the `protect` middleware,
  // so there's no extra database call needed here.
  res.status(200).json({ success: true, data: removePassword(req.user) });
};

module.exports = { register, login, getMe };