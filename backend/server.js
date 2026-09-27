// Load variables from .env into process.env (MONGO_URI, PORT, ...)
// This must run before anything that needs those variables.
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/Userroutes");
const productRoutes = require("./routes/productroutes");
const cartRoutes = require("./routes/Cartroutes");
const wishlistRoutes = require("./routes/Whishlistroutes");
const orderRoutes = require("./routes/Orderroutes");

// Connect to MongoDB before the app starts handling requests
connectDB();

const app = express();

// Allows requests from other origins (e.g. a local HTML file, or your
// Expo app running on a different port/device) to reach this API.
app.use(cors());

// Middleware that runs on EVERY request, before it reaches any route.
// express.json() reads a JSON request body and puts it in req.body,
// which is why your controllers can do things like `const { name } = req.body`.
app.use(express.json());

// A simple health-check route, useful to confirm the server is alive.
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "API is running" });
});

// Mount each router under its own base path.
// Example: userRoutes' "/:id" becomes "/api/users/:id" here.
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);

// 404 handler: runs if no route above matched the request.
// Must be placed AFTER all the real routes.
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler: catches any error passed to next(error),
// or thrown outside a try/catch. Express recognizes this as an
// error handler because it takes 4 arguments (err, req, res, next).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});