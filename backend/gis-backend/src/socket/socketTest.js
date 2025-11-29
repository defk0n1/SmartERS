import { io } from "socket.io-client";

// Connect to your GIS backend Socket.IO server
const socket = io("http://localhost:5001"); // replace port if needed

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});

// Listen for incident updates
socket.on("incidentUpdate", (data) => {
  console.log("Received incidentUpdate:", data);
});

// Listen for ambulance updates
socket.on("ambulanceUpdate", (data) => {
  console.log("Received ambulanceUpdate:", data);
});

// Optional: emit a test event
// socket.emit("ambulanceLocationUpdate", {
//   plateNumber: "TEST123",
//   location: { x: -73.985, y: 40.748 },
//   status: "available"
// });
