const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware runs BEFORE a controller, and can either call next() to let
// the request continue, or stop it early by sending a response itself.

// protect: checks that a valid token was sent with the request, and
// attaches the matching user to req.user so controllers know who's asking.
//
// The client is expected to send the token like this:
//   Authorization: Bearer <token>
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1]; // "Bearer abc123" -> "abc123"

    // jwt.verify throws if the token is invalid, tampered with, or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    req.user = user; // every controller AFTER this middleware can now read req.user
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized, invalid token" });
  }
};

// authorize("admin", "seller") -> only these roles may continue.
// Must be used AFTER protect, since it needs req.user to already exist.
// Example: router.delete("/:id", protect, authorize("admin"), deleteProduct);
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user ? req.user.role : "unknown"}' is not allowed to do this`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };