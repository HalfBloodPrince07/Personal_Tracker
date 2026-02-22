import { useState, useEffect, useRef } from 'react'
import api from '../api'
import Modal from '../components/Modal'

const REL_TYPES = ['family', 'friend', 'close friend', 'colleague', 'mentor', 'acquaintance', 'partner', 'other'];
const ENERGY_TYPES = [
    { value: 'energizing', emoji: '⚡', label: 'Energizing', color: 'var(--accent-emerald)' },
    { value: 'neutral', emoji: '😐', label: 'Neutral', color: 'var(--accent-amber)' },
    { value: 'draining', emoji: '🔋', label: 'Draining', color: 'var(--accent-rose)' },
];
const TONE_TYPES = [
    { value: 'positive', emoji: '😊', color: 'var(--accent-emerald)' },
    { value: 'neutral', emoji: '😐', color: 'var(--accent-amber)' },
    { value: 'mixed', emoji: '🤔', color: '#a78bfa' },
    { value: 'negative', emoji: '😔', color: 'var(--accent-rose)' },
];

const EMPTY_FORM = {
    name: '', relationship_type: '', trust_level: 5, energy_exchange: '',
    notes: '', known_since: '', birthday: ''
};

function yearsKnown(dateStr) {
    if (!dateStr) return null;
    const ms = Date.now() - new Date(dateStr).getTime();
    const yrs = ms / (1000 * 60 * 60 * 24 * 365.25);
    if (yrs >= 1) return `${Math.floor(yrs)}y`;
    return `${Math.floor(yrs * 12)}mo`;
}

export default function People() {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editPerson, setEditPerson] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);

    // Side-panel state
    const [panel, setPanel] = useState(null); // { person }
    const [interactions, setInteractions] = useState([]);
    const [intLoading, setIntLoading] = useState(false);
    const [showIntForm, setShowIntForm] = useState(false);
    const [intForm, setIntForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', emotional_tone: 'positive', context: 'social' });

    // NLP state
    const [showNLP, setShowNLP] = useState(false);
    const [nlpText, setNlpText] = useState('');
    const [nlpLoading, setNlpLoading] = useState(false);
    const [nlpResult, setNlpResult] = useState(null);
    const [nlpError, setNlpError] = useState('');

    useEffect(() => { loadPeople(); }, []);

    const loadPeople = async () => {
        setLoading(true);
        try {
            const data = await api.getPeople();
            setPeople(data);
            try { localStorage.setItem('plis_people_cache', JSON.stringify(data)); } catch {}
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadInteractions = async (personId) => {
        setIntLoading(true);
        try { setInteractions(await api.getInteractions(personId)); }
        catch (err) { console.error(err); }
        finally { setIntLoading(false); }
    };

    const openPanel = (p) => {
        setPanel(p);
        setShowIntForm(false);
        setIntForm({ date: new Date().toISOString().split('T')[0], description: '', emotional_tone: 'positive', context: 'social' });
        loadInteractions(p.id);
    };

    const closePanel = () => { setPanel(null); setInteractions([]); };

    const openCreate = () => { setEditPerson(null); setForm(EMPTY_FORM); setShowModal(true); };
    const openEdit = (p) => {
        setEditPerson(p);
        setForm({
            name: p.name, relationship_type: p.relationship_type || '',
            trust_level: p.trust_level, energy_exchange: p.energy_exchange || '',
            notes: p.notes || '', known_since: p.known_since || '', birthday: p.birthday || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const data = { ...form };
            if (!data.relationship_type) delete data.relationship_type;
            if (!data.energy_exchange) delete data.energy_exchange;
            if (!data.known_since) delete data.known_since;
            if (!data.birthday) delete data.birthday;
            if (editPerson) { await api.updatePerson(editPerson.id, data); }
            else { await api.createPerson(data); }
            loadPeople();
            setShowModal(false);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id, e) => {
        e?.stopPropagation();
        if (!confirm('Remove this person from your network?')) return;
        try { await api.deletePerson(id); loadPeople(); if (panel?.id === id) closePanel(); }
        catch (err) { console.error(err); }
    };

    const handleLogInteraction = async () => {
        try {
            await api.createInteraction({ ...intForm, person_id: panel.id });
            loadInteractions(panel.id);
            // Refresh person interaction count
            loadPeople();
            setShowIntForm(false);
            setIntForm({ date: new Date().toISOString().split('T')[0], description: '', emotional_tone: 'positive', context: 'social' });
        } catch (err) { console.error(err); }
    };

    const handleDeleteInteraction = async (id) => {
        if (!confirm('Delete this interaction?')) return;
        try { await api.deleteInteraction(id); loadInteractions(panel.id); loadPeople(); }
        catch (err) { console.error(err); }
    };

    const handleNLP = async () => {
        if (!nlpText.trim()) return;
        setNlpLoading(true); setNlpError(''); setNlpResult(null);
        try {
            const res = await api.nlpPerson(nlpText);
            setNlpResult(res);
            loadPeople();
        } catch (err) {
            setNlpError(err.message || 'LLM parsing failed');
        } finally { setNlpLoading(false); }
    };

    const trustColor = (lvl) => lvl >= 7 ? 'var(--accent-emerald)' : lvl >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)';

    const filteredPeople = people.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.relationship_type || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = {};
    filteredPeople.forEach(p => {
        const type = p.relationship_type || 'Other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(p);
    });

    return (
        <>
            <div className="page-header">
                <h1>👥 People</h1>
                <div className="header-actions">
                    <input className="form-input" placeholder="Search people..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)} style={{ width: '200px' }} />
                    <button className="btn btn-secondary" onClick={() => { setShowNLP(true); setNlpText(''); setNlpResult(null); setNlpError(''); }}>✨ Describe Person</button>
                    <button className="btn btn-primary" onClick={openCreate}>+ Add Person</button>
                </div>
            </div>

            <div className="page-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}><div className="loading-dots"><span /><span /><span /></div></div>
                ) : people.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h3>No people in your network yet</h3>
                        <p>Add people manually or describe them in natural language</p>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setShowNLP(true)}>✨ Describe a Person</button>
                            <button className="btn btn-primary" onClick={openCreate}>+ Add Manually</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {Object.entries(grouped).map(([type, ppl]) => (
                            <div key={type} className="fade-in" style={{ marginBottom: 'var(--space-xl)' }}>
                                <h3 style={{ fontSize: 'var(--font-md)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', textTransform: 'capitalize' }}>
                                    {type} ({ppl.length})
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                                    {ppl.map(person => (
                                        <div key={person.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openPanel(person)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                                <div className="user-avatar" style={{ width: '44px', height: '44px', fontSize: 'var(--font-md)' }}>
                                                    {person.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>{person.name}</div>
                                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                                        {person.relationship_type || 'No type set'}
                                                        {person.known_since && <span> · Known {yearsKnown(person.known_since)}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(person); }} style={{ padding: '4px 8px', opacity: 0.7 }}>✏️</button>
                                                    <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(person.id, e)} style={{ padding: '4px 8px', opacity: 0.6 }}>🗑</button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-tertiary)' }}>Trust: </span>
                                                    <span style={{ fontWeight: 700, color: trustColor(person.trust_level) }}>{person.trust_level}/10</span>
                                                </div>
                                                {person.energy_exchange && (
                                                    <span style={{ color: ENERGY_TYPES.find(e => e.value === person.energy_exchange)?.color }}>
                                                        {ENERGY_TYPES.find(e => e.value === person.energy_exchange)?.emoji} {person.energy_exchange}
                                                    </span>
                                                )}
                                                <span style={{ color: 'var(--text-tertiary)' }}>{person.interaction_count} interactions</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Detail Side Panel ─────────────────────────────────────────── */}
            {panel && (
                <>
                    <div onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
                    <div style={{
                        position: 'fixed', right: 0, top: 0, bottom: 0, width: '420px', maxWidth: '95vw',
                        background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', zIndex: 201,
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        {/* Panel Header */}
                        <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <div className="user-avatar" style={{ width: '52px', height: '52px', fontSize: 'var(--font-lg)', flexShrink: 0 }}>
                                {panel.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{panel.name}</div>
                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                    {panel.relationship_type || 'Unknown'}
                                    {panel.known_since && ` · Known since ${new Date(panel.known_since).getFullYear()}`}
                                    {panel.birthday && ` · 🎂 ${new Date(panel.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(panel)}>✏️</button>
                                <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 'var(--font-lg)' }}>✕</button>
                            </div>
                        </div>

                        {/* Stats strip */}
                        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
                            {[
                                { label: 'Trust', value: `${panel.trust_level}/10`, color: trustColor(panel.trust_level) },
                                { label: 'Energy', value: ENERGY_TYPES.find(e => e.value === panel.energy_exchange)?.emoji || '—', color: 'var(--text-primary)' },
                                { label: 'Interactions', value: panel.interaction_count, color: 'var(--accent-indigo)' },
                            ].map(s => (
                                <div key={s.label} style={{ flex: 1, padding: 'var(--space-md)', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {panel.notes && (
                            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                "{panel.notes}"
                            </div>
                        )}

                        {/* Interactions list */}
                        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                <h4 style={{ margin: 0, fontSize: 'var(--font-sm)' }}>📅 Interaction Log</h4>
                                <button className="btn btn-primary btn-sm" style={{ fontSize: 'var(--font-xs)', padding: '6px 12px' }}
                                    onClick={() => setShowIntForm(v => !v)}>
                                    {showIntForm ? '✕ Cancel' : '+ Log Interaction'}
                                </button>
                            </div>

                            {showIntForm && (
                                <div className="card fade-in" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
                                    <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                        <label style={{ fontSize: 'var(--font-xs)' }}>Date</label>
                                        <input type="date" className="form-input" value={intForm.date}
                                            onChange={e => setIntForm({ ...intForm, date: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                        <label style={{ fontSize: 'var(--font-xs)' }}>Context</label>
                                        <select className="form-input" value={intForm.context} onChange={e => setIntForm({ ...intForm, context: e.target.value })}>
                                            {['social', 'work', 'family', 'call', 'message', 'online', 'other'].map(c =>
                                                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                        <label style={{ fontSize: 'var(--font-xs)' }}>Tone</label>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            {TONE_TYPES.map(t => (
                                                <button key={t.value} className={`tag ${intForm.emotional_tone === t.value ? 'selected' : ''}`}
                                                    onClick={() => setIntForm({ ...intForm, emotional_tone: t.value })}
                                                    style={intForm.emotional_tone === t.value ? { borderColor: t.color, color: t.color, background: t.color + '20' } : {}}>
                                                    {t.emoji} {t.value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                                        <label style={{ fontSize: 'var(--font-xs)' }}>Notes</label>
                                        <textarea className="form-input" rows={2} placeholder="What happened? How was it?"
                                            value={intForm.description} onChange={e => setIntForm({ ...intForm, description: e.target.value })} />
                                    </div>
                                    <button className="btn btn-primary" style={{ width: '100%', fontSize: 'var(--font-sm)' }} onClick={handleLogInteraction}>
                                        Save Interaction
                                    </button>
                                </div>
                            )}

                            {intLoading ? (
                                <div style={{ textAlign: 'center', padding: '24px' }}><div className="loading-dots"><span /><span /><span /></div></div>
                            ) : interactions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
                                    No interactions logged yet. Tap "+ Log Interaction" to start!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    {interactions.map(i => {
                                        const tone = TONE_TYPES.find(t => t.value === i.emotional_tone);
                                        return (
                                            <div key={i.id} className="card" style={{ padding: 'var(--space-md)', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: 'var(--font-xs)' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                        {new Date(i.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        {tone && <span style={{ color: tone.color }}>{tone.emoji}</span>}
                                                        {i.context && <span className="tag" style={{ padding: '1px 6px', fontSize: '10px' }}>{i.context}</span>}
                                                        <button onClick={() => handleDeleteInteraction(i.id)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', fontSize: '12px', padding: 0, opacity: 0.6 }}>🗑</button>
                                                    </div>
                                                </div>
                                                {i.description && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{i.description}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ─── Manual Add/Edit Modal ──────────────────────────────────────── */}
            {showModal && (
                <Modal title={editPerson ? `Edit: ${editPerson.name}` : 'Add Person'} onClose={() => setShowModal(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>{editPerson ? 'Save' : 'Add Person'}</button></>}>
                    <div className="form-group">
                        <label>Name *</label>
                        <input className="form-input" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Relationship Type</label>
                        <select className="form-input" value={form.relationship_type} onChange={e => setForm({ ...form, relationship_type: e.target.value })}>
                            <option value="">Select...</option>
                            {REL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label>Known Since</label>
                            <input type="date" className="form-input" value={form.known_since} onChange={e => setForm({ ...form, known_since: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Birthday</label>
                            <input type="date" className="form-input" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Trust Level</label>
                        <div className="slider-group">
                            <input type="range" min="1" max="10" value={form.trust_level}
                                onChange={e => setForm({ ...form, trust_level: parseInt(e.target.value) })} />
                            <span className="slider-value">{form.trust_level}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Energy Exchange</label>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            {ENERGY_TYPES.map(e => (
                                <button key={e.value} className={`tag ${form.energy_exchange === e.value ? 'selected' : ''}`}
                                    onClick={() => setForm({ ...form, energy_exchange: form.energy_exchange === e.value ? '' : e.value })}
                                    style={form.energy_exchange === e.value ? { borderColor: e.color, color: e.color, background: e.color + '20' } : {}}>
                                    {e.emoji} {e.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <textarea className="form-input" placeholder="Personal notes about this person..." value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
                    </div>
                </Modal>
            )}

            {/* ─── NLP Describe Modal ─────────────────────────────────────────── */}
            {showNLP && (
                <Modal title="✨ Describe a Person" onClose={() => setShowNLP(false)}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setShowNLP(false)}>Close</button>
                        {!nlpResult && <button className="btn btn-primary" onClick={handleNLP} disabled={nlpLoading || !nlpText.trim()}>
                            {nlpLoading ? '🧠 Analysing...' : '✨ Parse & Add'}
                        </button>}
                    </>}>
                    {!nlpResult ? (
                        <>
                            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                                Describe a person in natural language — the AI will extract their profile.
                            </p>
                            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                                💡 Example: <em>"John is my best friend from college, known him since 2018. He's super energising, really trust him — like 9 out of 10. His birthday is March 5th. Works in finance now."</em>
                            </div>
                            <textarea className="form-input" rows={5}
                                placeholder="Tell me about this person..."
                                value={nlpText} onChange={e => setNlpText(e.target.value)} />
                            {nlpError && <p style={{ color: 'var(--accent-rose)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-sm)' }}>⚠️ {nlpError}</p>}
                        </>
                    ) : (
                        <div className="fade-in">
                            <div style={{ background: 'var(--accent-emerald)20', border: '1px solid var(--accent-emerald)', borderRadius: 'var(--radius)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <div style={{ color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>✅ Person {nlpResult.action}!</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', fontSize: 'var(--font-sm)' }}>
                                {Object.entries(nlpResult.parsed).map(([k, v]) => (
                                    <div key={k} style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)', marginBottom: '2px', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</div>
                                        <div style={{ fontWeight: 600 }}>{String(v)}</div>
                                    </div>
                                ))}
                            </div>
                            <button className="btn btn-secondary" style={{ marginTop: 'var(--space-md)', width: '100%' }}
                                onClick={() => { setNlpText(''); setNlpResult(null); }}>
                                + Add Another Person
                            </button>
                        </div>
                    )}
                </Modal>
            )}
        </>
    );
}
