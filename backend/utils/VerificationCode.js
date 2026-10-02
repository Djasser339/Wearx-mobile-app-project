const crypto = require("crypto");

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // a code is valid for 10 minutes

// A 6-digit numeric code, e.g. "482913". padStart guarantees it's always
// exactly 6 digits — without it, a value like 4821 would show as "4821"
// instead of "004821", which would confuse anyone reading the email.
const generateCode = () => {
  const max = 10 ** CODE_LENGTH;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(CODE_LENGTH, "0");
};

// Same reasoning as the password: store a hash, never the raw code.
const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

const createVerificationCode = () => {
  const code = generateCode(); // goes in the email
  const codeHash = hashCode(code); // goes in the database
  const expires = new Date(Date.now() + CODE_TTL_MS);
  return { code, codeHash, expires };
};

module.exports = { createVerificationCode, hashCode, CODE_TTL_MS };