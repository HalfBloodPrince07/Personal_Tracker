import { useState, useEffect } from 'react'
import api from '../api'

const EMOTIONS = {
    positive: ['Grateful', 'Happy', 'Excited', 'Peaceful', 'Inspired', 'Confident', 'Loved', 'Energized'],
    negative: ['Anxious', 'Stressed', 'Sad', 'Frustrated', 'Lonely', 'Overwhelmed', 'Angry', 'Exhausted'],
    neutral: ['Calm', 'Focused', 'Reflective', 'Nostalgic', 'Curious', 'Indifferent'],
};

function formatDate(d) { return d.toISOString().split('T')[0]; }
function displayDate(d) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }

export default function DailyLog() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [log, setLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [people, setPeople] = useState([]);

    // Form state
    const [content, setContent] = useState('');
    const [mood, setMood] = useState(5);
    const [energy, setEnergy] = useState(5);
    const [emotions, setEmotions] = useState([]);
    const [highlights, setHighlights] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [peopleMentioned, setPeopleMentioned] = useState([]);
    const [photoUrls, setPhotoUrls] = useState([]);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // NLP state
    const [showNLP, setShowNLP] = useState(false);
    const [nlpText, setNlpText] = useState('');
    const [nlpLoading, setNlpLoading] = useState(false);
    const [nlpResult, setNlpResult] = useState(null);
    const [nlpError, setNlpError] = useState('');

    useEffect(() => { loadLog(); loadPeople(); }, [currentDate]);

    const loadPeople = async () => {
        try {
            const data = await api.getPeople();
            setPeople(data);
            try { localStorage.setItem('plis_people_cache', JSON.stringify(data)); } catch {}
        } catch (err) { console.error(err); }
    };

    const loadLog = async () => {
        setLoading(true);
        try {
            const data = await api.getLogByDate(formatDate(currentDate));
            if (data) {
                setLog(data); setContent(data.content || ''); setMood(data.mood_score || 5);
                setEnergy(data.energy_level || 5); setEmotions(data.emotions || []);
                setHighlights(data.highlights || ''); setTags(data.tags || []);
                setPeopleMentioned(data.people_mentioned || []);
                setPhotoUrls(data.photo_urls || []);
            } else {
                setLog(null); setContent(''); setMood(5); setEnergy(5);
                setEmotions([]); setHighlights(''); setTags([]);
                setPeopleMentioned([]); setPhotoUrls([]);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true); setSaved(false);
        try {
            const data = {
                date: formatDate(currentDate), content, mood_score: mood,
                energy_level: energy, emotions, highlights, tags,
                people_mentioned: peopleMentioned, decisions_made: [],
                photo_urls: photoUrls
            };
            const result = await api.createLog(data);
            // Guard: if offline, result is { __offline: true } — don't overwrite local state
            if (result && !result.__offline) setLog(result);
            setSaved(true); setTimeout(() => setSaved(false), 2000);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleNLP = async () => {
        if (!nlpText.trim()) return;
        setNlpLoading(true); setNlpError(''); setNlpResult(null);
        try {
            const res = await api.nlpDailyLog(nlpText, formatDate(currentDate));
            setNlpResult(res);
            const p = res.parsed;
            // Auto-fill form
            if (p.mood_score) setMood(p.mood_score);
            if (p.energy_level) setEnergy(p.energy_level);
            if (p.emotions?.length) setEmotions(p.emotions.map(e => e.charAt(0).toUpperCase() + e.slice(1)));
            if (p.highlights) setHighlights(p.highlights);
            if (p.content) setContent(p.content);
            if (p.tags?.length) setTags(p.tags);
            if (p.people_mentioned?.length) setPeopleMentioned(p.people_mentioned.map(Number));
        } catch (err) {
            setNlpError(err.message || 'LM Studio parsing failed');
        } finally { setNlpLoading(false); }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const res = await api.uploadPhoto(file);
            setPhotoUrls(prev => [...prev, res.url]);
        } catch (err) {
            console.error('Photo upload failed:', err);
            alert('Failed to upload photo. See console for details.');
        } finally {
            setUploadingPhoto(false);
            e.target.value = null; // reset input
        }
    };
    const removePhoto = (url) => setPhotoUrls(prev => prev.filter(u => u !== url));

    const prevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
    const nextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setCurrentDate(d); };
    const goToday = () => setCurrentDate(new Date());

    const toggleEmotion = (e) => setEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
    const togglePerson = (id) => setPeopleMentioned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const addTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };
    const removeTag = (t) => setTags(tags.filter(x => x !== t));
    const isToday = formatDate(currentDate) === formatDate(new Date());

    return (
        <>
            <div className="page-header">
                <h1>📝 Daily Log</h1>
                <div className="header-actions">
                    {saved && <span className="alert-success" style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-xs)' }}>✓ Saved!</span>}
                    <button className="btn btn-secondary" onClick={() => { setShowNLP(v => !v); setNlpText(''); setNlpResult(null); setNlpError(''); }}>
                        {showNLP ? '✕ Close AI' : '✨ Describe Your Day'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Entry'}</button>
                </div>
            </div>

            <div className="page-content">
                {/* Date Navigation */}
                <div className="date-nav" style={{ marginBottom: 'var(--space-xl)', justifyContent: 'center' }}>
                    <button onClick={prevDay}>◀</button>
                    <span className="current-date">{displayDate(currentDate)}</span>
                    <button onClick={nextDay} disabled={isToday}>▶</button>
                    {!isToday && <button onClick={goToday} style={{ marginLeft: '8px', fontSize: 'var(--font-sm)' }}>Today</button>}
                    <input type="date" value={formatDate(currentDate)}
                        onChange={e => setCurrentDate(new Date(e.target.value + 'T00:00:00'))}
                        max={formatDate(new Date())} />
                </div>

                {/* ─── NLP Panel ─────────────────────────────────────────────── */}
                {showNLP && (
                    <div className="card fade-in" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--accent-indigo)40' }}>
                        <div className="card-header">
                            <h3>✨ Describe Your Day</h3>
                            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>AI extracts mood, energy, emotions, highlights and more</span>
                        </div>
                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                            💡 <em>"Today was super hectic at work — big deadline hit. Feeling exhausted but proud. Met up with Sarah for coffee in the evening, that lifted my spirits. Mood was like a 5 overall."</em>
                        </div>
                        <textarea className="form-input" rows={5}
                            placeholder="Tell me about your day..."
                            value={nlpText} onChange={e => setNlpText(e.target.value)}
                            style={{ marginBottom: 'var(--space-md)' }} />
                        {nlpError && <p style={{ color: 'var(--accent-rose)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>⚠️ {nlpError}</p>}
                        {nlpResult && !nlpError && (
                            <div className="fade-in" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--accent-emerald)10', border: '1px solid var(--accent-emerald)40', borderRadius: 'var(--radius)' }}>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)', color: 'var(--accent-emerald)' }}>✅ Form auto-filled! Review and adjust below.</div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                                    <span>😊 Mood: <strong>{nlpResult.parsed.mood_score}</strong></span>
                                    <span>⚡ Energy: <strong>{nlpResult.parsed.energy_level}</strong></span>
                                    {nlpResult.parsed.emotions?.length > 0 && <span>💭 {nlpResult.parsed.emotions.join(', ')}</span>}
                                    {nlpResult.parsed.people_mentioned?.length > 0 && <span>👥 {nlpResult.parsed.people_mentioned.length} people matched</span>}
                                </div>
                            </div>
                        )}
                        <button className="btn btn-primary" onClick={handleNLP} disabled={nlpLoading || !nlpText.trim()}>
                            {nlpLoading ? '🧠 Analysing...' : '✨ Parse & Fill Form'}
                        </button>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}><div className="loading-dots"><span /><span /><span /></div></div>
                ) : (
                    <div className="log-form">
                        {/* Mood & Energy */}
                        <div className="log-section fade-in">
                            <h3>😊 How are you feeling?</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div className="slider-group">
                                    <label>Mood</label>
                                    <input type="range" min="1" max="10" value={mood} onChange={e => setMood(parseInt(e.target.value))} />
                                    <span className="slider-value" style={{ color: mood >= 7 ? 'var(--accent-emerald)' : mood >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{mood}</span>
                                </div>
                                <div className="slider-group">
                                    <label>Energy</label>
                                    <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(parseInt(e.target.value))} />
                                    <span className="slider-value" style={{ color: energy >= 7 ? 'var(--accent-emerald)' : energy >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{energy}</span>
                                </div>
                            </div>
                        </div>

                        {/* Journal Entry */}
                        <div className="log-section fade-in fade-in-delay-1">
                            <h3>✍️ What happened today?</h3>
                            <textarea className="form-input"
                                placeholder="Write about your day... What did you do? Who did you see? What's on your mind?"
                                value={content} onChange={e => setContent(e.target.value)}
                                rows={6} style={{ minHeight: '150px' }} />
                        </div>

                        {/* People Mentioned */}
                        {people.length > 0 && (
                            <div className="log-section fade-in fade-in-delay-2">
                                <h3>👥 People I interacted with today</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                    {people.map(p => {
                                        const selected = peopleMentioned.includes(p.id);
                                        return (
                                            <button key={p.id}
                                                onClick={() => togglePerson(p.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 12px', borderRadius: 'var(--radius-full)',
                                                    border: `1px solid ${selected ? 'var(--accent-indigo)' : 'var(--border)'}`,
                                                    background: selected ? 'var(--accent-indigo)20' : 'var(--bg-tertiary)',
                                                    color: selected ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                                                    cursor: 'pointer', fontSize: 'var(--font-xs)', fontWeight: selected ? 600 : 400,
                                                    transition: 'all 0.15s'
                                                }}>
                                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                    {p.name.slice(0, 1).toUpperCase()}
                                                </span>
                                                {p.name}
                                                {selected && ' ✓'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Emotions */}
                        <div className="log-section fade-in fade-in-delay-2">
                            <h3>💭 Emotions</h3>
                            {Object.entries(EMOTIONS).map(([category, emList]) => (
                                <div key={category} style={{ marginBottom: 'var(--space-md)' }}>
                                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)', textTransform: 'capitalize' }}>{category}</p>
                                    <div className="tag-grid">
                                        {emList.map(em => (
                                            <span key={em} className={`tag emotion-${category} ${emotions.includes(em) ? 'selected' : ''}`}
                                                onClick={() => toggleEmotion(em)}>{em}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Highlights */}
                        <div className="log-section fade-in fade-in-delay-3">
                            <h3>⭐ Highlights & Key Moments</h3>
                            <textarea className="form-input" placeholder="Any special moments, achievements, or notable events?"
                                value={highlights} onChange={e => setHighlights(e.target.value)} rows={3} style={{ marginBottom: '16px' }} />

                            {/* Photo Upload */}
                            <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>📸 Photos ({photoUrls.length})</div>
                                    <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 'var(--font-xs)' }}>
                                        {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                    </label>
                                </div>
                                {photoUrls.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        {photoUrls.map((url, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                                <img src={url} alt={`Upload ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button onClick={() => removePhoto(url)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px' }}>No photos attached yet</div>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="log-section fade-in fade-in-delay-4">
                            <h3>🏷️ Tags</h3>
                            <div className="tag-grid" style={{ marginBottom: 'var(--space-sm)' }}>
                                {tags.map(t => (
                                    <span key={t} className="tag selected" onClick={() => removeTag(t)}>{t} ×</span>
                                ))}
                            </div>
                            <input className="form-input" placeholder="Type a tag and press Enter..."
                                value={tagInput} onChange={e => setTagInput(e.target.value)}
                                onKeyDown={addTag} style={{ maxWidth: '300px' }} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
