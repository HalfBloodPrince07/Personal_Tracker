import { useState, useEffect } from 'react'
import api from '../api'

export default function ConversationMemory() {
    const [people, setPeople] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [briefs, setBriefs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => { loadPeople(); }, []);

    async function loadPeople() {
        try {
            setLoading(true);
            const data = await api.getPeople();
            setPeople(data || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function selectPerson(person) {
        setSelectedPerson(person);
        setBriefs([]);
        try {
            const data = await api.getConversationBriefs(person.id);
            setBriefs(data || []);
        } catch (e) {
            // No briefs yet, that's fine
        }
    }

    async function handleGenerate() {
        if (!selectedPerson) return;
        setGenerating(true);
        setError('');
        try {
            await api.generateConversationBrief(selectedPerson.id);
            const data = await api.getConversationBriefs(selectedPerson.id);
            setBriefs(data || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setGenerating(false);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const filteredPeople = people.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const latestBrief = briefs.length > 0 ? briefs[0] : null;

    const healthColors = {
        thriving: 'var(--accent-emerald)',
        stable: 'var(--accent-primary)',
        needs_attention: 'var(--accent-amber)',
        strained: 'var(--accent-rose)',
    };

    return (
        <div>
            <div className="page-header">
                <h1>Conversation Memory</h1>
                <div className="header-actions">
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                        AI-generated pre-meeting briefs
                    </span>
                </div>
            </div>

            <div className="page-content">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="convo-layout">
                    <div className="convo-people-panel">
                        <input
                            className="form-input"
                            placeholder="Search people..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ marginBottom: 'var(--space-md)' }}
                        />
                        <div className="convo-people-list">
                            {loading ? (
                                <div className="loading-dots"><span></span><span></span><span></span></div>
                            ) : filteredPeople.length === 0 ? (
                                <div style={{ color: 'var(--text-tertiary)', padding: 'var(--space-md)', textAlign: 'center' }}>
                                    No people found
                                </div>
                            ) : filteredPeople.map(p => (
                                <div
                                    key={p.id}
                                    className={`convo-person-item ${selectedPerson?.id === p.id ? 'active' : ''}`}
                                    onClick={() => selectPerson(p)}
                                >
                                    <div className="convo-person-avatar">
                                        {p.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="convo-person-info">
                                        <div className="convo-person-name">{p.name}</div>
                                        <div className="convo-person-type">{p.relationship_type || 'Other'}</div>
                                    </div>
                                    <div className="convo-person-count">{p.interaction_count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="convo-detail-panel">
                        {!selectedPerson ? (
                            <div className="empty-state">
                                <div className="empty-icon">💬</div>
                                <h3>Select a Person</h3>
                                <p>Choose someone from your network to generate a pre-meeting brief.</p>
                            </div>
                        ) : (
                            <>
                                <div className="convo-person-header card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <h2>{selectedPerson.name}</h2>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                                                {selectedPerson.relationship_type || 'Connection'} &middot; Trust: {selectedPerson.trust_level}/10 &middot; {selectedPerson.energy_exchange || 'neutral'}
                                            </div>
                                        </div>
                                        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                                            {generating ? (
                                                <><span className="loading-dots"><span></span><span></span><span></span></span> Generating...</>
                                            ) : 'Generate Brief'}
                                        </button>
                                    </div>
                                </div>

                                {latestBrief ? (
                                    <div className="convo-brief-content">
                                        <div className="card">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                                                <h3>Latest Brief</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                    {latestBrief.relationship_health && (
                                                        <span className="badge" style={{
                                                            background: `${healthColors[latestBrief.relationship_health]}20`,
                                                            color: healthColors[latestBrief.relationship_health]
                                                        }}>
                                                            {latestBrief.relationship_health.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
                                                        {formatDate(latestBrief.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="brief-text">
                                                {latestBrief.brief.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                                            </div>
                                        </div>

                                        {latestBrief.key_topics && latestBrief.key_topics.length > 0 && (
                                            <div className="card">
                                                <h3>Key Topics to Remember</h3>
                                                <div className="topic-pills">
                                                    {latestBrief.key_topics.map((t, i) => (
                                                        <span key={i} className="topic-pill">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {latestBrief.last_interaction_summary && (
                                            <div className="card">
                                                <h3>Last Interaction</h3>
                                                <p style={{ color: 'var(--text-secondary)' }}>{latestBrief.last_interaction_summary}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon">📋</div>
                                        <h3>No Brief Yet</h3>
                                        <p>Generate a pre-meeting brief for {selectedPerson.name}.</p>
                                    </div>
                                )}

                                {briefs.length > 1 && (
                                    <div className="card" style={{ marginTop: 'var(--space-md)' }}>
                                        <h3>Brief History</h3>
                                        <div className="brief-history">
                                            {briefs.slice(1).map(b => (
                                                <div key={b.id} className="brief-history-item">
                                                    <span>{formatDate(b.created_at)}</span>
                                                    <span className="badge" style={{
                                                        background: `${healthColors[b.relationship_health] || 'var(--accent-primary)'}20`,
                                                        color: healthColors[b.relationship_health] || 'var(--accent-primary)'
                                                    }}>
                                                        {b.relationship_health || 'stable'}
                                                    </span>
                                                    <span style={{ color: 'var(--text-tertiary)' }}>{b.brief.slice(0, 80)}...</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
