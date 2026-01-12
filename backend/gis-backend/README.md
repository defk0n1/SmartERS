# SmartERS GIS Backend

A Geographic Information System (GIS) backend service for the SmartERS (Smart Emergency Response System) platform. This backend provides real-time geospatial capabilities for emergency incident management and ambulance tracking using ArcGIS services.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
  - [ArcGIS Feature Services Integration](#arcgis-feature-services-integration)
  - [Incident Management](#incident-management)
  - [Ambulance Management](#ambulance-management)
  - [Routing Service](#routing-service)
  - [Geocoding Service](#geocoding-service)
  - [Real-time WebSocket Communication](#real-time-websocket-communication)
  - [Ambulance Simulation](#ambulance-simulation)
  - [Interactive Map Dashboard](#interactive-map-dashboard)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Testing](#testing)
- [Project Structure](#project-structure)

---

## Overview

The GIS Backend is a core microservice in the SmartERS architecture, responsible for all geospatial operations including:

- **Incident geolocation**: Storing and querying emergency incidents with geographic coordinates
- **Ambulance tracking**: Real-time tracking of ambulance locations and statuses
- **Optimal routing**: Calculating the best routes between locations for emergency dispatch
- **Geocoding**: Converting addresses to coordinates and vice versa
- **Real-time updates**: Broadcasting location changes via WebSockets for live map updates
- **Simulation**: Testing ambulance movement along calculated routes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GIS Backend                                │
├─────────────────────────────────────────────────────────────────────┤
│  Express.js Server (Port 5001)                                      │
│  ├── REST API Endpoints                                             │
│  │   ├── /incidents      → Incident CRUD operations                 │
│  │   ├── /ambulances     → Ambulance CRUD operations                │
│  │   ├── /api/gis        → Routing services                         │
│  │   └── /gis/ambulance  → Simulation controls                      │
│  │                                                                  │
│  └── Socket.IO Server                                               │
│      ├── ambulanceUpdate events                                     │
│      ├── incidentUpdate events                                      │
│      └── ambulanceLocationUpdate listener                           │
├─────────────────────────────────────────────────────────────────────┤
│  Services Layer                                                     │
│  ├── ArcGIS Feature Service → CRUD for incidents & ambulances       │
│  ├── Routing Service        → ArcGIS route solving                  │
│  ├── Geocoding Service      → Address ↔ coordinates conversion      │
│  └── Simulation Service     → Ambulance movement simulation         │
├─────────────────────────────────────────────────────────────────────┤
│  External Integrations                                              │
│  ├── ArcGIS REST API (OAuth2 authentication)                        │
│  ├── ArcGIS Feature Layers (Incidents & Ambulances)                 │
│  └── ArcGIS Routing & Geocoding Services                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### ArcGIS Feature Services Integration

The backend integrates with ArcGIS Online/Enterprise Feature Services for persistent geospatial data storage.

**Implementation**: [src/services/arcgisFeatureService.js](src/services/arcgisFeatureService.js)

**Capabilities**:

| Function | Description |
|----------|-------------|
| `addFeature(feature, featureServiceUrl)` | Adds a new feature (incident/ambulance) to the specified feature layer |
| `queryFeatures(featureServiceUrl, whereClause)` | Queries features with optional SQL WHERE clause |
| `updateFeatures(features, featureServiceUrl)` | Updates existing features in bulk |

**Shortcut Functions**:
- `addIncident()`, `queryIncidents()`, `updateIncident()` - Incident-specific operations
- `addAmbulance()`, `queryAmbulances()`, `updateAmbulance()` - Ambulance-specific operations

**Token Management**: [src/config/arcgis.js](src/config/arcgis.js)
- OAuth2 client credentials flow authentication
- Automatic token caching and renewal based on expiry time
- Tokens are requested from `https://www.arcgis.com/sharing/rest/oauth2/token/`

---

### Incident Management

Full CRUD operations for emergency incidents with automatic geocoding support.

**Controller**: [src/controllers/incidentGISController.js](src/controllers/incidentGISController.js)  
**Routes**: [src/routes/incidentGISRoutes.js](src/routes/incidentGISRoutes.js)

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/incidents` | Create a new incident |
| `GET` | `/incidents` | Get all incidents |
| `PUT` | `/incidents` | Update incidents (bulk) |

**Create Incident Request Body**:
```json
{
  "attributes": {
    "description": "Traffic accident on Main St",
    "severity": "high",
    "status": "pending",
    "reportedBy": "user123",
    "address": "123 Main Street, Tunis"  // Optional: auto-geocoded if geometry not provided
  },
  "geometry": {
    "x": 10.16579,  // longitude
    "y": 36.81897   // latitude
  }
}
```

**Key Features**:
- **Automatic Geocoding**: If no `geometry` is provided but an `address` is present in attributes, the system automatically geocodes the address to coordinates
- **Real-time Broadcast**: Every create/update operation emits a `incidentUpdate` WebSocket event

---

### Ambulance Management

Full CRUD operations for ambulance units with real-time location tracking.

**Controller**: [src/controllers/ambulanceGISController.js](src/controllers/ambulanceGISController.js)  
**Routes**: [src/routes/ambulanceGISRoutes.js](src/routes/ambulanceGISRoutes.js)

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ambulances` | Create a new ambulance |
| `GET` | `/ambulances` | Get all ambulances |
| `PUT` | `/ambulances` | Update ambulances (bulk) |

**Create Ambulance Request Body**:
```json
{
  "attributes": {
    "plateNumber": "AMB-001",
    "status": "available",
    "crewSize": 2,
    "equipmentLevel": "advanced"
  },
  "geometry": {
    "x": 10.16579,  // longitude
    "y": 36.81897   // latitude
  }
}
```

**Key Features**:
- Real-time broadcast via `ambulanceUpdate` WebSocket event on every operation
- Supports bulk updates for fleet management

---

### Routing Service

Calculates optimal routes between two geographic points using ArcGIS Network Analysis.

**Service**: [src/services/routingService.js](src/services/routingService.js)  
**Controller**: [src/controllers/routingController.js](src/controllers/routingController.js)  
**Routes**: [src/routes/routingRoutes.js](src/routes/routingRoutes.js)

**Endpoint**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/gis/getRoute` | Calculate route between two points |

**Request Body**:
```json
{
  "start": {
    "longitude": 10.16579,
    "latitude": 36.81897
  },
  "end": {
    "longitude": 10.18234,
    "latitude": 36.80123
  }
}
```

**Response**:
```json
{
  "success": true,
  "route": {
    "geometry": {
      "paths": [[[lon1, lat1], [lon2, lat2], ...]]
    },
    "attributes": {...}
  },
  "directions": [
    { "text": "Turn left onto Avenue Habib Bourguiba", ... }
  ],
  "totalDistance": 5.2,  // miles
  "totalTime": 12.5      // minutes
}
```

**Key Features**:
- Uses `@esri/arcgis-rest-routing` package
- Returns full route geometry for map display
- Includes turn-by-turn directions
- Provides total distance and estimated travel time

---

### Geocoding Service

Bi-directional geocoding: convert addresses to coordinates (geocoding) and coordinates to addresses (reverse geocoding).

**Service**: [src/services/geocodingService.js](src/services/geocodingService.js)

**Methods**:

| Method | Input | Output |
|--------|-------|--------|
| `geocodeAddress(address)` | Address string | `{ latitude, longitude, score }` |
| `reverseGeocodeLocation(coords)` | `{ longitude, latitude }` | Structured address object |

**Usage Example**:
```javascript
// Geocode an address
const location = await geocodingService.geocodeAddress("Avenue Habib Bourguiba, Tunis");
// Returns: { latitude: 36.8065, longitude: 10.1815, score: 98.5 }

// Reverse geocode coordinates
const address = await geocodingService.reverseGeocodeLocation({
  longitude: 10.1815,
  latitude: 36.8065
});
// Returns: { Match_addr: "Avenue Habib Bourguiba, Tunis", ... }
```

**Key Features**:
- Automatic integration with incident creation (auto-geocodes addresses)
- Uses `@esri/arcgis-rest-geocoding` package
- Returns confidence score for geocoding results

**⚠️ Important Limitation - Reverse Geocoding**:
- **Reverse geocoding requires an ArcGIS premium/paid subscription**
- Standard OAuth2 credentials will result in a `499: Token Required` error
- This is an ArcGIS platform limitation, not a code issue
- Forward geocoding (address → coordinates) works with standard credentials
- If reverse geocoding is critical for your use case, consider:
  - Upgrading to an ArcGIS premium plan
  - Using an alternative geocoding provider (Mapbox, Google Maps, etc.)
  - Implementing a fallback to store original addresses in your database

---

### Real-time WebSocket Communication

Provides real-time bidirectional communication for live map updates.

**Implementation**: [src/socket/realtime.js](src/socket/realtime.js)

**Server Events Emitted**:

| Event | Payload | Description |
|-------|---------|-------------|
| `ambulanceUpdate` | `{ id, position, ... }` | Ambulance location/status changed |
| `incidentUpdate` | Feature object | Incident created/updated |

**Client Events Listened**:

| Event | Payload | Description |
|-------|---------|-------------|
| `ambulanceLocationUpdate` | Location data | Incoming location from ambulance device/app |

**Connection Events**:
- `connection` - Client connected (logs socket ID)
- `disconnect` - Client disconnected

**CORS Configuration**: Currently allows all origins (`*`) - should be restricted in production.

**Test Client**: [src/socket/socketTest.js](src/socket/socketTest.js) - A sample Socket.IO client for testing WebSocket events.

---

### Ambulance Simulation

Simulates ambulance movement along calculated routes for testing and demonstration purposes.

**Service**: [src/services/ambulanceSimulationService.js](src/services/ambulanceSimulationService.js)  
**Routes**: [src/routes/ambulanceSimulationRoutes.js](src/routes/ambulanceSimulationRoutes.js)

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/gis/ambulance/startSimulation` | Start ambulance simulation |
| `POST` | `/gis/ambulance/stopSimulation` | Stop simulation |

**Start Simulation Request**:
```json
{
  "ambulances": [
    {
      "id": "AMB-001",
      "route": [
        { "latitude": 36.8065, "longitude": 10.1815 },
        { "latitude": 36.8070, "longitude": 10.1820 },
        ...
      ]
    }
  ],
  "speed": 2  // points per second (optional, default: 1)
}
```

**How It Works**:
1. Accepts an array of ambulances with pre-calculated routes
2. Starts an interval timer that advances each ambulance along its route
3. Emits `ambulanceUpdate` WebSocket events every second with updated positions
4. Speed parameter controls how many route points are traversed per tick

---

### Interactive Map Dashboard

A built-in web interface for visualizing and testing the GIS backend.

**Location**: [src/public/index.html](src/public/index.html)

**Features**:
- **Live Map**: ArcGIS Maps SDK for JavaScript with streets basemap
- **Real-time Tracking**: Socket.IO client receives `ambulanceUpdate` events and animates ambulance markers
- **Control Panel**:
  - Start Simulation button
  - Stop Simulation button
  - Clear Map button
- **Connection Status**: Visual indicator showing WebSocket connection state
- **Ambulance Markers**: Red animated markers showing ambulance positions
- **Route Visualization**: Displays calculated routes on the map

**Default Center**: Tunis, Tunisia (10.16579, 36.81897)

**Access**: Navigate to `http://localhost:5001/` when the server is running.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js 5** | Web framework for REST API |
| **Socket.IO** | Real-time WebSocket communication |
| **@esri/arcgis-rest-request** | ArcGIS REST API authentication |
| **@esri/arcgis-rest-routing** | Route calculation service |
| **@esri/arcgis-rest-geocoding** | Geocoding service |
| **Axios** | HTTP client for ArcGIS API calls |
| **dotenv** | Environment variable management |

**Development Tools**:
| Tool | Purpose |
|------|---------|
| **Nodemon** | Auto-restart on file changes |
| **Mocha** | Test runner |
| **Chai** | Assertion library |
| **Chai-HTTP** | HTTP integration testing |

---

## Installation

1. **Clone the repository** (if not already done)

2. **Navigate to the GIS backend directory**:
   ```bash
   cd backend/gis-backend
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

5. **Configure environment variables** (see [Configuration](#configuration))

6. **Start the server**:
   ```bash
   # Development (with auto-reload)
   npm run dev
   
   # Production
   npm start
   ```

---

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Server port
PORT=5001

# ArcGIS OAuth2 credentials (from ArcGIS Developer Dashboard)
ARCGIS_CLIENT_ID=your_client_id
ARCGIS_CLIENT_SECRET=your_client_secret

# ArcGIS Feature Service URLs (your hosted feature layers)
INCIDENT_FEATURE_SERVICE=https://services.arcgis.com/{org_id}/arcgis/rest/services/{service_name}/FeatureServer/0
AMBULANCE_FEATURE_SERVICE=https://services.arcgis.com/{org_id}/arcgis/rest/services/{service_name}/FeatureServer/1
```

### Setting Up ArcGIS

1. **Create an ArcGIS Developer Account**: Sign up at [developers.arcgis.com](https://developers.arcgis.com)

2. **Register a New Application**:
   - Go to Dashboard → OAuth 2.0 → New Application
   - Copy the Client ID and Client Secret

3. **Create Feature Layers**:
   - Create a Feature Service with two layers:
     - **Incidents Layer** (Point geometry) with fields for description, severity, status, reportedBy
     - **Ambulances Layer** (Point geometry) with fields for plateNumber, status, crewSize
   - Copy the REST endpoint URLs for each layer

---

## API Reference

### Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "GIS backend running"
}
```

### Incidents

```http
# Create incident
POST /incidents
Content-Type: application/json

{
  "attributes": { "description": "...", "severity": "high" },
  "geometry": { "x": 10.165, "y": 36.818 }
}

# Get all incidents
GET /incidents

# Update incidents
PUT /incidents
Content-Type: application/json

{
  "features": [
    { "attributes": { "objectId": 1, "status": "resolved" } }
  ]
}
```

### Ambulances

```http
# Create ambulance
POST /ambulances
Content-Type: application/json

{
  "attributes": { "plateNumber": "AMB-001", "status": "available" },
  "geometry": { "x": 10.165, "y": 36.818 }
}

# Get all ambulances
GET /ambulances

# Update ambulances
PUT /ambulances
Content-Type: application/json

{
  "features": [
    { "attributes": { "objectId": 1, "status": "dispatched" } }
  ]
}
```

### Routing

```http
POST /api/gis/getRoute
Content-Type: application/json

{
  "start": { "longitude": 10.165, "latitude": 36.818 },
  "end": { "longitude": 10.182, "latitude": 36.801 }
}
```

### Geocoding

```http
# Geocode address to coordinates
POST /api/gis/geocode
Content-Type: application/json

{
  "address": "Avenue Habib Bourguiba, Tunis"
}

# Response
{
  "success": true,
  "data": {
    "latitude": 36.8065,
    "longitude": 10.1815,
    "score": 98.5
  }
}

# Reverse geocode coordinates to address
# ⚠️ NOTE: Requires ArcGIS premium subscription
# Standard OAuth credentials will return 499: Token Required error
POST /api/gis/reverse-geocode
Content-Type: application/json

{
  "latitude": 36.8065,
  "longitude": 10.1815
}

# Response (with premium subscription)
{
  "success": true,
  "data": {
    "Match_addr": "Avenue Habib Bourguiba, Tunis",
    ...
  }
}

# Response (with standard credentials - expected)
{
  "success": false,
  "error": "Reverse geocoding requires ArcGIS premium subscription (499: Token Required)"
}
```

### Find Nearest Ambulances

```http
# Find nearest available ambulances to a location
GET /ambulances/nearest?latitude=36.818&longitude=10.165&limit=5&status=available&includeRoute=true

# Response
{
  "success": true,
  "data": [
    {
      "attributes": { "plateNumber": "AMB-001", "status": "available", "businessId": "..." },
      "geometry": { "x": 10.160, "y": 36.820 },
      "distance": 1.25,
      "estimatedTimeMinutes": 3.5,
      "route": { ... }  // Only if includeRoute=true
    }
  ],
  "meta": {
    "total": 1,
    "searchLocation": { "latitude": 36.818, "longitude": 10.165 },
    "statusFilter": "available"
  }
}

# Get route from ambulance to incident
POST /ambulances/route-to-incident
Content-Type: application/json

{
  "ambulanceLocation": { "latitude": 36.820, "longitude": 10.160 },
  "incidentLocation": { "latitude": 36.818, "longitude": 10.165 }
}

# Response
{
  "success": true,
  "data": {
    "route": { ... },
    "directions": [...],
    "totalDistanceMiles": 2.5,
    "totalTimeMinutes": 5.2
  }
}
```

### Simulation

```http
# Start simulation
POST /gis/ambulance/startSimulation
Content-Type: application/json

{
  "ambulances": [{ "id": "1", "route": [...] }],
  "speed": 1
}

# Stop simulation
POST /gis/ambulance/stopSimulation
```

---

## WebSocket Events

Connect to the Socket.IO server at the same port as the HTTP server (default: 5001).

### Client Example

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5001");

// Listen for ambulance updates
socket.on("ambulanceUpdate", (data) => {
  console.log("Ambulance moved:", data);
  // data: { id: "AMB-001", position: { latitude, longitude } }
});

// Listen for incident updates
socket.on("incidentUpdate", (data) => {
  console.log("Incident update:", data);
});

// Send ambulance location (from mobile device)
socket.emit("ambulanceLocationUpdate", {
  plateNumber: "AMB-001",
  location: { x: 10.165, y: 36.818 },
  status: "en-route"
});
```

---

## Testing

Run the test suite:

```bash
npm test
```

**Test Coverage**:
- Health check endpoint
- Incident CRUD operations
- API response validation

Tests use Mocha + Chai + Chai-HTTP for integration testing against the Express app.

---

## Project Structure

```
gis-backend/
├── .env                    # Environment variables (not committed)
├── .env.example            # Environment template
├── package.json            # Dependencies and scripts
├── README.md               # This file
└── src/
    ├── app.js              # Express application setup
    ├── server.js           # HTTP server + Socket.IO initialization
    ├── config/
    │   ├── arcgis.js       # ArcGIS token management
    │   └── env.js          # Environment variable exports
    ├── controllers/
    │   ├── ambulanceGISController.js  # Ambulance business logic
    │   ├── incidentGISController.js   # Incident business logic
    │   └── routingController.js       # Route calculation logic
    ├── public/
    │   └── index.html      # Interactive map dashboard
    ├── routes/
    │   ├── ambulanceGISRoutes.js       # /ambulances endpoints
    │   ├── ambulanceSimulationRoutes.js # /gis/ambulance endpoints
    │   ├── incidentGISRoutes.js        # /incidents endpoints
    │   └── routingRoutes.js            # /api/gis endpoints
    ├── services/
    │   ├── ambulanceSimulationService.js # Simulation engine
    │   ├── arcgisFeatureService.js       # Feature layer CRUD
    │   ├── geocodingService.js           # Address ↔ coords
    │   └── routingService.js             # Route solving
    ├── socket/
    │   ├── realtime.js     # Socket.IO server setup
    │   └── socketTest.js   # Test client for debugging
    └── test/
        └── incidents.test.js # Integration tests
```

---

## License

ISC

---

## Related Services

- **Business Backend** (`../business-backend/`): Core business logic, user authentication, and data management
- **Frontend Application**: Web/mobile interface for dispatchers and emergency responders
