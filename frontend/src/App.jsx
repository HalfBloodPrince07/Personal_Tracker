import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from './api'
import SyncManager from './SyncManager'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DailyLog from './pages/DailyLog'
import Timeline from './pages/Timeline'
import Chapters from './pages/Chapters'
import RelationshipGraph from './pages/RelationshipGraph'

export default function App() {
    const [user, setUser] = useState(api.getUser());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verify token on mount
        const token = api.getToken();
        if (token) {
            api.getMe()
                .then(u => { setUser(u); api.setUser(u); })
                .catch(() => { api.removeToken(); api.removeUser(); setUser(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const handleLogin = (token, userData) => {
        api.setToken(token);
        api.setUser(userData);
        setUser(userData);
    };

    const handleLogout = () => {
        api.removeToken();
        api.removeUser();
        setUser(null);
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0f'
            }}>
                <div className="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        );
    }

    return (
        <SyncManager>
            <Routes>
                <Route path="/login" element={
                    user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
                } />
                <Route path="/register" element={
                    user ? <Navigate to="/" /> : <Register onLogin={handleLogin} />
                } />
                <Route path="/*" element={
                    user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
                } />
            </Routes>
        </SyncManager>
    );
}
