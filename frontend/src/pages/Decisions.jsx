import { useState, useEffect } from 'react'
import api from '../api'
import Modal from '../components/Modal'

const DOMAINS = ['health', 'career', 'finances', 'relationships', 'learning', 'creativity', 'spirituality'];
const DOMAIN_EMOJIS = { health: '💪', career: '💼', finances: '💰', relationships: '❤️', learning: '📚', creativity: '🎨', spirituality: '🧘' };

export default function Decisions() {
    const [decisions, setDecisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showReview, setShowReview] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', domain: '', date: new Date().toISOString().split('T')[0] });
    const [reviewForm, setReviewForm] = useState({ outcome_notes: '', outcome_score: 5 });

    useEffect(() => { loadDecisions(); }, []);

    const loadDecisions = async () => {
        setLoading(true);
        try { setDecisions(await api.getDecisions()); } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        try {
            const data = { ...form };
            if (!data.domain) delete data.domain;
            await api.createDecision(data);
            loadDecisions();
            setShowModal(false);
        } catch (err) { console.error(err); }
    };

    const handleReview = async () => {
        if (!showReview) return;
        try {
            await api.updateDecision(showReview.id, reviewForm);
            setShowReview(null);
            loadDecisions();
        } catch (err) { console.error(err); }
    };

    const scoreColor = (s) => s >= 7 ? 'var(--accent-emerald)' : s >= 4 ? 'var(--accent-amber)' : 'var(--accent-rose)';

    return (
        <>
            <div className="page-header">
                <h1>⚖️ Decisions</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => {
                        setForm({ title: '', description: '', domain: '', date: new Date().toISOString().split('T')[0] });
                        setShowModal(true);
                    }}>+ Log Decision</button>
                </div>
            </div>

            <div className="page-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : decisions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">⚖️</div>
                        <h3>No decisions logged</h3>
                        <p>Start logging important decisions to track outcomes over time</p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log Decision</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {decisions.map(d => (
                            <div key={d.id} className="card fade-in">
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                            {d.domain && <span>{DOMAIN_EMOJIS[d.domain] || '📌'}</span>}
                                            <span style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>{d.title}</span>
                                        </div>
                                        {d.description && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>{d.description}</p>}
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>📅 {d.date}</span>
                                            {d.domain && <span className="badge" style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{d.domain}</span>}
                                            {d.reviewed_at && <span className="badge badge-completed">Reviewed</span>}
                                        </div>

                                        {d.outcome_notes && (
                                            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Outcome Review</div>
                                                <p style={{ fontSize: 'var(--font-sm)' }}>{d.outcome_notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                        {d.outcome_score ? (
                                            <>
                                                <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: scoreColor(d.outcome_score) }}>
                                                    {d.outcome_score}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>/10</div>
                                            </>
                                        ) : (
                                            <button className="btn btn-secondary btn-sm" onClick={() => {
                                                setShowReview(d);
                                                setReviewForm({ outcome_notes: d.outcome_notes || '', outcome_score: d.outcome_score || 5 });
                                            }}>
                                                Review
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Log Decision Modal */}
            {showModal && (
                <Modal title="Log Decision" onClose={() => setShowModal(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreate}>Log Decision</button></>}>
                    <div className="form-group">
                        <label>Decision</label>
                        <input className="form-input" placeholder="What decision did you make?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Context / Reasoning</label>
                        <textarea className="form-input" placeholder="Why did you make this decision? What were the alternatives?"
                            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Life Domain</label>
                            <select className="form-input" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}>
                                <option value="">None</option>
                                {DOMAINS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Date</label>
                            <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Review Decision Modal */}
            {showReview && (
                <Modal title={`Review: ${showReview.title}`} onClose={() => setShowReview(null)}
                    footer={<><button className="btn btn-secondary" onClick={() => setShowReview(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleReview}>Submit Review</button></>}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
                        How did this decision turn out?
                    </p>
                    <div className="form-group">
                        <label>Outcome Score</label>
                        <div className="slider-group">
                            <input type="range" min="1" max="10" value={reviewForm.outcome_score}
                                onChange={e => setReviewForm({ ...reviewForm, outcome_score: parseInt(e.target.value) })} />
                            <span className="slider-value">{reviewForm.outcome_score}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Outcome Notes</label>
                        <textarea className="form-input" placeholder="What happened as a result of this decision?"
                            value={reviewForm.outcome_notes} onChange={e => setReviewForm({ ...reviewForm, outcome_notes: e.target.value })} rows={4} />
                    </div>
                </Modal>
            )}
        </>
    );
}
