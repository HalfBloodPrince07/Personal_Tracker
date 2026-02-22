import { useState, useEffect } from 'react'
import api from '../api'

export default function WeeklyReview() {
    const [reviews, setReviews] = useState([]);
    const [selectedReview, setSelectedReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [weekDate, setWeekDate] = useState('');

    useEffect(() => { loadReviews(); }, []);

    async function loadReviews() {
        try {
            setLoading(true);
            const data = await api.getWeeklyReviews(12);
            setReviews(data || []);
            if (data && data.length > 0) setSelectedReview(data[0]);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerate() {
        setGenerating(true);
        setError('');
        try {
            await api.generateWeeklyReview(weekDate || null);
            await loadReviews();
        } catch (e) {
            setError(e.message);
        } finally {
            setGenerating(false);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return (
        <div>
            <div className="page-header">
                <h1>Weekly Review</h1>
                <div className="header-actions">
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 160 }}
                        value={weekDate}
                        onChange={e => setWeekDate(e.target.value)}
                        placeholder="Week start..."
                    />
                    <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                        {generating ? (
                            <><span className="loading-dots"><span></span><span></span><span></span></span> Generating...</>
                        ) : 'Generate Review'}
                    </button>
                </div>
            </div>

            <div className="page-content">
                {error && <div className="alert alert-error">{error}</div>}

                {loading ? (
                    <div className="empty-state"><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : reviews.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No Weekly Reviews Yet</h3>
                        <p>Generate your first weekly review to get AI-powered insights about your week.</p>
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                            Generate First Review
                        </button>
                    </div>
                ) : (
                    <div className="review-layout">
                        <div className="review-sidebar">
                            <h3>Past Reviews</h3>
                            <div className="review-list">
                                {reviews.map(r => (
                                    <div
                                        key={r.id}
                                        className={`review-list-item ${selectedReview?.id === r.id ? 'active' : ''}`}
                                        onClick={() => setSelectedReview(r)}
                                    >
                                        <div className="review-week">Week of {formatDate(r.week_start_date)}</div>
                                        <div className="review-meta">
                                            {r.mood_avg && <span>Mood: {r.mood_avg.toFixed(1)}</span>}
                                            {r.energy_avg && <span>Energy: {r.energy_avg.toFixed(1)}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedReview && (
                            <div className="review-detail">
                                <div className="review-header-card card">
                                    <h2>Week of {formatDate(selectedReview.week_start_date)}</h2>
                                    <div className="review-stats">
                                        {selectedReview.mood_avg && (
                                            <div className="review-stat">
                                                <span className="stat-label">Avg Mood</span>
                                                <span className="stat-value mood">{selectedReview.mood_avg.toFixed(1)}/10</span>
                                            </div>
                                        )}
                                        {selectedReview.energy_avg && (
                                            <div className="review-stat">
                                                <span className="stat-label">Avg Energy</span>
                                                <span className="stat-value energy">{selectedReview.energy_avg.toFixed(1)}/10</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedReview.summary && (
                                    <div className="card review-section">
                                        <h3>Summary</h3>
                                        <p>{selectedReview.summary}</p>
                                    </div>
                                )}

                                {selectedReview.wins && selectedReview.wins.length > 0 && (
                                    <div className="card review-section">
                                        <h3>Wins & Highlights</h3>
                                        <ul className="review-list-items">
                                            {selectedReview.wins.map((w, i) => (
                                                <li key={i} className="win-item">{w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedReview.struggles && selectedReview.struggles.length > 0 && (
                                    <div className="card review-section">
                                        <h3>Challenges</h3>
                                        <ul className="review-list-items">
                                            {selectedReview.struggles.map((s, i) => (
                                                <li key={i} className="struggle-item">{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedReview.reflections && selectedReview.reflections.length > 0 && (
                                    <div className="card review-section">
                                        <h3>Reflective Questions</h3>
                                        <div className="reflections-list">
                                            {selectedReview.reflections.map((r, i) => (
                                                <div key={i} className="reflection-item">
                                                    <div className="reflection-question">{r.question}</div>
                                                    <div className="reflection-insight">{r.insight}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedReview.focus_next_week && selectedReview.focus_next_week.length > 0 && (
                                    <div className="card review-section">
                                        <h3>Focus for Next Week</h3>
                                        <div className="focus-items">
                                            {selectedReview.focus_next_week.map((f, i) => (
                                                <div key={i} className="focus-item">{f}</div>
                                            ))}
                                        </div>
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
