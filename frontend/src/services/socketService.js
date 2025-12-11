import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
        if (this.socket?.connected) {
            console.log('✅ Already connected');
            return this.socket;
        }

        const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

        this.socket = io(serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to WebSocket:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }

    // Dashboard methods
    joinDashboard() {
        if (!this.socket) return;
        this.socket.emit('dashboard:join');
        console.log('📊 Joined dashboard');
    }

    // Ambulance methods
    joinAsAmbulance(ambulanceId) {
        if (!this.socket) return;
        this.socket.emit('ambulance:join', ambulanceId);
        console.log(`🚑 Joined as ambulance: ${ambulanceId}`);
    }

    updateLocation(ambulanceId, location, status) {
        if (!this.socket) return;
        this.socket.emit('ambulance:location:update', {
            ambulanceId,
            location,
            status
        });
    }

    changeStatus(ambulanceId, status) {
        if (!this.socket) return;
        this.socket.emit('ambulance:status:change', {
            ambulanceId,
            status
        });
    }

    // Incident methods
    reportIncident(incidentData) {
        if (!this.socket) return;
        this.socket.emit('incident:new', incidentData);
    }

    // Event listeners
    onAmbulanceLocationUpdate(callback) {
        return this.on('ambulance:location:updated', callback);
    }

    onAmbulanceStatusChange(callback) {
        return this.on('ambulance:status:changed', callback);
    }

    onNewIncident(callback) {
        return this.on('incident:created', callback);
    }

    onIncidentAssigned(callback) {
        return this.on('incident:assigned', callback);
    }

    onIncidentAssignmentUpdate(callback) {
        return this.on('incident:assignment:updated', callback);
    }

    onIncidentCompleted(callback) {
        return this.on('incident:completed', callback);
    }

    // Generic event handler
    on(event, callback) {
        if (!this.socket) {
            console.error('Socket not connected');
            return () => {};
        }

        this.socket.on(event, callback);

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        // Return cleanup function
        return () => {
            this.socket?.off(event, callback);
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
        this.listeners.delete(event);
    }

    isConnected() {
        return this.socket?.connected || false;
    }
}

export default new SocketService();