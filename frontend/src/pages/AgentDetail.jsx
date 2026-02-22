import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

const AGENT_META = {
    behavioral: { icon: '🔄', name: 'Behavioral Agent', color: '#6366f1' },
    psychological: { icon: '🧠', name: 'Psychological Agent', color: '#ec4899' },
    financial: { icon: '💰', name: 'Financial Agent', color: '#10b981' },
    relationship: { icon: '💞', name: 'Relationship Agent', color: '#f43f5e' },
    decision_audit: { icon: '⚖️', name: 'Decision Audit Agent', color: '#f59e0b' },
    predictive: { icon: '🔮', name: 'Predictive Agent', color: '#8b5cf6' },
    contradiction: { icon: '⚡', name: 'Contradiction Agent', color: '#0ea5e9' },
    life_pattern: { icon: '🌊', name: 'Life Pattern Agent', color: '#14b8a6' },
};

export default function AgentDetail() {
    const { agentType } = useParams();
    const navigate = useNavigate();
    const [insights, setInsights] = useState([]);
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const meta = AGENT_META[agentType] || { icon: '🤖', name: agentType, color: '#6366f1' };

    useEffect(() => {
        loadInsights();
    }, [agentType]);

    async function loadInsights() {
        try {
            setLoading(true);
            const data = await api.getAgentInsights(agentType, 20);
            setInsights(data || []);
            if (data && data.length > 0) setSelectedInsight(data[0]);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRun() {
        setRunning(true);
        setError('');
        try {
            await api.runAgent(agentType, dateRange.start || null, dateRange.end || null);
            await loadInsights();
        } catch (e) {
            setError(e.message);
        } finally {
            setRunning(false);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function renderData(data) {
        if (!data || Object.keys(data).length === 0) return null;

        const renderValue = (val) => {
            if (Array.isArray(val)) {
                return (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        {val.map((v, i) => (
                            <li key={i} style={{ marginBottom: '0.25rem' }}>
                                {renderValue(v)}
                            </li>
                        ))}
                    </ul>
                );
            }
            if (val !== null && typeof val === 'object') {
                return (
                    <div style={{ marginLeft: '0.5rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '0.5rem' }}>
                        {Object.entries(val).map(([k, v]) => (
                            <div key={k} style={{ marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}: </span>
                                {renderValue(v)}
                            </div>
                        ))}
                    </div>
                );
            }
            return String(val);
        };

        return (
            <div className="insight-data-grid">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="insight-data-item" style={{ breakInside: 'avoid', marginBottom: '1rem' }}>
                        <div className="data-key" style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                            {key.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="data-value" style={{ fontSize: '0.9rem' }}>
                            {renderValue(value)}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/agents')}>← Back</button>
                    <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                    <h1>{meta.name}</h1>
                </div>
                <div className="header-actions">
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 140 }}
                        value={dateRange.start}
                        onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
                        placeholder="Start"
                    />
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 140 }}
                        value={dateRange.end}
                        onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                        placeholder="End"
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleRun}
                        disabled={running}
                        style={{ background: meta.color }}
                    >
                        {running ? (
                            <><span className="loading-dots"><span></span><span></span><span></span></span> Analyzing...</>
                        ) : 'Run Analysis'}
                    </button>
                </div>
            </div>

            <div className="page-content">
                {error && <div className="alert alert-error">{error}</div>}

                {loading ? (
                    <div className="empty-state"><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : insights.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">{meta.icon}</div>
                        <h3>No Insights Yet</h3>
                        <p>Run the {meta.name} to generate your first analysis.</p>
                        <button className="btn btn-primary" onClick={handleRun} disabled={running} style={{ background: meta.color }}>
                            Run First Analysis
                        </button>
                    </div>
                ) : (
                    <div className="insight-layout">
                        <div className="insight-sidebar">
                            <h3>Insights History</h3>
                            <div className="insight-list">
                                {insights.map(ins => (
                                    <div
                                        key={ins.id}
                                        className={`insight-list-item ${selectedInsight?.id === ins.id ? 'active' : ''}`}
                                        onClick={() => setSelectedInsight(ins)}
                                    >
                                        <div className="insight-list-title">{ins.title || 'Untitled'}</div>
                                        <div className="insight-list-meta">
                                            <span className={`badge badge-${ins.severity || 'info'}`}>
                                                {ins.severity || 'info'}
                                            </span>
                                            <span>{formatDate(ins.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedInsight && (
                            <div className="insight-detail">
                                <div className="card insight-header-card" style={{ borderLeftColor: meta.color, borderLeftWidth: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <h2>{selectedInsight.title}</h2>
                                        <span className={`badge badge-${selectedInsight.severity || 'info'}`}>
                                            {selectedInsight.severity || 'info'}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-xs)' }}>
                                        {selectedInsight.date_range_start && selectedInsight.date_range_end
                                            ? `${formatDate(selectedInsight.date_range_start)} — ${formatDate(selectedInsight.date_range_end)}`
                                            : formatDate(selectedInsight.created_at)}
                                    </div>
                                </div>

                                <div className="card insight-content-card">
                                    <h3>Analysis</h3>
                                    <div className="insight-content-text">
                                        {selectedInsight.content.split('\n').map((p, i) => (
                                            <p key={i}>{p}</p>
                                        ))}
                                    </div>
                                </div>

                                {selectedInsight.data && Object.keys(selectedInsight.data).length > 0 && (
                                    <div className="card insight-content-card">
                                        <h3>Data & Metrics</h3>
                                        {renderData(selectedInsight.data)}
                                    </div>
                                )}

                                {selectedInsight.tags && selectedInsight.tags.length > 0 && (
                                    <div className="insight-tags">
                                        {selectedInsight.tags.map((t, i) => (
                                            <span key={i} className="tag selected">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
