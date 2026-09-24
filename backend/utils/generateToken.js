const jwt = require("jsonwebtoken");

// Creates a JWT (JSON Web Token) that contains the user's id.
// A JWT is a signed piece of text — anyone can read it, but only someone
// who knows JWT_SECRET could have created a valid one. That signature is
// what proves the token wasn't forged or tampered with.
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId }, // the "payload": the data stored inside the token
    process.env.JWT_SECRET, // the secret key used to sign it
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" } // when it stops being valid
  );
};

module.exports = generateToken;