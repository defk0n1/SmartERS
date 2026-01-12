# SmartERS Frontend - Quick Start Guide

## 🚀 Getting Started

This Next.js 14 frontend application provides a complete interface for the SmartERS emergency response system with role-based dashboards and real-time tracking.

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Running backends:
  - Business Backend on port 5000
  - GIS Backend on port 5001

### Installation Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (already set in `.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_GIS_API_URL=http://localhost:5001
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@smarters.com | admin123 |
| **Operator** | operator@smarters.com | operator123 |
| **Driver** | driver@smarters.com | driver123 |

## 📁 Project Structure

```
front/
├── app/                    # Next.js 14 App Router pages
│   ├── admin/             # Admin dashboard, users, incidents, ambulances, map
│   ├── operator/          # Operator dashboard
│   ├── driver/            # Driver dashboard and assignments
│   └── auth/              # Login and registration
├── components/            # Reusable UI components
├── contexts/              # React contexts (Auth)
├── hooks/                 # Custom hooks (useRequireAuth)
├── services/              # API service layers
├── types/                 # TypeScript definitions
└── lib/                   # Utilities (API client)
```

## 🎯 Key Features Implemented

### ✅ Authentication System
- JWT-based authentication with automatic token refresh
- Role-based access control (RBAC)
- Protected routes with redirects
- Persistent sessions

### ✅ Admin Features
- **Dashboard**: System statistics and overview
- **Users**: Full CRUD operations for user management
- **Incidents**: Create, view, update, delete, and dispatch
- **Ambulances**: Fleet management with real-time status
- **Map**: Real-time tracking with Socket.IO

### ✅ Operator Features
- **Dashboard**: Quick overview of active incidents
- **Incidents**: Create and manage incidents
- **Ambulances**: View fleet and dispatch ambulances
- **Map**: Real-time tracking view

### ✅ Driver Features
- **Dashboard**: View assigned incidents
- **Assignments**: List of all assignments
- **Status Updates**: Update ambulance location/status

### ✅ Real-time Features
- Socket.IO integration for live updates
- Real-time incident notifications
- Live ambulance location tracking
- Automatic map refresh
- Connection status indicator

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context API
- **API Client**: Axios with interceptors
- **Real-time**: Socket.IO Client
- **UI Components**: Headless UI, Heroicons
- **Notifications**: React Hot Toast
- **Date Utils**: date-fns

## 📡 API Integration

### Business Backend (Port 5000)
```typescript
// Authentication
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me

// Incidents
GET    /api/incidents
POST   /api/incidents
PUT    /api/incidents/:id
DELETE /api/incidents/:id
POST   /api/incidents/dispatch

// Ambulances
GET    /api/ambulances
POST   /api/ambulances
PUT    /api/ambulances/:id
PUT    /api/ambulances/:id/location

// Admin
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
GET    /api/admin/dashboard
```

### GIS Backend (Port 5001)
```typescript
// Routing
POST /api/gis/getRoute

// Incidents & Ambulances
GET  /incidents
POST /incidents
GET  /ambulances
POST /ambulances
```

## 🔌 WebSocket Events

### Events Received (from server)
- `incident:update` - Incident created/updated
- `ambulance:update` - Ambulance status changed
- `ambulance:locationUpdate` - Location updated
- `dispatch:created` - New dispatch

### Events Sent (to server)
- `join:role` - Join role-specific room
- `join:incident` - Subscribe to incident
- `driver:locationUpdate` - Send location update

## 🎨 Design System

### Colors
- **Primary**: Blue (#0ea5e9)
- **Emergency**: Red (#ef4444)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)

### Component Classes
```css
.btn-primary      /* Primary action button */
.btn-secondary    /* Secondary button */
.btn-danger       /* Destructive action */
.input-field      /* Form inputs */
.card             /* Card container */
.badge            /* Status badges */
```

## 📱 Pages Overview

### Public Pages
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/unauthorized` - Access denied page

### Admin Pages
- `/admin/dashboard` - Statistics and overview
- `/admin/users` - User management
- `/admin/incidents` - Incident management
- `/admin/ambulances` - Fleet management
- `/admin/map` - Real-time map

### Operator Pages
- `/operator/dashboard` - Operator overview

### Driver Pages
- `/driver/dashboard` - Driver overview
- `/driver/assignments` - All assignments

## 🚨 Common Commands

```bash
# Development
npm run dev         # Start dev server

# Production
npm run build       # Build for production
npm start           # Start production server

# Linting
npm run lint        # Run ESLint
```

## 🔧 Configuration Files

- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `tsconfig.json` - TypeScript settings
- `.env.local` - Environment variables

## 🐛 Troubleshooting

### Backend Connection Issues
1. Ensure both backends are running
2. Check ports 5000 and 5001 are accessible
3. Verify CORS is enabled on backends

### Authentication Issues
1. Clear browser localStorage
2. Check backend is running
3. Verify credentials are correct

### WebSocket Issues
1. Check browser console for errors
2. Verify Socket.IO server is running
3. Test connection status indicator

## 📚 Next Steps

1. **Start backends**: Make sure business-backend and gis-backend are running
2. **Seed database**: Run `npm run db:seed` in business-backend
3. **Install dependencies**: Run `npm install` in this directory
4. **Start frontend**: Run `npm run dev`
5. **Login**: Use admin@smarters.com / admin123

## 🤝 Development Workflow

1. Make changes to components/pages
2. Hot reload will update automatically
3. Check TypeScript errors in terminal
4. Test in browser
5. Commit changes

---

**Built with ❤️ for SmartERS - Emergency Response Made Smart**
