import { useState, useEffect } from 'react'
import api from '../api'
import Modal from '../components/Modal'

const STATUS_COLORS = {
    active: '#10b981', paused: '#f59e0b', completed: '#6366f1', archived: '#6b6b80'
};

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#f97316', '#14b8a6'];

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editProject, setEditProject] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Form
    const [form, setForm] = useState({ name: '', description: '', status: 'active', color: '#6366f1', start_date: '', target_date: '' });

    useEffect(() => { loadProjects(); }, []);

    const loadProjects = async () => {
        setLoading(true);
        try {
            setProjects(await api.getProjects());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadTasks = async (projectId) => {
        try { setTasks(await api.getTasks(projectId)); } catch (err) { console.error(err); }
    };

    const selectProject = async (p) => {
        setSelectedProject(p);
        await loadTasks(p.id);
    };

    const openCreate = () => {
        setEditProject(null);
        setForm({ name: '', description: '', status: 'active', color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)], start_date: '', target_date: '' });
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditProject(p);
        setForm({ name: p.name, description: p.description || '', status: p.status, color: p.color, start_date: p.start_date || '', target_date: p.target_date || '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const data = { ...form };
            if (!data.start_date) delete data.start_date;
            if (!data.target_date) delete data.target_date;
            if (editProject) {
                await api.updateProject(editProject.id, data);
            } else {
                await api.createProject(data);
            }
            loadProjects();
            setShowModal(false);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this project and all its tasks?')) return;
        try {
            await api.deleteProject(id);
            if (selectedProject?.id === id) { setSelectedProject(null); setTasks([]); }
            loadProjects();
        } catch (err) { console.error(err); }
    };

    const addTask = async () => {
        if (!newTaskTitle.trim() || !selectedProject) return;
        try {
            await api.createTask(selectedProject.id, { title: newTaskTitle.trim() });
            setNewTaskTitle('');
            loadTasks(selectedProject.id);
            loadProjects();
        } catch (err) { console.error(err); }
    };

    const toggleTask = async (task) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        try {
            await api.updateTask(task.id, { status: newStatus });
            loadTasks(selectedProject.id);
            loadProjects();
        } catch (err) { console.error(err); }
    };

    const deleteTask = async (taskId) => {
        try {
            await api.deleteTask(taskId);
            loadTasks(selectedProject.id);
            loadProjects();
        } catch (err) { console.error(err); }
    };

    const progress = (p) => p.task_count > 0 ? Math.round((p.completed_task_count / p.task_count) * 100) : 0;

    return (
        <>
            <div className="page-header">
                <h1>🚀 Projects</h1>
                <div className="header-actions">
                    {selectedProject && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedProject(null); setTasks([]); }}>← All Projects</button>
                    )}
                    <button className="btn btn-primary" onClick={openCreate}>+ New Project</button>
                </div>
            </div>

            <div className="page-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : selectedProject ? (
                    /* Project Detail View */
                    <div className="fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedProject.color }}></div>
                            <h2 style={{ flex: 1, fontSize: 'var(--font-xl)' }}>{selectedProject.name}</h2>
                            <span className={`badge badge-${selectedProject.status}`}>{selectedProject.status}</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(selectedProject)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedProject.id)}>Delete</button>
                        </div>
                        {selectedProject.description && (
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>{selectedProject.description}</p>
                        )}

                        <div className="progress-bar" style={{ marginBottom: 'var(--space-sm)', height: '8px' }}>
                            <div className="progress-bar-fill" style={{ width: `${progress(selectedProject)}%` }}></div>
                        </div>
                        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xl)' }}>
                            {selectedProject.completed_task_count}/{selectedProject.task_count} tasks complete ({progress(selectedProject)}%)
                        </p>

                        {/* Add Task */}
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                            <input
                                className="form-input"
                                placeholder="Add a new task..."
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTask()}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-primary" onClick={addTask}>Add</button>
                        </div>

                        {/* Task List */}
                        <div className="task-list">
                            {tasks.length === 0 ? (
                                <div className="empty-state"><p>No tasks yet. Add your first task above!</p></div>
                            ) : tasks.map(task => (
                                <div key={task.id} className="task-item">
                                    <button
                                        className={`task-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                                        onClick={() => toggleTask(task)}
                                    >{task.status === 'done' ? '✓' : ''}</button>
                                    <span className={`task-title ${task.status === 'done' ? 'done' : ''}`}>{task.title}</span>
                                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                                    <div className="task-actions">
                                        <button onClick={() => deleteTask(task.id)} title="Delete">🗑</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Projects Grid */
                    <div>
                        {projects.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🚀</div>
                                <h3>No projects yet</h3>
                                <p>Create your first project to start tracking your work</p>
                                <button className="btn btn-primary" onClick={openCreate}>+ Create Project</button>
                            </div>
                        ) : (
                            <div className="projects-grid">
                                {projects.map(p => (
                                    <div key={p.id} className="project-card fade-in" onClick={() => selectProject(p)} style={{ '--project-color': p.color }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: p.color }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                            <span className="project-name">{p.name}</span>
                                            <span className={`badge badge-${p.status}`}>{p.status}</span>
                                        </div>
                                        {p.description && <p className="project-desc">{p.description}</p>}
                                        <div className="progress-bar">
                                            <div className="progress-bar-fill" style={{ width: `${progress(p)}%`, background: p.color }}></div>
                                        </div>
                                        <div className="project-meta">
                                            <span>{p.completed_task_count}/{p.task_count} tasks</span>
                                            <span>{progress(p)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <Modal
                    title={editProject ? 'Edit Project' : 'New Project'}
                    onClose={() => setShowModal(false)}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {editProject ? 'Save Changes' : 'Create Project'}
                            </button>
                        </>
                    }
                >
                    <div className="form-group">
                        <label>Project Name</label>
                        <input className="form-input" placeholder="My Project" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea className="form-input" placeholder="What is this project about?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Color</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {PROJECT_COLORS.map(c => (
                                <button key={c} onClick={() => setForm({ ...form, color: c })}
                                    style={{
                                        width: '32px', height: '32px', borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '3px solid transparent',
                                        cursor: 'pointer', transition: 'transform 0.15s', transform: form.color === c ? 'scale(1.15)' : 'scale(1)'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Start Date</label>
                            <input type="date" className="form-input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Target Date</label>
                            <input type="date" className="form-input" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
