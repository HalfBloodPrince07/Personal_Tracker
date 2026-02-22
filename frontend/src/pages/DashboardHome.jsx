import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import api from '../api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function DashboardHome({ user }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.getDashboardSummary()
            .then(setSummary)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="page-content">
                <div className="page-header"><h1>Dashboard</h1></div>
                <div style={{ padding: '48px', textAlign: 'center' }}>
                    <div className="loading-dots"><span></span><span></span><span></span></div>
                </div>
            </div>
        );
    }

    const s = summary || {};
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Mood chart data
    const moodChartData = {
        labels: (s.mood_trend || []).map(d => {
            const dt = new Date(d.date);
            return dt.toLocaleDateString('en-US', { weekday: 'short' });
        }),
        datasets: [
            {
                label: 'Mood',
                data: (s.mood_trend || []).map(d => d.mood),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1',
            },
            {
                label: 'Energy',
                data: (s.mood_trend || []).map(d => d.energy),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981',
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                min: 0, max: 10,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#6b6b80', stepSize: 2 }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#6b6b80' }
            }
        },
        plugins: {
            legend: {
                labels: { color: '#a0a0b5', usePointStyle: true, padding: 20 }
            }
        }
    };

    // Life area labels for quick display
    const areaEmojis = {
        health: '💪', career: '💼', finances: '💰',
        relationships: '❤️', learning: '📚', creativity: '🎨', spirituality: '🧘'
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Good {getGreeting()}, {user?.display_name || user?.username} 👋</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>{today}</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => navigate('/daily-log')}>
                        📝 Log Today
                    </button>
                </div>
            </div>

            <div className="page-content">
                {/* Summary Cards */}
                <div className="summary-grid">
                    <div className="summary-card mood fade-in">
                        <div className="icon-circle">😊</div>
                        <div className="card-value">{s.today_log?.mood_score || '—'}</div>
                        <div className="card-label">Today's Mood</div>
                    </div>

                    <div className="summary-card projects fade-in fade-in-delay-1" onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
                        <div className="icon-circle">🚀</div>
                        <div className="card-value">{s.active_projects}</div>
                        <div className="card-label">Active Projects · {s.pending_tasks} tasks pending</div>
                    </div>

                    <div className="summary-card goals fade-in fade-in-delay-2" onClick={() => navigate('/goals')} style={{ cursor: 'pointer' }}>
                        <div className="icon-circle">⭐</div>
                        <div className="card-value">{s.goals_on_track}/{s.goals_total}</div>
                        <div className="card-label">Goals on Track</div>
                    </div>

                    <div className="summary-card people fade-in fade-in-delay-3" onClick={() => navigate('/people')} style={{ cursor: 'pointer' }}>
                        <div className="icon-circle">👥</div>
                        <div className="card-value">{s.people_count}</div>
                        <div className="card-label">People in Network</div>
                    </div>
                </div>

                {/* Charts & Details */}
                <div className="dashboard-grid">
                    {/* Mood Trend */}
                    <div className="card fade-in">
                        <div className="card-header">
                            <h3>📈 Mood & Energy — Last 7 Days</h3>
                        </div>
                        <div className="chart-container">
                            {(s.mood_trend || []).length > 0 ? (
                                <Line data={moodChartData} options={chartOptions} />
                            ) : (
                                <div className="empty-state" style={{ padding: '32px' }}>
                                    <p>No mood data yet. Start logging your days!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Life Areas Snapshot */}
                    <div className="card fade-in">
                        <div className="card-header">
                            <h3>🎯 Life Areas</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/life-areas')}>View All</button>
                        </div>
                        {Object.keys(s.life_area_scores || {}).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(s.life_area_scores).map(([area, score]) => (
                                    <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{areaEmojis[area] || '📌'}</span>
                                        <span style={{ flex: '0 0 100px', fontSize: 'var(--font-sm)', textTransform: 'capitalize', fontWeight: 500 }}>{area}</span>
                                        <div className="progress-bar" style={{ flex: 1 }}>
                                            <div className="progress-bar-fill" style={{ width: `${score * 10}%`, background: score >= 7 ? 'var(--gradient-emerald)' : score >= 4 ? 'var(--gradient-warm)' : 'linear-gradient(135deg, var(--accent-rose), var(--accent-orange))' }}></div>
                                        </div>
                                        <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'right', color: score >= 7 ? 'var(--accent-emerald)' : score >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{score}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <p>No life area scores yet. Rate your week!</p>
                                <button className="btn btn-primary btn-sm" onClick={() => navigate('/life-areas')}>Score Now</button>
                            </div>
                        )}
                    </div>

                    {/* Recent Decisions */}
                    <div className="card full-width fade-in">
                        <div className="card-header">
                            <h3>⚖️ Recent Decisions</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/decisions')}>View All</button>
                        </div>
                        {(s.recent_decisions || []).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {s.recent_decisions.map(d => (
                                    <div key={d.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-subtle)'
                                    }}>
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)', minWidth: '80px' }}>{d.date}</span>
                                        <span style={{ flex: 1, fontWeight: 500 }}>{d.title}</span>
                                        {d.domain && <span className={`badge badge-${d.domain}`} style={{ textTransform: 'capitalize' }}>{d.domain}</span>}
                                        {d.outcome_score && (
                                            <span style={{ fontWeight: 700, color: d.outcome_score >= 7 ? 'var(--accent-emerald)' : d.outcome_score >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                                                {d.outcome_score}/10
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '24px' }}>
                                <p>No decisions logged yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}
