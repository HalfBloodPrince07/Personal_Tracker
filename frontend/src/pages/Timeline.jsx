import { useState, useEffect, useRef } from 'react'
import api from '../api'

const TYPE_CONFIG = {
    daily_log: { emoji: '📝', color: '#6366f1', label: 'Daily Log' },
    goal: { emoji: '🎯', color: '#10b981', label: 'Goal' },
    decision: { emoji: '⚖️', color: '#f59e0b', label: 'Decision' },
    project: { emoji: '🚀', color: '#3b82f6', label: 'Project' },
    interaction: { emoji: '💬', color: '#ec4899', label: 'Interaction' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function groupByMonth(events) {
    const groups = {};
    events.forEach(ev => {
        const d = new Date(ev.date + 'T00:00:00');
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        if (!groups[key]) groups[key] = { key, label, events: [] };
        groups[key].events.push(ev);
    });
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
}

export default function Timeline() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        daily_log: true, goal: true, decision: true, project: true, interaction: true,
    });
    const [selectedEvent, setSelectedEvent] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => { loadTimeline(); }, []);

    const loadTimeline = async () => {
        setLoading(true);
        try { setEvents(await api.getTimeline()); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const toggleFilter = (type) => {
        setFilters(f => ({ ...f, [type]: !f[type] }));
    };

    const filteredEvents = events.filter(e => filters[e.type]);
    const grouped = groupByMonth(filteredEvents);

    const scrollToToday = () => {
        const today = new Date().toISOString().split('T')[0].slice(0, 7);
        const el = document.getElementById(`month-${today}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    };

    return (
        <>
            <div className="page-header">
                <h1>📅 Life Timeline</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={scrollToToday}>Today</button>
                    <button className="btn btn-primary" onClick={loadTimeline}>↻ Refresh</button>
                </div>
            </div>

            <div className="page-content">
                {/* Filter toggles */}
                <div style={{
                    display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap',
                    marginBottom: 'var(--space-lg)', padding: 'var(--space-md)',
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', alignSelf: 'center', marginRight: '8px' }}>Filter:</span>
                    {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                        <button
                            key={type}
                            className={`tag ${filters[type] ? 'selected' : ''}`}
                            onClick={() => toggleFilter(type)}
                            style={filters[type] ? {
                                borderColor: cfg.color, color: cfg.color,
                                background: cfg.color + '15',
                            } : { opacity: 0.5 }}
                        >
                            {cfg.emoji} {cfg.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div className="loading-dots"><span /><span /><span /></div>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📅</div>
                        <h3>No timeline events yet</h3>
                        <p>Start logging your days, setting goals, and making decisions to build your timeline.</p>
                    </div>
                ) : (
                    <div ref={scrollRef} style={{ position: 'relative' }}>
                        {/* Vertical timeline line */}
                        <div style={{
                            position: 'absolute', left: '24px', top: 0, bottom: 0,
                            width: '2px', background: 'linear-gradient(to bottom, #6366f1, #a78bfa, #6366f1)',
                            opacity: 0.3,
                        }} />

                        {grouped.map(group => (
                            <div key={group.key} id={`month-${group.key}`} style={{ marginBottom: 'var(--space-xl)' }}>
                                {/* Month header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                                    marginBottom: 'var(--space-md)', position: 'sticky', top: 0,
                                    zIndex: 5, paddingTop: '8px', paddingBottom: '8px',
                                    background: 'var(--bg-primary)',
                                }}>
                                    <div style={{
                                        width: '50px', height: '50px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: 'var(--font-sm)',
                                        flexShrink: 0, zIndex: 2,
                                    }}>
                                        {group.label.split(' ')[0].slice(0, 3)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'var(--text-primary)' }}>{group.label}</div>
                                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                                            {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>

                                {/* Events */}
                                <div style={{ paddingLeft: '60px', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    {group.events.map((ev, idx) => {
                                        const cfg = TYPE_CONFIG[ev.type] || {};
                                        const isSelected = selectedEvent?.id === ev.id && selectedEvent?.type === ev.type;
                                        return (
                                            <div
                                                key={`${ev.type}-${ev.id}`}
                                                className="card fade-in"
                                                onClick={() => setSelectedEvent(isSelected ? null : ev)}
                                                style={{
                                                    cursor: 'pointer', padding: 'var(--space-md)',
                                                    borderLeft: `3px solid ${cfg.color}`,
                                                    background: isSelected ? cfg.color + '10' : undefined,
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '18px' }}>{cfg.emoji}</span>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{ev.title}</div>
                                                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                                                                {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', {
                                                                    weekday: 'short', month: 'short', day: 'numeric'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        {ev.mood && (
                                                            <span style={{
                                                                fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                                                                background: ev.mood >= 7 ? '#10b98120' : ev.mood >= 4 ? '#f59e0b20' : '#ef444420',
                                                                color: ev.mood >= 7 ? '#10b981' : ev.mood >= 4 ? '#f59e0b' : '#ef4444',
                                                            }}>
                                                                Mood: {ev.mood}
                                                            </span>
                                                        )}
                                                        {ev.status && (
                                                            <span className="tag" style={{ fontSize: '10px', padding: '1px 6px', textTransform: 'capitalize' }}>
                                                                {ev.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Always show content */}
                                                {ev.summary && (
                                                    <div style={{
                                                        marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)',
                                                        borderTop: '1px solid var(--border)',
                                                        fontSize: 'var(--font-xs)', color: 'var(--text-secondary)',
                                                    }}>
                                                        {ev.summary}
                                                    </div>
                                                )}
                                                {ev.tags?.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                        {ev.tags.map(t => (
                                                            <span key={t} className="tag" style={{ fontSize: '10px', padding: '1px 6px' }}>#{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {ev.photos?.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                                        {ev.photos.map((url, i) => (
                                                            <img key={i} src={url} alt="" style={{
                                                                width: '80px', height: '80px', objectFit: 'cover',
                                                                borderRadius: '8px', border: '1px solid var(--border)',
                                                            }} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
