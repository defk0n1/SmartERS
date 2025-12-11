// frontend/src/pages/DriverView.jsx
import React, { useState, useEffect } from 'react';
import { useDriverSocket } from '../hooks/useSocket';
import '../styles/DriverView.css';

const DriverView = () => {
    // Get ambulanceId from localStorage (set during login)
    const ambulanceId = localStorage.getItem('ambulanceId') || '674a1234567890abcdef0000';

    const { connected, assignedIncident, updateLocation, changeStatus } = useDriverSocket(ambulanceId);
    const [currentStatus, setCurrentStatus] = useState('available');
    const [isTracking, setIsTracking] = useState(false);
    const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });

    useEffect(() => {
        if (!isTracking) return;

        const interval = setInterval(() => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const newCoords = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        setCoordinates(newCoords);
                        updateLocation(
                            { type: 'Point', coordinates: [newCoords.lng, newCoords.lat] },
                            currentStatus
                        );
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                    }
                );
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isTracking, currentStatus, updateLocation]);

    const handleStatusChange = (newStatus) => {
        setCurrentStatus(newStatus);
        changeStatus(newStatus);
    };

    const toggleTracking = () => {
        if (!isTracking) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setCoordinates({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                        setIsTracking(true);
                    },
                    () => {
                        setCoordinates({ lat: 36.7783, lng: -119.4179 });
                        setIsTracking(true);
                    }
                );
            } else {
                setCoordinates({ lat: 36.7783, lng: -119.4179 });
                setIsTracking(true);
            }
        } else {
            setIsTracking(false);
        }
    };

    return (
        <div className="driver-view">
            <header className="driver-header">
                <h1>🚑 Driver Dashboard</h1>
                <div className="connection-status">
                    {connected ? (
                        <span className="status-connected">🟢 Online</span>
                    ) : (
                        <span className="status-disconnected">🔴 Offline</span>
                    )}
                </div>
            </header>

            <div className="driver-content">
                <div className="card status-card">
                    <h2>Status Control</h2>
                    <div className="status-buttons">
                        <button
                            className={`status-btn ${currentStatus === 'available' ? 'active available' : ''}`}
                            onClick={() => handleStatusChange('available')}
                        >
                            ✅ Available
                        </button>
                        <button
                            className={`status-btn ${currentStatus === 'en-route' ? 'active en-route' : ''}`}
                            onClick={() => handleStatusChange('en-route')}
                        >
                            🚨 En-Route
                        </button>
                        <button
                            className={`status-btn ${currentStatus === 'busy' ? 'active busy' : ''}`}
                            onClick={() => handleStatusChange('busy')}
                        >
                            ⛔ Busy
                        </button>
                    </div>
                    <div className="current-status">
                        Current Status: <strong>{currentStatus}</strong>
                    </div>
                </div>

                <div className="card tracking-card">
                    <h2>GPS Tracking</h2>
                    <div className="tracking-info">
                        <p><strong>Latitude:</strong> {coordinates.lat.toFixed(6)}</p>
                        <p><strong>Longitude:</strong> {coordinates.lng.toFixed(6)}</p>
                        <p><strong>Tracking:</strong> {isTracking ? '🟢 Active' : '🔴 Inactive'}</p>
                    </div>
                    <button
                        className={`tracking-btn ${isTracking ? 'stop' : 'start'}`}
                        onClick={toggleTracking}
                    >
                        {isTracking ? '⏸️ Stop Tracking' : '▶️ Start Tracking'}
                    </button>
                </div>

                {assignedIncident ? (
                    <div className="card incident-card alert">
                        <h2>🚨 Assigned Incident</h2>
                        <div className="incident-details">
                            <div className="incident-severity">
                                Severity: <span className={`severity-badge ${assignedIncident.severity}`}>
                  {assignedIncident.severity}
                </span>
                            </div>
                            <p><strong>Description:</strong> {assignedIncident.description}</p>
                            {assignedIncident.location && (
                                <p>
                                    <strong>Location:</strong> [
                                    {assignedIncident.location.coordinates[0].toFixed(4)},
                                    {assignedIncident.location.coordinates[1].toFixed(4)}]
                                </p>
                            )}
                            <button className="navigate-btn">
                                🗺️ Navigate to Location
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card no-incident">
                        <h2>No Active Incidents</h2>
                        <p>Waiting for assignment...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverView;