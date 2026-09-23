const mongoose = require("mongoose");

// This function connects to MongoDB using the URI from your .env file.
// It's async because connecting to a database takes time and can fail.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // stop the app — it's useless without a database
  }
};

module.exports = connectDB;