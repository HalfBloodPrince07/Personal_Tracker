import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.login({ username, password });
            onLogin(data.access_token, data.user);
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="logo-icon">🧠</div>
                <h1>Welcome Back</h1>
                <p className="subtitle">Sign in to your Personal Life Intelligence System</p>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            placeholder="Enter your username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <button
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="loading-dots"><span></span><span></span><span></span></div>
                            ) : 'Sign In'}
                        </button>
                    </div>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Create one</Link>
                </p>
            </div>
        </div>
    );
}
