import express from "express";
import { register, login, refreshAccessToken, getCurrentUser, logout } from "../controllers/authController.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       Creates a new user account with the specified role.
 *       - Available roles for self-registration: `operator`, `driver`
 *       - Admin accounts can only be created by existing admins
 *       - Rate limited to prevent abuse
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             operator:
 *               summary: Register as Operator
 *               value:
 *                 name: "Jane Smith"
 *                 email: "jane.smith@example.com"
 *                 password: "securePass123"
 *                 role: "operator"
 *             driver:
 *               summary: Register as Driver
 *               value:
 *                 name: "Bob Driver"
 *                 email: "bob.driver@example.com"
 *                 password: "driverPass456"
 *                 role: "driver"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Bad request - Email already registered or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Email already registered"
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/register", authLimiter, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: |
 *       Authenticates a user and returns an access token.
 *       - Access token is returned in the response body
 *       - Refresh token is set as an HTTP-only cookie
 *       - Rate limited to prevent brute force attacks
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             password: "securePassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=abc123; Path=/; HttpOnly; Secure; SameSite=Strict
 *             description: HTTP-only cookie containing refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Invalid credentials"
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/login", authLimiter, login);

/**
 * @swagger
 * /api/auth/refresh:
 *   get:
 *     summary: Refresh access token
 *     description: |
 *       Generates a new access token using the refresh token from cookies.
 *       - Refresh token must be present in HTTP-only cookie
 *       - Implements refresh token rotation for security
 *       - Old refresh token is invalidated after use
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: New HTTP-only cookie with rotated refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: No refresh token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "No refresh token"
 *       403:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Invalid or expired refresh token"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/refresh", refreshAccessToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: |
 *       Logs out the current user by:
 *       - Invalidating the refresh token on the server
 *       - Clearing the refresh token cookie
 *       
 *       Note: Access tokens remain valid until expiry (stateless JWT)
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cleared refresh token cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Logged out"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/logout", logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the profile of the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/me", auth([]), getCurrentUser);

export default router;
