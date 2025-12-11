// frontend/src/App.js
import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import DriverView from './pages/DriverView';
import './App.css';

function App() {
    const [view, setView] = useState('dashboard');

    return (
        <div className="App">
            <div className="view-switcher">
                <button
                    className={view === 'dashboard' ? 'active' : ''}
                    onClick={() => setView('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={view === 'driver' ? 'active' : ''}
                    onClick={() => setView('driver')}
                >
                    🚑 Driver View
                </button>
            </div>

            {view === 'dashboard' ? <Dashboard /> : <DriverView />}
        </div>
    );
}

export default App;