import express from "express";
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    getDashboardStats,
    getActivityLogs,
    generateReport,
    getSystemConfig
} from "../controllers/adminController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// All admin routes require admin role
const adminAuth = auth(["admin"]);

// ==================== USER MANAGEMENT ====================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: |
 *       Retrieves a paginated list of all users in the system.
 *       Supports filtering by role, active status, and search.
 *       
 *       **Required Role:** Admin
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, operator, driver]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/users", adminAuth, getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     description: Retrieves detailed information about a specific user.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/users/:id", adminAuth, getUserById);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     description: |
 *       Creates a new user account. Admins can create any role including other admins.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, operator, driver]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/users", adminAuth, createUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     description: Updates an existing user's information.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, operator, driver]
 *               isActive:
 *                 type: boolean
 *               assignedAmbulance:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put("/users/:id", adminAuth, updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     description: |
 *       Deletes a user. Use `?hard=true` for permanent deletion, 
 *       otherwise the user is just deactivated.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hard
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, permanently delete user
 *     responses:
 *       200:
 *         description: User deleted/deactivated successfully
 *       400:
 *         description: Cannot delete own account
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/users/:id", adminAuth, deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password (Admin only)
 *     description: Resets a user's password and forces re-login.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Password too short
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/users/:id/reset-password", adminAuth, resetUserPassword);

// ==================== DASHBOARD & ANALYTICS ====================

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics (Admin only)
 *     description: |
 *       Retrieves comprehensive statistics for the admin dashboard including:
 *       - User counts by role and status
 *       - Ambulance counts by status
 *       - Incident counts by status and severity
 *       - Performance metrics
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: object
 *                 ambulances:
 *                   type: object
 *                 incidents:
 *                   type: object
 *                 performance:
 *                   type: object
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/dashboard", adminAuth, getDashboardStats);

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get activity logs (Admin only)
 *     description: Retrieves system activity logs for audit purposes.
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/logs", adminAuth, getActivityLogs);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Generate reports (Admin only)
 *     description: Generates various operational reports.
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [incidents, ambulances, response-times]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Report generated successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/reports", adminAuth, generateReport);

// ==================== SYSTEM CONFIGURATION ====================

/**
 * @swagger
 * /api/admin/config:
 *   get:
 *     summary: Get system configuration (Admin only)
 *     description: Retrieves current system configuration settings.
 *     tags: [Admin - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/config", adminAuth, getSystemConfig);

export default router;
