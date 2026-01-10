import { getIO } from "../socket/realtime.js";

class AmbulanceSimulationService {
    constructor () {
        this.ambulances = [];
        this.interval = null;
    }

    setAmbulances(ambulances) {
        this.ambulances = ambulances.map(a => ({ ...a, currentIndex: 0 }));
    }

    start(speed = 1) {
        const io = getIO();
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            this.ambulances.forEach(amb => {
                if (!amb.route || amb.route.length === 0) return;

                amb.currentIndex += speed;
                if (amb.currentIndex >= amb.route.length) amb.currentIndex = amb.route.length - 1;

                const pos = amb.route[Math.floor(amb.currentIndex)];

                // Emit real-time update
                io.emit("ambulanceUpdate", { id: amb.id, position: pos });
            });
        }, 1000); // tick every second
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }
}

export default new AmbulanceSimulationService();