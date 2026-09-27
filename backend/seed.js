// Run with: npm run seed
// This wipes your current data and fills the database with sample
// products and test users, so your app has something to show.

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const Wishlist = require("./models/Wishlist");
const Order = require("./models/Order");

const products = [
  {
    name: "Classic Oxford Shirt",
    brand: "Zara",
    description: "Slim-fit cotton oxford shirt.",
    category: "Shirts",
    price: 4500,
    colors: ["White", "Blue"],
    sizes: ["S", "M", "L", "XL"],
    stock: 20,
    images: ["https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80"],
    tag: "NEW",
  },
  {
    name: "Linen Summer Shirt",
    brand: "H&M",
    description: "Breathable linen blend, short sleeve.",
    category: "Shirts",
    price: 3800,
    colors: ["Beige", "Sky Blue"],
    sizes: ["M", "L", "XL"],
    stock: 15,
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80"],
  },
  {
    name: "Essential Crew Tee",
    brand: "Uniqlo",
    description: "Everyday cotton t-shirt.",
    category: "T-Shirts",
    price: 1800,
    colors: ["Black", "White", "Grey"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: 40,
    images: ["https://images.unsplash.com/photo-1583743814966-8936f37f4678?w=800&q=80"],
    tag: "POPULAR",
  },
  {
    name: "Graphic Print Tee",
    brand: "Bershka",
    description: "Relaxed fit, front print.",
    category: "T-Shirts",
    price: 2200,
    colors: ["Black", "White"],
    sizes: ["S", "M", "L"],
    stock: 25,
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80"],
    tag: "NEW",
  },
  {
    name: "Slim Chino Pants",
    brand: "Zara",
    description: "Stretch cotton chinos.",
    category: "Pants",
    price: 5200,
    colors: ["Khaki", "Navy", "Black"],
    sizes: ["30", "32", "34", "36"],
    stock: 18,
    images: ["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80"],
  },
  {
    name: "Straight Fit Jeans",
    brand: "Levi's",
    description: "Classic mid-wash denim.",
    category: "Pants",
    price: 7900,
    colors: ["Blue"],
    sizes: ["30", "32", "34", "36"],
    stock: 12,
    images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80"],
    tag: "POPULAR",
  },
  {
    name: "Cargo Shorts",
    brand: "H&M",
    description: "Utility shorts with side pockets.",
    category: "Shorts",
    price: 3200,
    colors: ["Olive", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 22,
    images: ["https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80"],
  },
  {
    name: "Athletic Training Shorts",
    brand: "Nike",
    description: "Lightweight, quick-dry fabric.",
    category: "Shorts",
    price: 2800,
    colors: ["Black", "Grey"],
    sizes: ["S", "M", "L"],
    stock: 30,
    images: ["https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=800&q=80"],
    tag: "NEW",
  },
  {
    name: "Denim Jacket",
    brand: "Levi's",
    description: "Classic trucker jacket.",
    category: "Jackets",
    price: 9500,
    colors: ["Blue"],
    sizes: ["M", "L", "XL"],
    stock: 10,
    images: ["https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=800&q=80"],
    tag: "POPULAR",
  },
  {
    name: "Lightweight Bomber",
    brand: "Zara",
    description: "Water-resistant shell, ribbed cuffs.",
    category: "Jackets",
    price: 8700,
    colors: ["Black", "Olive"],
    sizes: ["S", "M", "L", "XL"],
    stock: 14,
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80"],
    tag: "NEW",
  },
  {
    name: "Classic Sneakers",
    brand: "Adidas",
    description: "Everyday low-top sneakers.",
    category: "Shoes",
    price: 8900,
    colors: ["White", "Black"],
    sizes: ["40", "41", "42", "43", "44"],
    stock: 16,
    images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80"],
    tag: "POPULAR",
  },
  {
    name: "Running Shoes",
    brand: "Nike",
    description: "Cushioned sole for daily runs.",
    category: "Shoes",
    price: 11500,
    colors: ["Black", "Grey"],
    sizes: ["40", "41", "42", "43", "44"],
    stock: 10,
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"],
  },
  {
    name: "Leather Belt",
    brand: "Massimo Dutti",
    description: "Genuine leather, classic buckle.",
    category: "Accessories",
    price: 2500,
    colors: ["Brown", "Black"],
    sizes: ["M", "L"],
    stock: 25,
    images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"],
  },
  {
    name: "Wool Beanie",
    brand: "H&M",
    description: "Warm knit beanie.",
    category: "Accessories",
    price: 1200,
    colors: ["Black", "Grey", "Navy"],
    sizes: [],
    stock: 35,
    images: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80"],
    tag: "NEW",
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Wipe everything so the seed can be run again safely
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Wishlist.deleteMany({}),
      Order.deleteMany({}),
    ]);

    console.log("Cleared existing data");

    // All test users use the same password
    const hashedPassword = await bcrypt.hash("password123", 10);

    const users = await User.insertMany([
      {
        name: "Test Customer",
        email: "test@gmail.com",
        password: hashedPassword,
        phone: "0550000001",
        role: "customer",
      },
      {
        name: "Test Seller",
        email: "seller@gmail.com",
        password: hashedPassword,
        phone: "0550000002",
        role: "seller",
      },
      {
        name: "Test Admin",
        email: "admin@gmail.com",
        password: hashedPassword,
        phone: "0550000003",
        role: "admin",
      },
      {
        name: "Demo Customer",
        email: "demo@mail.com",
        password: hashedPassword,
        phone: "0550000004",
        role: "customer",
      },
    ]);

    console.log(`Created ${users.length} test users`);
    console.log("All test users use password: password123");

    const createdProducts = await Product.insertMany(products);
    console.log(`Created ${createdProducts.length} products`);

    // Give every customer/seller an empty cart and wishlist
    for (const user of users) {
      if (user.role === "customer" || user.role === "seller") {
        await Cart.create({
          user: user._id,
          items: [],
        });

        await Wishlist.create({
          user: user._id,
          products: [],
        });
      }
    }

    console.log("Created carts and wishlists");
    console.log("Seeding complete.");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
  }
};

run();