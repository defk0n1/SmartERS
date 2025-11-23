import express from "express";
import { register, login, refreshAccessToken, logout } from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// refresh uses cookie; it should be GET or POST depending on preference
router.get("/refresh", refreshAccessToken);

// logout clears cookie and server-side token
router.post("/logout", logout);

export default router;
