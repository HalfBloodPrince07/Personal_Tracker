import { useState, useEffect } from 'react'
import api from '../api'

const TYPE_COLORS = {
    family: '#f43f5e',
    partner: '#ec4899',
    close_friend: '#8b5cf6',
    friend: '#3b82f6',
    colleague: '#06b6d4',
    mentor: '#10b981',
    acquaintance: '#6b7280',
    other: '#a78bfa',
};

function classifyType(type) {
    if (!type) return 'other';
    const t = type.toLowerCase();
    if (['mother', 'father', 'brother', 'sister', 'parent', 'family', 'mummy', 'dad', 'mom'].some(k => t.includes(k))) return 'family';
    if (['girlfriend', 'boyfriend', 'partner', 'wife', 'husband', 'ex-girlfriend', 'ex-boyfriend', 'ex'].some(k => t.includes(k))) return 'partner';
    if (['best friend', 'very good friend', 'close friend', 'roommate'].some(k => t.includes(k))) return 'close_friend';
    if (['colleague', 'manager', 'teammate', 'flatmate', 'coworker'].some(k => t.includes(k))) return 'colleague';
    if (t.includes('mentor')) return 'mentor';
    if (['former', 'acquaintance'].some(k => t.includes(k))) return 'acquaintance';
    if (t.includes('friend')) return 'friend';
    return 'other';
}

const CATEGORY_LABELS = {
    family: 'Family',
    partner: 'Partner',
    close_friend: 'Close Friend',
    friend: 'Friend',
    colleague: 'Colleague',
    mentor: 'Mentor',
    acquaintance: 'Acquaintance',
    other: 'Other',
};

export default function PeopleInLife() {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [birthYear] = useState(2000);

    useEffect(() => { loadPeople(); }, []);

    const loadPeople = async () => {
        setLoading(true);
        try {
            const data = await api.getPeople();
            setPeople(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Build year-by-year data
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = birthYear; y <= currentYear; y++) {
        years.push(y);
    }

    // For each year, determine who was NEW that year and cumulative list
    const yearData = years.map(year => {
        const newPeople = people.filter(p => {
            if (!p.known_since) return false;
            const knownYear = new Date(p.known_since + 'T00:00:00').getFullYear();
            return knownYear === year;
        });
        const cumulativePeople = people.filter(p => {
            if (!p.known_since) return year === currentYear; // show unknowns at current year
            const knownYear = new Date(p.known_since + 'T00:00:00').getFullYear();
            return knownYear <= year;
        });
        return { year, newPeople, cumulativePeople, totalCount: cumulativePeople.length };
    });

    // Only show years with at least 1 person
    const activeYears = yearData.filter(yd => yd.totalCount > 0 || yd.newPeople.length > 0);

    // Age calculation
    const getAge = (year) => year - birthYear;

    return (
        <>
            <div className="page-header">
                <h1>🧑‍🤝‍🧑 People in Life</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={loadPeople}>↻ Refresh</button>
                </div>
            </div>

            <div className="page-content">
                {/* Legend */}
                <div style={{
                    display: 'flex', gap: '12px', flexWrap: 'wrap',
                    marginBottom: 'var(--space-lg)', padding: 'var(--space-md)',
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                }}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: TYPE_COLORS[key], flexShrink: 0 }} />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div className="loading-dots"><span /><span /><span /></div>
                    </div>
                ) : people.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🧑‍🤝‍🧑</div>
                        <h3>No people added yet</h3>
                        <p>Add people from the People page to see your life network grow year by year.</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        {/* Vertical timeline line */}
                        <div style={{
                            position: 'absolute', left: '60px', top: 0, bottom: 0,
                            width: '3px',
                            background: 'linear-gradient(to bottom, #6366f1, #a78bfa, #ec4899, #6366f1)',
                            opacity: 0.4,
                        }} />

                        {activeYears.map((yd, idx) => (
                            <div key={yd.year} style={{ marginBottom: '32px', position: 'relative' }}>
                                {/* Year marker */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                                    marginBottom: 'var(--space-sm)',
                                }}>
                                    {/* Year bubble */}
                                    <div style={{
                                        width: '120px', minWidth: '120px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: '8px',
                                    }}>
                                        <div style={{
                                            width: '46px', height: '46px', borderRadius: '50%',
                                            background: yd.newPeople.length > 0
                                                ? 'linear-gradient(135deg, #6366f1, #a78bfa)'
                                                : 'rgba(99, 102, 241, 0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700, fontSize: '14px',
                                            border: yd.newPeople.length > 0 ? '2px solid #a78bfa' : '2px solid rgba(99,102,241,0.3)',
                                            flexShrink: 0, zIndex: 2, position: 'relative',
                                            boxShadow: yd.newPeople.length > 0 ? '0 0 20px rgba(99,102,241,0.3)' : 'none',
                                        }}>
                                            {yd.year}
                                        </div>
                                    </div>

                                    {/* Year info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'baseline', gap: '10px',
                                        }}>
                                            <span style={{
                                                fontSize: '11px', color: 'var(--text-tertiary)',
                                                background: 'rgba(99,102,241,0.1)', padding: '2px 8px',
                                                borderRadius: '10px',
                                            }}>
                                                Age {getAge(yd.year)}
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                {yd.totalCount} {yd.totalCount === 1 ? 'person' : 'people'} in your life
                                            </span>
                                            {yd.newPeople.length > 0 && (
                                                <span style={{
                                                    fontSize: '11px', color: '#10b981',
                                                    background: '#10b98115', padding: '2px 8px',
                                                    borderRadius: '10px', fontWeight: 600,
                                                }}>
                                                    +{yd.newPeople.length} new
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* New people cards for this year */}
                                {yd.newPeople.length > 0 && (
                                    <div style={{
                                        marginLeft: '130px',
                                        display: 'flex', gap: '10px', flexWrap: 'wrap',
                                    }}>
                                        {yd.newPeople.map(p => {
                                            const cat = classifyType(p.relationship_type);
                                            const color = TYPE_COLORS[cat];
                                            return (
                                                <div key={p.id} style={{
                                                    background: 'var(--bg-secondary)',
                                                    border: `1px solid ${color}30`,
                                                    borderLeft: `3px solid ${color}`,
                                                    borderRadius: 'var(--radius)',
                                                    padding: '10px 14px',
                                                    minWidth: '180px', maxWidth: '280px',
                                                    transition: 'all 0.2s ease',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: color, display: 'flex',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            color: 'white', fontWeight: 700, fontSize: '13px',
                                                            flexShrink: 0,
                                                        }}>
                                                            {p.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                                                {p.name}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '11px', color: color,
                                                                textTransform: 'capitalize',
                                                            }}>
                                                                {p.relationship_type || 'Other'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Trust & energy indicators */}
                                                    <div style={{
                                                        display: 'flex', gap: '8px', marginTop: '6px',
                                                        fontSize: '10px', color: 'var(--text-tertiary)',
                                                    }}>
                                                        <span>Trust: <b style={{
                                                            color: p.trust_level >= 7 ? '#10b981' : p.trust_level >= 4 ? '#f59e0b' : '#ef4444'
                                                        }}>{p.trust_level}/10</b></span>
                                                        {p.energy_exchange && (
                                                            <span style={{
                                                                color: p.energy_exchange === 'energizing' ? '#10b981' :
                                                                    p.energy_exchange === 'draining' ? '#ef4444' : '#f59e0b',
                                                                textTransform: 'capitalize',
                                                            }}>
                                                                {p.energy_exchange === 'energizing' ? '⚡' : p.energy_exchange === 'draining' ? '🔋' : '😐'} {p.energy_exchange}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {p.notes && (
                                                        <div style={{
                                                            fontSize: '10px', color: 'var(--text-tertiary)',
                                                            marginTop: '4px', fontStyle: 'italic',
                                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                                            display: '-webkit-box', WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                        }}>
                                                            {p.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Cumulative people dots (small) */}
                                {yd.newPeople.length === 0 && yd.totalCount > 0 && (
                                    <div style={{
                                        marginLeft: '130px',
                                        display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
                                    }}>
                                        {yd.cumulativePeople.map(p => {
                                            const cat = classifyType(p.relationship_type);
                                            const color = TYPE_COLORS[cat];
                                            return (
                                                <div key={p.id} title={`${p.name} (${p.relationship_type})`} style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    background: color + '30', border: `1.5px solid ${color}60`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: color, fontWeight: 700, fontSize: '10px',
                                                    cursor: 'default',
                                                }}>
                                                    {p.name.charAt(0)}
                                                </div>
                                            );
                                        })}
                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                                            — no new connections
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Summary at bottom */}
                        <div style={{
                            marginTop: 'var(--space-lg)', marginLeft: '130px',
                            padding: 'var(--space-md)',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(167,139,250,0.08))',
                            borderRadius: 'var(--radius)', border: '1px solid rgba(99,102,241,0.15)',
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                📊 Network Summary
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <span><b style={{ color: '#6366f1' }}>{people.length}</b> total people</span>
                                <span><b style={{ color: '#f43f5e' }}>{people.filter(p => classifyType(p.relationship_type) === 'family').length}</b> family</span>
                                <span><b style={{ color: '#3b82f6' }}>{people.filter(p => ['friend', 'close_friend'].includes(classifyType(p.relationship_type))).length}</b> friends</span>
                                <span><b style={{ color: '#06b6d4' }}>{people.filter(p => classifyType(p.relationship_type) === 'colleague').length}</b> colleagues</span>
                                <span><b style={{ color: '#ec4899' }}>{people.filter(p => classifyType(p.relationship_type) === 'partner').length}</b> partners</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
