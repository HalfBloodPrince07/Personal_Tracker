import { useState, useEffect } from 'react'
import { Radar, Line } from 'react-chartjs-2'
import {
    Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
    CategoryScale, LinearScale, Filler, Tooltip, Legend
} from 'chart.js'
import api from '../api'

ChartJS.register(RadialLinearScale, PointElement, LineElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);

const AREAS = [
    { key: 'health', label: 'Health', emoji: '💪', color: '#10b981' },
    { key: 'career', label: 'Career', emoji: '💼', color: '#6366f1' },
    { key: 'finances', label: 'Finances', emoji: '💰', color: '#f59e0b' },
    { key: 'relationships', label: 'Relationships', emoji: '❤️', color: '#ec4899' },
    { key: 'learning', label: 'Learning', emoji: '📚', color: '#0ea5e9' },
    { key: 'creativity', label: 'Creativity', emoji: '🎨', color: '#8b5cf6' },
    { key: 'spirituality', label: 'Spirituality', emoji: '🧘', color: '#14b8a6' },
];

function getWeekStart(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
}

export default function LifeAreas() {
    const [scores, setScores] = useState({});
    const [notes, setNotes] = useState({});
    const [allScores, setAllScores] = useState([]);
    const [weekDate, setWeekDate] = useState(getWeekStart());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // NLP state
    const [showNLP, setShowNLP] = useState(false);
    const [nlpText, setNlpText] = useState('');
    const [nlpLoading, setNlpLoading] = useState(false);
    const [nlpResult, setNlpResult] = useState(null); // parsed result from API
    const [nlpError, setNlpError] = useState('');
    const [highlighted, setHighlighted] = useState({}); // area -> true for flash animation

    useEffect(() => { loadScores(); }, [weekDate]);

    const loadScores = async () => {
        setLoading(true);
        try {
            const all = await api.getLifeAreaScores({ weeks: 12 });
            setAllScores(all);
            const thisWeek = all.filter(s => s.week_start_date === weekDate);
            const scoreMap = {}; const noteMap = {};
            thisWeek.forEach(s => { scoreMap[s.area] = s.score; noteMap[s.area] = s.notes || ''; });
            setScores(scoreMap); setNotes(noteMap);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true); setSaved(false);
        try {
            await api.batchCreateScores({ week_start_date: weekDate, scores, notes });
            setSaved(true); setTimeout(() => setSaved(false), 2000);
            loadScores();
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleNLP = async () => {
        if (!nlpText.trim()) return;
        setNlpLoading(true); setNlpError(''); setNlpResult(null);
        try {
            const res = await api.nlpLifeAreas(nlpText, weekDate);
            setNlpResult(res);

            // Auto-fill sliders from parsed result
            const newScores = { ...scores };
            const newNotes = { ...notes };
            const flash = {};
            for (const [area, val] of Object.entries(res.parsed)) {
                if (typeof val === 'object' && val.score) {
                    newScores[area] = val.score;
                    if (val.note) newNotes[area] = val.note;
                    flash[area] = true;
                }
            }
            setScores(newScores); setNotes(newNotes); setHighlighted(flash);
            // Remove highlights after 2s
            setTimeout(() => setHighlighted({}), 2000);
        } catch (err) {
            setNlpError(err.message || 'LM Studio parsing failed');
        } finally { setNlpLoading(false); }
    };

    // Chart data
    const radarData = {
        labels: AREAS.map(a => a.label),
        datasets: [{
            label: 'This Week',
            data: AREAS.map(a => scores[a.key] || 0),
            backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: '#6366f1',
            borderWidth: 2, pointBackgroundColor: '#6366f1', pointRadius: 5, pointHoverRadius: 7,
        }]
    };
    const radarOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, color: '#6b6b80', backdropColor: 'transparent' }, grid: { color: 'rgba(255,255,255,0.06)' }, pointLabels: { color: '#a0a0b5', font: { size: 13, weight: 600 } }, angleLines: { color: 'rgba(255,255,255,0.06)' } } },
        plugins: { legend: { display: false } }
    };

    const weekGroups = {};
    allScores.forEach(s => {
        if (!weekGroups[s.week_start_date]) weekGroups[s.week_start_date] = {};
        weekGroups[s.week_start_date][s.area] = s.score;
    });
    const sortedWeeks = Object.keys(weekGroups).sort();
    const historyData = {
        labels: sortedWeeks.map(w => new Date(w + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: AREAS.map(a => ({
            label: a.label, data: sortedWeeks.map(w => weekGroups[w]?.[a.key] || null),
            borderColor: a.color, backgroundColor: a.color + '20', tension: 0.4, pointRadius: 3, spanGaps: true,
        }))
    };
    const historyOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b6b80' } }, x: { grid: { display: false }, ticks: { color: '#6b6b80' } } },
        plugins: { legend: { labels: { color: '#a0a0b5', usePointStyle: true, padding: 16, font: { size: 11 } } } }
    };

    return (
        <>
            <div className="page-header">
                <h1>🎯 Life Areas</h1>
                <div className="header-actions">
                    {saved && <span style={{ color: 'var(--accent-emerald)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>✓ Saved!</span>}
                    <input type="date" className="form-input" style={{ width: '160px' }} value={weekDate} onChange={e => setWeekDate(e.target.value)} />
                    <button className="btn btn-secondary" onClick={() => { setShowNLP(v => !v); setNlpText(''); setNlpResult(null); setNlpError(''); }}>
                        {showNLP ? '✕ Close AI' : '✨ Describe Your Week'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving || Object.keys(scores).length === 0}>
                        {saving ? 'Saving...' : 'Save Scores'}
                    </button>
                </div>
            </div>

            <div className="page-content">
                {/* ─── NLP Panel ─────────────────────────────────────────────── */}
                {showNLP && (
                    <div className="card fade-in" style={{ marginBottom: 'var(--space-xl)', border: '1px solid var(--accent-indigo)40' }}>
                        <div className="card-header">
                            <h3>✨ Describe Your Week</h3>
                            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>AI will rate all 7 areas from your description</span>
                        </div>
                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                            💡 <em>"This week I crushed the gym 5 days, feeling great physically. Career was stressful — big presentation fell apart. Finances are tighter than usual. Didn't see many friends."</em>
                        </div>
                        <textarea className="form-input" rows={4}
                            placeholder="Describe how your week went in your own words..."
                            value={nlpText} onChange={e => setNlpText(e.target.value)}
                            style={{ marginBottom: 'var(--space-md)' }} />
                        {nlpError && <p style={{ color: 'var(--accent-rose)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>⚠️ {nlpError}</p>}
                        {nlpResult && !nlpError && (
                            <div className="fade-in" style={{ marginBottom: 'var(--space-md)' }}>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)', color: 'var(--accent-emerald)' }}>✅ Sliders auto-filled! Here's what the AI understood:</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
                                    {AREAS.map(a => {
                                        const parsed = nlpResult.parsed[a.key];
                                        if (!parsed) return null;
                                        return (
                                            <div key={a.key} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', borderLeft: `3px solid ${a.color}` }}>
                                                <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, marginBottom: '2px' }}>{a.emoji} {a.label} — <span style={{ color: a.color }}>{parsed.score}/10</span></div>
                                                {parsed.note && <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{parsed.note}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <button className="btn btn-primary" onClick={handleNLP} disabled={nlpLoading || !nlpText.trim()}
                            style={{ minWidth: '160px' }}>
                            {nlpLoading ? '🧠 Analysing...' : '✨ Analyse & Fill Sliders'}
                        </button>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}><div className="loading-dots"><span /><span /><span /></div></div>
                ) : (
                    <div className="life-areas-grid">
                        {/* Scoring Interface */}
                        <div className="card fade-in">
                            <div className="card-header">
                                <h3>Rate Your Week</h3>
                                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
                                    Week of {new Date(weekDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="scoring-interface">
                                {AREAS.map(area => (
                                    <div key={area.key} className="area-score-item" style={{
                                        transition: 'background 0.3s',
                                        background: highlighted[area.key] ? area.color + '15' : 'transparent',
                                        borderRadius: 'var(--radius-sm)', padding: '4px 0'
                                    }}>
                                        <span className="area-icon">{area.emoji}</span>
                                        <span className="area-name">{area.label}</span>
                                        <input type="range" min="1" max="10"
                                            value={scores[area.key] || 5}
                                            onChange={e => setScores({ ...scores, [area.key]: parseInt(e.target.value) })}
                                            style={{ flex: 1, accentColor: area.color }} />
                                        <span style={{
                                            minWidth: '28px', textAlign: 'center', fontWeight: 700, fontSize: 'var(--font-lg)',
                                            color: (scores[area.key] || 5) >= 7 ? area.color : (scores[area.key] || 5) >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                                        }}>
                                            {scores[area.key] || 5}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Notes per area */}
                            <div style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>Optional notes per area:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    {AREAS.filter(a => scores[a.key]).map(area => (
                                        <div key={area.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span style={{ minWidth: '80px', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{area.emoji} {area.label}</span>
                                            <input className="form-input" style={{ fontSize: 'var(--font-xs)', padding: '4px 8px' }}
                                                placeholder={`What happened with ${area.label.toLowerCase()}?`}
                                                value={notes[area.key] || ''}
                                                onChange={e => setNotes({ ...notes, [area.key]: e.target.value })} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="card fade-in fade-in-delay-1">
                            <div className="card-header"><h3>Your Life Balance</h3></div>
                            <div style={{ height: '350px' }}>
                                <Radar data={radarData} options={radarOptions} />
                            </div>
                        </div>

                        {/* History Chart */}
                        <div className="card fade-in fade-in-delay-2" style={{ gridColumn: '1 / -1' }}>
                            <div className="card-header"><h3>📈 Historical Trend</h3></div>
                            <div style={{ height: '300px' }}>
                                {sortedWeeks.length > 0 ? (
                                    <Line data={historyData} options={historyOptions} />
                                ) : (
                                    <div className="empty-state"><p>Start scoring your weeks to see trends!</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
