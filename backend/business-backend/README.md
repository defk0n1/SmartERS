# SmartERS Business Backend

Smart Emergency Response System (SmartERS) - Business Logic Backend API

## Overview

The Business Backend is a RESTful API service that handles core business logic for the SmartERS emergency response system. It manages user authentication, role-based access control (RBAC), incident management, and ambulance fleet operations.

## Features

### Authentication & Authorization
- **JWT-based Authentication** with access and refresh tokens
- **Role-Based Access Control (RBAC)** with three roles:
  - **Admin**: Full system access, user management, configuration
  - **Operator**: Incident management, ambulance dispatch, monitoring
  - **Driver**: View assigned incidents, update ambulance location
- **Secure Password Hashing** using bcrypt
- **Rate Limiting** on authentication endpoints to prevent brute-force attacks
- **HTTP-only Cookies** for refresh token storage

### User Management (Admin Only)
- Create, read, update, delete users
- Assign and change user roles
- Activate/deactivate user accounts
- Reset user passwords
- Filter users by role and status
- Paginated user listing

### Incident Management
- Create new incidents with location coordinates (GeoJSON)
- Update incident status and severity
- Filter incidents by status, severity, and date range
- Dispatch ambulances to incidents
- View incidents assigned to specific drivers
- Paginated incident listing
- Severity levels: `low`, `medium`, `high`, `critical`
- Status workflow: `pending` → `assigned` → `completed`

### Ambulance Fleet Management
- Register and manage ambulance fleet
- Track ambulance status (`available`, `busy`, `en-route`, `offline`)
- Update real-time ambulance locations
- View available ambulances for dispatch
- Assign drivers to ambulances
- GeoJSON location support for mapping integration

### Admin Dashboard & Reports
- System statistics (total users, incidents, ambulances)
- Incident reports with date range filtering
- Ambulance utilization reports
- System configuration management

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Testing**: Mocha, Chai, chai-http
- **API Documentation**: Swagger (OpenAPI 3.0)
- **Environment**: dotenv

## Project Structure

```
src/
├── app.js                 # Express app configuration
├── server.js              # Server entry point
├── config/
│   ├── db.js              # MongoDB connection
│   └── swagger.js         # Swagger documentation config
├── controllers/
│   ├── adminController.js     # Admin operations
│   ├── ambulanceController.js # Ambulance CRUD & location
│   ├── authController.js      # Authentication
│   └── incidentController.js  # Incident management
├── middleware/
│   ├── authMiddleware.js  # JWT & RBAC middleware
│   └── rateLimit.js       # Rate limiting
├── models/
│   ├── Ambulance.js       # Ambulance schema
│   ├── Incident.js        # Incident schema
│   └── User.js            # User schema
├── routes/
│   ├── adminRoutes.js     # /api/admin/*
│   ├── ambulanceRoutes.js # /api/ambulances/*
│   ├── authRoutes.js      # /api/auth/*
│   └── incidentRoutes.js  # /api/incidents/*
├── scripts/
│   ├── seed.js            # Database seeding
│   └── clear-db.js        # Clear database
├── test/
│   └── *.test.js          # Test files
└── utils/
    └── tokens.js          # JWT token utilities
```

## Prerequisites

- **Node.js** >= 18.x
- **MongoDB** >= 6.x (local or MongoDB Atlas)
- **npm** >= 9.x

## Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartERS/backend/business-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development
   
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/smarters
   
   # JWT Secrets (use strong random strings in production)
   JWT_SECRET=your-jwt-secret-key-here
   JWT_REFRESH_SECRET=your-refresh-secret-key-here
   
   # JWT Expiration
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   
   # GIS Backend URL (for integration)
   GIS_BACKEND_URL=http://localhost:5001
   ```

4. **Start MongoDB**
   
   If running locally:
   ```bash
   mongod
   ```
   
   Or use MongoDB Atlas connection string in `MONGODB_URI`.

## Running the Application

### Development Mode
```bash
npm run dev
```
Starts the server with nodemon for auto-reload on file changes.

### Production Mode
```bash
npm start
```

The API will be available at `http://localhost:5000`

## Database Seeding

Populate the database with test data:

```bash
npm run db:seed
```

This creates:
- **Admin user**: `admin@smarters.com` / `admin123`
- **Operator user**: `operator@smarters.com` / `operator123`
- **Driver user**: `driver@smarters.com` / `driver123`
- Sample ambulances and incidents

### Clear Database
```bash
npm run db:clear
```

## Running Tests

### Run All Tests
```bash
npm test
```

This command:
1. Sets `NODE_ENV=test` to disable rate limiting
2. Runs all test files in `src/test/` directory
3. Uses 10-second timeout for async operations

### Test Coverage

The test suite includes **99 tests** covering:

| Test File | Coverage |
|-----------|----------|
| `auth.test.js` | Registration, login, RBAC across all routes |
| `adminController.test.js` | User management, dashboard, reports, config |
| `ambulanceController.test.js` | CRUD operations, location updates, RBAC |
| `incidentController.test.js` | CRUD operations, dispatch, filtering |
| `user.test.js` | User model validation |
| `ambulance.test.js` | Ambulance model validation |
| `incident.test.js` | Incident model validation |

### Test Environment

Tests use a separate test database and automatically:
- Create test users for each role
- Clean up test data after completion
- Skip rate limiting to allow rapid API calls

## API Documentation

### Swagger UI
Access interactive API documentation at:
```
http://localhost:5000/api-docs
```

### API Endpoints Overview

#### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login and get tokens |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/logout` | Auth | Logout and invalidate tokens |
| GET | `/me` | Auth | Get current user profile |

#### Admin (`/api/admin`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin | List all users (paginated) |
| GET | `/users/:id` | Admin | Get user by ID |
| POST | `/users` | Admin | Create new user |
| PUT | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |
| POST | `/users/:id/reset-password` | Admin | Reset user password |
| GET | `/dashboard` | Admin | Get dashboard stats |
| GET | `/reports` | Admin | Generate reports |
| GET | `/config` | Admin | Get system config |

#### Incidents (`/api/incidents`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Admin, Operator | List incidents (paginated) |
| GET | `/:id` | Auth | Get incident by ID |
| POST | `/` | Admin, Operator | Create incident |
| PUT | `/:id` | Admin, Operator | Update incident |
| DELETE | `/:id` | Admin | Delete incident |
| POST | `/dispatch` | Admin, Operator | Dispatch ambulance |
| GET | `/driver/assigned` | Driver | Get assigned incidents |

#### Ambulances (`/api/ambulances`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Auth | List all ambulances |
| GET | `/available` | Admin, Operator | List available ambulances |
| GET | `/:id` | Auth | Get ambulance by ID |
| POST | `/` | Admin | Create ambulance |
| PUT | `/:id` | Admin, Operator | Update ambulance |
| PUT | `/:id/location` | Admin, Driver | Update location |
| DELETE | `/:id` | Admin | Delete ambulance |

## Role Permissions Matrix

| Resource | Admin | Operator | Driver |
|----------|-------|----------|--------|
| **Users** | CRUD | ❌ | ❌ |
| **Incidents - Create** | ✅ | ✅ | ❌ |
| **Incidents - View All** | ✅ | ✅ | ❌ |
| **Incidents - View One** | ✅ | ✅ | ✅ |
| **Incidents - Update** | ✅ | ✅ | ❌ |
| **Incidents - Delete** | ✅ | ❌ | ❌ |
| **Incidents - Dispatch** | ✅ | ✅ | ❌ |
| **Ambulances - Create** | ✅ | ❌ | ❌ |
| **Ambulances - View** | ✅ | ✅ | ✅ |
| **Ambulances - Update** | ✅ | ✅ | ❌ |
| **Ambulances - Location** | ✅ | ❌ | ✅ (own) |
| **Ambulances - Delete** | ✅ | ❌ | ❌ |
| **Dashboard/Reports** | ✅ | ❌ | ❌ |

## Error Handling

The API returns consistent error responses:

```json
{
  "message": "Error description"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Server Error

## Security Features

1. **Password Security**
   - Bcrypt hashing with salt rounds
   - Minimum password length validation

2. **JWT Security**
   - Short-lived access tokens (15 min default)
   - Long-lived refresh tokens in HTTP-only cookies
   - Token blacklisting on logout

3. **Rate Limiting**
   - 5 requests per 15 minutes on auth endpoints
   - Prevents brute-force attacks
   - Disabled in test environment

4. **Input Validation**
   - Mongoose schema validation
   - Email format validation
   - Enum validation for status fields

## GIS Integration

The business backend integrates with the GIS microservice for geospatial capabilities.

### Configuration

Add to your `.env`:
```env
GIS_BACKEND_URL=http://localhost:5001
GIS_SYNC_ENABLED=true
```

### GIS Service Features

| Feature | Description |
|---------|-------------|
| `geocodeAddress(address)` | Convert address to coordinates |
| `reverseGeocode(lat, lng)` | Convert coordinates to address |
| `findNearestAmbulances(location)` | Find closest available ambulances |
| `getRoute(start, end)` | Calculate optimal route |
| `syncAmbulance(ambulance)` | Sync ambulance data to ArcGIS Feature Service |
| `syncIncident(incident)` | Sync incident data to ArcGIS Feature Service |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend                                     │
│  (React/Vue/Angular app)                                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ Socket.IO + REST
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Business Backend (Port 5000)                      │
│  - MongoDB (Source of Truth)                                         │
│  - Authentication & Authorization                                    │
│  - Business Logic                                                    │
│  - Socket.IO Server (for frontend)                                   │
│  - GIS Service Client                                                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTP + Socket.IO
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GIS Backend (Port 5001)                         │
│  - ArcGIS Feature Services                                           │
│  - Geocoding & Routing                                               │
│  - Spatial Queries                                                   │
│  - Real-time Map Updates                                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Real-time WebSocket Events

Connect using Socket.IO client to the same server URL (port 5000).

### Client Events (emit to server)

| Event | Payload | Description |
|-------|---------|-------------|
| `join:role` | `"admin"` \| `"operator"` \| `"driver"` | Join role-based notification room |
| `join:incident` | `incidentId` | Subscribe to specific incident updates |
| `join:ambulance` | `ambulanceId` | Subscribe to specific ambulance updates |
| `driver:locationUpdate` | `{ ambulanceId, location, driverId }` | Send ambulance location update |
| `dispatch:ambulance` | `{ incidentId, ambulanceId, action }` | Dispatch ambulance to incident |

### Server Events (listen from server)

| Event | Payload | Description |
|-------|---------|-------------|
| `incident:update` | Incident object | Incident status/details changed |
| `incident:assigned` | Incident object | Incident assigned to an ambulance |
| `ambulance:update` | Ambulance object | Ambulance status/details changed |
| `ambulance:locationUpdate` | `{ ambulanceId, location, timestamp }` | Ambulance location changed |
| `ambulance:dispatched` | `{ incidentId, ambulanceId, action }` | Ambulance dispatched notification |
| `dispatch:new` | Dispatch details | New dispatch (for drivers) |
| `dispatch:created` | Dispatch details | Dispatch created (for admins/operators) |

### Example Client Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
    auth: { token: "your-jwt-token" }
});

// Join role room for notifications
socket.emit("join:role", "operator");

// Listen for incident updates
socket.on("incident:update", (incident) => {
    console.log("Incident updated:", incident);
});

// Listen for ambulance location updates
socket.on("ambulance:locationUpdate", (data) => {
    console.log("Ambulance moved:", data.ambulanceId, data.location);
});

// For drivers: send location updates
socket.emit("driver:locationUpdate", {
    ambulanceId: "amb123",
    location: { latitude: 36.818, longitude: 10.165 },
    driverId: "driver456"
});
```
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm test` | Run test suite |
| `npm run db:seed` | Seed database with test data |
| `npm run db:clear` | Clear all database collections |

## Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass (`npm test`)
4. Submit a pull request

## License

ISC License
