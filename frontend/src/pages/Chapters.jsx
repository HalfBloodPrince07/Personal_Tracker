import { useState, useEffect } from 'react'
import api from '../api'

const MOOD_COLORS = {
    positive: { bg: '#10b98118', border: '#10b981', text: '#10b981', icon: '☀️' },
    challenging: { bg: '#ef444418', border: '#ef4444', text: '#ef4444', icon: '🔥' },
    transformative: { bg: '#8b5cf618', border: '#8b5cf6', text: '#8b5cf6', icon: '🦋' },
    neutral: { bg: '#6b728018', border: '#6b7280', text: '#6b7280', icon: '🌤️' },
    mixed: { bg: '#f59e0b18', border: '#f59e0b', text: '#f59e0b', icon: '🌦️' },
};

export default function Chapters() {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedIdx, setExpandedIdx] = useState(null);

    useEffect(() => { loadChapters(); }, []);

    const loadChapters = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getChapters();
            setChapters(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to generate chapters. Is LM Studio running?');
        } finally { setLoading(false); }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Present';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <>
            <div className="page-header">
                <h1>📖 Life Chapters</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={loadChapters} disabled={loading}>
                        {loading ? '🧠 Analyzing...' : '✨ Generate Chapters'}
                    </button>
                </div>
            </div>

            <div className="page-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <div className="loading-dots" style={{ marginBottom: '20px' }}><span /><span /><span /></div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                            🧠 AI is analyzing your timeline and clustering life chapters...
                        </p>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)', marginTop: '8px' }}>
                            This may take a moment depending on your timeline size.
                        </p>
                    </div>
                ) : error ? (
                    <div className="empty-state">
                        <div className="empty-icon">⚠️</div>
                        <h3>Couldn't generate chapters</h3>
                        <p style={{ color: 'var(--accent-rose)' }}>{error}</p>
                        <button className="btn btn-primary" onClick={loadChapters} style={{ marginTop: '16px' }}>
                            Try Again
                        </button>
                    </div>
                ) : chapters.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📖</div>
                        <h3>No chapters yet</h3>
                        <p>Start logging daily entries to let the AI discover the chapters of your life story.</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        {/* Connecting line */}
                        <div style={{
                            position: 'absolute', left: '32px', top: '40px', bottom: '40px',
                            width: '3px',
                            background: 'linear-gradient(to bottom, #6366f1, #a78bfa, #ec4899, #f59e0b, #10b981)',
                            borderRadius: '4px', opacity: 0.4,
                        }} />

                        {chapters.map((ch, idx) => {
                            const mood = MOOD_COLORS[ch.mood] || MOOD_COLORS.neutral;
                            const isExpanded = expandedIdx === idx;
                            return (
                                <div key={idx} className="fade-in" style={{
                                    display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)',
                                    alignItems: 'flex-start',
                                    animationDelay: `${idx * 0.1}s`,
                                }}>
                                    {/* Chapter number circle */}
                                    <div style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${mood.border}, ${mood.border}80)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 800, fontSize: '22px',
                                        flexShrink: 0, zIndex: 2,
                                        boxShadow: `0 0 20px ${mood.border}30`,
                                    }}>
                                        {mood.icon}
                                    </div>

                                    {/* Chapter card */}
                                    <div
                                        className="card"
                                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                        style={{
                                            flex: 1, cursor: 'pointer',
                                            borderLeft: `4px solid ${mood.border}`,
                                            transition: 'all 0.3s ease',
                                            background: isExpanded ? mood.bg : undefined,
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{
                                                    fontSize: 'var(--font-xs)', color: mood.text,
                                                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
                                                    marginBottom: '4px',
                                                }}>
                                                    Chapter {idx + 1}
                                                </div>
                                                <h3 style={{
                                                    margin: 0, fontSize: 'var(--font-lg)',
                                                    fontWeight: 700, color: 'var(--text-primary)',
                                                    lineHeight: 1.3,
                                                }}>
                                                    {ch.title}
                                                </h3>
                                            </div>
                                            <span style={{
                                                fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)',
                                                whiteSpace: 'nowrap', flexShrink: 0,
                                                background: 'var(--bg-tertiary)', padding: '4px 10px',
                                                borderRadius: 'var(--radius-sm)',
                                            }}>
                                                {formatDate(ch.start_date)} — {formatDate(ch.end_date)}
                                            </span>
                                        </div>

                                        <p style={{
                                            fontSize: 'var(--font-sm)', color: 'var(--text-secondary)',
                                            margin: '8px 0 12px', lineHeight: 1.6,
                                        }}>
                                            {ch.summary}
                                        </p>

                                        {/* Themes */}
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {(ch.themes || []).map(theme => (
                                                <span key={theme} className="tag" style={{
                                                    fontSize: '11px', padding: '2px 10px',
                                                    borderColor: mood.border + '40',
                                                    color: mood.text, textTransform: 'capitalize',
                                                }}>
                                                    {theme}
                                                </span>
                                            ))}
                                            <span style={{
                                                fontSize: '11px', padding: '2px 10px', borderRadius: '12px',
                                                background: mood.bg, color: mood.text,
                                                border: `1px solid ${mood.border}40`,
                                                textTransform: 'capitalize',
                                            }}>
                                                {mood.icon} {ch.mood}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
