import http from "http";
import app from "./app.js";
import { initRealtime } from "./socket/realtime.js";
import { PORT } from "./config/env.js";

const server = http.createServer(app);

// Initialize Socket.IO
initRealtime(server);

server.listen(PORT, () => {
  console.log(`GIS backend running on http://localhost:${PORT}`);
});
