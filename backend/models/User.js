const mongoose = require("mongoose");

// A Schema describes the SHAPE of a document: which fields it has,
// what type each field is, and which rules it must follow.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // MongoDB will refuse to save a user without a name
      trim: true, // removes spaces at the start/end: "  Ali " -> "Ali"
    },
    email: {
      type: String,
      required: true,
      unique: true, // no two users can share the same email
      lowercase: true, // "Ali@Mail.com" is saved as "ali@mail.com"
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // by default, queries will NOT return the password
    },
    phone: {
      type: String,
      trim: true, // optional (no "required")
    },
    avatar: {
      type: String, // a URL to an image, not the image itself — optional
      trim: true,
    },
    role: {
      type: String,
      enum: ["customer", "seller", "admin"], // only these 3 values are allowed
      default: "customer", // new users are customers unless told otherwise
    },
    isVerified: {
      type: Boolean,
      default: false, // flips to true once the user enters the correct code
    },
    // We store a HASH of the code, never the raw code — same idea as the
    // password. If the database ever leaked, a stolen hash alone can't be
    // used to verify someone's account.
    verificationCodeHash: {
      type: String,
      select: false,
    },
    verificationCodeExpires: {
      type: Date,
      select: false,
    },
    // Counts wrong guesses since the last code was issued. Without this,
    // someone could brute-force a 6-digit code (only ~1 million
    // possibilities) by just trying every combination.
    verificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true, // Mongoose adds createdAt and updatedAt automatically
  }
);

// A Model is the tool we use to talk to the "users" collection
// (create, find, update, delete). Mongoose pluralizes "User" -> "users".
module.exports = mongoose.model("User", userSchema);