import { Server } from "socket.io";

let io;

export function initRealtime(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // allow all origins for now; change in production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Listen for ambulance location updates from backend or devices
    socket.on("ambulanceLocationUpdate", (data) => {
      // Broadcast to all other clients
      io.emit("ambulanceUpdate", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

// Export io so other modules can emit events
export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
