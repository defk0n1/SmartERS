# SmartERS Backend - Frontend Developer Guide

**Smart Emergency Response System (SmartERS)** - Centralized API Specification

> This document provides a unified overview of the SmartERS backend architecture for frontend developers. The system consists of two microservices working together to provide real-time emergency response capabilities.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Endpoints Summary](#api-endpoints-summary)
- [Real-time Communication](#real-time-communication)
- [Data Models](#data-models)
- [Integration Guide](#integration-guide)
- [Detailed Documentation](#detailed-documentation)

---

## 🎯 Project Overview

### Project Concept: Smart Emergency Response System

**Goal**: Reduce ambulance response times and improve emergency resource allocation using real-time spatial analytics.

### Core Features

1. **Real-time Ambulance Tracking**
   - Show ambulance locations on a map in real-time
   - Display status: available, en-route, busy, offline
   - Interactive mapping using ArcGIS JS SDK

2. **Optimal Dispatch Routing**
   - Calculate which ambulance can reach incidents fastest
   - Consider traffic, road conditions, and incident severity
   - ArcGIS Routing and Network Analysis integration

3. **Emergency Hotspot Prediction**
   - Analyze historical data to predict high-risk areas
   - Display heatmaps for efficient resource allocation
   - Spatial analysis using ArcGIS tools

4. **Incident Reporting**
   - Log incidents via web/mobile apps
   - Automatic geocoding of incident locations
   - Real-time status updates

5. **Dashboard & Analytics**
   - Real-time statistics: response times, incidents per zone, availability
   - Generate reports for resource allocation decisions

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                    │
│  NextJS + ArcGIS Maps SDK for JavaScript + Socket.IO Client                 │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    ┌──────────────┴───────────────┐
                    │                              │
         REST API + Socket.IO          ArcGIS Maps SDK (Direct)
                    │                              │
                    ▼                              ▼
┌───────────────────────────────────┐  ┌─────────────────────────────────┐
│   BUSINESS BACKEND (Port 5000)    │  │  GIS BACKEND (Port 5001)        │
├───────────────────────────────────┤  ├─────────────────────────────────┤
│ • Authentication & Authorization  │◄─┤ • Geocoding & Routing           │
│ • User & Role Management         │  │ • Spatial Queries                │
│ • Incident CRUD                  │  │ • Nearest Ambulance Finder       │
│ • Ambulance Fleet Management     │  │ • ArcGIS Feature Service Sync    │
│ • Business Logic & Validation    │  │ • Real-time Map Updates          │
│ • Socket.IO Server (frontend)    │  │                                  │
│ • MongoDB (Source of Truth)      │  │                                  │
└───────────────┬───────────────────┘  └─────────────────────────────────┘
                │                                   │
                │   HTTP + Socket.IO Bridge         │
                └───────────────┬───────────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │  ArcGIS Online/Portal   │
                    │  Feature Services       │
                    │  (Visualization Layer)  │
                    └─────────────────────────┘
```

### Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Data Source of Truth** | MongoDB (Business Backend) | Ensures data consistency and enables offline operation |
| **Real-time Communication** | Socket.IO on Business Backend | Single WebSocket connection for frontend, simpler client code |
| **Geospatial Operations** | GIS Backend (ArcGIS) | Specialized microservice for routing, geocoding, spatial queries |
| **Authentication** | JWT on Business Backend | Centralized auth, tokens valid across both services |
| **Map Visualization** | ArcGIS Feature Services + Frontend SDK | Live synchronized map layers, no backend rendering needed |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **MongoDB** >= 6.x
- **ArcGIS Developer Account** (for GIS features)
- **npm** >= 9.x

### Starting Both Services

```bash
# Terminal 1: Business Backend
cd backend/business-backend
npm install
cp .env.example .env
# Edit .env with MongoDB and JWT secrets
npm run dev   # Runs on http://localhost:5000

# Terminal 2: GIS Backend
cd backend/gis-backend
npm install
cp .env.example .env
# Edit .env with ArcGIS credentials
npm run dev   # Runs on http://localhost:5001
```

### Environment Variables Quick Reference

**Business Backend (.env)**:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smarters
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
GIS_BACKEND_URL=http://localhost:5001
```

**GIS Backend (.env)**:
```env
PORT=5001
ARCGIS_CLIENT_ID=your_arcgis_client_id
ARCGIS_CLIENT_SECRET=your_arcgis_client_secret
INCIDENT_FEATURE_SERVICE=https://services.arcgis.com/.../FeatureServer/0
AMBULANCE_FEATURE_SERVICE=https://services.arcgis.com/.../FeatureServer/1
```

---

## 📡 API Endpoints Summary

### Base URLs

| Service | URL | Authentication |
|---------|-----|----------------|
| Business Backend | `http://localhost:5000` | JWT Bearer Token |
| GIS Backend | `http://localhost:5001` | None (internal) or JWT |
| Socket.IO | `ws://localhost:5000` | JWT in auth object |

### Authentication Endpoints (Business Backend)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user (operator/driver) | No |
| `POST` | `/api/auth/login` | Login and get JWT tokens | No |
| `POST` | `/api/auth/logout` | Logout and invalidate tokens | Yes |
| `POST` | `/api/auth/refresh` | Refresh access token | Refresh Token |

**Login Example**:
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'operator@example.com',
        password: 'password123'
    })
});
const { accessToken, user } = await response.json();
```

### Incident Management (Business Backend)

| Method | Endpoint | Description | Role Access |
|--------|----------|-------------|-------------|
| `GET` | `/api/incidents` | List all incidents (paginated, filterable) | Admin, Operator |
| `GET` | `/api/incidents/:id` | Get incident details | All authenticated |
| `POST` | `/api/incidents` | Create new incident | Admin, Operator |
| `PUT` | `/api/incidents/:id` | Update incident | Admin, Operator |
| `POST` | `/api/incidents/dispatch` | Dispatch ambulance to incident | Admin, Operator |
| `DELETE` | `/api/incidents/:id` | Delete incident | Admin only |

**Query Parameters for GET /api/incidents**:
- `?status=pending|assigned|completed` - Filter by status
- `?severity=low|medium|high|critical` - Filter by severity
- `?page=1&limit=20` - Pagination
- `?startDate=2026-01-01&endDate=2026-01-31` - Date range

**Create Incident Example**:
```javascript
const response = await fetch('http://localhost:5000/api/incidents', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
        description: 'Heart attack - urgent',
        severity: 'critical',
        location: {
            type: 'Point',
            coordinates: [10.1815, 36.8065]  // [longitude, latitude]
        },
        address: 'Avenue Habib Bourguiba, Tunis'  // Optional
    })
});
```

### Ambulance Management (Business Backend)

| Method | Endpoint | Description | Role Access |
|--------|----------|-------------|-------------|
| `GET` | `/api/ambulances` | List all ambulances | All authenticated |
| `GET` | `/api/ambulances/available` | Get available ambulances only | Admin, Operator |
| `GET` | `/api/ambulances/:id` | Get ambulance details | All authenticated |
| `POST` | `/api/ambulances` | Register new ambulance | Admin only |
| `PUT` | `/api/ambulances/:id` | Update ambulance | Admin, Operator |
| `PUT` | `/api/ambulances/:id/location` | Update location | Admin, Driver |
| `DELETE` | `/api/ambulances/:id` | Delete ambulance | Admin only |

**Ambulance Statuses**: `available`, `busy`, `en-route`, `offline`

### GIS & Routing Endpoints (GIS Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/gis/geocode` | Convert address to coordinates |
| `POST` | `/api/gis/reverse-geocode` | Convert coordinates to address ⚠️ |
| `GET` | `/ambulances/nearest` | Find nearest ambulances to location |
| `POST` | `/ambulances/route-to-incident` | Calculate route between points |
| `POST` | `/api/gis/getRoute` | Get optimal route with directions |

⚠️ **Important**: Reverse geocoding requires ArcGIS premium subscription. Standard credentials will return error 499.

**Find Nearest Ambulances Example**:
```javascript
const lat = 36.818;
const lng = 10.165;
const response = await fetch(
    `http://localhost:5001/ambulances/nearest?latitude=${lat}&longitude=${lng}&limit=5&status=available`
);
const { data } = await response.json();
// Returns ambulances sorted by distance with estimated arrival times
```

**Get Route Example**:
```javascript
const response = await fetch('http://localhost:5001/api/gis/getRoute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        start: { latitude: 36.820, longitude: 10.160 },
        end: { latitude: 36.818, longitude: 10.165 }
    })
});
const { route, totalDistance, totalTime, directions } = await response.json();
```

### Admin Endpoints (Business Backend)

| Method | Endpoint | Description | Role Access |
|--------|----------|-------------|-------------|
| `GET` | `/api/admin/users` | List all users | Admin |
| `POST` | `/api/admin/users` | Create user (any role) | Admin |
| `PUT` | `/api/admin/users/:id` | Update user | Admin |
| `DELETE` | `/api/admin/users/:id` | Delete user | Admin |
| `GET` | `/api/admin/dashboard` | Dashboard statistics | Admin |
| `GET` | `/api/admin/reports` | Generate reports | Admin |

---

## 🔄 Real-time Communication

### Socket.IO Connection (Business Backend)

**Connect to**: `ws://localhost:5000` (same URL as Business Backend)

**Authentication**:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
    auth: {
        token: 'your-jwt-access-token'
    }
});
```

### Events to Emit (Frontend → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `join:role` | `"admin"` \| `"operator"` \| `"driver"` | Join role-based room for notifications |
| `join:incident` | `incidentId` (string) | Subscribe to specific incident updates |
| `join:ambulance` | `ambulanceId` (string) | Subscribe to specific ambulance updates |
| `driver:locationUpdate` | `{ ambulanceId, location: { latitude, longitude }, driverId }` | Send location update (drivers) |
| `dispatch:ambulance` | `{ incidentId, ambulanceId, action }` | Dispatch action |

### Events to Listen (Server → Frontend)

| Event | Payload | Description | Use Case |
|-------|---------|-------------|----------|
| `incident:update` | Incident object | Incident details changed | Update incident card/marker |
| `incident:assigned` | Incident object | Incident assigned to ambulance | Show assignment notification |
| `ambulance:update` | Ambulance object | Ambulance status changed | Update ambulance marker color |
| `ambulance:locationUpdate` | `{ ambulanceId, location, timestamp }` | Ambulance moved | Animate marker on map |
| `ambulance:dispatched` | `{ incidentId, ambulanceId, action }` | Ambulance dispatched | Show route on map |
| `dispatch:new` | Dispatch details | New dispatch for driver | Driver notification |
| `dispatch:created` | Dispatch details | Dispatch created | Admin/operator notification |

### Complete Frontend Example

```javascript
import { io } from 'socket.io-client';

// Initialize connection
const socket = io('http://localhost:5000', {
    auth: { token: localStorage.getItem('accessToken') }
});

// Join role-based room
socket.emit('join:role', 'operator');

// Listen for ambulance location updates
socket.on('ambulance:locationUpdate', (data) => {
    // Update ambulance marker on map
    const { ambulanceId, location } = data;
    updateAmbulanceMarker(ambulanceId, location);
});

// Listen for new incidents
socket.on('incident:update', (incident) => {
    if (incident.status === 'pending') {
        showNewIncidentNotification(incident);
        addIncidentMarkerToMap(incident);
    }
});

// Listen for dispatch notifications
socket.on('ambulance:dispatched', (dispatch) => {
    const { incidentId, ambulanceId } = dispatch;
    // Draw route on map between ambulance and incident
    drawRouteOnMap(ambulanceId, incidentId);
});

// For driver app: send location updates every 5 seconds
if (userRole === 'driver') {
    setInterval(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            socket.emit('driver:locationUpdate', {
                ambulanceId: currentAmbulanceId,
                location: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                },
                driverId: currentUserId
            });
        });
    }, 5000);
}
```

---

## 📊 Data Models

### User

```typescript
{
    _id: string;
    email: string;
    password: string;  // Hashed (bcrypt)
    name: string;
    role: 'admin' | 'operator' | 'driver';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
```

### Incident

```typescript
{
    _id: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'assigned' | 'completed';
    location: {
        type: 'Point';
        coordinates: [longitude: number, latitude: number];
    };
    address?: string;  // Optional, auto-geocoded
    reportedBy: string;  // User ID reference
    assignedAmbulance?: string;  // Ambulance ID reference
    createdAt: Date;
    updatedAt: Date;
}
```

### Ambulance

```typescript
{
    _id: string;
    plateNumber: string;  // Unique identifier
    status: 'available' | 'busy' | 'en-route' | 'offline';
    driver?: string;  // User ID reference
    location: {
        type: 'Point';
        coordinates: [longitude: number, latitude: number];
    };
    crewSize: number;
    lastLocationUpdate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
```

### GeoJSON Location Format

All locations in the system use **GeoJSON Point** format:

```json
{
    "type": "Point",
    "coordinates": [longitude, latitude]
}
```

⚠️ **Important**: Note the order is `[longitude, latitude]` (not lat, lng) to comply with GeoJSON spec.

---

## 🔗 Integration Guide

### Step-by-Step Frontend Integration

#### 1. Authentication Flow

```javascript
// Login
async function login(email, password) {
    const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    // Refresh token is in HTTP-only cookie
    
    return data.user;
}

// Logout
async function logout() {
    await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    });
    localStorage.removeItem('accessToken');
}

// Refresh token (call when 401 received)
async function refreshToken() {
    const res = await fetch('http://localhost:5000/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'  // Include cookies
    });
    const { accessToken } = await res.json();
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
}
```

#### 2. Fetching Data with Authorization

```javascript
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    // Handle token expiration
    if (res.status === 401) {
        const newToken = await refreshToken();
        // Retry request with new token
        return fetchWithAuth(url, options);
    }
    
    return res.json();
}

// Usage
const incidents = await fetchWithAuth('http://localhost:5000/api/incidents?status=pending');
```

#### 3. Map Integration with ArcGIS

```javascript
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';

// Initialize map
const map = new Map({
    basemap: 'streets-navigation-vector'
});

const view = new MapView({
    container: 'mapDiv',
    map: map,
    center: [10.1815, 36.8065],  // Tunis, Tunisia
    zoom: 12
});

// Add incident markers
function addIncidentMarker(incident) {
    const point = new Point({
        longitude: incident.location.coordinates[0],
        latitude: incident.location.coordinates[1]
    });
    
    const graphic = new Graphic({
        geometry: point,
        symbol: {
            type: 'simple-marker',
            color: getSeverityColor(incident.severity),
            size: '12px',
            outline: { color: 'white', width: 1 }
        },
        attributes: incident,
        popupTemplate: {
            title: 'Incident: {description}',
            content: 'Severity: {severity}<br>Status: {status}'
        }
    });
    
    view.graphics.add(graphic);
}

// Add ambulance markers
function addAmbulanceMarker(ambulance) {
    const point = new Point({
        longitude: ambulance.location.coordinates[0],
        latitude: ambulance.location.coordinates[1]
    });
    
    const graphic = new Graphic({
        geometry: point,
        symbol: {
            type: 'picture-marker',
            url: '/ambulance-icon.png',
            width: '32px',
            height: '32px'
        },
        attributes: ambulance
    });
    
    view.graphics.add(graphic);
}

// Update ambulance location (from Socket.IO event)
function updateAmbulanceMarker(ambulanceId, newLocation) {
    const graphic = view.graphics.find(g => g.attributes._id === ambulanceId);
    if (graphic) {
        graphic.geometry = new Point({
            longitude: newLocation.longitude,
            latitude: newLocation.latitude
        });
    }
}
```

#### 4. Dispatch Workflow

```javascript
// Complete dispatch flow
async function dispatchAmbulance(incidentId) {
    // 1. Get incident location
    const incident = await fetchWithAuth(`http://localhost:5000/api/incidents/${incidentId}`);
    const incidentLocation = {
        latitude: incident.location.coordinates[1],
        longitude: incident.location.coordinates[0]
    };
    
    // 2. Find nearest available ambulances
    const response = await fetch(
        `http://localhost:5001/ambulances/nearest?` +
        `latitude=${incidentLocation.latitude}&` +
        `longitude=${incidentLocation.longitude}&` +
        `limit=5&status=available`
    );
    const { data: nearbyAmbulances } = await response.json();
    
    if (nearbyAmbulances.length === 0) {
        alert('No available ambulances');
        return;
    }
    
    // 3. Show ambulances to operator and let them choose
    const selectedAmbulance = await showAmbulanceSelectionDialog(nearbyAmbulances);
    
    // 4. Dispatch ambulance
    const dispatch = await fetchWithAuth('http://localhost:5000/api/incidents/dispatch', {
        method: 'POST',
        body: JSON.stringify({
            incidentId: incident._id,
            ambulanceId: selectedAmbulance._id
        })
    });
    
    // 5. Get route and display on map
    const routeResponse = await fetch('http://localhost:5001/ambulances/route-to-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ambulanceLocation: {
                latitude: selectedAmbulance.location.coordinates[1],
                longitude: selectedAmbulance.location.coordinates[0]
            },
            incidentLocation: incidentLocation
        })
    });
    const { data: routeData } = await routeResponse.json();
    
    // 6. Display route on map
    displayRouteOnMap(routeData.route, routeData.totalDistance, routeData.totalTime);
}
```

#### 5. Role-Based UI Components

```javascript
// Get current user role
const userRole = localStorage.getItem('userRole'); // Set during login

// Conditionally render components
function Dashboard() {
    return (
        <div>
            <h1>SmartERS Dashboard</h1>
            
            {/* All roles can see the map */}
            <MapComponent />
            
            {/* Only admin and operator can see incident list */}
            {(userRole === 'admin' || userRole === 'operator') && (
                <IncidentListPanel />
            )}
            
            {/* Only admin can see user management */}
            {userRole === 'admin' && (
                <UserManagementPanel />
            )}
            
            {/* Only drivers see their assigned incidents */}
            {userRole === 'driver' && (
                <DriverIncidentsPanel />
            )}
            
            {/* Only admin and operator can dispatch */}
            {(userRole === 'admin' || userRole === 'operator') && (
                <DispatchButton />
            )}
        </div>
    );
}
```

---

## 📚 Detailed Documentation

For in-depth implementation details, refer to the individual service READMEs:

### Business Backend Documentation
📄 **[Business Backend README](business-backend/README.md)**

**Topics Covered**:
- Detailed API endpoint specifications
- Authentication & JWT implementation
- RBAC (Role-Based Access Control)
- MongoDB schema details
- Validation rules
- Testing guide
- Database seeding and management
- Swagger API documentation (available at `/api-docs`)

**Key Files**:
- Controllers: [src/controllers/](business-backend/src/controllers/)
- Models: [src/models/](business-backend/src/models/)
- Routes: [src/routes/](business-backend/src/routes/)
- Tests: [src/test/](business-backend/src/test/)

### GIS Backend Documentation
📄 **[GIS Backend README](gis-backend/README.md)**

**Topics Covered**:
- ArcGIS integration setup
- Geocoding & reverse geocoding
- Routing and spatial queries
- ArcGIS Feature Service sync
- Spatial analysis algorithms
- Interactive map dashboard
- Ambulance simulation for testing
- WebSocket event details

**Key Files**:
- Services: [src/services/](gis-backend/src/services/)
- Controllers: [src/controllers/](gis-backend/src/controllers/)
- Socket.IO: [src/socket/](gis-backend/src/socket/)
- Public Dashboard: [src/public/index.html](gis-backend/src/public/index.html)

---

## 🛠️ Development Tips

### Testing Both Services

```bash
# Run tests for business backend
cd backend/business-backend
npm test

# Run tests for GIS backend
cd backend/gis-backend
npm test
```

### Debugging WebSocket Connections

Use the provided test client:
```bash
cd backend/gis-backend/src/socket
node socketTest.js
```

### API Documentation

**Business Backend Swagger UI**: `http://localhost:5000/api-docs`

### Common Issues

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Ensure MongoDB is running: `mongod` or check MongoDB Atlas connection string |
| JWT token expired (401) | Use the refresh token endpoint to get a new access token |
| CORS errors | Both backends have CORS enabled. Check if frontend URL is whitelisted |
| ArcGIS 499 error | Reverse geocoding requires premium subscription. Use forward geocoding or alternative service |
| Socket.IO not connecting | Check JWT token is valid and passed in auth object |
| GIS sync not working | Verify `GIS_BACKEND_URL` in business backend .env is correct |

---

## 🎨 Frontend Implementation Checklist

- [ ] Set up authentication flow (login, logout, token refresh)
- [ ] Initialize ArcGIS Maps SDK
- [ ] Connect to Socket.IO server
- [ ] Subscribe to role-based WebSocket rooms
- [ ] Display incidents on map as markers
- [ ] Display ambulances on map with status colors
- [ ] Implement incident creation form
- [ ] Implement ambulance dispatch workflow
- [ ] Show routes on map when ambulances dispatched
- [ ] Real-time ambulance location updates (animate markers)
- [ ] Role-based component rendering (admin, operator, driver views)
- [ ] Dashboard with statistics
- [ ] User management panel (admin only)
- [ ] Driver location updates (for driver mobile app)
- [ ] Notifications for new incidents/dispatches
- [ ] Ambulance availability filters
- [ ] Incident status filters (pending, assigned, completed)
- [ ] Search/geocode address functionality
- [ ] Emergency hotspot heatmap (using historical data)

---

## 📞 Support

For questions or issues:
- Review the detailed READMEs linked above
- Check the Swagger documentation at `/api-docs`
- Test endpoints using the provided test files
- Use the Socket.IO test client for debugging real-time events

---

**Last Updated**: January 11, 2026  
**Version**: 1.0.0
