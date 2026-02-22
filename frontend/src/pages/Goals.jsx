import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import api from '../api'
import Modal from '../components/Modal'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const DOMAINS = ['health', 'career', 'finances', 'relationships', 'learning', 'creativity', 'spirituality'];
const DOMAIN_EMOJIS = { health: '💪', career: '💼', finances: '💰', relationships: '❤️', learning: '📚', creativity: '🎨', spirituality: '🧘' };

export default function Goals() {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCheckin, setShowCheckin] = useState(null);
    const [editGoal, setEditGoal] = useState(null);
    const [filter, setFilter] = useState('active');

    const [form, setForm] = useState({ title: '', description: '', domain: '', target_date: '', status: 'active' });
    const [checkinForm, setCheckinForm] = useState({ alignment_score: 5, notes: '', date: new Date().toISOString().split('T')[0] });

    useEffect(() => { loadGoals(); }, [filter]);

    const loadGoals = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter) params.status_filter = filter;
            setGoals(await api.getGoals(params));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditGoal(null);
        setForm({ title: '', description: '', domain: '', target_date: '', status: 'active' });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const data = { ...form };
            if (!data.target_date) delete data.target_date;
            if (!data.domain) delete data.domain;
            if (editGoal) {
                await api.updateGoal(editGoal.id, data);
            } else {
                await api.createGoal(data);
            }
            loadGoals();
            setShowModal(false);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this goal?')) return;
        try { await api.deleteGoal(id); loadGoals(); } catch (err) { console.error(err); }
    };

    const handleCheckin = async () => {
        if (!showCheckin) return;
        try {
            await api.createGoalCheckIn(showCheckin.id, checkinForm);
            setShowCheckin(null);
            loadGoals();
        } catch (err) { console.error(err); }
    };

    const getScoreColor = (score) => score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';

    return (
        <>
            <div className="page-header">
                <h1>⭐ Goals</h1>
                <div className="header-actions">
                    <select className="form-input" style={{ width: '140px' }} value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="achieved">Achieved</option>
                        <option value="paused">Paused</option>
                        <option value="abandoned">Abandoned</option>
                    </select>
                    <button className="btn btn-primary" onClick={openCreate}>+ New Goal</button>
                </div>
            </div>

            <div className="page-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : goals.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">⭐</div>
                        <h3>No goals yet</h3>
                        <p>Set your first goal and start tracking your progress</p>
                        <button className="btn btn-primary" onClick={openCreate}>+ Create Goal</button>
                    </div>
                ) : (
                    <div className="goals-list">
                        {goals.map(goal => (
                            <div key={goal.id} className="goal-card fade-in">
                                <div className="goal-header">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                                            {goal.domain && <span>{DOMAIN_EMOJIS[goal.domain] || '📌'}</span>}
                                            <span className="goal-title">{goal.title}</span>
                                        </div>
                                        {goal.description && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>{goal.description}</p>}
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                            <span className={`badge badge-${goal.status}`}>{goal.status}</span>
                                            {goal.domain && <span className="badge" style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{goal.domain}</span>}
                                            {goal.target_date && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Target: {goal.target_date}</span>}
                                        </div>
                                    </div>
                                    <div className="goal-alignment">
                                        <div style={{ textAlign: 'center' }}>
                                            <div className={`alignment-score ${goal.avg_alignment ? getScoreColor(goal.avg_alignment) : ''}`}>
                                                {goal.avg_alignment ? goal.avg_alignment.toFixed(1) : '—'}
                                            </div>
                                            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Avg Alignment</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Check-in history chart */}
                                {goal.checkins && goal.checkins.length > 1 && (
                                    <div style={{ height: '120px', marginBottom: 'var(--space-md)' }}>
                                        <Line
                                            data={{
                                                labels: goal.checkins.map(c => new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                                                datasets: [{
                                                    data: goal.checkins.map(c => c.alignment_score),
                                                    borderColor: '#6366f1',
                                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                                    fill: true,
                                                    tension: 0.4,
                                                    pointRadius: 4,
                                                    pointBackgroundColor: '#6366f1',
                                                }]
                                            }}
                                            options={{
                                                responsive: true, maintainAspectRatio: false,
                                                scales: {
                                                    y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b6b80', stepSize: 5 } },
                                                    x: { grid: { display: false }, ticks: { color: '#6b6b80', font: { size: 10 } } }
                                                },
                                                plugins: { legend: { display: false } }
                                            }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => {
                                        setShowCheckin(goal);
                                        setCheckinForm({ alignment_score: 5, notes: '', date: new Date().toISOString().split('T')[0] });
                                    }}>
                                        📊 Check In
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => {
                                        setEditGoal(goal);
                                        setForm({ title: goal.title, description: goal.description || '', domain: goal.domain || '', target_date: goal.target_date || '', status: goal.status });
                                        setShowModal(true);
                                    }}>Edit</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal.id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Goal Modal */}
            {showModal && (
                <Modal title={editGoal ? 'Edit Goal' : 'New Goal'} onClose={() => setShowModal(false)}
                    footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave}>{editGoal ? 'Save' : 'Create'}</button></>}>
                    <div className="form-group">
                        <label>Goal Title</label>
                        <input className="form-input" placeholder="e.g., Run a marathon" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea className="form-input" placeholder="What does this goal mean to you?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
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
                            <label>Target Date</label>
                            <input type="date" className="form-input" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
                        </div>
                    </div>
                    {editGoal && (
                        <div className="form-group">
                            <label>Status</label>
                            <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="active">Active</option>
                                <option value="achieved">Achieved</option>
                                <option value="paused">Paused</option>
                                <option value="abandoned">Abandoned</option>
                            </select>
                        </div>
                    )}
                </Modal>
            )}

            {/* Check-in Modal */}
            {showCheckin && (
                <Modal title={`Check In: ${showCheckin.title}`} onClose={() => setShowCheckin(null)}
                    footer={<><button className="btn btn-secondary" onClick={() => setShowCheckin(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCheckin}>Submit Check-in</button></>}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
                        How aligned was your behavior with this goal today?
                    </p>
                    <div className="slider-group">
                        <label>Alignment</label>
                        <input type="range" min="1" max="10" value={checkinForm.alignment_score}
                            onChange={e => setCheckinForm({ ...checkinForm, alignment_score: parseInt(e.target.value) })} />
                        <span className="slider-value">{checkinForm.alignment_score}</span>
                    </div>
                    <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                        <label>Notes (optional)</label>
                        <textarea className="form-input" placeholder="What did you do today toward this goal?"
                            value={checkinForm.notes} onChange={e => setCheckinForm({ ...checkinForm, notes: e.target.value })} rows={3} />
                    </div>
                    <div className="form-group">
                        <label>Date</label>
                        <input type="date" className="form-input" value={checkinForm.date}
                            onChange={e => setCheckinForm({ ...checkinForm, date: e.target.value })} />
                    </div>
                </Modal>
            )}
        </>
    );
}
