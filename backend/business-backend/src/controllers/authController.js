// src/controllers/authController.js
import User from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";

// Register (user chooses role -- we validate it)
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const allowed = ["operator", "driver"];
    const chosenRole = allowed.includes(role) ? role : "operator";

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password, role: chosenRole });

    // do not return password or refresh token
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login: returns access token and sets refresh token in httpOnly cookie.
// Also returns the access token in body.
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store refresh token in DB (rotate/replace)
    user.refreshToken = refreshToken;
    await user.save();

    // Set httpOnly secure cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Refresh access token (reads cookie). Rotates refresh token.
export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== token) {
      // token mismatch => possible theft, force logout
      if (user) { user.refreshToken = null; await user.save(); }
      return res.status(403).json({ message: "Refresh token not recognized" });
    }

    // rotate refresh token
    const newRefresh = signRefreshToken(user);
    user.refreshToken = newRefresh;
    await user.save();

    const newAccess = signAccessToken(user);

    // set new cookie
    res.cookie("refreshToken", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: newAccess });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout: remove refresh token server-side and clear cookie
export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const payload = (() => {
        try { return verifyRefreshToken(token); } catch { return null; }
      })();

      if (payload) {
        const user = await User.findById(payload.id);
        if (user && user.refreshToken === token) {
          user.refreshToken = null;
          await user.save();
        }
      }
    }

    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
