import express from "express";
import {
    getAllAmbulances,
    getAvailableAmbulances,
    getMyAmbulance,
    getAmbulanceById,
    createAmbulance,
    updateAmbulance,
    updateAmbulanceLocation,
    deleteAmbulance,
} from "../controllers/ambulanceController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/ambulances:
 *   get:
 *     summary: Get all ambulances
 *     description: |
 *       Retrieves a paginated list of all ambulances in the system.
 *       - Returns ambulance details including driver information
 *       - Supports filtering by status and driver assignment
 *       - Useful for fleet overview and dispatch planning
 *       
 *       **Required Role:** Admin, Operator, Driver (limited view)
 *       
 *       **GIS Integration Note:** Real-time location updates are handled by the GIS backend service.
 *     tags: [Ambulances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, en-route, busy]
 *         description: Filter by status
 *       - in: query
 *         name: hasDriver
 *         schema:
 *           type: boolean
 *         description: Filter by driver assignment
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of ambulances retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ambulances:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ambulance'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", auth(["admin", "operator", "driver"]), getAllAmbulances);

/**
 * @swagger
 * /api/ambulances/available:
 *   get:
 *     summary: Get available ambulances only
 *     description: |
 *       Retrieves only ambulances with status "available".
 *       Useful for dispatch operations.
 *       
 *       **Required Role:** Admin, Operator
 *     tags: [Ambulances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available ambulances retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/available", auth(["admin", "operator"]), getAvailableAmbulances);

/**
 * @swagger
 * /api/ambulances/my-ambulance:
 *   get:
 *     summary: Get driver's assigned ambulance
 *     description: |
 *       Retrieves the ambulance assigned to the authenticated driver.
 *       
 *       **Required Role:** Driver
 *     tags: [Ambulances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver's ambulance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ambulance'
 *       404:
 *         description: No ambulance assigned to driver
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/my-ambulance", auth(["driver"]), getMyAmbulance);

/**
 * @swagger
 * /api/ambulances/{id}:
 *   get:
 *     summary: Get ambulance by ID
 *     description: |
 *       Retrieves detailed information about a specific ambulance.
 *       - Includes populated driver information
 *       - Returns current status and location
 *       
 *       **Required Role:** Admin, Operator, Driver
 *     tags: [Ambulances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ambulance ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Ambulance details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ambulance'
 *       404:
 *         description: Ambulance not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Ambulance not found"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/:id", auth(["admin", "operator", "driver"]), getAmbulanceById);

/**
 * @swagger
 * /api/ambulances:
 *   post:
 *     summary: Create a new ambulance
 *     description: |
 *       Registers a new ambulance in the system.
 *       - Plate number must be unique
 *       - Driver assignment is optional (can be assigned later)
 *       - Default status is "available"
 *       
 *       **Required Role:** Admin only
 *     tags: [Ambulances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AmbulanceCreate'
 *           examples:
 *             withDriver:
 *               summary: Ambulance with assigned driver
 *               value:
 *                 plateNumber: "AMB-005"
 *                 driver: "507f1f77bcf86cd799439012"
 *                 status: "available"
 *                 location:
 *                   type: "Point"
 *                   coordinates: [-73.935242, 40.730610]
 *             withoutDriver:
 *               summary: Ambulance without driver
 *               value:
 *                 plateNumber: "AMB-006"
 *                 status: "available"
 *     responses:
 *       201:
 *         description: Ambulance created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ambulance'
 *       400:
 *         description: Bad request - Invalid input or duplicate plate number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/", auth(["admin"]), createAmbulance);

/**
 * @swagger
 * /api/ambulances/{id}:
 *   put:
 *     summary: Update ambulance information
 *     description: |
 *       Updates an existing ambulance's information.
 *       - Admin/Operator: Can update all fields
 *       - Driver: Can only update status and location of own ambulance
 *       
 *       **Required Role:** Admin, Operator, Driver (limited)
 *       
 *       **GIS Integration Note:** Location updates are synced with the GIS backend.
 *     tags: [Ambulances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ambulance ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AmbulanceUpdate'
 *           examples:
 *             updateStatus:
 *               summary: Update ambulance status
 *               value:
 *                 status: "en-route"
 *             updateLocation:
 *               summary: Update ambulance location
 *               value:
 *                 location:
 *                   type: "Point"
 *                   coordinates: [-73.940000, 40.735000]
 *             assignDriver:
 *               summary: Assign driver to ambulance (Admin only)
 *               value:
 *                 driver: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Ambulance updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ambulance'
 *       403:
 *         description: Forbidden - Drivers can only update their own ambulance
 *       404:
 *         description: Ambulance not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put("/:id", auth(["admin", "operator", "driver"]), updateAmbulance);

/**
 * @swagger
 * /api/ambulances/{id}/location:
 *   put:
 *     summary: Update ambulance location
 *     description: |
 *       Updates only the location of an ambulance.
 *       Convenience endpoint for drivers to update their location.
 *       
 *       **Required Role:** Admin, Driver (own ambulance)
 *       
 *       **GIS Integration Note:** Location is synced with the GIS backend for real-time tracking.
 *     tags: [Ambulances]
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
 *               - coordinates
 *             properties:
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 2
 *                 maxItems: 2
 *                 description: "[longitude, latitude]"
 *                 example: [-73.940000, 40.735000]
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       403:
 *         description: Forbidden - Not your ambulance
 *       404:
 *         description: Ambulance not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put("/:id/location", auth(["admin", "driver"]), updateAmbulanceLocation);

/**
 * @swagger
 * /api/ambulances/{id}:
 *   delete:
 *     summary: Delete an ambulance
 *     description: |
 *       Removes an ambulance from the system.
 *       - Cannot delete ambulance that is en-route or busy
 *       - Driver assignment is automatically removed
 *       
 *       **Required Role:** Admin only
 *     tags: [Ambulances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ambulance ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Ambulance deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Ambulance deleted successfully"
 *       400:
 *         description: Cannot delete ambulance that is not available
 *       404:
 *         description: Ambulance not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/:id", auth(["admin"]), deleteAmbulance);

export default router;
