import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function Register({ onLogin }) {
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const data = await api.register({
                username: form.username,
                email: form.email,
                password: form.password,
                display_name: form.username,
            });
            onLogin(data.access_token, data.user);
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="logo-icon">🧠</div>
                <h1>Create Account</h1>
                <p className="subtitle">Start building your Personal Life Intelligence</p>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="reg-username">Username</label>
                        <input id="reg-username" type="text" className="form-input" placeholder="Choose a username"
                            value={form.username} onChange={e => update('username', e.target.value)} required autoFocus />
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-email">Email</label>
                        <input id="reg-email" type="email" className="form-input" placeholder="your@email.com"
                            value={form.email} onChange={e => update('email', e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-password">Password</label>
                        <input id="reg-password" type="password" className="form-input" placeholder="At least 6 characters"
                            value={form.password} onChange={e => update('password', e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="reg-confirm">Confirm Password</label>
                        <input id="reg-confirm" type="password" className="form-input" placeholder="Confirm your password"
                            value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? <div className="loading-dots"><span></span><span></span><span></span></div> : 'Create Account'}
                        </button>
                    </div>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
