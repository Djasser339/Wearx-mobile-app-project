// Run with: npm run seed
// WARNING: This deletes all existing database data and recreates it.

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const Wishlist = require("./models/Wishlist");
const Order = require("./models/Order");

const products = [
  // =========================
  // T-SHIRTS
  // =========================
  {
    name: "Essential Crew Tee",
    brand: "Uniqlo",
    description: "Everyday cotton t-shirt with a clean regular fit.",
    category: "T-Shirts",
    price: 1800,
    colors: ["Black", "White", "Grey"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: 40,
    images: [
      "https://images.unsplash.com/photo-1583743814966-8936f37f4678?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Graphic Print Tee",
    brand: "Bershka",
    description: "Relaxed fit t-shirt with a modern front graphic.",
    category: "T-Shirts",
    price: 2200,
    colors: ["Black", "White"],
    sizes: ["S", "M", "L", "XL"],
    stock: 25,
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
    ],
    tag: "NEW",
  },
  {
    name: "Heavyweight Oversized Tee",
    brand: "Zara",
    description: "Heavy cotton oversized t-shirt with dropped shoulders.",
    category: "T-Shirts",
    price: 2900,
    colors: ["Black", "Cream", "Brown"],
    sizes: ["S", "M", "L", "XL"],
    stock: 28,
    images: [
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80",
    ],
    tag: "FEATURED",
  },
  {
    name: "Premium Cotton Tee",
    brand: "H&M",
    description: "Soft premium cotton t-shirt for everyday wear.",
    category: "T-Shirts",
    price: 2100,
    colors: ["White", "Navy", "Grey"],
    sizes: ["S", "M", "L", "XL"],
    stock: 35,
    images: [
      "https://images.unsplash.com/photo-1527719327859-3a6633a9f1a1?w=800&q=80",
    ],
    tag: "POPULAR",
  },

  // =========================
  // SHIRTS
  // =========================
  {
    name: "Classic Oxford Shirt",
    brand: "Zara",
    description: "Slim-fit cotton oxford shirt.",
    category: "Shirts",
    price: 4500,
    colors: ["White", "Blue"],
    sizes: ["S", "M", "L", "XL"],
    stock: 20,
    images: [
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80",
    ],
    tag: "NEW",
  },
  {
    name: "Linen Summer Shirt",
    brand: "H&M",
    description: "Breathable linen blend short-sleeve shirt.",
    category: "Shirts",
    price: 3800,
    colors: ["Beige", "Sky Blue"],
    sizes: ["M", "L", "XL"],
    stock: 15,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",
    ],
    tag: "FEATURED",
  },
  {
    name: "Relaxed Camp Collar Shirt",
    brand: "Mango",
    description: "Relaxed camp collar shirt with a lightweight feel.",
    category: "Shirts",
    price: 4200,
    colors: ["Cream", "Green", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 18,
    images: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Textured Casual Shirt",
    brand: "Massimo Dutti",
    description: "Textured cotton shirt designed for smart casual outfits.",
    category: "Shirts",
    price: 5900,
    colors: ["White", "Beige"],
    sizes: ["M", "L", "XL"],
    stock: 12,
    images: [
      "https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?w=800&q=80",
    ],
    tag: "FEATURED",
  },

  // =========================
  // PANTS
  // =========================
  {
    name: "Slim Chino Pants",
    brand: "Zara",
    description: "Stretch cotton chinos with a slim silhouette.",
    category: "Pants",
    price: 5200,
    colors: ["Khaki", "Navy", "Black"],
    sizes: ["30", "32", "34", "36"],
    stock: 18,
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80",
    ],
    tag: "NEW",
  },
  {
    name: "Straight Fit Jeans",
    brand: "Levi's",
    description: "Classic mid-wash straight fit denim.",
    category: "Pants",
    price: 7900,
    colors: ["Blue"],
    sizes: ["30", "32", "34", "36"],
    stock: 12,
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Relaxed Cargo Pants",
    brand: "Bershka",
    description: "Relaxed cargo pants with utility pockets.",
    category: "Pants",
    price: 5600,
    colors: ["Black", "Olive", "Beige"],
    sizes: ["30", "32", "34", "36"],
    stock: 20,
    images: [
      "https://images.unsplash.com/photo-1517445312882-09c0b7e8b6c5?w=800&q=80",
    ],
    tag: "FEATURED",
  },
  {
    name: "Tailored Trousers",
    brand: "Massimo Dutti",
    description: "Clean tailored trousers for smart everyday outfits.",
    category: "Pants",
    price: 6800,
    colors: ["Black", "Charcoal", "Navy"],
    sizes: ["30", "32", "34", "36"],
    stock: 14,
    images: [
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80",
    ],
    tag: "POPULAR",
  },

  // =========================
  // SHORTS
  // =========================
  {
    name: "Cargo Shorts",
    brand: "H&M",
    description: "Utility shorts with practical side pockets.",
    category: "Shorts",
    price: 3200,
    colors: ["Olive", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 22,
    images: [
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Athletic Training Shorts",
    brand: "Nike",
    description: "Lightweight quick-dry training shorts.",
    category: "Shorts",
    price: 2800,
    colors: ["Black", "Grey"],
    sizes: ["S", "M", "L", "XL"],
    stock: 30,
    images: [
      "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=800&q=80",
    ],
    tag: "NEW",
  },
  {
    name: "Relaxed Denim Shorts",
    brand: "Levi's",
    description: "Relaxed denim shorts with a vintage wash.",
    category: "Shorts",
    price: 3500,
    colors: ["Blue", "Black"],
    sizes: ["S", "M", "L", "XL"],
    stock: 16,
    images: [
      "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=800&q=80",
    ],
    tag: "FEATURED",
  },

  // =========================
  // JACKETS
  // =========================
  {
    name: "Denim Jacket",
    brand: "Levi's",
    description: "Classic denim trucker jacket.",
    category: "Jackets",
    price: 9500,
    colors: ["Blue"],
    sizes: ["M", "L", "XL"],
    stock: 10,
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Lightweight Bomber",
    brand: "Zara",
    description: "Water-resistant bomber with ribbed cuffs.",
    category: "Jackets",
    price: 8700,
    colors: ["Black", "Olive"],
    sizes: ["S", "M", "L", "XL"],
    stock: 14,
    images: [
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80",
    ],
    tag: "NEW",
  },
  {
    name: "Minimal Harrington Jacket",
    brand: "Uniqlo",
    description: "Clean lightweight jacket with a classic collar.",
    category: "Jackets",
    price: 8200,
    colors: ["Navy", "Black", "Beige"],
    sizes: ["S", "M", "L", "XL"],
    stock: 11,
    images: [
      "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&q=80",
    ],
    tag: "FEATURED",
  },
  {
    name: "Puffer Jacket",
    brand: "Nike",
    description: "Warm insulated jacket for colder days.",
    category: "Jackets",
    price: 12500,
    colors: ["Black", "Grey"],
    sizes: ["S", "M", "L", "XL"],
    stock: 8,
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
    ],
    tag: "POPULAR",
  },

  // =========================
  // SHOES
  // =========================
  {
    name: "Classic Sneakers",
    brand: "Adidas",
    description: "Everyday low-top sneakers.",
    category: "Shoes",
    price: 8900,
    colors: ["White", "Black"],
    sizes: ["40", "41", "42", "43", "44"],
    stock: 16,
    images: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Running Shoes",
    brand: "Nike",
    description: "Cushioned running shoes for daily training.",
    category: "Shoes",
    price: 11500,
    colors: ["Black", "Grey"],
    sizes: ["40", "41", "42", "43", "44"],
    stock: 10,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    ],
    tag: "NEW",
  },
  {
    name: "Minimal Court Sneakers",
    brand: "Puma",
    description: "Clean low-profile sneakers for everyday outfits.",
    category: "Shoes",
    price: 7600,
    colors: ["White", "Black"],
    sizes: ["40", "41", "42", "43", "44"],
    stock: 19,
    images: [
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80",
    ],
    tag: "FEATURED",
  },
  {
    name: "Retro Runner",
    brand: "New Balance",
    description: "Retro-inspired running sneaker with cushioned sole.",
    category: "Shoes",
    price: 10800,
    colors: ["Grey", "White"],
    sizes: ["40", "41", "42", "43", "44"],
    stock: 13,
    images: [
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80",
    ],
    tag: "POPULAR",
  },

  // =========================
  // ACCESSORIES
  // =========================
  {
    name: "Leather Belt",
    brand: "Massimo Dutti",
    description: "Classic leather belt with a metal buckle.",
    category: "Accessories",
    price: 2500,
    colors: ["Brown", "Black"],
    sizes: ["M", "L"],
    stock: 25,
    images: [
      "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Wool Beanie",
    brand: "H&M",
    description: "Warm knitted beanie for colder weather.",
    category: "Accessories",
    price: 1200,
    colors: ["Black", "Grey", "Navy"],
    sizes: [],
    stock: 35,
    images: [
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80",
    ],
    tag: "NEW",
  },
  {
    name: "Classic Leather Wallet",
    brand: "Zara",
    description: "Slim leather wallet with multiple card slots.",
    category: "Accessories",
    price: 2900,
    colors: ["Black", "Brown"],
    sizes: [],
    stock: 20,
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80",
    ],
    tag: "FEATURED",
  },
  {
    name: "Minimal Crossbody Bag",
    brand: "Uniqlo",
    description: "Compact crossbody bag for everyday essentials.",
    category: "Accessories",
    price: 3100,
    colors: ["Black", "Olive"],
    sizes: [],
    stock: 18,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    ],
    tag: "POPULAR",
  },
  {
    name: "Metal Frame Sunglasses",
    brand: "Ray-Ban",
    description: "Minimal metal-frame sunglasses.",
    category: "Accessories",
    price: 6500,
    colors: ["Black", "Silver"],
    sizes: [],
    stock: 9,
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80",
    ],
    tag: "FEATURED",
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Wipe existing data
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Wishlist.deleteMany({}),
      Order.deleteMany({}),
    ]);

    console.log("Cleared existing data");

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