import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import { getAll, remove } from '../offlineQueue'
import { useSyncStatus } from '../SyncManager'

// ── Constants (reused from other pages) ─────────────────────────────────────
const EMOTIONS = {
    positive: ['Grateful', 'Happy', 'Excited', 'Peaceful', 'Inspired', 'Confident', 'Loved', 'Energized'],
    negative: ['Anxious', 'Stressed', 'Sad', 'Frustrated', 'Lonely', 'Overwhelmed', 'Angry', 'Exhausted'],
    neutral: ['Calm', 'Focused', 'Reflective', 'Nostalgic', 'Curious', 'Indifferent'],
};

const REL_TYPES = ['family', 'friend', 'close friend', 'colleague', 'mentor', 'acquaintance', 'partner', 'other'];

const ENERGY_TYPES = [
    { value: 'energizing', emoji: '⚡', label: 'Energizing', color: 'var(--accent-emerald)' },
    { value: 'neutral',    emoji: '😐', label: 'Neutral',    color: 'var(--accent-amber)' },
    { value: 'draining',   emoji: '🔋', label: 'Draining',   color: 'var(--accent-rose)' },
];

const TONE_TYPES = [
    { value: 'positive', emoji: '😊', color: 'var(--accent-emerald)' },
    { value: 'neutral',  emoji: '😐', color: 'var(--accent-amber)' },
    { value: 'mixed',    emoji: '🤔', color: '#a78bfa' },
    { value: 'negative', emoji: '😔', color: 'var(--accent-rose)' },
];

const CONTEXT_TYPES = ['social', 'work', 'family', 'call', 'message', 'online', 'other'];

const DOMAINS = ['health', 'career', 'finances', 'relationships', 'learning', 'creativity', 'spirituality'];
const DOMAIN_EMOJIS = { health: '💪', career: '💼', finances: '💰', relationships: '❤️', learning: '📚', creativity: '🎨', spirituality: '🧘' };

const LIFE_AREAS = [
    { key: 'health',        label: 'Health',        emoji: '💪', color: '#10b981' },
    { key: 'career',        label: 'Career',        emoji: '💼', color: '#6366f1' },
    { key: 'finances',      label: 'Finances',      emoji: '💰', color: '#f59e0b' },
    { key: 'relationships', label: 'Relationships', emoji: '❤️', color: '#ec4899' },
    { key: 'learning',      label: 'Learning',      emoji: '📚', color: '#0ea5e9' },
    { key: 'creativity',    label: 'Creativity',    emoji: '🎨', color: '#8b5cf6' },
    { key: 'spirituality',  label: 'Spirituality',  emoji: '🧘', color: '#14b8a6' },
];

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#f97316', '#14b8a6'];

const TABS = [
    { id: 'log',         label: 'Daily Log',  icon: '📝' },
    { id: 'person',      label: 'People',     icon: '👥' },
    { id: 'interaction', label: 'Interaction', icon: '🤝' },
    { id: 'decision',    label: 'Decision',   icon: '⚖️' },
    { id: 'goal',        label: 'Goal',       icon: '⭐' },
    { id: 'project',     label: 'Project',    icon: '🚀' },
    { id: 'life-areas',  label: 'Life Areas', icon: '🎯' },
];

function formatDate(d) { return d.toISOString().split('T')[0]; }
function getWeekStart(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay();
    date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    return formatDate(date);
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function OfflineEntry() {
    const { pendingCount, serverReachable } = useSyncStatus();
    const [activeTab, setActiveTab] = useState('log');
    const [flash, setFlash] = useState('');
    const [queue, setQueue] = useState([]);
    const [showQueue, setShowQueue] = useState(true);

    // People cache for Interaction tab
    const [cachedPeople, setCachedPeople] = useState([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('plis_people_cache');
            if (raw) setCachedPeople(JSON.parse(raw));
        } catch {}
    }, []);

    // Queue management
    const refreshQueue = useCallback(async () => {
        try { setQueue(await getAll()); } catch {}
    }, []);
    useEffect(() => { refreshQueue(); }, [refreshQueue]);

    const showFlash = (msg) => {
        setFlash(msg);
        setTimeout(() => setFlash(''), 2500);
    };

    const deleteQueueItem = async (id) => {
        await remove(id);
        refreshQueue();
        window.__plisRefreshPendingCount?.();
    };

    // ── Form States ─────────────────────────────────────────────────────
    // Daily Log
    const [logDate, setLogDate] = useState(formatDate(new Date()));
    const [logContent, setLogContent] = useState('');
    const [logMood, setLogMood] = useState(5);
    const [logEnergy, setLogEnergy] = useState(5);
    const [logEmotions, setLogEmotions] = useState([]);
    const [logHighlights, setLogHighlights] = useState('');
    const [logTags, setLogTags] = useState([]);
    const [logTagInput, setLogTagInput] = useState('');

    // People
    const [personName, setPersonName] = useState('');
    const [personRel, setPersonRel] = useState('');
    const [personTrust, setPersonTrust] = useState(5);
    const [personEnergy, setPersonEnergy] = useState('');
    const [personNotes, setPersonNotes] = useState('');

    // Interaction
    const [intPersonId, setIntPersonId] = useState('');
    const [intDate, setIntDate] = useState(formatDate(new Date()));
    const [intDesc, setIntDesc] = useState('');
    const [intTone, setIntTone] = useState('positive');
    const [intContext, setIntContext] = useState('social');

    // Decision
    const [decTitle, setDecTitle] = useState('');
    const [decDesc, setDecDesc] = useState('');
    const [decDomain, setDecDomain] = useState('');
    const [decDate, setDecDate] = useState(formatDate(new Date()));

    // Goal
    const [goalTitle, setGoalTitle] = useState('');
    const [goalDesc, setGoalDesc] = useState('');
    const [goalDomain, setGoalDomain] = useState('');
    const [goalTarget, setGoalTarget] = useState('');

    // Project
    const [projName, setProjName] = useState('');
    const [projDesc, setProjDesc] = useState('');
    const [projStatus, setProjStatus] = useState('active');
    const [projColor, setProjColor] = useState(PROJECT_COLORS[0]);

    // Life Areas
    const [laWeek, setLaWeek] = useState(getWeekStart());
    const [laScores, setLaScores] = useState({});
    const [laNotes, setLaNotes] = useState({});

    // ── Save Handlers ───────────────────────────────────────────────────
    const saveLog = async () => {
        try {
            const result = await api.createLog({
                date: logDate, content: logContent, mood_score: logMood,
                energy_level: logEnergy, emotions: logEmotions, highlights: logHighlights,
                tags: logTags, people_mentioned: [], decisions_made: [], photo_urls: [],
            });
            showFlash(result?.__offline ? 'Queued!' : 'Saved!');
            setLogContent(''); setLogMood(5); setLogEnergy(5);
            setLogEmotions([]); setLogHighlights(''); setLogTags([]); setLogTagInput('');
            refreshQueue();
        } catch (err) { console.error('Save failed:', err); }
    };

    const savePerson = async () => {
        if (!personName.trim()) return;
        try {
            const data = { name: personName, trust_level: personTrust };
            if (personRel) data.relationship_type = personRel;
            if (personEnergy) data.energy_exchange = personEnergy;
            if (personNotes) data.notes = personNotes;
            const result = await api.createPerson(data);
            showFlash(result?.__offline ? 'Queued!' : 'Saved!');
            setPersonName(''); setPersonRel(''); setPersonTrust(5);
            setPersonEnergy(''); setPersonNotes('');
            refreshQueue();
        } catch (err) { console.error('Save failed:', err); }
    };

    const saveInteraction = async () => {
        const pid = parseInt(intPersonId);
        if (!pid) return;
        try {
            const result = await api.createInteraction({
                person_id: pid, date: intDate, description: intDesc,
                emotional_tone: intTone, context: intContext,
            });
            showFlash(result?.__offline ? 'Queued!' : 'Saved!');
            setIntPersonId(''); setIntDesc(''); setIntTone('positive'); setIntContext('social');
            refreshQueue();
        } catch (err) { console.error('Save failed:', err); }
    };

    const saveDecision = async () => {
        if (!decTitle.trim()) return;
        try {
            const data = { title: decTitle, date: decDate };
            if (decDesc) data.description = decDesc;
            if (decDomain) data.domain = decDomain;
            const result = await api.createDecision(data);
            showFlash(result?.__offline ? 'Queued!' : 'Saved!');
            setDecTitle(''); setDecDesc(''); setDecDomain('');
            refreshQueue();
        } catch (err) { console.error('Save failed:', err); }
    };

    const saveGoal = async () => {
        if (!goalTitle.trim()) return;
        try {
            const data = { title: goalTitle, status: 'active' };
            if (goalDesc) data.description = goalDesc;
            if (goalDomain) data.domain = goalDomain;
            if (goalTarget) data.target_date = goalTarget;
            const result = await api.createGoal(data);
            showFlash(result?.__offline ? 'Queued!' : 'Saved!');
            setGoalTitle(''); setGoalDesc(''); setGoalDomain(''); setGoalTarget('');
            refreshQueue();
        } catch (err) { console.error('Save failed:', err); }
    };

    const saveProject = async () => {
        if (!projName.trim()) return;
        try {
            const result = await api.createProject({
                name: projName, description: projDesc, status: projStatus, color: projColor,
            });
            showFlash(result?.__offline ? 'Queued!' : 'Saved!');
            setProjName(''); setProjDesc(''); setProjStatus('active');
            setProjColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
            refreshQueue();
        } catch (err) { console.error('Save failed:', err); }
    };

    const saveLifeAreas = async () => {
        if (Object.keys(laScores).length === 0) return;
        try {
            const result = await api.batchCreateScores({
                week_start_date: laWeek, scores: laScores, notes: laNotes,
            });
            showFlash(result?.__offline ? 'Queued!' : 'Saved!');
            setLaScores({}); setLaNotes({});
            refreshQueue();
        } catch (err) { console.error('Save failed:', err); }
    };

    // ── Helpers ──────────────────────────────────────────────────────────
    const toggleEmotion = (e) => setLogEmotions(prev =>
        prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]
    );
    const addTag = (e) => {
        if (e.key === 'Enter' && logTagInput.trim()) {
            if (!logTags.includes(logTagInput.trim())) setLogTags([...logTags, logTagInput.trim()]);
            setLogTagInput('');
        }
    };

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <>
            <div className="page-header">
                <h1>📡 Offline Quick Entry</h1>
                <div className="header-actions">
                    {flash && (
                        <span className={flash === 'Saved!' ? 'alert-success' : 'alert-warning'}
                            style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-xs)', fontWeight: 600 }}>
                            {flash === 'Queued!' ? '📦 ' : '✓ '}{flash}
                        </span>
                    )}
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-xs)', fontWeight: 600,
                        background: serverReachable ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                        color: serverReachable ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        border: `1px solid ${serverReachable ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
                        {serverReachable ? 'Server Online' : 'Server Offline'}
                    </span>
                </div>
            </div>

            <div className="page-content">
                {/* Info Banner */}
                <div className="card fade-in" style={{
                    marginBottom: 'var(--space-xl)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    padding: 'var(--space-md)',
                }}>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        📡 <strong>Quick Entry Mode</strong> — All entries are saved locally and sync automatically
                        when the server is reachable. No AI features, no photo uploads — just fast data entry.
                        {pendingCount > 0 && (
                            <span style={{ marginLeft: 8, color: 'var(--accent-amber)', fontWeight: 600 }}>
                                {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending sync.
                            </span>
                        )}
                    </div>
                </div>

                {/* Tab Bar */}
                <div style={{
                    display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)',
                    overflowX: 'auto', paddingBottom: 'var(--space-xs)',
                }}>
                    {TABS.map(tab => (
                        <button key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tag ${activeTab === tab.id ? 'selected' : ''}`}
                            style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab Forms ─────────────────────────────────────────────── */}
                <div className="card fade-in" style={{ marginBottom: 'var(--space-xl)' }}>

                    {/* ── DAILY LOG ──────────────────────────────────────── */}
                    {activeTab === 'log' && (
                        <div>
                            <div className="card-header"><h3>📝 Daily Log</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={labelStyle}>Date</label>
                                    <input type="date" className="form-input" value={logDate}
                                        onChange={e => setLogDate(e.target.value)} max={formatDate(new Date())} />
                                </div>
                                <div>
                                    <label style={labelStyle}>What happened today?</label>
                                    <textarea className="form-input" rows={4} placeholder="Write about your day..."
                                        value={logContent} onChange={e => setLogContent(e.target.value)} />
                                </div>
                                <div className="slider-group">
                                    <label>Mood</label>
                                    <input type="range" min="1" max="10" value={logMood}
                                        onChange={e => setLogMood(parseInt(e.target.value))} />
                                    <span className="slider-value" style={{ color: logMood >= 7 ? 'var(--accent-emerald)' : logMood >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{logMood}</span>
                                </div>
                                <div className="slider-group">
                                    <label>Energy</label>
                                    <input type="range" min="1" max="10" value={logEnergy}
                                        onChange={e => setLogEnergy(parseInt(e.target.value))} />
                                    <span className="slider-value" style={{ color: logEnergy >= 7 ? 'var(--accent-emerald)' : logEnergy >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{logEnergy}</span>
                                </div>
                                <div>
                                    <label style={labelStyle}>Emotions</label>
                                    {Object.entries(EMOTIONS).map(([cat, list]) => (
                                        <div key={cat} style={{ marginBottom: 'var(--space-sm)' }}>
                                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'capitalize' }}>{cat}</p>
                                            <div className="tag-grid">
                                                {list.map(em => (
                                                    <span key={em} className={`tag emotion-${cat} ${logEmotions.includes(em) ? 'selected' : ''}`}
                                                        onClick={() => toggleEmotion(em)} style={{ cursor: 'pointer' }}>{em}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <label style={labelStyle}>Highlights</label>
                                    <textarea className="form-input" rows={2} placeholder="Any special moments?"
                                        value={logHighlights} onChange={e => setLogHighlights(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Tags</label>
                                    <div className="tag-grid" style={{ marginBottom: 'var(--space-xs)' }}>
                                        {logTags.map(t => (
                                            <span key={t} className="tag selected" style={{ cursor: 'pointer' }}
                                                onClick={() => setLogTags(logTags.filter(x => x !== t))}>{t} ×</span>
                                        ))}
                                    </div>
                                    <input className="form-input" placeholder="Type a tag and press Enter..."
                                        value={logTagInput} onChange={e => setLogTagInput(e.target.value)}
                                        onKeyDown={addTag} style={{ maxWidth: '300px' }} />
                                </div>
                                <button className="btn btn-primary" onClick={saveLog}>Save Daily Log</button>
                            </div>
                        </div>
                    )}

                    {/* ── PEOPLE ─────────────────────────────────────────── */}
                    {activeTab === 'person' && (
                        <div>
                            <div className="card-header"><h3>👥 Add Person</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={labelStyle}>Name *</label>
                                    <input className="form-input" placeholder="Person's name"
                                        value={personName} onChange={e => setPersonName(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Relationship</label>
                                    <select className="form-input" value={personRel} onChange={e => setPersonRel(e.target.value)}>
                                        <option value="">— Select —</option>
                                        {REL_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="slider-group">
                                    <label>Trust Level</label>
                                    <input type="range" min="1" max="10" value={personTrust}
                                        onChange={e => setPersonTrust(parseInt(e.target.value))} />
                                    <span className="slider-value">{personTrust}</span>
                                </div>
                                <div>
                                    <label style={labelStyle}>Energy Exchange</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        {ENERGY_TYPES.map(et => (
                                            <button key={et.value}
                                                onClick={() => setPersonEnergy(personEnergy === et.value ? '' : et.value)}
                                                style={{
                                                    padding: '8px 16px', borderRadius: 'var(--radius)',
                                                    border: `1px solid ${personEnergy === et.value ? et.color : 'var(--border)'}`,
                                                    background: personEnergy === et.value ? `${et.color}20` : 'var(--bg-tertiary)',
                                                    color: personEnergy === et.value ? et.color : 'var(--text-secondary)',
                                                    cursor: 'pointer', fontSize: 'var(--font-sm)',
                                                }}>
                                                {et.emoji} {et.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Notes</label>
                                    <textarea className="form-input" rows={3} placeholder="Notes about this person..."
                                        value={personNotes} onChange={e => setPersonNotes(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" onClick={savePerson} disabled={!personName.trim()}>Save Person</button>
                            </div>
                        </div>
                    )}

                    {/* ── INTERACTION ────────────────────────────────────── */}
                    {activeTab === 'interaction' && (
                        <div>
                            <div className="card-header"><h3>🤝 Log Interaction</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={labelStyle}>Person *</label>
                                    {cachedPeople.length > 0 ? (
                                        <select className="form-input" value={intPersonId} onChange={e => setIntPersonId(e.target.value)}>
                                            <option value="">— Select person —</option>
                                            {cachedPeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    ) : (
                                        <>
                                            <input className="form-input" type="number" min="1" placeholder="Person ID"
                                                value={intPersonId} onChange={e => setIntPersonId(e.target.value)} />
                                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                                Visit the People page while online to enable the dropdown.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Date</label>
                                    <input type="date" className="form-input" value={intDate}
                                        onChange={e => setIntDate(e.target.value)} max={formatDate(new Date())} />
                                </div>
                                <div>
                                    <label style={labelStyle}>What happened?</label>
                                    <textarea className="form-input" rows={3} placeholder="Describe the interaction..."
                                        value={intDesc} onChange={e => setIntDesc(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Emotional Tone</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        {TONE_TYPES.map(tt => (
                                            <button key={tt.value}
                                                onClick={() => setIntTone(tt.value)}
                                                style={{
                                                    padding: '8px 16px', borderRadius: 'var(--radius)',
                                                    border: `1px solid ${intTone === tt.value ? tt.color : 'var(--border)'}`,
                                                    background: intTone === tt.value ? `${tt.color}20` : 'var(--bg-tertiary)',
                                                    color: intTone === tt.value ? tt.color : 'var(--text-secondary)',
                                                    cursor: 'pointer', fontSize: 'var(--font-sm)',
                                                }}>
                                                {tt.emoji} {tt.value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Context</label>
                                    <select className="form-input" value={intContext} onChange={e => setIntContext(e.target.value)}>
                                        {CONTEXT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <button className="btn btn-primary" onClick={saveInteraction} disabled={!intPersonId}>Save Interaction</button>
                            </div>
                        </div>
                    )}

                    {/* ── DECISION ───────────────────────────────────────── */}
                    {activeTab === 'decision' && (
                        <div>
                            <div className="card-header"><h3>⚖️ Log Decision</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={labelStyle}>Title *</label>
                                    <input className="form-input" placeholder="What did you decide?"
                                        value={decTitle} onChange={e => setDecTitle(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Description</label>
                                    <textarea className="form-input" rows={3} placeholder="Why? What alternatives did you consider?"
                                        value={decDesc} onChange={e => setDecDesc(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Domain</label>
                                    <select className="form-input" value={decDomain} onChange={e => setDecDomain(e.target.value)}>
                                        <option value="">— Select —</option>
                                        {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_EMOJIS[d]} {d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Date</label>
                                    <input type="date" className="form-input" value={decDate}
                                        onChange={e => setDecDate(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" onClick={saveDecision} disabled={!decTitle.trim()}>Save Decision</button>
                            </div>
                        </div>
                    )}

                    {/* ── GOAL ───────────────────────────────────────────── */}
                    {activeTab === 'goal' && (
                        <div>
                            <div className="card-header"><h3>⭐ Add Goal</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={labelStyle}>Title *</label>
                                    <input className="form-input" placeholder="What's the goal?"
                                        value={goalTitle} onChange={e => setGoalTitle(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Description</label>
                                    <textarea className="form-input" rows={3} placeholder="Why is this important?"
                                        value={goalDesc} onChange={e => setGoalDesc(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Domain</label>
                                    <select className="form-input" value={goalDomain} onChange={e => setGoalDomain(e.target.value)}>
                                        <option value="">— Select —</option>
                                        {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_EMOJIS[d]} {d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Target Date</label>
                                    <input type="date" className="form-input" value={goalTarget}
                                        onChange={e => setGoalTarget(e.target.value)} />
                                </div>
                                <button className="btn btn-primary" onClick={saveGoal} disabled={!goalTitle.trim()}>Save Goal</button>
                            </div>
                        </div>
                    )}

                    {/* ── PROJECT ────────────────────────────────────────── */}
                    {activeTab === 'project' && (
                        <div>
                            <div className="card-header"><h3>🚀 Add Project</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={labelStyle}>Name *</label>
                                    <input className="form-input" placeholder="Project name"
                                        value={projName} onChange={e => setProjName(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Description</label>
                                    <textarea className="form-input" rows={3} placeholder="What's this project about?"
                                        value={projDesc} onChange={e => setProjDesc(e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Status</label>
                                    <select className="form-input" value={projStatus} onChange={e => setProjStatus(e.target.value)}>
                                        {['active', 'paused', 'completed', 'archived'].map(s =>
                                            <option key={s} value={s}>{s}</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Color</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                        {PROJECT_COLORS.map(c => (
                                            <button key={c} onClick={() => setProjColor(c)}
                                                style={{
                                                    width: 32, height: 32, borderRadius: '50%', background: c,
                                                    border: projColor === c ? '3px solid #fff' : '2px solid transparent',
                                                    cursor: 'pointer', boxShadow: projColor === c ? `0 0 0 2px ${c}` : 'none',
                                                }} />
                                        ))}
                                    </div>
                                </div>
                                <button className="btn btn-primary" onClick={saveProject} disabled={!projName.trim()}>Save Project</button>
                            </div>
                        </div>
                    )}

                    {/* ── LIFE AREAS ─────────────────────────────────────── */}
                    {activeTab === 'life-areas' && (
                        <div>
                            <div className="card-header"><h3>🎯 Life Area Scores</h3></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                    <label style={labelStyle}>Week Starting</label>
                                    <input type="date" className="form-input" value={laWeek}
                                        onChange={e => setLaWeek(e.target.value)} />
                                </div>
                                {LIFE_AREAS.map(area => (
                                    <div key={area.key} style={{
                                        padding: 'var(--space-md)', background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius)', border: `1px solid ${area.color}20`,
                                    }}>
                                        <div className="slider-group">
                                            <label style={{ color: area.color }}>{area.emoji} {area.label}</label>
                                            <input type="range" min="1" max="10"
                                                value={laScores[area.key] || 5}
                                                onChange={e => setLaScores(prev => ({ ...prev, [area.key]: parseInt(e.target.value) }))} />
                                            <span className="slider-value" style={{ color: area.color }}>
                                                {laScores[area.key] || 5}
                                            </span>
                                        </div>
                                        <input className="form-input" placeholder={`Notes for ${area.label.toLowerCase()}...`}
                                            value={laNotes[area.key] || ''}
                                            onChange={e => setLaNotes(prev => ({ ...prev, [area.key]: e.target.value }))}
                                            style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-xs)' }} />
                                    </div>
                                ))}
                                <button className="btn btn-primary" onClick={saveLifeAreas}>Save Life Area Scores</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Pending Queue ──────────────────────────────────────── */}
                <div className="card" style={{ borderColor: queue.length > 0 ? 'rgba(245,158,11,0.25)' : undefined }}>
                    <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowQueue(v => !v)}>
                        <h3>📦 Pending Queue ({queue.length})</h3>
                        <span style={{ color: 'var(--text-tertiary)' }}>{showQueue ? '▾' : '▸'}</span>
                    </div>
                    {showQueue && (
                        queue.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
                                No pending operations. Entries sync automatically when the server is reachable.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-md)' }}>
                                {queue.map(op => (
                                    <div key={op.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: 'var(--space-sm) var(--space-md)',
                                        background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{op.label}</div>
                                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                                                {new Date(op.timestamp).toLocaleString()} · {op.method} {op.path}
                                            </div>
                                        </div>
                                        <button onClick={() => deleteQueueItem(op.id)}
                                            style={{
                                                padding: '4px 10px', borderRadius: 'var(--radius)',
                                                background: 'transparent', border: '1px solid var(--accent-rose)',
                                                color: 'var(--accent-rose)', fontSize: 'var(--font-xs)',
                                                cursor: 'pointer',
                                            }}>
                                            Discard
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
}

// ── Shared Styles ────────────────────────────────────────────────────────────
const labelStyle = {
    display: 'block', fontSize: 'var(--font-sm)', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)',
};
