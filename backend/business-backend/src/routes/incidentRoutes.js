import express from "express";
import {
    getAllIncidents,
    getDriverIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    dispatchAmbulance,
    deleteIncident,
} from "../controllers/incidentController.js";

import { auth } from "../middleware/authMiddleware.js";  


const router = express.Router();

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: Get all incidents
 *     description: |
 *       Retrieves a paginated list of all emergency incidents in the system.
 *       - Returns incident details including reporter information
 *       - Supports filtering by status, severity, and date range
 *       - Useful for dashboard overview and incident management
 *       
 *       **Required Role:** Admin, Operator
 *       
 *       **GIS Integration Note:** Incident locations can be visualized on the map via the GIS backend.
 *     tags: [Incidents]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, completed]
 *         description: Filter by status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter incidents from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter incidents until this date
 *     responses:
 *       200:
 *         description: List of incidents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 incidents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incident'
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
router.get("/", auth(["admin", "operator"]), getAllIncidents);

/**
 * @swagger
 * /api/incidents/my-assignments:
 *   get:
 *     summary: Get driver's assigned incidents
 *     description: |
 *       Retrieves incidents assigned to the authenticated driver's ambulance.
 *       Only returns non-completed incidents.
 *       
 *       **Required Role:** Driver
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver's incidents retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/my-assignments", auth(["driver"]), getDriverIncidents);

/**
 * @swagger
 * /api/incidents/dispatch:
 *   post:
 *     summary: Dispatch ambulance to incident
 *     description: |
 *       Dispatches an ambulance to a pending incident.
 *       Can auto-select the nearest available ambulance.
 *       
 *       **Required Role:** Admin, Operator
 *       
 *       **GIS Integration Note:** When autoSelect is true, the GIS backend 
 *       would calculate the nearest ambulance based on real-time locations and routing.
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - incidentId
 *             properties:
 *               incidentId:
 *                 type: string
 *                 description: ID of the incident
 *               ambulanceId:
 *                 type: string
 *                 description: ID of the ambulance to dispatch (optional if autoSelect is true)
 *               autoSelect:
 *                 type: boolean
 *                 default: false
 *                 description: Automatically select nearest available ambulance
 *     responses:
 *       200:
 *         description: Ambulance dispatched successfully
 *       400:
 *         description: Bad request
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/dispatch", auth(["admin", "operator"]), dispatchAmbulance);

/**
 * @swagger
 * /api/incidents/{id}:
 *   get:
 *     summary: Get incident by ID
 *     description: |
 *       Retrieves detailed information about a specific incident.
 *       - Includes populated reporter and assigned ambulance information
 *       - Returns full incident history and status
 *       
 *       **Required Role:** Admin, Operator, Driver (own assigned incidents)
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID (MongoDB ObjectId)
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Incident details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Incident not found"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/:id", auth(["admin", "operator", "driver"]), getIncidentById);

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Create a new incident
 *     description: |
 *       Reports a new emergency incident in the system.
 *       - Location coordinates are required for dispatch routing
 *       - Severity level affects dispatch priority
 *       - Reporter user ID is required
 *       
 *       **Required Role:** Admin, Operator
 *       
 *       **Workflow:**
 *       1. Incident is created with "pending" status
 *       2. Operators can view and dispatch ambulances
 *       3. Status changes to "assigned" when ambulance is dispatched
 *       4. Status changes to "completed" when resolved
 *       
 *       **GIS Integration Note:** After creation, the GIS backend can:
 *       - Geocode the location for display
 *       - Calculate optimal ambulance routing
 *       - Update hotspot predictions
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncidentCreate'
 *           examples:
 *             trafficAccident:
 *               summary: Traffic Accident
 *               value:
 *                 description: "Multi-vehicle collision on Highway 101"
 *                 type: "accident"
 *                 location:
 *                   type: "Point"
 *                   coordinates: [-73.935242, 40.730610]
 *                 severity: "critical"
 *             medicalEmergency:
 *               summary: Medical Emergency
 *               value:
 *                 description: "Person collapsed, possible cardiac arrest"
 *                 type: "medical"
 *                 location:
 *                   type: "Point"
 *                   coordinates: [-73.940000, 40.735000]
 *                 severity: "critical"
 *     responses:
 *       201:
 *         description: Incident created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 *       400:
 *         description: Bad request - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/", auth(["admin", "operator"]), createIncident);

/**
 * @swagger
 * /api/incidents/{id}:
 *   put:
 *     summary: Update incident information
 *     description: |
 *       Updates an existing incident's information.
 *       - Can update status, severity, description, and assigned ambulance
 *       - Status transitions: pending → assigned → completed
 *       - Assigning an ambulance automatically updates status to "assigned"
 *       
 *       **Required Role:** Admin, Operator
 *       
 *       **Status Values:**
 *       - `pending`: Awaiting dispatch
 *       - `assigned`: Ambulance dispatched
 *       - `completed`: Incident resolved
 *       
 *       **GIS Integration Note:** When ambulance is assigned, the GIS backend should:
 *       - Calculate optimal route to incident
 *       - Update ambulance status to "en-route"
 *       - Provide ETA to incident location
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncidentUpdate'
 *           examples:
 *             assignAmbulance:
 *               summary: Assign ambulance to incident
 *               value:
 *                 status: "assigned"
 *                 assignedAmbulance: "507f1f77bcf86cd799439013"
 *             updateSeverity:
 *               summary: Update incident severity
 *               value:
 *                 severity: "critical"
 *                 description: "Situation escalated, multiple casualties"
 *             completeIncident:
 *               summary: Mark incident as completed
 *               value:
 *                 status: "completed"
 *     responses:
 *       200:
 *         description: Incident updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Incident not found"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put("/:id", auth(["admin", "operator"]), updateIncident);

/**
 * @swagger
 * /api/incidents/{id}:
 *   delete:
 *     summary: Delete an incident
 *     description: |
 *       Removes an incident from the system.
 *       - Should only be used for false reports or data cleanup
 *       - Frees up assigned ambulance if any
 *       
 *       **Required Role:** Admin only
 *       
 *       **Warning:** This action is irreversible. Completed incidents
 *       should typically be archived rather than deleted for reporting purposes.
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Incident deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Incident deleted successfully"
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Incident not found"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/:id", auth(["admin"]), deleteIncident);

export default router;
