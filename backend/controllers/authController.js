const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const { createVerificationCode, hashCode, CODE_TTL_MS } = require("../utils/verificationCode");

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between resend requests

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

const verificationEmailHtml = (name, code) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; text-align:center;">
    <h2>Welcome to WearX, ${name}!</h2>
    <p>Enter this code in the app to verify your email address:</p>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#F5F6FA;padding:16px 24px;border-radius:12px;display:inline-block;margin:16px 0;">${code}</div>
    <p style="color:#8B929C;font-size:12px;margin-top:24px;">This code expires in 10 minutes. If you didn't create this account, you can ignore this email.</p>
  </div>
`;

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

    const { code, codeHash, expires } = createVerificationCode();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: safeRole,
      verificationCodeHash: codeHash,
      verificationCodeExpires: expires,
    });

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your WearX email",
        html: verificationEmailHtml(user.name, code),
      });
    } catch (emailError) {
      // Don't fail the whole signup just because the email didn't go out —
      // log it so you notice during testing, but let the user continue.
      console.error("Failed to send verification email:", emailError.message);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      data: removePassword(user),
      message: "Account created. Check your email for a 6-digit verification code.",
    });
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

// POST /api/auth/verify — protected: body { code }
const verifyEmailCode = async (req, res) => {
  try {
    const { code } = req.body || {};

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Enter the 6-digit code from your email." });
    }

    // req.user (from `protect`) doesn't include the select:false fields,
    // so we fetch them explicitly here.
    const user = await User.findById(req.user._id).select(
      "+verificationCodeHash +verificationCodeExpires +verificationAttempts"
    );

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Your email is already verified." });
    }

    if (
      !user.verificationCodeHash ||
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < Date.now()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "This code has expired. Request a new one." });
    }

    if (user.verificationAttempts >= MAX_ATTEMPTS) {
      return res
        .status(429)
        .json({ success: false, message: "Too many incorrect attempts. Request a new code." });
    }

    const submittedHash = hashCode(String(code).trim());

    if (submittedHash !== user.verificationCodeHash) {
      user.verificationAttempts += 1;
      await user.save();

      const remaining = MAX_ATTEMPTS - user.verificationAttempts;
      return res.status(400).json({
        success: false,
        message:
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Incorrect code. Request a new one.",
      });
    }

    user.isVerified = true;
    user.verificationCodeHash = undefined;
    user.verificationCodeExpires = undefined;
    user.verificationAttempts = 0;
    await user.save();

    res.status(200).json({ success: true, message: "Email verified!", data: removePassword(user) });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/auth/resend-verification — protected
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+verificationCodeExpires");

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Your email is already verified." });
    }

    // Rate-limit resends: work out when the current code was ISSUED by
    // subtracting its lifetime from its expiry time, and block a new one
    // if that was less than RESEND_COOLDOWN_MS ago.
    if (user.verificationCodeExpires) {
      const issuedAt = user.verificationCodeExpires.getTime() - CODE_TTL_MS;
      const msSinceIssued = Date.now() - issuedAt;
      if (msSinceIssued < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - msSinceIssued) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds}s before requesting another code.`,
        });
      }
    }

    const { code, codeHash, expires } = createVerificationCode();
    user.verificationCodeHash = codeHash;
    user.verificationCodeExpires = expires;
    user.verificationAttempts = 0;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Your new WearX verification code",
        html: verificationEmailHtml(user.name, code),
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
      return res
        .status(502)
        .json({ success: false, message: "Could not send the email. Try again shortly." });
    }

    res.status(200).json({ success: true, message: "A new verification code has been sent." });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { register, login, getMe, verifyEmailCode, resendVerification };