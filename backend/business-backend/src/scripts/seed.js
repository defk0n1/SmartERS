import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import Ambulance from "../models/Ambulance.js";
import Incident from "../models/Incident.js";

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
}

// ==================== MOCK DATA ====================

const mockUsers = [
    // Admins (Back Office)
    {
        name: "System Administrator",
        email: "admin@smarters.com",
        password: "admin123",
        role: "admin",
        isActive: true
    },
    {
        name: "John Admin",
        email: "john.admin@smarters.com",
        password: "admin123",
        role: "admin",
        isActive: true
    },
    // Operators (Front Office)
    {
        name: "Sarah Operator",
        email: "sarah.op@smarters.com",
        password: "operator123",
        role: "operator",
        isActive: true
    },
    {
        name: "Mike Dispatcher",
        email: "mike.dispatch@smarters.com",
        password: "operator123",
        role: "operator",
        isActive: true
    },
    {
        name: "Emily Controller",
        email: "emily.control@smarters.com",
        password: "operator123",
        role: "operator",
        isActive: true
    },
    // Drivers (Front Office - Field)
    {
        name: "David Driver",
        email: "david.driver@smarters.com",
        password: "driver123",
        role: "driver",
        isActive: true
    },
    {
        name: "Lisa Paramedic",
        email: "lisa.para@smarters.com",
        password: "driver123",
        role: "driver",
        isActive: true
    },
    {
        name: "James EMT",
        email: "james.emt@smarters.com",
        password: "driver123",
        role: "driver",
        isActive: true
    },
    {
        name: "Anna Medic",
        email: "anna.medic@smarters.com",
        password: "driver123",
        role: "driver",
        isActive: true
    },
    {
        name: "Robert Rescue",
        email: "robert.rescue@smarters.com",
        password: "driver123",
        role: "driver",
        isActive: true
    },
    // Inactive driver for testing
    {
        name: "Tom Inactive",
        email: "tom.inactive@smarters.com",
        password: "driver123",
        role: "driver",
        isActive: false
    }
];

// New York City area coordinates for realistic demo
const nycLocations = [
    { name: "Manhattan - Times Square", coordinates: [-73.9855, 40.7580] },
    { name: "Manhattan - Central Park", coordinates: [-73.9654, 40.7829] },
    { name: "Brooklyn - Downtown", coordinates: [-73.9857, 40.6892] },
    { name: "Queens - Flushing", coordinates: [-73.8330, 40.7580] },
    { name: "Bronx - Yankee Stadium", coordinates: [-73.9262, 40.8296] },
    { name: "Staten Island Ferry", coordinates: [-74.0724, 40.6437] },
    { name: "Manhattan - Wall Street", coordinates: [-74.0089, 40.7074] },
    { name: "Manhattan - Harlem", coordinates: [-73.9465, 40.8116] },
    { name: "Brooklyn - Williamsburg", coordinates: [-73.9574, 40.7081] },
    { name: "Queens - JFK Airport", coordinates: [-73.7781, 40.6413] }
];

const ambulancePlates = [
    "AMB-001", "AMB-002", "AMB-003", "AMB-004", "AMB-005",
    "AMB-006", "AMB-007", "AMB-008", "AMB-009", "AMB-010"
];

const incidentDescriptions = [
    {
        description: "Multi-vehicle collision on highway, multiple injuries reported",
        severity: "critical",
        type: "accident"
    },
    {
        description: "Elderly person collapsed, possible cardiac arrest",
        severity: "critical",
        type: "medical"
    },
    {
        description: "Kitchen fire with smoke inhalation victim",
        severity: "high",
        type: "fire"
    },
    {
        description: "Pedestrian struck by vehicle, conscious but injured",
        severity: "high",
        type: "accident"
    },
    {
        description: "Construction site accident, worker fell from height",
        severity: "critical",
        type: "accident"
    },
    {
        description: "Diabetic emergency, patient unresponsive",
        severity: "high",
        type: "medical"
    },
    {
        description: "Minor fender bender, one person with neck pain",
        severity: "medium",
        type: "accident"
    },
    {
        description: "Child with severe allergic reaction",
        severity: "high",
        type: "medical"
    },
    {
        description: "Slip and fall at grocery store, possible broken hip",
        severity: "medium",
        type: "accident"
    },
    {
        description: "Chest pain reported, patient is 65 years old",
        severity: "high",
        type: "medical"
    },
    {
        description: "Sports injury at local park, leg fracture suspected",
        severity: "medium",
        type: "medical"
    },
    {
        description: "Food poisoning symptoms, multiple people affected",
        severity: "medium",
        type: "medical"
    },
    {
        description: "Minor cut requiring stitches",
        severity: "low",
        type: "medical"
    },
    {
        description: "Anxiety attack, patient hyperventilating",
        severity: "low",
        type: "medical"
    },
    {
        description: "Building evacuation, smoke detector triggered",
        severity: "medium",
        type: "fire"
    }
];

async function seed() {
    console.log("🌱 Starting database seeding...\n");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await User.deleteMany({});
    await Ambulance.deleteMany({});
    await Incident.deleteMany({});
    console.log("✅ Data cleared.\n");

    // Create Users
    console.log("👥 Creating users...");
    const createdUsers = [];
    for (const userData of mockUsers) {
        const user = await User.create(userData);
        createdUsers.push(user);
        console.log(`   ✓ Created ${user.role}: ${user.name} (${user.email})`);
    }
    console.log(`✅ Created ${createdUsers.length} users.\n`);

    // Get drivers for ambulance assignment
    const drivers = createdUsers.filter(u => u.role === "driver" && u.isActive);
    const operators = createdUsers.filter(u => u.role === "operator");

    // Create Ambulances
    console.log("🚑 Creating ambulances...");
    const createdAmbulances = [];
    for (let i = 0; i < ambulancePlates.length; i++) {
        const location = nycLocations[i % nycLocations.length];
        const driver = i < drivers.length ? drivers[i] : null;
        
        // Vary ambulance statuses for realistic demo
        let status = "available";
        if (i === 0) status = "en-route";
        if (i === 1) status = "busy";

        const ambulance = await Ambulance.create({
            plateNumber: ambulancePlates[i],
            driver: driver?._id || null,
            status: status,
            location: {
                type: "Point",
                coordinates: location.coordinates
            }
        });

        // Update driver's assigned ambulance
        if (driver) {
            await User.findByIdAndUpdate(driver._id, { assignedAmbulance: ambulance._id });
        }

        createdAmbulances.push(ambulance);
        console.log(`   ✓ Created ambulance: ${ambulance.plateNumber} (${status}) at ${location.name}`);
    }
    console.log(`✅ Created ${createdAmbulances.length} ambulances.\n`);

    // Create Incidents
    console.log("🚨 Creating incidents...");
    const createdIncidents = [];
    const statuses = ["pending", "assigned", "completed"];

    for (let i = 0; i < incidentDescriptions.length; i++) {
        const incidentData = incidentDescriptions[i];
        const location = nycLocations[i % nycLocations.length];
        const reporter = operators[i % operators.length];

        // Vary incident statuses
        let status = "pending";
        let assignedAmbulance = null;

        if (i < 2) {
            // First two: assigned to en-route/busy ambulances
            status = "assigned";
            assignedAmbulance = createdAmbulances[i]._id;
        } else if (i >= incidentDescriptions.length - 3) {
            // Last three: completed
            status = "completed";
            assignedAmbulance = createdAmbulances[i % createdAmbulances.length]._id;
        }

        const incident = await Incident.create({
            description: incidentData.description,
            severity: incidentData.severity,
            status: status,
            location: {
                type: "Point",
                coordinates: [
                    location.coordinates[0] + (Math.random() - 0.5) * 0.01, // Add slight variation
                    location.coordinates[1] + (Math.random() - 0.5) * 0.01
                ]
            },
            assignedAmbulance: assignedAmbulance,
            reportedBy: reporter._id
        });

        createdIncidents.push(incident);
        console.log(`   ✓ Created incident: ${incidentData.severity.toUpperCase()} - ${incidentData.description.substring(0, 40)}... (${status})`);
    }
    console.log(`✅ Created ${createdIncidents.length} incidents.\n`);

    // Ensure specific driver has both assigned and completed incidents
    try {
        const primaryDriver = createdUsers.find(u => u.email === "david.driver@smarters.com") || drivers[0];
        const primaryAmbulance = createdAmbulances.find(a => a.driver?.toString() === primaryDriver?._id?.toString());
        const reporter = operators[0];

        if (primaryDriver && primaryAmbulance) {
            console.log("🧩 Adding driver-focused demo incidents for:", primaryDriver.name, "->", primaryAmbulance.plateNumber);

            const pick = (idx) => nycLocations[idx % nycLocations.length];

            // Two assigned incidents for this driver's ambulance
            for (let i = 0; i < 2; i++) {
                const loc = pick(i + 1);
                const incident = await Incident.create({
                    description: `Driver demo assigned incident #${i + 1} for ${primaryDriver.name}`,
                    severity: "high",
                    status: "assigned",
                    location: {
                        type: "Point",
                        coordinates: [
                            loc.coordinates[0] + (Math.random() - 0.5) * 0.01,
                            loc.coordinates[1] + (Math.random() - 0.5) * 0.01
                        ]
                    },
                    assignedAmbulance: primaryAmbulance._id,
                    reportedBy: reporter?._id
                });
                createdIncidents.push(incident);
            }

            // Two completed incidents for this driver's ambulance
            for (let i = 0; i < 2; i++) {
                const loc = pick(i + 4);
                const incident = await Incident.create({
                    description: `Driver demo completed incident #${i + 1} for ${primaryDriver.name}`,
                    severity: "medium",
                    status: "completed",
                    location: {
                        type: "Point",
                        coordinates: [
                            loc.coordinates[0] + (Math.random() - 0.5) * 0.01,
                            loc.coordinates[1] + (Math.random() - 0.5) * 0.01
                        ]
                    },
                    assignedAmbulance: primaryAmbulance._id,
                    reportedBy: reporter?._id
                });
                createdIncidents.push(incident);
            }

            console.log("✅ Added driver-specific assigned and completed incidents.");
        } else {
            console.log("⚠️ Could not locate primary driver/ambulance for driver-focused incidents.");
        }
    } catch (e) {
        console.warn("⚠️ Failed to add driver-focused demo incidents:", e.message);
    }

    // Summary
    console.log("=".repeat(60));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(60));
    console.log(`\n👥 Users: ${createdUsers.length}`);
    console.log(`   - Admins: ${createdUsers.filter(u => u.role === "admin").length}`);
    console.log(`   - Operators: ${createdUsers.filter(u => u.role === "operator").length}`);
    console.log(`   - Drivers: ${createdUsers.filter(u => u.role === "driver").length}`);
    
    console.log(`\n🚑 Ambulances: ${createdAmbulances.length}`);
    console.log(`   - Available: ${createdAmbulances.filter(a => a.status === "available").length}`);
    console.log(`   - En-route: ${createdAmbulances.filter(a => a.status === "en-route").length}`);
    console.log(`   - Busy: ${createdAmbulances.filter(a => a.status === "busy").length}`);
    
    console.log(`\n🚨 Incidents: ${createdIncidents.length}`);
    console.log(`   - Pending: ${createdIncidents.filter(i => i.status === "pending").length}`);
    console.log(`   - Assigned: ${createdIncidents.filter(i => i.status === "assigned").length}`);
    console.log(`   - Completed: ${createdIncidents.filter(i => i.status === "completed").length}`);
    const driverDemoCount = createdIncidents.filter(i => i.assignedAmbulance && createdAmbulances.find(a => a._id.toString() === i.assignedAmbulance.toString() && a.driver)).length;
    console.log(`   - Linked to driver ambulances: ${driverDemoCount}`);

    console.log("\n=".repeat(60));
    console.log("🔐 TEST CREDENTIALS");
    console.log("=".repeat(60));
    console.log("\nAdmin:    admin@smarters.com / admin123");
    console.log("Operator: sarah.op@smarters.com / operator123");
    console.log("Driver:   david.driver@smarters.com / driver123");
    console.log("\n✅ Seeding complete!\n");

    process.exit(0);
}

await connectDB();
await seed();
