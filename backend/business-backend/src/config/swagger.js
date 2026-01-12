import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "SmartERS Business Backend API",
            version: "1.0.0",
            description: `
## Smart Emergency Response System - Business Backend API

This API handles the business logic and authentication for the Smart Emergency Response System.

### Features:
- **Authentication & Authorization**: JWT-based auth with RBAC (Role-Based Access Control)
- **Incident Management**: Create, track, and manage emergency incidents
- **Ambulance Management**: Track ambulance status, location, and assignments
- **User Management**: Handle operators and drivers
- **Real-time Updates**: Socket.IO integration for live updates
- **GIS Integration**: Geocoding, routing, and spatial queries via GIS microservice

### Roles:
- **Admin**: Full system access (back office)
- **Operator**: Manage incidents and dispatch ambulances (front office)
- **Driver**: View assigned incidents and update ambulance status

### Real-time WebSocket Events:
Connect to the same server URL using Socket.IO client.

**Client Events (emit to server):**
- \`join:role\` - Join role-based room (admin/operator/driver)
- \`join:incident\` - Subscribe to specific incident updates
- \`join:ambulance\` - Subscribe to specific ambulance updates
- \`driver:locationUpdate\` - Send ambulance location update
- \`dispatch:ambulance\` - Dispatch ambulance to incident

**Server Events (listen from server):**
- \`incident:update\` - Incident status/details changed
- \`incident:assigned\` - Incident assigned to ambulance
- \`ambulance:update\` - Ambulance status/details changed
- \`ambulance:locationUpdate\` - Ambulance location changed
- \`ambulance:dispatched\` - Ambulance dispatched to incident
- \`dispatch:new\` - New dispatch notification (for drivers)
- \`dispatch:created\` - Dispatch created (for operators/admins)

### GIS Integration:
GIS features (mapping, routing, geocoding) are integrated via the GIS microservice at \`${process.env.GIS_BACKEND_URL || 'http://localhost:5001'}\`.
            `,
            contact: {
                name: "SmartERS Support",
                email: "support@smarters.com"
            },
            license: {
                name: "ISC",
                url: "https://opensource.org/licenses/ISC"
            }
        },
        servers: [
            {
                url: "http://localhost:5000",
                description: "Development server"
            },
            {
                url: "https://api.smarters.com",
                description: "Production server"
            }
        ],
        tags: [
            {
                name: "Authentication",
                description: "User authentication and authorization endpoints"
            },
            {
                name: "Incidents",
                description: "Emergency incident management"
            },
            {
                name: "Ambulances",
                description: "Ambulance fleet management"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter your JWT access token"
                },
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "refreshToken",
                    description: "HTTP-only cookie containing refresh token"
                }
            },
            schemas: {
                User: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            description: "User ID",
                            example: "507f1f77bcf86cd799439011"
                        },
                        name: {
                            type: "string",
                            description: "User full name",
                            example: "John Doe"
                        },
                        email: {
                            type: "string",
                            format: "email",
                            description: "User email address",
                            example: "john.doe@example.com"
                        },
                        role: {
                            type: "string",
                            enum: ["admin", "operator", "driver"],
                            description: "User role for RBAC",
                            example: "operator"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Account creation timestamp"
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Last update timestamp"
                        }
                    }
                },
                UserResponse: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            example: "507f1f77bcf86cd799439011"
                        },
                        name: {
                            type: "string",
                            example: "John Doe"
                        },
                        email: {
                            type: "string",
                            example: "john.doe@example.com"
                        },
                        role: {
                            type: "string",
                            example: "operator"
                        }
                    }
                },
                RegisterRequest: {
                    type: "object",
                    required: ["name", "email", "password"],
                    properties: {
                        name: {
                            type: "string",
                            description: "User full name",
                            example: "John Doe"
                        },
                        email: {
                            type: "string",
                            format: "email",
                            description: "User email address",
                            example: "john.doe@example.com"
                        },
                        password: {
                            type: "string",
                            format: "password",
                            minLength: 6,
                            description: "User password (min 6 characters)",
                            example: "securePassword123"
                        },
                        role: {
                            type: "string",
                            enum: ["operator", "driver"],
                            description: "User role (admin role can only be assigned by existing admin)",
                            example: "operator"
                        }
                    }
                },
                LoginRequest: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            description: "User email address",
                            example: "john.doe@example.com"
                        },
                        password: {
                            type: "string",
                            format: "password",
                            description: "User password",
                            example: "securePassword123"
                        }
                    }
                },
                LoginResponse: {
                    type: "object",
                    properties: {
                        accessToken: {
                            type: "string",
                            description: "JWT access token (short-lived)",
                            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        },
                        user: {
                            $ref: "#/components/schemas/UserResponse"
                        }
                    }
                },
                Location: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            enum: ["Point"],
                            default: "Point",
                            description: "GeoJSON type"
                        },
                        coordinates: {
                            type: "array",
                            items: {
                                type: "number"
                            },
                            minItems: 2,
                            maxItems: 2,
                            description: "[longitude, latitude]",
                            example: [-73.935242, 40.730610]
                        }
                    }
                },
                Ambulance: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            description: "Ambulance ID",
                            example: "507f1f77bcf86cd799439011"
                        },
                        plateNumber: {
                            type: "string",
                            description: "Vehicle plate number",
                            example: "AMB-001"
                        },
                        driver: {
                            oneOf: [
                                { type: "string", description: "Driver ID" },
                                { $ref: "#/components/schemas/UserResponse" }
                            ],
                            description: "Assigned driver (ID or populated user object)"
                        },
                        status: {
                            type: "string",
                            enum: ["available", "en-route", "busy"],
                            description: "Current ambulance status",
                            example: "available"
                        },
                        location: {
                            $ref: "#/components/schemas/Location"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                },
                AmbulanceCreate: {
                    type: "object",
                    required: ["plateNumber"],
                    properties: {
                        plateNumber: {
                            type: "string",
                            description: "Vehicle plate number",
                            example: "AMB-001"
                        },
                        driver: {
                            type: "string",
                            description: "Driver user ID",
                            example: "507f1f77bcf86cd799439011"
                        },
                        status: {
                            type: "string",
                            enum: ["available", "en-route", "busy"],
                            default: "available",
                            description: "Initial ambulance status"
                        },
                        location: {
                            $ref: "#/components/schemas/Location"
                        }
                    }
                },
                AmbulanceUpdate: {
                    type: "object",
                    properties: {
                        plateNumber: {
                            type: "string",
                            description: "Vehicle plate number"
                        },
                        driver: {
                            type: "string",
                            description: "Driver user ID"
                        },
                        status: {
                            type: "string",
                            enum: ["available", "en-route", "busy"],
                            description: "Ambulance status"
                        },
                        location: {
                            $ref: "#/components/schemas/Location"
                        }
                    }
                },
                Incident: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            description: "Incident ID",
                            example: "507f1f77bcf86cd799439011"
                        },
                        description: {
                            type: "string",
                            description: "Incident description",
                            example: "Traffic accident with injuries"
                        },
                        location: {
                            $ref: "#/components/schemas/Location"
                        },
                        severity: {
                            type: "string",
                            enum: ["low", "medium", "high", "critical"],
                            description: "Incident severity level",
                            example: "high"
                        },
                        status: {
                            type: "string",
                            enum: ["pending", "assigned", "completed"],
                            description: "Current incident status",
                            example: "pending"
                        },
                        assignedAmbulance: {
                            oneOf: [
                                { type: "string", description: "Ambulance ID" },
                                { $ref: "#/components/schemas/Ambulance" }
                            ],
                            description: "Assigned ambulance (ID or populated object)"
                        },
                        reportedBy: {
                            oneOf: [
                                { type: "string", description: "User ID" },
                                { $ref: "#/components/schemas/UserResponse" }
                            ],
                            description: "User who reported the incident"
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time"
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                },
                IncidentCreate: {
                    type: "object",
                    required: ["description", "location", "reportedBy"],
                    properties: {
                        description: {
                            type: "string",
                            description: "Incident description",
                            example: "Traffic accident with injuries"
                        },
                        type: {
                            type: "string",
                            description: "Type of incident",
                            example: "accident"
                        },
                        location: {
                            $ref: "#/components/schemas/Location"
                        },
                        severity: {
                            type: "string",
                            enum: ["low", "medium", "high", "critical"],
                            default: "medium",
                            description: "Incident severity level"
                        },
                        reportedBy: {
                            type: "string",
                            description: "Reporter user ID",
                            example: "507f1f77bcf86cd799439011"
                        }
                    }
                },
                IncidentUpdate: {
                    type: "object",
                    properties: {
                        description: {
                            type: "string",
                            description: "Incident description"
                        },
                        location: {
                            $ref: "#/components/schemas/Location"
                        },
                        severity: {
                            type: "string",
                            enum: ["low", "medium", "high", "critical"],
                            description: "Incident severity level"
                        },
                        status: {
                            type: "string",
                            enum: ["pending", "assigned", "completed"],
                            description: "Incident status"
                        },
                        assignedAmbulance: {
                            type: "string",
                            description: "Ambulance ID to assign"
                        }
                    }
                },
                Error: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Error message",
                            example: "Server error"
                        },
                        success: {
                            type: "boolean",
                            example: false
                        }
                    }
                },
                SuccessMessage: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Success message",
                            example: "Operation completed successfully"
                        }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: "Access token is missing or invalid",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Unauthorized - No token provided"
                            }
                        }
                    }
                },
                ForbiddenError: {
                    description: "Access forbidden - insufficient permissions",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Forbidden - Insufficient permissions"
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: "Resource not found",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Resource not found"
                            }
                        }
                    }
                },
                ServerError: {
                    description: "Internal server error",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Server error"
                            }
                        }
                    }
                },
                TooManyRequests: {
                    description: "Too many requests - rate limit exceeded",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            },
                            example: {
                                message: "Too many requests, please try again later"
                            }
                        }
                    }
                }
            }
        }
    },
    apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
