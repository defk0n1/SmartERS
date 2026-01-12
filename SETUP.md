# SmartERS - Complete Setup Instructions

## 🎯 Overview

SmartERS is a complete emergency response system with:
- **Business Backend**: Authentication, incidents, ambulances (Port 5000)
- **GIS Backend**: Maps, routing, geocoding (Port 5001)  
- **Next.js Frontend**: Role-based dashboards (Port 3000)

## 📋 Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x (running locally or MongoDB Atlas)
- npm >= 9.x

## 🚀 Complete Setup Guide

### Step 1: Setup Business Backend

```bash
# Navigate to business backend
cd backend/business-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Required: MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET

# Start MongoDB (if local)
mongod

# Seed the database with test data
npm run db:seed

# Start the server
npm run dev
```

**Business Backend** will run on `http://localhost:5000`

Default users created:
- Admin: admin@smarters.com / admin123
- Operator: operator@smarters.com / operator123
- Driver: driver@smarters.com / driver123

### Step 2: Setup GIS Backend

```bash
# Navigate to GIS backend
cd backend/gis-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your ArcGIS credentials
# Required: ARCGIS_CLIENT_ID, ARCGIS_CLIENT_SECRET

# Start the server
npm run dev
```

**GIS Backend** will run on `http://localhost:5001`

### Step 3: Setup Frontend

```bash
# Navigate to frontend
cd front

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

**Frontend** will run on `http://localhost:3000`

## ✅ Verification

### 1. Check Business Backend
```bash
curl http://localhost:5000/api-docs
```
Should return Swagger documentation page.

### 2. Check GIS Backend
```bash
curl http://localhost:5001/health
```
Should return: `{"status":"GIS backend running"}`

### 3. Check Frontend
Open browser: `http://localhost:3000`
Should redirect to login page.

## 🔑 First Login

1. Go to `http://localhost:3000`
2. You'll be redirected to `/auth/login`
3. Login with:
   - **Email**: admin@smarters.com
   - **Password**: admin123
4. You'll be redirected to Admin Dashboard

## 📱 Testing All Features

### Admin Testing
1. **Dashboard**: View system statistics
2. **Users**: Create a new user
3. **Incidents**: Create a new incident with coordinates
4. **Ambulances**: Add an ambulance to the fleet
5. **Map**: See real-time tracking

### Operator Testing
1. Login as operator@smarters.com / operator123
2. Create incident
3. Dispatch ambulance to incident
4. View real-time map

### Driver Testing
1. Login as driver@smarters.com / driver123
2. View assigned incidents
3. Check assignment details

## 🔌 Real-time Features

The system uses Socket.IO for real-time updates:

1. Open Admin Dashboard in one browser tab
2. Open Map page in another tab
3. Create an incident - both tabs update instantly
4. Dispatch an ambulance - see real-time notification

## 🗺️ GIS Features

### Geocoding
The system can convert addresses to coordinates when creating incidents.

### Routing
Calculate optimal routes between ambulances and incidents (requires ArcGIS account).

### Simulation
Test ambulance movement along calculated routes.

## 📊 Database Structure

### Users Collection
- Stores user credentials and roles
- Password hashing with bcrypt
- JWT token management

### Incidents Collection
- Emergency incident details
- GeoJSON location data
- Status and severity tracking
- Ambulance assignment

### Ambulances Collection
- Fleet management data
- Real-time location tracking
- Driver assignment
- Status monitoring

## 🔧 Environment Variables

### Business Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smarters
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GIS_BACKEND_URL=http://localhost:5001
```

### GIS Backend (.env)
```env
PORT=5001
ARCGIS_CLIENT_ID=your-client-id
ARCGIS_CLIENT_SECRET=your-client-secret
INCIDENT_FEATURE_SERVICE=your-feature-service-url
AMBULANCE_FEATURE_SERVICE=your-feature-service-url
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GIS_API_URL=http://localhost:5001
```

## 🐛 Common Issues

### Backend won't start
- **MongoDB not running**: Start MongoDB with `mongod`
- **Port in use**: Change PORT in .env or kill process on port 5000
- **Missing dependencies**: Run `npm install`

### Frontend connection errors
- **CORS issues**: Check backend CORS configuration
- **Wrong URL**: Verify NEXT_PUBLIC_API_URL in .env.local
- **Backend not running**: Start both backends first

### Authentication failures
- **Invalid credentials**: Use seeded user credentials
- **Token expired**: Clear localStorage and login again
- **Cookie issues**: Check browser allows cookies

### WebSocket not connecting
- **Backend Socket.IO not started**: Restart backend
- **Firewall blocking**: Check firewall settings
- **Wrong URL**: Verify API_URL in frontend

## 📚 API Documentation

### Business Backend
- Swagger UI: `http://localhost:5000/api-docs`
- README: `backend/business-backend/README.md`

### GIS Backend  
- README: `backend/gis-backend/README.md`
- Test page: `http://localhost:5001/`

### Frontend
- Quick Start: `front/QUICKSTART.md`
- README: `front/README.md`

## 🎨 Development Tips

### Backend Development
- Use Postman/Insomnia for API testing
- Check Swagger docs for all endpoints
- Run tests: `npm test`
- Clear database: `npm run db:clear`

### Frontend Development
- Hot reload enabled automatically
- Check browser console for errors
- Use React DevTools for debugging
- TypeScript errors shown in terminal

## 🚢 Production Deployment

### Backend
```bash
npm run build
npm start
```

### Frontend
```bash
npm run build
npm start
```

### Environment
- Use production MongoDB (Atlas recommended)
- Set strong JWT secrets
- Enable HTTPS
- Configure proper CORS origins
- Use environment-specific .env files

## 📈 Next Steps

1. ✅ Setup complete system
2. ✅ Test all features
3. 📝 Customize for your needs
4. 🎨 Modify UI/branding
5. 🚀 Deploy to production

## 🤝 Support

For issues or questions:
1. Check respective README files
2. Review API documentation
3. Check browser/server console logs
4. Verify all services are running

---

**System is ready! Start with `npm run dev` in all three directories.**
